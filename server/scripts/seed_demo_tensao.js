/**
 * seed_demo_tensao.js — Ajuste de "tensão" da massa de demonstração
 *
 * Problema que resolve: o seed principal (seed_demo_modelo.js) cria contratos com
 * vigência até o fim do exercício e estoques confortáveis. Resultado: o Painel de
 * Contratos e o alerta de estoque aparecem VAZIOS na apresentação — e tela vazia
 * mata a venda. Este script cria, de forma controlada, as situações que o gestor
 * precisa ver: contrato expirado, contrato vencendo, item abaixo do mínimo.
 *
 * Características:
 *   • RELATIVO À DATA DE HOJE — rode antes de cada apresentação e os prazos estarão
 *     sempre corretos, independentemente de quando o seed foi gerado.
 *   • IDEMPOTENTE — rodar duas vezes produz o mesmo resultado.
 *   • REVERSÍVEL — grava os valores originais em seed_demo_tensao.backup.json.
 *   • SEGURO — só opera no schema de demonstração; aborta em qualquer outro.
 *   • DRY-RUN POR PADRÃO — nada é gravado sem --aplicar.
 *
 * Uso:
 *   node server/scripts/seed_demo_tensao.js              → mostra o que faria (não grava)
 *   node server/scripts/seed_demo_tensao.js --aplicar    → aplica no banco
 *   node server/scripts/seed_demo_tensao.js --restaurar  → desfaz, usando o backup
 */
require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const SCHEMA_PERMITIDO = 'tenant_modelo';
const SCHEMA = process.env.DEMO_SCHEMA || SCHEMA_PERMITIDO;
const BACKUP = path.resolve(__dirname, 'seed_demo_tensao.backup.json');

const APLICAR   = process.argv.includes('--aplicar');
const RESTAURAR = process.argv.includes('--restaurar');

// ── Roteiro de tensão ─────────────────────────────────────────────────────────
// Cada contrato recebe uma nova data de fim de vigência calculada a partir de HOJE.
// A escolha não é aleatória: os contratos que vencem primeiro são os que doem —
// saúde, transporte escolar, oxigênio hospitalar. É o que faz o prefeito se mexer.
const CONTRATOS_TENSAO = [
  // [nº do contrato, dias a partir de hoje, motivo narrativo]
  ['021/2026', -34, 'EXPIRADO — manutenção de ar-condicionado, venceu e ninguém viu'],
  ['019/2026', -11, 'EXPIRADO — serviços gráficos, venceu na semana passada'],
  ['030/2026',   7, 'VENCE EM 7 DIAS — oxigênio medicinal do Hospital Municipal'],
  ['014/2026',  16, 'VENCE EM 16 DIAS — locação de veículos das equipes de saúde'],
  ['015/2026',  27, 'VENCE EM 27 DIAS — transporte escolar da zona rural'],
  ['006/2026',  48, 'vence em 48 dias — medicamentos'],
  ['008/2026',  63, 'vence em 63 dias — merenda escolar'],
  ['024/2026',  79, 'vence em 79 dias — análises clínicas'],
  ['005/2026',  88, 'vence em 88 dias — combustíveis da frota'],
];

// Itens que devem aparecer como estoque crítico.
// Optamos por elevar o ESTOQUE MÍNIMO (campo de política de reposição) em vez de
// baixar o saldo — assim o alerta acende sem criar inconsistência entre o saldo do
// item, os lotes e o histórico de movimentação.
// A massa original lança as receitas em contas específicas (FPM, convênios) e as
// despesas na Conta Movimento Geral — o que deixa a conta principal com saldo
// NEGATIVO no relatório de Tesouraria. Numa apresentação isso é um tiro no pé:
// o prefeito pergunta por que o caixa está no vermelho. Aqui lançamos a arrecadação
// própria e a transferência interna que, na vida real, alimentam essa conta.
const CONTA_MOVIMENTO = 'Conta Movimento Geral';
const MARCADOR = 'demo-tensao';   // permite desfazer exatamente estas linhas
const RECEITAS_COMPLEMENTO = [
  // [mês, dia, descrição, valor]
  [2, 25, 'ICMS – cota-parte municipal, fevereiro/2026',            168420.55],
  [3, 25, 'ICMS – cota-parte municipal, março/2026',                155980.12],
  [3, 28, 'ISS – arrecadação própria, março/2026',                   42310.00],
  [4, 24, 'ICMS – cota-parte municipal, abril/2026',                172640.80],
  [5, 26, 'ICMS – cota-parte municipal, maio/2026',                 149220.45],
  [5, 29, 'IPTU – arrecadação própria, maio/2026',                   61870.30],
  [6, 25, 'ICMS – cota-parte municipal, junho/2026',                181350.90],
  [6, 29, 'ISS – arrecadação própria, junho/2026',                   47905.20],
  [7, 24, 'ICMS – cota-parte municipal, julho/2026',                166740.25],
  [7, 10, 'Transferência do FPM para a conta movimento',            300000.00],
];

