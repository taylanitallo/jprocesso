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
 * Uso:
 *   node server/scripts/seed_demo_modelo.js           → só roda com o tenant vazio
 *   node server/scripts/seed_demo_modelo.js --reset   → apaga os dados de demo e repopula
 *
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

  // ── CHECK de tipo_acao precisa aceitar 'recebimento' (como no modelo) ─────
  await q(`ALTER TABLE "${SCHEMA}".tramitacoes DROP CONSTRAINT IF EXISTS tramitacoes_tipo_acao_check`);
  await q(`ALTER TABLE "${SCHEMA}".tramitacoes ADD CONSTRAINT tramitacoes_tipo_acao_check
    CHECK (tipo_acao IN ('abertura','tramite','devolucao','conclusao','arquivamento','recebimento'))`);

  // ── Reset opcional / trava de segurança ───────────────────────────────────
  const nProc = await count('processos');
  if (nProc > 0 && !RESET) {
    console.error(`ABORTADO: o tenant já possui ${nProc} processos. Use --reset para apagar os dados de demo e repopular.`);
    await client.end();
    process.exit(1);
  }
  if (RESET) {
    console.log('Limpando dados existentes (--reset)...');
    const wipe = [
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
    await q(`DELETE FROM "${SCHEMA}".usuarios WHERE id NOT IN ($1,$2)`, [org.ADMIN_ID, 'a5be7991-043e-4c36-ad2e-62f6060e960f']);
    await q(`DELETE FROM "${SCHEMA}".setores WHERE id <> $1`, [org.PROTO_ID]);
    await q(`DELETE FROM "${SCHEMA}".secretarias WHERE id <> $1`, [org.SEMAD_ID]);
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
      org.SEMAD_ID,
    ]);
    await q(`UPDATE "${SCHEMA}".usuarios SET cargo='Administrador do Sistema', nome_reduzido='Admin',
      portaria_nomeacao='Portaria nº 001/2025', ultimo_acesso=NOW() WHERE id=$1`, [org.ADMIN_ID]);

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

  // ── Resumo ────────────────────────────────────────────────────────────────
  console.log('\n════════ RESUMO DO SEED ════════');
  const tabelas = ['secretarias', 'setores', 'usuarios', 'responsaveis', 'agentes', 'credores', 'contratos_itens',
    'contratos', 'contratos_itens_vinculo', 'contratos_ordens', 'contratos_ordens_itens', 'contas_bancarias',
    'tes_receitas', 'tes_despesas', 'alm_categorias', 'almoxarifado_itens', 'almoxarifado_lotes',
    'almoxarifado_movimentacoes', 'almoxarifado_requisicoes', 'almoxarifado_requisicao_itens', 'almox_cotas',
    'almox_inventarios', 'almox_inventario_itens', 'pat_grupos', 'pat_bens', 'pat_responsabilidades',
    'pat_movimentacoes', 'pat_baixas', 'pat_inventarios', 'pat_inventario_itens', 'processos', 'tramitacoes',
    'dids', 'financeiro_lancamentos', 'logs'];
  for (const t of tabelas) console.log(`  ${t.padEnd(32)} ${await count(t)}`);
  console.log('\nLogin demo: admin@modelo.com (admin) e usuários @modelo.ce.gov.br — senha: 123456');
  await client.end();
  console.log('Seed concluído com sucesso.');
};

main().catch((err) => { console.error('ERRO NO SEED:', err); process.exit(1); });
