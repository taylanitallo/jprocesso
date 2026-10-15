// Importação de contratos (Configurações → Importação de Dados).
// Aceita o formato exportado pelo próprio sistema e planilhas externas,
// como a do portal de transparência (Número, Modalidade, Nome, CPF/CNPJ...).

const TIPOS_CONTRATO  = ['CONTRATO', 'ATA DE REGISTRO DE PREÇO', 'TERMO ADITIVO', 'CONVÊNIO', 'ACORDO', 'OUTRO'];
const STATUS_CONTRATO = ['ATIVO', 'ENCERRADO', 'SUSPENSO', 'RESCINDIDO'];

const semAcento = (s) => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '');

// Cabeçalho → campo do sistema (chave já sem acento, minúscula e só [a-z0-9])
const ALIASES = {
  numero: 'numero_contrato', numerocontrato: 'numero_contrato', contrato: 'numero_contrato', numcontrato: 'numero_contrato',
  numerolicitacao: 'numero_licitacao', numlicitacao: 'numero_licitacao', numeroprocesso: 'numero_licitacao',
  vigenciainicio: 'vigencia_inicio', datainicio: 'vigencia_inicio',
  vigenciafim: 'vigencia_fim', datafim: 'vigencia_fim', datatermino: 'vigencia_fim',
  data: 'data_assinatura', datacontrato: 'data_assinatura', dataassinatura: 'data_assinatura',
  valor: 'valor', valorglobal: 'valor', valortotal: 'valor', valorcontrato: 'valor',
  nome: 'nome_credor', nomecredor: 'nome_credor', credor: 'nome_credor', razaosocial: 'nome_credor',
  fornecedor: 'nome_credor', nomefornecedor: 'nome_credor', contratado: 'nome_credor',
  cpfcnpj: 'cnpj_cpf', cnpjcpf: 'cnpj_cpf', cnpj: 'cnpj_cpf', cpf: 'cnpj_cpf',
  credorid: 'credor_id',
  tipo: 'tipo_contrato', tipocontrato: 'tipo_contrato',
  objeto: 'objeto', descricao: 'objeto', objetocontrato: 'objeto', descricaoobjeto: 'objeto',
  modalidade: 'modalidade', secretaria: 'secretaria',
  status: 'status', situacao: 'status',
  observacoes: 'observacoes', observacao: 'observacoes',
};

const normalizarLinha = (r) => {
  const out = {};
  for (const [k, v] of Object.entries(r)) {
    const key = semAcento(k).toLowerCase().replace(/[^a-z0-9]/g, '');
    const campo = ALIASES[key];
    if (campo && out[campo] === undefined) out[campo] = typeof v === 'string' ? v.trim() : v;
  }
  return out;
};

