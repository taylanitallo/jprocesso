/**
 * Seed de demonstração — Prefeitura Municipal de Modelo (schema tenant_modelo)
 *
 * Popula o tenant com dados realistas de todos os módulos: organização
 * (secretarias, setores, usuários, responsáveis, agentes), contratos
 * (credores, itens, contratos, ordens de compra/serviço), tesouraria
 * (contas, receitas, despesas), almoxarifado, patrimônio, processos com
 * trilha completa de tramitação, DIDs de contas fixas e variáveis,
 * documentos oficiais (ofícios, determinações, portarias, decretos),
 * lançamentos financeiros e logs de atividade.
 *
 * Datas: os dados são escritos no calendário de fev–jul/2026 e deslocados para
 * terminar no dia em que o seed roda (seed_demo/datas.js).
 * Fase 2 (seed_demo/fase2.js), pelos serviços do próprio sistema: fluxos do DID
 * do município, assinaturas eletrônicas, aplicativo autenticador dos usuários,
 * anexos em PDF, lixeira, grupos de contas, licitações e vigências de contratos.
 *
 * Uso:
 *   node server/scripts/seed_demo_modelo.js           → só roda com o tenant vazio
 *   node server/scripts/seed_demo_modelo.js --reset   → apaga os dados de demo e repopula
 *
 * Mantidos no --reset: a SEMAD, o Protocolo Geral e os usuários administradores.
 * Senha de todos os usuários criados: 123456
 */
require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
const { Client } = require('pg');
const bcrypt = require('bcryptjs');
const QRCode = require('qrcode');
const crypto = require('crypto');

const util = require('./seed_demo/util');
const org = require('./seed_demo/org');
const compras = require('./seed_demo/compras');
const almoxPat = require('./seed_demo/almox_pat');
const processos = require('./seed_demo/processos');
const datas = require('./seed_demo/datas');
const fase2 = require('./seed_demo/fase2');

const SCHEMA = 'tenant_modelo';
const RESET = process.argv.includes('--reset');

