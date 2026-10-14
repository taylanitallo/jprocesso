// Fase 2 do seed de demonstração — feita pelos serviços do próprio sistema,
// depois que a fase 1 gravou organização, contratos, processos e DIDs:
//   1. Fluxos do DID do município (Contas Fixas v2 com etapa personalizada)
//   2. Assinaturas eletrônicas dos atos (encadeadas, com a data de cada ato)
//   3. Aplicativo autenticador já cadastrado nos usuários (um segredo comum)
//   4. Anexos em PDF nos processos (storage do sistema)
//   5. Lixeira: alguns registros excluídos, para mostrar "Excluídos" e "Restaurar"
//   6. Grupos de contas da Tesouraria, licitações e vigências de contratos
const path = require('path');
const crypto = require('crypto');
const { Op } = require('sequelize');
const { PDFDocument, StandardFonts, rgb } = require('pdf-lib');

const SERVER = path.join(__dirname, '../..');
const db = require(path.join(SERVER, 'config/database'));
const initModels = require(path.join(SERVER, 'models'));
const Tenant = require(path.join(SERVER, 'models/Tenant'));
const assinatura = require(path.join(SERVER, 'services/assinaturaService'));
const lixeira = require(path.join(SERVER, 'services/lixeiraService'));
const storage = require(path.join(SERVER, 'services/storageService'));
const fluxos = require('./fluxos');

const DIA = 86400000;
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/126 Safari/537.36';
// Segredo do autenticador comum a todos os usuários de demonstração (igual no DEV
// e em produção): um único cadastro no celular assina por qualquer usuário.
const SEGREDO_TOTP = assinatura.base32Encode(crypto.createHash('sha1').update('jprocesso|demonstracao|modelo').digest());

const iso = (d) => new Date(d).toISOString();
const diasAtras = (n, h = 10) => { const d = new Date(Date.now() - n * DIA); d.setUTCHours(h + 3, 15, 0, 0); return d; };
const dataSo = (d) => new Date(d).toISOString().slice(0, 10);

// ── PDF de demonstração ──────────────────────────────────────────────────────
async function gerarPdf({ titulo, subtitulo, linhas }) {
  const pdf = await PDFDocument.create();
  const fonte = await pdf.embedFont(StandardFonts.Helvetica);
  const negrito = await pdf.embedFont(StandardFonts.HelveticaBold);
  // Só caracteres que a fonte padrão codifica (WinAnsi)
  const limpo = (s) => String(s ?? '').replace(/[^\x20-\x7E\xA0-\xFF–—‘’“”•…ºª]/g, '-');
  const page = pdf.addPage([595, 842]);
  let y = 790;
  const escrever = (txt, { f = fonte, tam = 10, cor = rgb(0.1, 0.1, 0.12), x = 56 } = {}) => {
    const palavras = limpo(txt).split(/\s+/);
    let linha = '';
    const flush = () => { if (linha) { page.drawText(linha, { x, y, size: tam, font: f, color: cor }); y -= tam + 5; linha = ''; } };
    for (const p of palavras) {
      const tentativa = linha ? `${linha} ${p}` : p;
      if (f.widthOfTextAtSize(tentativa, tam) > 595 - x - 56) { flush(); linha = p; } else linha = tentativa;
    }
    flush();
  };
  escrever('PREFEITURA MUNICIPAL DE MODELO', { f: negrito, tam: 13 });
  escrever('Documento de demonstração do jProcesso — dados fictícios', { tam: 8, cor: rgb(0.45, 0.45, 0.5) });
  page.drawLine({ start: { x: 56, y: y + 2 }, end: { x: 539, y: y + 2 }, thickness: 0.6, color: rgb(0.7, 0.7, 0.75) });
  y -= 18;
  escrever(titulo, { f: negrito, tam: 14 });
  if (subtitulo) escrever(subtitulo, { tam: 10, cor: rgb(0.35, 0.35, 0.4) });
  y -= 8;
  for (const l of linhas) {
    if (l === '') { y -= 8; continue; }
    for (const parte of String(l).split('\n')) { if (parte.trim()) escrever(parte); else y -= 8; }
  }
  page.drawText(limpo('Documento fictício gerado para demonstração. Sem valor legal.'), { x: 56, y: 40, size: 7, font: fonte, color: rgb(0.5, 0.5, 0.55) });
  return Buffer.from(await pdf.save());
}