// dd/mm/aaaa ou aaaa-mm-dd → aaaa-mm-dd (null se inválida)
const parseData = (v) => {
  const s = String(v ?? '').trim();
  let m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  const [a, mes, d] = m ? [m[3], m[2], m[1]] : (s.match(/^(\d{4})-(\d{2})-(\d{2})/) || []).slice(1);
  if (!a) return null;
  const dt = new Date(Date.UTC(+a, +mes - 1, +d));
  if (dt.getUTCMonth() !== +mes - 1) return null;
  return `${a}-${String(mes).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
};

// "13022405,10" / "1.234,56" (BR) ou "5000.00" (export do sistema)
const parseValor = (v) => {
  if (v === null || v === undefined || v === '') return null;
  if (typeof v === 'number') return v;
  const s = String(v).replace(/[^\d,.-]/g, '');
  const n = s.includes(',') ? parseFloat(s.replace(/\./g, '').replace(',', '.')) : parseFloat(s);
  return Number.isFinite(n) ? n : null;
};

// Tipo do instrumento — planilhas externas trazem isso na coluna "Modalidade"
const INSTRUMENTO_RE = /ADITIVO|APOSTILAMENTO|CONTRATO ORIGINAL|ALTERA[CÇ][AÃ]O|RESCIS/;
const mapearTipo = (v) => {
  const u = semAcento(v).toUpperCase();
  if (!u) return null;
  const exato = TIPOS_CONTRATO.find(t => semAcento(t) === u);
  if (exato) return exato;
  if (u.includes('ADITIVO')) return 'TERMO ADITIVO';
  if (/\bATA\b/.test(u)) return 'ATA DE REGISTRO DE PREÇO';
  if (u.includes('CONVENIO')) return 'CONVÊNIO';
  if (u.includes('ACORDO')) return 'ACORDO';
  if (u.includes('CONTRATO')) return 'CONTRATO';
  return 'OUTRO';
};

const soDigitos = (s) => String(s ?? '').replace(/\D/g, '');
const ehMascarado = (s) => /\*/.test(String(s ?? ''));

async function importarContratos(registros, models) {
  const { Contrato, Credor } = models;
  const res = { importados: 0, atualizados: 0, invalidos: 0, credoresCriados: 0, renumerados: [] };

  // Credores existentes: CNPJ/CPF completo casa pelos dígitos; CPF mascarado (***.123.456-**) pelo texto
  const credores = await Credor.findAll({ attributes: ['id', 'cnpj_cpf', 'razao_social'] });
  const credorPorChave = new Map();
  const chaveCredor = (doc) => (ehMascarado(doc) ? `M:${String(doc).trim()}` : `D:${soDigitos(doc)}`);
  for (const c of credores) if (c.cnpj_cpf) credorPorChave.set(chaveCredor(c.cnpj_cpf), c.id);

  // Contratos existentes por número (o número é único no banco)
  const contratos = await Contrato.findAll({ attributes: ['id', 'numero_contrato', 'credor_id'] });
  const contratoPorNumero = new Map(contratos.map(c => [c.numero_contrato, c]));

  const LOTE = 500;
  const linhas = [];
  const credoresNovos = new Map(); // chave → dados do credor a criar

  // 1ª passada: valida e identifica credores que ainda não existem
  for (const raw of registros) {
    const r = normalizarLinha(raw);
    const numero = String(r.numero_contrato || '').trim().slice(0, 50);
    if (!numero) { res.invalidos++; continue; }
    const doc = String(r.cnpj_cpf || '').trim();
    const nomeCredor = String(r.nome_credor || '').trim();
    let chave = null;
    if (!r.credor_id && (soDigitos(doc) || nomeCredor)) {
      chave = soDigitos(doc) ? chaveCredor(doc) : `N:${nomeCredor.toUpperCase()}`;
      if (!credorPorChave.has(chave) && !credoresNovos.has(chave)) {
        const digitos = soDigitos(doc);
        const fisica = ehMascarado(doc) || (digitos.length > 0 && digitos.length <= 11);
        credoresNovos.set(chave, {
          razao_social: (nomeCredor || 'Credor importado').slice(0, 500),
          cnpj_cpf: (doc || nomeCredor).slice(0, 20),
          tipo: fisica ? 'Física' : 'Jurídica',
          status: 'ATIVO',
        });
      }
    }
    linhas.push({ r, numero, chave });
  }

  // Credores novos em lote
  const pendentes = [...credoresNovos.entries()];
  for (let i = 0; i < pendentes.length; i += LOTE) {
    const fatia = pendentes.slice(i, i + LOTE);
    const criados = await Credor.bulkCreate(fatia.map(([, d]) => d));
    criados.forEach((c, j) => credorPorChave.set(fatia[j][0], c.id));
  }
  res.credoresCriados = pendentes.length;

  // 2ª passada: monta os contratos
  const inserir = [];
  const atualizar = new Map(); // id → [instância, dados]
  for (const { r, numero, chave } of linhas) {
    const credorId = r.credor_id ? parseInt(r.credor_id, 10) || null : (chave ? credorPorChave.get(chave) : null);

    // Tipo: coluna própria ou "Modalidade" quando ela descreve o instrumento (aditivo, apostilamento...)
    let tipo = mapearTipo(r.tipo_contrato);
    let modalidade = r.modalidade || null;
    let observacoes = r.observacoes || null;
    if (modalidade && INSTRUMENTO_RE.test(semAcento(modalidade).toUpperCase())) {
      if (!tipo) tipo = mapearTipo(modalidade);
      if (!observacoes) observacoes = `Modalidade na origem: ${modalidade}`;
      modalidade = null;
    }

    const status = STATUS_CONTRATO.includes(semAcento(r.status).toUpperCase())
      ? semAcento(r.status).toUpperCase()
      : 'ATIVO';

    const dados = {
      tipo_contrato: tipo || 'CONTRATO',
      objeto: String(r.objeto || '').trim() || 'Importado',
      modalidade: modalidade ? String(modalidade).slice(0, 100) : null,
      numero_licitacao: r.numero_licitacao ? String(r.numero_licitacao).slice(0, 100) : null,
      credor_id: credorId,
      valor: parseValor(r.valor),
      vigencia_inicio: parseData(r.vigencia_inicio),
      vigencia_fim: parseData(r.vigencia_fim),
      data_assinatura: parseData(r.data_assinatura),
      secretaria: r.secretaria ? String(r.secretaria).slice(0, 200) : null,
      observacoes,
      status,
    };

    // Mesmo número com outro credor (erro de numeração na origem): grava como "número (2)", "(3)"...
    let numeroFinal = numero;
    let existente = contratoPorNumero.get(numero);
    for (let n = 2; existente && credorId && existente.credor_id && existente.credor_id !== credorId; n++) {
      numeroFinal = `${numero} (${n})`.slice(0, 50);
      existente = contratoPorNumero.get(numeroFinal);
    }
    if (numeroFinal !== numero) res.renumerados.push(`${numero} → ${numeroFinal}`);

    if (existente) {
      if (existente.id) atualizar.set(existente.id, [existente, dados]);
      else Object.assign(existente.dados, dados); // repetido no próprio arquivo: vale a última linha
    } else {
      const novo = { numero_contrato: numeroFinal, credor_id: credorId, dados };
      contratoPorNumero.set(numeroFinal, novo);
      inserir.push(novo);
    }
  }

  for (let i = 0; i < inserir.length; i += LOTE) {
    await Contrato.bulkCreate(inserir.slice(i, i + LOTE).map(c => ({ numero_contrato: c.numero_contrato, ...c.dados })));
  }
  const paraAtualizar = [...atualizar.values()];
  for (let i = 0; i < paraAtualizar.length; i += 20) {
    await Promise.all(paraAtualizar.slice(i, i + 20).map(([c, d]) => c.update(d)));
  }
  res.importados = inserir.length;
  res.atualizados = paraAtualizar.length;
  return res;
}

module.exports = { importarContratos, normalizarLinha, parseData, parseValor, mapearTipo };