const main = async () => {
  const client = new Client({
    host: process.env.DB_HOST, port: process.env.DB_PORT, user: process.env.DB_USER,
    password: process.env.DB_PASSWORD, database: process.env.DB_NAME,
    ssl: { rejectUnauthorized: false },
  });
  await client.connect();
  console.log('Conectado ao banco. Schema alvo:', SCHEMA);

  const q = (sql, params) => client.query(sql, params);
  const count = async (t) => parseInt((await q(`SELECT COUNT(*) FROM "${SCHEMA}"."${t}"`)).rows[0].count, 10);

  // ── Migração pendente neste tenant: numero_did INTEGER → VARCHAR(30) ──────
  const col = await q(`SELECT data_type FROM information_schema.columns
    WHERE table_schema=$1 AND table_name='dids' AND column_name='numero_did'`, [SCHEMA]);
  if (col.rows[0] && ['integer', 'bigint'].includes(col.rows[0].data_type)) {
    await q(`ALTER TABLE "${SCHEMA}".dids ALTER COLUMN numero_did TYPE VARCHAR(30) USING numero_did::text`);
    console.log('Coluna dids.numero_did migrada para VARCHAR(30).');
  }

  // A estrutura (colunas, CHECKs) vem das migrações do servidor: o tenant precisa
  // já ter sido acessado depois do último deploy
  const faltando = (await q(`SELECT unnest(ARRAY['assinaturas_eletronicas','registros_excluidos','usuario_totp','tes_grupos_contas']) AS t
    EXCEPT SELECT table_name FROM information_schema.tables WHERE table_schema=$1`, [SCHEMA])).rows.map(r => r.t);
  const colDid = (await q(`SELECT 1 FROM information_schema.columns WHERE table_schema=$1 AND table_name='dids' AND column_name='etapas_dados'`, [SCHEMA])).rowCount;
  if (faltando.length || !colDid) {
    console.error(`ABORTADO: o tenant está sem migrações (${[...faltando, colDid ? null : 'dids.etapas_dados'].filter(Boolean).join(', ')}). Acesse o município no sistema e rode de novo.`);
    process.exit(1);
  }

  // ── Registros mantidos: SEMAD, Protocolo Geral e administradores ──────────
  const admins = (await q(`SELECT id, nome FROM "${SCHEMA}".usuarios WHERE tipo IN ('admin','jeos') ORDER BY (tipo='admin') DESC, created_at`)).rows;
  if (!admins.length) { console.error('ABORTADO: nenhum usuário administrador no tenant.'); process.exit(1); }
  let semadId = (await q(`SELECT id FROM "${SCHEMA}".secretarias WHERE sigla='SEMAD' LIMIT 1`)).rows[0]?.id;
  if (!semadId) {
    semadId = util.uuid();
    await q(`INSERT INTO "${SCHEMA}".secretarias (id, nome, sigla, ativo, created_at, updated_at) VALUES ($1,'Secretaria de Administração','SEMAD',true,NOW(),NOW())`, [semadId]);
  }
  let protoId = (await q(`SELECT id FROM "${SCHEMA}".setores WHERE sigla='PROTO' LIMIT 1`)).rows[0]?.id;
  if (!protoId) {
    protoId = util.uuid();
    await q(`INSERT INTO "${SCHEMA}".setores (id, secretaria_id, nome, sigla, ativo, created_at, updated_at) VALUES ($1,$2,'Protocolo Geral','PROTO',true,NOW(),NOW())`, [protoId, semadId]);
  }
  org.setIds({ SEMAD_ID: semadId, PROTO_ID: protoId, ADMIN_ID: admins[0].id, ADMIN_NOME: admins[0].nome });
  const idsAdmins = admins.map(a => a.id);

  // ── Reset opcional / trava de segurança ───────────────────────────────────
  const nProc = await count('processos');
  if (nProc > 0 && !RESET) {
    console.error(`ABORTADO: o tenant já possui ${nProc} processos. Use --reset para apagar os dados de demo e repopular.`);
    await client.end();
    process.exit(1);
  }
  if (RESET) {
    console.log('Limpando dados existentes (--reset)...');
    // Arquivos dos anexos no storage
    const arquivos = (await q(`SELECT url_arquivo FROM "${SCHEMA}".anexos WHERE url_arquivo IS NOT NULL`)).rows.map(r => r.url_arquivo);
    await fase2.apagarArquivos(arquivos);
    const wipe = [
      'assinaturas_eletronicas', 'registros_excluidos', 'tes_grupos_contas', 'licitacoes',
      'logs', 'financeiro_lancamentos', 'dids', 'tramitacoes', 'anexos', 'processos',
      'tes_despesas', 'tes_receitas', 'contas_bancarias',
      'almox_inventario_itens', 'almox_inventarios', 'almox_cotas',
      'almoxarifado_requisicao_itens', 'almoxarifado_requisicoes', 'almoxarifado_movimentacoes',
      'almoxarifado_lotes', 'almoxarifado_audit_log', 'almoxarifado_itens', 'alm_categorias',
      'pat_inventario_itens', 'pat_inventarios', 'pat_baixas', 'pat_movimentacoes', 'pat_responsabilidades', 'pat_bens',
      'contratos_ordens_itens', 'contratos_ordens', 'contratos_itens_vinculo', 'contratos', 'contratos_itens', 'credores',
      'agentes', 'responsaveis',
    ];
    for (const t of wipe) await q(`DELETE FROM "${SCHEMA}"."${t}"`);
    // Administradores ficam no Protocolo (os demais setores são recriados)
    await q(`UPDATE "${SCHEMA}".usuarios SET setor_id=$1, secretaria_id=$2 WHERE id = ANY($3::uuid[])`, [protoId, semadId, idsAdmins]);
    await q(`DELETE FROM "${SCHEMA}".usuario_totp WHERE usuario_id <> ALL($1::uuid[])`, [idsAdmins]);
    await q(`DELETE FROM "${SCHEMA}".refresh_tokens WHERE user_id <> ALL($1::uuid[])`, [idsAdmins]).catch(() => {});
    await q(`DELETE FROM "${SCHEMA}".usuarios WHERE id <> ALL($1::uuid[])`, [idsAdmins]);
    await q(`DELETE FROM "${SCHEMA}".setores WHERE id <> $1`, [protoId]);
    await q(`DELETE FROM "${SCHEMA}".secretarias WHERE id <> $1`, [semadId]);
    // O backup do seed_demo_tensao.js era da massa apagada: não serve mais para desfazer
    const backupTensao = require('path').resolve(__dirname, 'seed_demo_tensao.backup.json');
    if (require('fs').existsSync(backupTensao)) require('fs').unlinkSync(backupTensao);
    console.log('Limpeza concluída.');
  }

  // ── Monta todos os dados em memória ───────────────────────────────────────
  console.log('Gerando dados...');
  const senhaHash = await bcrypt.hash('123456', 10);
  const ctx = {};

  // grupos de patrimônio já existentes no tenant
  ctx.patGrupos = {};
  for (const r of (await q(`SELECT id, codigo FROM "${SCHEMA}".pat_grupos`)).rows) ctx.patGrupos[r.codigo] = r.id;

  org.build(ctx, senhaHash);
  compras.build(ctx);
  almoxPat.build(ctx);
  processos.build(ctx);

  // ── Linha do tempo: o registro mais recente cai pouco antes de agora ──────
  // Âncora: a última movimentação de processo (o que aparece em "hoje"/"esta semana");
  // registros agendados de outros módulos podem ficar alguns dias à frente
  const chavesLinhas = Object.keys(ctx).filter(k => k.endsWith('Rows'));
  const maisRecente = datas.maisRecente(ctx.tramRows);
  const desloc = datas.criarDeslocador(datas.diasAteHoje(maisRecente), new Date());
  for (const k of chavesLinhas) ctx[k] = desloc.valor(ctx[k]);
  ctx.deslocamento = desloc;
  console.log(`Datas deslocadas em ${desloc.dias} dias (${desloc.meses} meses nos textos).`);

  // ── Grava tudo numa transação ─────────────────────────────────────────────
  console.log('Inserindo no banco...');
  await q('BEGIN');
  try {
    const ins = (t, cols, rows) => util.batchInsert(client, SCHEMA, t, cols, rows);

    // Entidade e SEMAD (registros pré-existentes) atualizados
    await q(`UPDATE "${SCHEMA}".entidade SET
      nome='PREFEITURA MUNICIPAL DE MODELO', nome_abreviado='PM MODELO',
      razao_social='MUNICÍPIO DE MODELO', esfera='Municipal', poder='Executivo',
      email='gabinete@modelo.ce.gov.br', telefone='88 3699-1000', whatsapp='88 98899-1000',
      cep='62790-000', logradouro='Praça da Matriz', numero='01', bairro='Centro',
      cidade='Modelo', uf='CE', updated_at=NOW() WHERE id=1`);
    await q(`UPDATE "${SCHEMA}".secretarias SET
      descricao='Gestão administrativa, RH, compras, patrimônio e almoxarifado',
      data_inicio='2025-01-01', email='semad@modelo.ce.gov.br', whatsapp='88 98899-1010',
      cnpj=$1, razao_social='Secretaria de Administração do Município de Modelo', codigo_unidade='02',
      responsaveis=$2, orcamento=$3, dotacoes=$4, updated_at=NOW() WHERE id=$5`, [
      util.cnpj(),
      JSON.stringify([{ nome: 'Carlos Eduardo Vasconcelos Lima', cargo: 'Secretário de Administração', data_inicio: '2025-01-02', data_fim: null }]),
      JSON.stringify({ exercicio: 2026, valor_loa: 8400000, valor_suplementado: 350000, valor_reduzido: 0 }),
      JSON.stringify([
        { id: 1, codigo: '02.01.00.4.122.0002.2.004', descricao: 'Manutenção das atividades da SEMAD', elemento_despesa: '3.3.90.30', fonte_recurso: '1500 – Recursos Próprios', valor_previsto: 2400000 },
        { id: 2, codigo: '02.01.00.4.122.0002.2.005', descricao: 'Serviços de terceiros – SEMAD', elemento_despesa: '3.3.90.39', fonte_recurso: '1500 – Recursos Próprios', valor_previsto: 1800000 },
      ]),
      semadId,
    ]);
    await q(`UPDATE "${SCHEMA}".usuarios SET cargo='Administrador do Sistema', nome_reduzido='Admin',
      portaria_nomeacao='Portaria nº 001/2025', ultimo_acesso=NOW() WHERE id=$1`, [admins[0].id]);

    // Organização
    await ins('secretarias', ctx.secCols, ctx.secRows);
    await ins('setores', ctx.setCols, ctx.setRows);
    await ins('usuarios', ctx.uCols, ctx.uRows);
    await ins('responsaveis', ctx.respCols, ctx.respRows);
    await ins('agentes', ctx.agCols, ctx.agRows);
    for (const s of ctx.secRespUpdates) await q(`UPDATE "${SCHEMA}".secretarias SET responsaveis=$1 WHERE id=$2`, [s.json, s.id]);
    console.log('  organização ok');

    // Contratos
    await ins('credores', ctx.credCols, ctx.credRows);
    await ins('contratos_itens', ctx.catCols, ctx.catRows);
    await ins('contratos', ctx.ctrCols, ctx.ctrRows);
    await ins('contratos_itens_vinculo', ctx.vincCols, ctx.vincRows);
    await ins('contratos_ordens', ctx.ordCols, ctx.ordRows);
    await ins('contratos_ordens_itens', ctx.ordItemCols, ctx.ordItemRows);
    console.log('  contratos e ordens ok');

    // Tesouraria
    await ins('contas_bancarias', ctx.contaCols, ctx.contaRows);
    await ins('tes_receitas', ctx.recCols, ctx.recRows);
    await ins('tes_despesas', ctx.despCols, ctx.despRows);
    console.log('  tesouraria ok');

    // Almoxarifado
    await ins('alm_categorias', ctx.almCatCols, ctx.almCatRows);
    await ins('almoxarifado_itens', ctx.almoxItemCols, ctx.almoxItemRows);
    await ins('almoxarifado_lotes', ctx.loteCols, ctx.loteRows);
    await ins('almoxarifado_requisicoes', ctx.reqCols, ctx.reqRows);
    await ins('almoxarifado_requisicao_itens', ctx.reqItemCols, ctx.reqItemRows);
    await ins('almoxarifado_movimentacoes', ctx.movCols, ctx.movRows);
    await ins('almox_cotas', ctx.cotaCols, ctx.cotaRows);
    await ins('almox_inventarios', ctx.almInvCols, ctx.almInvRows);
    await ins('almox_inventario_itens', ctx.almInvItemCols, ctx.almInvItemRows);
    for (const a of ctx.ajusteEstoque) await q(`UPDATE "${SCHEMA}".almoxarifado_itens SET estoque_atual=$1 WHERE id=$2`, [a.saldo, a.id]);
    for (const l of ctx.ajusteLotes) await q(`UPDATE "${SCHEMA}".almoxarifado_lotes SET quantidade_atual=$1 WHERE id=$2`, [l.restante, l.id]);
    console.log('  almoxarifado ok');

    // Patrimônio
    await ins('pat_bens', ctx.bemCols, ctx.bemRows);
    await ins('pat_responsabilidades', ctx.patRespCols, ctx.patRespRows);
    await ins('pat_movimentacoes', ctx.patMovCols, ctx.patMovRows);
    await ins('pat_baixas', ctx.patBaixaCols, ctx.patBaixaRows);
    await ins('pat_inventarios', ctx.patInvCols, ctx.patInvRows);
    await ins('pat_inventario_itens', ctx.patInvItemCols, ctx.patInvItemRows);
    for (const b of ctx.bensTransferidos) await q(`UPDATE "${SCHEMA}".pat_bens SET setor_id=$1, secretaria_id=$2 WHERE id=$3`, [b.setorId, b.secretariaId, b.id]);
    if (ctx.bensBaixados.length) await q(`UPDATE "${SCHEMA}".pat_bens SET status='BAIXADO', ativo=false WHERE id = ANY($1::uuid[])`, [ctx.bensBaixados]);
    console.log('  patrimônio ok');

    // Processos (com QR code) + tramitações
    const procCols = ['id', 'numero', 'ano', 'sequencial', 'assunto', 'descricao', 'interessado_nome', 'interessado_cpf_cnpj',
      'status', 'setor_atual_id', 'usuario_atual_id', 'qrcode', 'prioridade', 'data_abertura', 'data_conclusao',
      'criado_por_id', 'tipo_processo', 'despacho_doc', 'created_at', 'updated_at'];
    const procArr = [];
    for (const p of ctx.procRows) {
      const qr = await QRCode.toDataURL(`${p.numero}-${crypto.randomBytes(8).toString('hex')}`);
      procArr.push([p.id, p.numero, p.ano, p.sequencial, p.assunto, p.descricao, p.interessado_nome, p.interessado_cpf_cnpj,
        p.status, p.setor_atual_id, p.usuario_atual_id, qr, p.prioridade, p.data_abertura, p.data_conclusao,
        p.criado_por_id, p.tipo_processo, p.despacho_doc, p.created_at, p.updated_at]);
    }
    await ins('processos', procCols, procArr);
    await ins('tramitacoes', ctx.tramCols, ctx.tramRows);
    console.log('  processos e tramitações ok');

    // DIDs (insert dinâmico por linha — muitas colunas variáveis)
    for (const did of ctx.didRows) {
      const cols = Object.keys(did);
      const vals = cols.map((c) => did[c]);
      await q(`INSERT INTO "${SCHEMA}".dids (${cols.map((c) => `"${c}"`).join(',')})
               VALUES (${cols.map((_, i) => `$${i + 1}`).join(',')})`, vals);
    }
    console.log('  DIDs ok');

    await ins('financeiro_lancamentos', ctx.finCols, ctx.finRows);
    await ins('logs', ctx.logCols, ctx.logRows);
    console.log('  financeiro e logs ok');

    // Sequences das tabelas SERIAL
    const setval = async (t, n) => q(`SELECT setval(pg_get_serial_sequence('${SCHEMA}.${t}','id'), $1)`, [n]);
    await setval('credores', ctx.credRows.length);
    await setval('contratos_itens', ctx.catRows.length);
    await setval('contratos', ctx.ctrRows.length);
    await setval('contratos_itens_vinculo', ctx.vincMax);
    await setval('contratos_ordens', ctx.ordMax);
    await setval('contratos_ordens_itens', ctx.ordItemMax);
    await setval('responsaveis', ctx.respMax);

    await q('COMMIT');
  } catch (err) {
    await q('ROLLBACK');
    throw err;
  }

  // ── Fase 2: pelos serviços do sistema (assinaturas, lixeira, anexos…) ─────
  console.log('\nFase 2...');
  const resumoFase2 = await fase2.executar({ schema: SCHEMA, ctx });

  // ── Resumo ────────────────────────────────────────────────────────────────
  console.log('\n════════ RESUMO DO SEED ════════');
  const tabelas = ['secretarias', 'setores', 'usuarios', 'responsaveis', 'agentes', 'credores', 'contratos_itens',
    'contratos', 'contratos_itens_vinculo', 'contratos_ordens', 'contratos_ordens_itens', 'contas_bancarias',
    'tes_receitas', 'tes_despesas', 'alm_categorias', 'almoxarifado_itens', 'almoxarifado_lotes',
    'almoxarifado_movimentacoes', 'almoxarifado_requisicoes', 'almoxarifado_requisicao_itens', 'almox_cotas',
    'almox_inventarios', 'almox_inventario_itens', 'pat_grupos', 'pat_bens', 'pat_responsabilidades',
    'pat_movimentacoes', 'pat_baixas', 'pat_inventarios', 'pat_inventario_itens', 'processos', 'tramitacoes',
    'dids', 'financeiro_lancamentos', 'logs', 'assinaturas_eletronicas', 'anexos', 'registros_excluidos',
    'licitacoes', 'tes_grupos_contas', 'usuario_totp'];
  for (const t of tabelas) console.log(`  ${t.padEnd(32)} ${await count(t)}`);
  console.log('\nLogin demo: usuários @modelo.ce.gov.br (e-mail ou CPF) — senha: 123456');
  fase2.imprimirResumo(resumoFase2);
  await client.end();
  console.log('Seed concluído com sucesso.');
};

main().then(() => process.exit(0)).catch((err) => { console.error('ERRO NO SEED:', err); process.exit(1); });