// O mínimo precisa ficar ACIMA do saldo atual para o alerta acender.
const ITENS_TENSAO = [
  ['MAT-013', 180, 'Água sanitária — limpeza das escolas (saldo 153)'],
  ['MAT-016', 120, 'Vassoura de nylon (saldo 106)'],
  ['MAT-020', 150, 'Luva de borracha — equipes de limpeza (saldo 135)'],
  ['MAT-003', 200, 'Caneta esferográfica (saldo 160)'],
];

const conectar = async () => {
  const c = new Client({
    host: process.env.DB_HOST, port: process.env.DB_PORT, user: process.env.DB_USER,
    password: process.env.DB_PASSWORD, database: process.env.DB_NAME,
    ssl: { rejectUnauthorized: false }, connectionTimeoutMillis: 20000,
  });
  await c.connect();
  return c;
};

const restaurar = async (c) => {
  if (!fs.existsSync(BACKUP)) {
    console.error('Não há backup para restaurar. Nada foi alterado.');
    process.exit(1);
  }
  const snap = JSON.parse(fs.readFileSync(BACKUP, 'utf8'));
  console.log(`Restaurando snapshot de ${snap.gerado_em} (schema ${snap.schema})...`);
  await c.query('BEGIN');
  try {
    for (const r of snap.contratos) {
      await c.query(`UPDATE "${snap.schema}".contratos SET vigencia_fim = $1, updated_at = NOW()
                     WHERE numero_contrato = $2`, [r.vigencia_fim, r.numero_contrato]);
    }
    for (const r of snap.itens) {
      await c.query(`UPDATE "${snap.schema}".almoxarifado_itens SET estoque_minimo = $1, updated_at = NOW()
                     WHERE codigo = $2`, [r.estoque_minimo, r.codigo]);
    }
    const del = await c.query(`DELETE FROM "${snap.schema}".tes_receitas WHERE observacao = $1`, [MARCADOR]);
    await c.query('COMMIT');
    if (del.rowCount) console.log(`  ${del.rowCount} receitas de demonstração removidas.`);
    fs.unlinkSync(BACKUP);
    console.log(`Restaurado: ${snap.contratos.length} contratos e ${snap.itens.length} itens voltaram ao valor original.`);
    console.log('Backup consumido e removido.');
  } catch (e) {
    await c.query('ROLLBACK');
    throw e;
  }
};