// O banco remoto às vezes derruba a conexão no meio de centenas de operações:
// repete a operação (o pool reabre a conexão) antes de desistir
async function comRetentativa(fn, tentativas = 5) {
  for (let i = 1; ; i++) {
    try { return await fn(); } catch (e) {
      const transitorio = /terminated|ECONNRESET|ETIMEDOUT|Connection|socket/i.test(`${e.message} ${e.parent?.message || ''}`);
      if (!transitorio || i >= tentativas) throw e;
      console.log(`  conexão caiu (${e.parent?.message || e.message}); tentativa ${i + 1}...`);
      await new Promise(r => setTimeout(r, 2000 * i));
    }
  }
}

const moeda = (v) => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const dataBR = (d) => (d ? dataSo(d).split('-').reverse().join('/') : '');

async function apagarArquivos(urls) {
  for (const u of urls) {
    if (!u || storage.isLocalPath(u)) continue;
    try { await storage.deleteDocumento(u); } catch (_) { /* já ausente */ }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
async function executar({ schema, ctx }) {
  const tenantDb = await db.getTenantConnection(schema);
  const m = db.getCachedModels(schema, initModels);
  const tenant = await Tenant.findOne({ where: { schema } });
  if (!tenant) throw new Error(`Tenant ${schema} não encontrado`);
  const resumo = {};
  const admin = await m.User.findOne({ where: { tipo: 'admin' } });
  const reqAdmin = { models: m, tenantDb, tenant, user: { id: admin.id, nome: admin.nome, tipo: 'admin' }, headers: { 'user-agent': UA }, ip: '45.170.18.44' };

  const usuarios = await m.User.findAll({ attributes: ['id', 'nome', 'cpf', 'cargo', 'portaria_nomeacao', 'tipo', 'setorId', 'secretariaId'] });
  const userPorId = new Map(usuarios.map(u => [u.id, u]));

  // ── 1. Fluxos do DID do município ─────────────────────────────────────────
  const dids = await m.Did.findAll({ include: [{ model: m.Processo, as: 'processo', attributes: ['id', 'numero', 'data_abertura', 'status'] }] });
  const abertura = (d) => new Date(d.processo?.data_abertura || d.created_at).getTime();
  const v2 = dids.filter(d => d.fluxo?.tipo === 'fixas' && d.fluxo?.versao === 2);
  const quandoV2 = new Date(Math.min(...v2.map(abertura)) - 3 * DIA);
  const quandoV1 = new Date(Math.min(...dids.map(abertura)) - 5 * DIA);
  const autor = { id: admin.id, nome: admin.nome };
  const confFluxo = (tipo, versao, quando) => ({ versao, atualizado_em: iso(quando), atualizado_por: autor, etapas: fluxos.fotoDoFluxo(ctx, tipo, versao).etapas });
  const conf = { ...(tenant.configuracoes || {}) };
  delete conf.did_etapas;
  conf.did_fluxos = { fixas: confFluxo('fixas', 2, quandoV2), variaveis: confFluxo('variaveis', 1, quandoV1) };
  conf.did_fluxos_historico = {
    fixas: [{ ...confFluxo('fixas', 1, quandoV1), substituida_em: iso(quandoV2), substituida_por: autor }],
    variaveis: [],
  };
  // seed_demo_tensao.js desloca as receitas dele com o mesmo número de dias
  conf.demo = { gerado_em: iso(new Date()), deslocamento_dias: ctx.deslocamento?.dias || 0 };
  await tenant.update({ configuracoes: conf });
  resumo.fluxos = `Contas Fixas v2 (com "${fluxos.PARECER.nome}") e Contas Variáveis v1`;

  // ── 2. Assinaturas eletrônicas ────────────────────────────────────────────
  // Todos os atos dos DIDs e os dos processos abertos nos últimos 75 dias
  // (a assinatura na tramitação é recente: processos antigos ficam sem).
  const limite = new Date(Date.now() - 75 * DIA);
  const procsDid = new Set(dids.map(d => d.processo_id));
  const processos = await m.Processo.findAll({ attributes: ['id', 'numero', 'assunto', 'data_abertura'] });
  const procAlvo = processos.filter(p => procsDid.has(p.id) || new Date(p.data_abertura) >= limite);
  // Mesmo fundamento que a tramitação usa: lei municipal que regulamenta a assinatura
  const [leis] = await db.masterDb.query(
    `SELECT titulo FROM public.legislacoes WHERE tenant_id = :tid AND regulamenta_assinatura AND ativo
      ORDER BY data_publicacao DESC NULLS LAST, criado_em DESC LIMIT 1`, { replacements: { tid: tenant.id } }).catch(() => [[]]);
  const fundamento = leis[0]?.titulo || null;
  const assinPorTram = new Map();
  let nAss = 0;
  for (const processo of procAlvo) {
    const trs = await m.Tramitacao.findAll({ where: { processo_id: processo.id }, order: [['data_hora', 'ASC'], ['created_at', 'ASC']] });
    for (const tr of trs) {
      const signatario = userPorId.get(tr.origem_usuario_id);
      if (!signatario) continue;
      const row = await comRetentativa(async () => {
        // Queda de conexão depois do INSERT: a assinatura já existe, não duplica
        const [ja] = await tenantDb.query(
          `SELECT codigo_verificador, codigo_crc, hash_conteudo FROM assinaturas_eletronicas WHERE tramitacao_id = :t LIMIT 1`,
          { replacements: { t: tr.id }, type: 'SELECT' });
        return ja || assinatura.assinarAto({
          db: tenantDb, masterDb: db.masterDb, tenant, processo, tramitacao: tr, signatario,
          req: { headers: { 'user-agent': UA }, ip: tr.ip_origem }, fundamentoMunicipal: fundamento, assinadoEm: tr.data_hora,
        });
      });
      await comRetentativa(() => tr.update({ assinatura_digital: row.hash_conteudo }));
      assinPorTram.set(tr.id, { codigo_verificador: row.codigo_verificador, codigo_crc: row.codigo_crc, em: tr.data_hora });
      nAss += 1;
    }
  }
  // Registros das etapas do DID recebem o código da assinatura e a hora real do ato
  for (const did of dids) {
    const etapas = { ...(did.etapas || {}) };
    for (const [id, reg] of Object.entries(etapas)) {
      const a = reg.tramitacao_id && assinPorTram.get(reg.tramitacao_id);
      const novo = { ...reg };
      if (a) Object.assign(novo, { assinatura: { codigo_verificador: a.codigo_verificador, codigo_crc: a.codigo_crc }, concluida_em: iso(a.em) });
      const ad = reg.devolucao?.tramitacao_id && assinPorTram.get(reg.devolucao.tramitacao_id);
      if (ad) novo.devolucao = { ...reg.devolucao, em: iso(ad.em) };
      etapas[id] = novo;
    }
    await comRetentativa(() => did.update({ etapas }));
  }
  resumo.assinaturas = nAss;

  // ── 3. Aplicativo autenticador (usuários do município, inclusive o administrador) ─
  let nTotp = 0;
  for (const u of usuarios) {
    if (u.tipo === 'jeos') continue; // contas da JEOS são pessoais
    await assinatura.definirTotp(tenantDb, u.id, SEGREDO_TOTP);
    nTotp += 1;
  }
  resumo.totp = { usuarios: nTotp, segredo: SEGREDO_TOTP,
    uri: assinatura.uriOtpAuth({ segredoBase32: SEGREDO_TOTP, conta: 'Demonstração (modelo)', emissor: 'jProcesso' }) };

  // ── 4. Anexos em PDF ──────────────────────────────────────────────────────
  const procs = await m.Processo.findAll({ attributes: ['id', 'numero', 'assunto', 'tipo_processo', 'interessado_nome', 'despacho_doc', 'data_abertura', 'criado_por_id', 'status'] });
  const didPorProc = new Map(dids.map(d => [d.processo_id, d]));
  let nAnexos = 0;
  const anexar = async (proc, nome, conteudo, { horas = 1, por = proc.criado_por_id, descricao = null } = {}) => {
    const buffer = await gerarPdf(conteudo);
    const nomeSistema = `${crypto.randomBytes(16).toString('hex')}.pdf`;
    const caminho = `${schema}/${proc.id}/${nomeSistema}`;
    await comRetentativa(() => storage.uploadDocumento({ buffer, path: caminho, contentType: 'application/pdf' }));
    const quando = new Date(new Date(proc.data_abertura).getTime() + horas * 3600000);
    const ordem = nAnexosProc(proc.id);
    await comRetentativa(() => m.Documento.create({
      processo_id: proc.id, nome_sistema: nomeSistema, nome_arquivo: nome, tipo_mime: 'application/pdf',
      tamanho_bytes: buffer.length, url_arquivo: caminho,
      hash_md5: crypto.createHash('md5').update(buffer).digest('hex'),
      hash_sha256: crypto.createHash('sha256').update(buffer).digest('hex'),
      upload_por_id: por, data_upload: quando, descricao, ordem, tipo_origem: 'upload',
      created_at: quando, updated_at: quando,
    }));
    nAnexos += 1;
  };
  const contAnexos = new Map();
  const nAnexosProc = (id) => { const n = contAnexos.get(id) || 0; contAnexos.set(id, n + 1); return n; };

  for (const proc of procs) {
    const did = didPorProc.get(proc.id);
    if (did) {
      const nf = did.nf_numero || did.nf_sec1 || String(100000 + nAnexos);
      await anexar(proc, `Nota fiscal nº ${nf} – ${did.credor_sec1}.pdf`, {
        titulo: `NOTA FISCAL DE SERVIÇO/VENDA Nº ${nf}`,
        subtitulo: `${did.credor_sec1} — CNPJ ${did.cnpj_cpf_credor_sec1}`,
        linhas: [`Tomador: Prefeitura Municipal de Modelo — ${did.secretaria_sec1}`, `Referência: ${did.objeto}`,
          `Contrato: ${did.contrato_ref || '—'}`, `Valor total: ${moeda(did.valor_did)}`, '', 'Discriminação:',
          ...(did.itens_did || []).map(it => `• ${it.descricao} — ${it.quantidade} × ${moeda(it.valor_unitario)} = ${moeda(it.valor_total)}`)],
      }, { descricao: 'Nota fiscal do credor' });
      await anexar(proc, `Certidões de regularidade – ${did.credor_sec1}.pdf`, {
        titulo: 'CERTIDÕES DE REGULARIDADE FISCAL E TRABALHISTA',
        subtitulo: `${did.credor_sec1} — CNPJ ${did.cnpj_cpf_credor_sec1}`,
        linhas: ['Certidão Negativa de Débitos Federais (RFB/PGFN) — válida', 'Certificado de Regularidade do FGTS (CRF) — ' + (did.cert_sec1_fgts ? 'válido' : 'VENCIDO'),
          'Certidão Negativa de Débitos Trabalhistas (CNDT) — válida', 'Certidão Negativa Estadual (SEFAZ) — válida', 'Certidão Negativa Municipal — válida'],
      }, { horas: 2, descricao: 'Certidões do credor' });
      if (did.pago === 'sim') {
        await anexar(proc, `Comprovante de pagamento – ${did.doc_caixa || did.numero_did}.pdf`, {
          titulo: 'COMPROVANTE DE TRANSFERÊNCIA',
          subtitulo: `${did.banco_pagador || 'Banco do Brasil'} — Ag. ${did.ag_pagador || ''} C/C ${did.cc_pagador || ''}`,
          linhas: [`Favorecido: ${did.credor_sec1}`, `CNPJ/CPF: ${did.cnpj_cpf_credor_sec1}`, `Data do pagamento: ${dataBR(did.data_pagamento)}`,
            `Valor bruto: ${moeda(did.valor_bruto || did.valor_did)}`, `Retenções (ISS/IRRF): ${moeda((+did.desconto_iss || 0) + (+did.desconto_irrf || 0))}`,
            `Documento de caixa: ${did.doc_caixa || '—'}`, `Referência: DID ${did.numero_did}`],
        }, { horas: 24 * 20, por: (usuarios.find(u => u.nome === did.tesouraria_responsavel) || admin).id, descricao: 'Comprovante da Tesouraria' });
      }
      continue;
    }
    if (proc.tipo_processo === 'Despacho' && proc.despacho_doc) {
      const doc = typeof proc.despacho_doc === 'string' ? JSON.parse(proc.despacho_doc) : proc.despacho_doc;
      await anexar(proc, `${proc.assunto.split(' – ')[0]}.pdf`, {
        titulo: proc.assunto.toUpperCase(), subtitulo: doc.para ? `Para: ${doc.para}` : doc.ementa,
        linhas: [doc.texto || '', '', doc.nome_assinante || '', doc.cargo_emissor || ''],
      }, { descricao: 'Documento oficial assinado' });
    } else if (proc.tipo_processo === 'Geral') {
      await anexar(proc, `Requerimento – ${proc.interessado_nome || 'interessado'}.pdf`, {
        titulo: 'REQUERIMENTO', subtitulo: `Requerente: ${proc.interessado_nome || '—'}`,
        linhas: [`Assunto: ${proc.assunto}`, '', 'Venho, respeitosamente, requerer a Vossa Senhoria as providências cabíveis quanto ao assunto acima, conforme documentação em anexo.', '', 'Nestes termos, pede deferimento.'],
      }, { descricao: 'Requerimento do interessado' });
      if (/Alvará|Licenciamento/.test(proc.assunto)) {
        await anexar(proc, 'Planta baixa e memorial descritivo.pdf', {
          titulo: 'MEMORIAL DESCRITIVO', subtitulo: proc.assunto,
          linhas: ['Área do terreno: 300,00 m² — Área construída: 142,50 m²', 'Responsável técnico: Eng. Civil — CREA-CE 000000', 'Taxa de ocupação: 47,5% — Recuos conforme Código de Obras'],
        }, { horas: 2, descricao: 'Projeto técnico' });
      }
    } else if (proc.tipo_processo === 'Pauta') {
      await anexar(proc, `Ata da sessão – ${proc.assunto.split(' – ')[0]}.pdf`, {
        titulo: 'ATA DA SESSÃO PÚBLICA', subtitulo: proc.assunto,
        linhas: ['Aos dias do mês corrente, reuniram-se o(a) Pregoeiro(a) e a Equipe de Apoio para a sessão pública do certame em epígrafe.',
          'Abertas as propostas, procedeu-se à fase de lances e à habilitação do licitante arrematante.', 'Nada mais havendo, lavrou-se a presente ata.'],
      }, { descricao: 'Ata da comissão' });
    }
  }
  resumo.anexos = nAnexos;

  // ── 5. Licitações (antes da lixeira: uma delas será excluída) ─────────────
  const contratos = (await tenantDb.query(`SELECT id, numero_contrato, objeto, modalidade, tipo_objeto, numero_licitacao, valor, secretaria, vigencia_inicio
    FROM contratos ORDER BY id`))[0];
  const tipoObj = (t) => ({ Fornecimento: 'Material', Locação: 'Locação de Imóveis' }[t] || t);
  const agente = ctx.u.compras.nome;
  const linhasLic = [];
  const vistos = new Set();
  for (const c of contratos) {
    if (!c.numero_licitacao || vistos.has(c.numero_licitacao)) continue;
    vistos.add(c.numero_licitacao);
    const ini = new Date(c.vigencia_inicio);
    linhasLic.push({ numero: c.numero_licitacao, modalidade: c.modalidade, tipo: tipoObj(c.tipo_objeto), objeto: c.objeto, secretaria: c.secretaria,
      estimado: Math.round(Number(c.valor) * 1.08 * 100) / 100, homologado: Number(c.valor), status: 'HOMOLOGADA',
      publicacao: new Date(ini - 40 * DIA), abertura: new Date(ini - 25 * DIA), homologacao: new Date(ini - 12 * DIA), rp: /registro de preços/i.test(c.objeto) });
  }
  const extras = [
    ['PE 018/2026', 'Pregão Eletrônico', 'Material', 'Aquisição de kits de fardamento escolar', 'SEDUC', 245000, 'EM ANDAMENTO', 6],
    ['TP 002/2026', 'Tomada de Preços', 'Obra', 'Reforma e modernização do Mercado Público Municipal', 'SEINFRA', 612400, 'PUBLICADA', -9],
    ['PE 019/2026', 'Pregão Eletrônico', 'Material', 'Aquisição de equipamentos odontológicos para as UBS', 'SESAU', 138900, 'SUSPENSA', 12],
    ['PE 020/2026', 'Pregão Eletrônico', 'Material', 'Aquisição de instrumentos musicais para a banda municipal', 'SECULT', 46300, 'DESERTA', 34],
    ['PE 021/2026', 'Pregão Eletrônico', 'Serviço', 'Serviços de dedetização e desratização de prédios públicos', 'SEMAD', 58700, 'FRACASSADA', 41],
    ['CC 002/2026', 'Concorrência', 'Obra', 'Construção de quadra poliesportiva coberta no Distrito de Barra Nova', 'SEJEL', 1180000, 'REVOGADA', 58],
    ['PE 022/2026', 'Pregão Eletrônico', 'Tecnologia da Informação', 'Implantação de sistema de videomonitoramento urbano', 'SEMAD', 389000, 'EM ANDAMENTO', -4],
  ];
  for (const [numero, modalidade, tipo, objeto, sec, estimado, status, diasAbertura] of extras) {
    const abertura = new Date(Date.now() - diasAbertura * DIA);
    linhasLic.push({ numero, modalidade, tipo, objeto, secretaria: sec, estimado, homologado: null, status, rp: false,
      publicacao: new Date(abertura - 15 * DIA), abertura, homologacao: null });
  }
  let procLic = 30;
  for (const l of linhasLic) {
    procLic += 1;
    await tenantDb.query(`INSERT INTO licitacoes (numero_licitacao, numero_processo, modalidade, tipo_objeto, criterio_julgamento, registro_preco, objeto,
        secretaria, agente_contratacao, valor_estimado, valor_homologado, data_publicacao, data_abertura, data_homologacao, link_pncp, observacoes, status, created_at, updated_at)
      VALUES (:numero, :proc, :modalidade, :tipo, :criterio, :rp, :objeto, :sec, :agente, :est, :hom, :pub, :abe, :homd, :link, :obs, :status, :pub, NOW())`, {
      replacements: {
        numero: l.numero, proc: `${String(procLic).padStart(3, '0')}/2026`, modalidade: l.modalidade, tipo: l.tipo,
        criterio: /Inexigibilidade|Dispensa|Credenciamento/.test(l.modalidade) ? null : 'Menor Preço', rp: !!l.rp, objeto: l.objeto,
        sec: l.secretaria, agente, est: l.estimado, hom: l.homologado, pub: dataSo(l.publicacao), abe: dataSo(l.abertura),
        homd: l.homologacao ? dataSo(l.homologacao) : null,
        link: /Pregão|Concorrência|Tomada/.test(l.modalidade) ? `https://pncp.gov.br/app/editais/00000000000100/2026/${procLic}` : null,
        obs: { SUSPENSA: 'Suspensa para análise de impugnação ao edital.', DESERTA: 'Nenhum licitante compareceu à sessão.',
          FRACASSADA: 'Todos os licitantes foram inabilitados.', REVOGADA: 'Revogada por insuficiência de recursos do convênio.' }[l.status] || null,
        status: l.status,
      },
    });
  }
  resumo.licitacoes = linhasLic.length;

  // ── 6. Contratos: encerrado, suspenso, rescindido ─────────────────────────
  // (vencidos e a vencer ficam com seed_demo_tensao.js, relativo ao dia da apresentação)
  const vigencias = [
    [28, -30, 'ENCERRADO', 'Contrato encerrado pelo término da vigência.'],
    [29, 120, 'SUSPENSO', 'Execução suspensa por determinação da Secretaria de Cultura até nova programação de eventos.'],
    [9, 150, 'RESCINDIDO', 'Rescindido amigavelmente a pedido da contratada (art. 138, II, da Lei 14.133/2021).'],
  ];
  for (const [id, dias, status, obs] of vigencias) {
    await tenantDb.query(`UPDATE contratos SET vigencia_fim = :fim, status = :status, observacoes = COALESCE(:obs, observacoes), updated_at = NOW() WHERE id = :id`,
      { replacements: { id, fim: dataSo(new Date(Date.now() + dias * DIA)), status, obs } });
  }
  resumo.contratos = 'encerrado, suspenso e rescindido (vencidos e a vencer: npm run demo:tensao)';

  // ── 7. Grupos de contas da Tesouraria ─────────────────────────────────────
  const contas = await m.ContaBancaria.findAll({ attributes: ['id', 'nome', 'natureza', 'secretaria_id'] });
  const sec = (sigla) => ctx.sec[sigla]?.id;
  const grupos = [
    ['Saúde (FMS)', 'Contas do Fundo Municipal de Saúde', contas.filter(c => c.secretaria_id === sec('SESAU'))],
    ['Educação (FUNDEB / PNAE)', 'Contas da Secretaria de Educação', contas.filter(c => c.secretaria_id === sec('SEDUC'))],
    ['Assistência Social (FMAS)', 'Contas do Fundo Municipal de Assistência Social', contas.filter(c => c.secretaria_id === sec('SEMAS'))],
    ['Folha de pagamento', 'Contas de pessoal e encargos', contas.filter(c => c.natureza === 'pessoal')],
    ['Arrecadação e movimento', 'Contas de receita e movimento livre', contas.filter(c => ['receita', 'custeio'].includes(c.natureza))],
  ].filter(([, , l]) => l.length);
  let nGrupos = 0;
  for (const uKey of ['tesoureiro', 'secfin']) {
    const u = ctx.u[uKey];
    for (const [i, [nome, descricao, lista]] of grupos.entries()) {
      await tenantDb.query(`INSERT INTO tes_grupos_contas (id, usuario_id, nome, descricao, contas_ids, ordem, ativo, created_at, updated_at)
        VALUES (:id, :u, :nome, :desc, CAST(:contas AS JSONB), :ordem, true, NOW(), NOW())`, {
        replacements: { id: crypto.randomUUID(), u: u.id, nome, desc: descricao, contas: JSON.stringify(lista.map(c => c.id)), ordem: i },
      });
      nGrupos += 1;
    }
  }
  resumo.grupos = nGrupos;

  // ── 8. Lixeira ────────────────────────────────────────────────────────────
  // Cópias criadas só para serem excluídas (nada do que está em uso é tocado)
  const excluidos = [];
  const clonar = async (Model, ajustes, where = {}) => {
    const base = await Model.findOne({ where });
    if (!base) return null;
    const dados = base.toJSON();
    for (const k of ['id', 'created_at', 'updated_at', 'createdAt', 'updatedAt', 'deleted_at', 'excluido_em']) delete dados[k];
    return Model.create({ ...dados, ...ajustes });
  };
  const registrarData = async (entidade, registroId, dias) => {
    await m.RegistroExcluido.update({ excluido_em: diasAtras(dias, 11) }, { where: { entidade, registro_id: String(registroId) } });
  };
  const tentar = async (rotulo, fn) => { try { await fn(); excluidos.push(rotulo); } catch (e) { console.log(`  (lixeira: ${rotulo} não excluído — ${e.message.slice(0, 120)})`); } };

  await tentar('licitação', async () => {
    const lic = await m.Licitacao.findOne({ where: { numero_licitacao: 'PE 020/2026' } });
    const copia = await clonar(m.Licitacao, { numero_licitacao: 'PE 020-A/2026', objeto: `${lic.objeto} (cadastro em duplicidade)` }, { id: lic.id });
    await lixeira.registrarExclusao(reqAdmin, 'licitacoes', copia);
    await copia.update({ status: 'EXCLUÍDO' });
    await registrarData('licitacoes', copia.id, 6);
  });
  await tentar('credor', async () => {
    const copia = await clonar(m.Credor, { razao_social: 'Comercial Sertão Distribuidora Ltda (cadastro em duplicidade)', nome_fantasia: 'Sertão Distribuidora', cnpj_cpf: '45.987.123/0001-60' });
    await lixeira.registrarExclusao(reqAdmin, 'credores', copia);
    await copia.update({ status: 'EXCLUÍDO' });
    await registrarData('credores', copia.id, 11);
  });
  await tentar('conta bancária', async () => {
    const copia = await clonar(m.ContaBancaria, { nome: 'Conta Convênio SICONV 889912 (encerrada)', conta: '77.120', conta_digito: '3', natureza: 'convenio' });
    await lixeira.excluir(reqAdmin, 'contas_bancarias', copia);
    await m.ContaBancaria.update({ deleted_at: diasAtras(9) }, { where: { id: copia.id }, paranoid: false });
    await registrarData('contas_bancarias', copia.id, 9);
  });
  await tentar('receita', async () => {
    const copia = await clonar(m.TesReceita, { descricao: 'Repasse FPM – 1º decêndio (lançado em duplicidade)' });
    await lixeira.excluir(reqAdmin, 'receitas', copia);
    await m.TesReceita.update({ deleted_at: diasAtras(3) }, { where: { id: copia.id }, paranoid: false });
    await registrarData('receitas', copia.id, 3);
  });
  await tentar('item do almoxarifado', async () => {
    const copia = await clonar(m.AlmoxarifadoItem, { nome: 'Papel A4 75g (cadastro duplicado)', codigo: `DUP-${Date.now() % 100000}`, estoque_atual: 0 });
    await lixeira.excluir(reqAdmin, 'almox_itens', copia);
    await copia.update({ excluido_em: diasAtras(14) });
    await registrarData('almox_itens', copia.id, 14);
  });
  await tentar('usuário', async () => {
    const base = ctx.u.ti;
    const copia = await clonar(m.User, { nome: 'Rodrigo Alencar Pimentel', nomeReduzido: 'Rodrigo', email: 'rodrigo.pimentel@modelo.ce.gov.br', cpf: '52998224725', cargo: 'Estagiário de TI (contrato encerrado)' }, { id: base.id });
    await lixeira.excluir(reqAdmin, 'usuarios', copia);
    await copia.update({ excluido_em: diasAtras(20) });
    await registrarData('usuarios', copia.id, 20);
  });
  await tentar('processo', async () => {
    const ultimo = await m.Processo.findOne({ order: [['sequencial', 'DESC']] });
    const sequencial = ultimo.sequencial + 1;
    const p = await m.Processo.create({
      numero: `Proc.2026.${String(sequencial).padStart(7, '0')} - SEMAD`, ano: 2026, sequencial,
      assunto: 'Solicitação de material de limpeza (aberto em duplicidade)', descricao: 'Processo aberto por engano em duplicidade.',
      interessado_nome: null, tipo_processo: 'Geral', prioridade: 'baixa', status: 'aberto',
      setor_atual_id: ctx.set.PROTO.id, criado_por_id: ctx.u.protocolo.id, data_abertura: diasAtras(5, 9),
    });
    await lixeira.excluir(reqAdmin, 'processos', p);
    await m.Processo.update({ deleted_at: diasAtras(5, 10) }, { where: { id: p.id }, paranoid: false });
    await registrarData('processos', p.id, 5);
  });
  resumo.lixeira = excluidos;

  resumo.semFuturo = await semEventosNoFuturo(tenantDb);
  return resumo;
}

// Fatos já ocorridos (receita lançada, requisição feita, movimentação de estoque)
// nunca ficam depois de hoje; vigências, validades e previsões continuam no futuro
const EVENTOS = [
  ['tes_receitas', 'data'],
  ['almoxarifado_requisicoes', 'data_solicitacao'],
  ['almoxarifado_movimentacoes', 'data_movimentacao'],
];
async function semEventosNoFuturo(tenantDb) {
  let n = 0;
  for (const [tabela, coluna] of EVENTOS) {
    const [, r] = await tenantDb.query(
      `UPDATE "${tabela}" SET "${coluna}" = "${coluna}" - (date_trunc('day', "${coluna}") - date_trunc('day', now()))
         - make_interval(days => (abs(hashtext(id::text)) % 5) + 1)
       WHERE "${coluna}" > now()`);
    n += r?.rowCount || 0;
  }
  return n;
}

function imprimirResumo(r) {
  if (!r) return;
  console.log('\n════════ FASE 2 ════════');
  console.log(`  Fluxos do DID:       ${r.fluxos}`);
  console.log(`  Assinaturas:         ${r.assinaturas} atos assinados`);
  console.log(`  Anexos em PDF:       ${r.anexos}`);
  console.log(`  Licitações:          ${r.licitacoes}`);
  console.log(`  Contratos:           ${r.contratos}`);
  console.log(`  Grupos de contas:    ${r.grupos}`);
  console.log(`  Lixeira:             ${(r.lixeira || []).join(', ')}`);
  console.log(`  Autenticador:        ${r.totp?.usuarios} usuários com o mesmo segredo`);
  console.log(`    segredo: ${r.totp?.segredo}`);
  console.log(`    ${r.totp?.uri}`);
}

module.exports = { executar, imprimirResumo, apagarArquivos, semEventosNoFuturo, SEGREDO_TOTP };