const main = async () => {
  if (SCHEMA !== SCHEMA_PERMITIDO) {
    console.error(`ABORTADO: este script só opera em "${SCHEMA_PERMITIDO}" (recebido: "${SCHEMA}").`);
    console.error('Ele existe para preparar a massa de DEMONSTRAÇÃO. Nunca aponte para um município real.');
    process.exit(1);
  }

  const c = await conectar();
  try {
    // Confirmação extra: o schema precisa ser o do município fictício "Modelo".
    const t = await c.query(`SELECT nome_municipio FROM public.clientes WHERE schema = $1`, [SCHEMA]);
    const nome = t.rows[0]?.nome_municipio || '';
    if (!/modelo/i.test(nome)) {
      console.error(`ABORTADO: o schema "${SCHEMA}" pertence a "${nome}", que não é o município de demonstração.`);
      process.exit(1);
    }
    console.log(`Alvo: ${nome} (${SCHEMA})\n`);

    if (RESTAURAR) return await restaurar(c);

    // ── Lê o estado atual (para o snapshot e para o relatório) ────────────────
    const numeros = CONTRATOS_TENSAO.map(x => x[0]);
    const codigos = ITENS_TENSAO.map(x => x[0]);

    const atuaisCtr = (await c.query(
      `SELECT numero_contrato, vigencia_fim, objeto, valor FROM "${SCHEMA}".contratos
       WHERE numero_contrato = ANY($1)`, [numeros])).rows;
    const atuaisIt = (await c.query(
      `SELECT codigo, nome, estoque_atual, estoque_minimo FROM "${SCHEMA}".almoxarifado_itens
       WHERE codigo = ANY($1)`, [codigos])).rows;

    const faltandoCtr = numeros.filter(n => !atuaisCtr.find(r => r.numero_contrato === n));
    const faltandoIt  = codigos.filter(n => !atuaisIt.find(r => r.codigo === n));
    if (faltandoCtr.length) console.warn(`AVISO: contratos não encontrados e ignorados: ${faltandoCtr.join(', ')}`);
    if (faltandoIt.length)  console.warn(`AVISO: itens não encontrados e ignorados: ${faltandoIt.join(', ')}`);

    const hoje = new Date();
    const emDias = (n) => {
      const d = new Date(hoje); d.setDate(d.getDate() + n);
      return d.toISOString().slice(0, 10);
    };

    // ── Relatório do que será feito ──────────────────────────────────────────
    console.log('CONTRATOS — nova vigência:');
    for (const [num, dias, motivo] of CONTRATOS_TENSAO) {
      const at = atuaisCtr.find(r => r.numero_contrato === num);
      if (!at) continue;
      console.log(`  ${num}  ${String(at.vigencia_fim).slice(0, 10)} → ${emDias(dias)}   ${motivo}`);
    }
    // ── Receitas que faltam na conta movimento ───────────────────────────────
    const conta = (await c.query(
      `SELECT id FROM "${SCHEMA}".contas_bancarias WHERE nome = $1`, [CONTA_MOVIMENTO])).rows[0];
    const jaLancadas = conta
      ? parseInt((await c.query(
          `SELECT COUNT(*)::int n FROM "${SCHEMA}".tes_receitas WHERE observacao = $1`, [MARCADOR])).rows[0].n, 10)
      : 0;

    console.log('\nTESOURARIA — receitas da conta movimento:');
    if (!conta) {
      console.warn(`  AVISO: conta "${CONTA_MOVIMENTO}" não encontrada — etapa ignorada.`);
    } else if (jaLancadas > 0) {
      console.log(`  ${jaLancadas} receitas de demonstração já lançadas — nada a fazer (idempotente).`);
    } else {
      const total = RECEITAS_COMPLEMENTO.reduce((s, r) => s + r[3], 0);
      console.log(`  ${RECEITAS_COMPLEMENTO.length} lançamentos, somando R$ ${total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`);
      console.log('  (sem isso, a conta principal aparece com saldo NEGATIVO no relatório)');
    }

    console.log('\nALMOXARIFADO — novo estoque mínimo (faz o alerta acender):');
    for (const [cod, min, desc] of ITENS_TENSAO) {
      const at = atuaisIt.find(r => r.codigo === cod);
      if (!at) continue;
      console.log(`  ${cod}  mínimo ${at.estoque_minimo} → ${min}  (saldo atual: ${at.estoque_atual})   ${desc}`);
    }

    if (!APLICAR) {
      console.log('\n──────────────────────────────────────────────');
      console.log('MODO SIMULAÇÃO — nada foi gravado.');
      console.log('Para aplicar de verdade:  npm run demo:tensao');
      console.log('──────────────────────────────────────────────');
      return;
    }

    // ── Snapshot antes de escrever ───────────────────────────────────────────
    if (!fs.existsSync(BACKUP)) {
      fs.writeFileSync(BACKUP, JSON.stringify({
        gerado_em: new Date().toISOString(),
        schema: SCHEMA,
        contratos: atuaisCtr.map(r => ({
          numero_contrato: r.numero_contrato,
          vigencia_fim: r.vigencia_fim ? String(r.vigencia_fim).slice(0, 10) : null,
        })),
        itens: atuaisIt.map(r => ({ codigo: r.codigo, estoque_minimo: r.estoque_minimo })),
      }, null, 2));
      console.log(`\nSnapshot dos valores originais gravado em ${path.basename(BACKUP)}`);
    } else {
      console.log(`\nSnapshot já existe (${path.basename(BACKUP)}) — preservado, para não perder os valores originais.`);
    }

    // ── Aplica ───────────────────────────────────────────────────────────────
    await c.query('BEGIN');
    try {
      let nCtr = 0, nIt = 0;
      for (const [num, dias] of CONTRATOS_TENSAO) {
        const r = await c.query(
          `UPDATE "${SCHEMA}".contratos SET vigencia_fim = $1, status = 'ATIVO', updated_at = NOW()
           WHERE numero_contrato = $2`, [emDias(dias), num]);
        nCtr += r.rowCount;
      }
      for (const [cod, min] of ITENS_TENSAO) {
        const r = await c.query(
          `UPDATE "${SCHEMA}".almoxarifado_itens SET estoque_minimo = $1, updated_at = NOW()
           WHERE codigo = $2`, [min, cod]);
        nIt += r.rowCount;
      }
      let nRec = 0;
      if (conta && jaLancadas === 0) {
        for (const [mes, dia, descricao, valor] of RECEITAS_COMPLEMENTO) {
          const data = `2026-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
          await c.query(
            `INSERT INTO "${SCHEMA}".tes_receitas
               (id, conta_id, data, descricao, valor, observacao, created_at, updated_at)
             VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, NOW(), NOW())`,
            [conta.id, data, descricao, valor, MARCADOR]);
          nRec++;
        }
      }
      await c.query('COMMIT');
      console.log(`\nAplicado: ${nCtr} contratos, ${nIt} itens e ${nRec} receitas.`);
    } catch (e) {
      await c.query('ROLLBACK');
      throw e;
    }

    // ── Confere o resultado ──────────────────────────────────────────────────
    const conf = await c.query(`
      SELECT CASE
        WHEN vigencia_fim IS NULL THEN 'sem data'
        WHEN vigencia_fim < CURRENT_DATE THEN '1. EXPIRADO'
        WHEN vigencia_fim <= CURRENT_DATE + 30 THEN '2. vence em ate 30d'
        WHEN vigencia_fim <= CURRENT_DATE + 90 THEN '3. vence em 31-90d'
        ELSE '4. vigente' END faixa,
        COUNT(*)::int n, SUM(valor)::numeric(15,2) valor
      FROM "${SCHEMA}".contratos WHERE status = 'ATIVO' GROUP BY 1 ORDER BY 1`);
    console.log('\nPainel de Contratos ficará assim:');
    conf.rows.forEach(r => console.log(`  ${r.faixa.padEnd(22)} ${String(r.n).padStart(3)} contratos   R$ ${Number(r.valor).toLocaleString('pt-BR')}`));

    const crit = await c.query(`SELECT COUNT(*)::int n FROM "${SCHEMA}".almoxarifado_itens
      WHERE ativo AND estoque_minimo > 0 AND estoque_atual <= estoque_minimo`);
    console.log(`\nItens em estoque crítico: ${crit.rows[0].n}`);

    if (conta) {
      // Mesma conta que a tela faz: o extrato soma despesas avulsas E DIDs pagos
      // por esta conta. Ignorar os DIDs daria um saldo otimista e enganaria a conferência.
      const s = await c.query(`
        SELECT COALESCE((SELECT SUM(valor)       FROM "${SCHEMA}".tes_receitas WHERE conta_id = $1), 0)
             - COALESCE((SELECT SUM(valor_bruto) FROM "${SCHEMA}".tes_despesas WHERE conta_id = $1), 0)
             - COALESCE((SELECT SUM(valor_bruto) FROM "${SCHEMA}".dids
                          WHERE conta_pagamento_id = $1 AND pago = 'sim'), 0) AS saldo`,
        [conta.id]);
      const saldo = Number(s.rows[0].saldo);
      console.log(`Saldo da ${CONTA_MOVIMENTO}: R$ ${saldo.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` +
        (saldo < 0 ? '   ← ATENÇÃO: ainda negativo, não mostre esta tela' : ''));
    }
    console.log('\nPara desfazer:  npm run demo:tensao:desfazer');
  } finally {
    await c.end().catch(() => {});
  }
};

main().catch(err => { console.error('ERRO:', err.message); process.exit(1); });
