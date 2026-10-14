// ─────────────────────────────────────────────────────────────────────────────
//  LIXEIRA — registros excluídos de cada tela
//
//  Excluir no sistema nunca apaga. Cada tela usa um dos modos:
//    status   → o registro ganha status de excluído (módulo Contratos)
//    paranoid → modelo Sequelize paranoid: deleted_at preenchido e o registro some
//               sozinho de todas as consultas feitas pelo modelo
//    marca    → cadastros referenciados no histórico (usuário, secretaria…): excluido_em
//               preenchido + ativo=false; seguem visíveis onde já foram usados
//  A tabela registros_excluidos guarda quem excluiu, quando e o estado anterior.
//  Na tela "Excluídos" quem tem permissão restaura ou apaga de vez.
//
//  Para levar a lixeira a outra tela: (1) a exclusão da tela chama excluir() (ou,
//  no modo status, registrarExclusao + update); (2) cadastrar a entidade abaixo;
//  (3) pôr <BotaoExcluidos entidade="..."> na tela e as ações no permissoesSchema.
// ─────────────────────────────────────────────────────────────────────────────
const { Op } = require('sequelize');
const storage = require('./storageService');

const fmtCnpj = (v) => v || '';

// Bloqueio de restauração: lançar com a mensagem que o usuário vai ler
class RestauracaoBloqueada extends Error {}
const bloquear = (msg) => { throw new RestauracaoBloqueada(msg); };

const apagarArquivo = async (url) => {
  if (!url) return;
  try {
    if (storage.isLocalPath(url)) {
      const fs = require('fs');
      if (fs.existsSync(url)) fs.unlinkSync(url);
    } else {
      await storage.deleteDocumento(url);
    }
  } catch (_) { /* arquivo já ausente não impede apagar o registro */ }
};

// perm: caminho no permissoesSchema (módulo[, aba]); as ações são
//       excluidos (ver) · restaurar · apagar_excluidos
// colunas: o que aparece na tela (tipo: 'data' | 'moeda' | 'datahora' formata no cliente)
// where/include: recorte e dados extras da listagem
// antesDeRestaurar: valida dependências (bloquear('motivo'))
// aoRestaurar / antesDeApagar: cuidam dos registros filhos
const ENTIDADES = {
  // ── Contratos ──────────────────────────────────────────────────────────────
  licitacoes: {
    titulo: 'Licitações', perm: ['contratos', 'licitacoes'],
    model: 'Licitacao', modo: 'status', statusExcluido: ['EXCLUÍDO'], statusPadrao: 'EM ANDAMENTO',
    colunas: [
      { campo: 'numero_licitacao', rotulo: 'Nº licitação' },
      { campo: 'numero_processo',  rotulo: 'Nº processo' },
      { campo: 'modalidade',       rotulo: 'Modalidade' },
      { campo: 'objeto',           rotulo: 'Objeto', largo: true },
      { campo: 'secretaria',       rotulo: 'Secretaria' },
      { campo: 'data_abertura',    rotulo: 'Abertura', tipo: 'data' },
      { campo: 'valor_estimado',   rotulo: 'Valor estimado', tipo: 'moeda' },
    ],
    descricao: (r) => `Licitação ${r.numero_licitacao}`,
  },

  credores: {
    titulo: 'Credores', perm: ['contratos', 'credores'],
    model: 'Credor', modo: 'status', statusExcluido: ['EXCLUÍDO'], statusPadrao: 'ATIVO',
    colunas: [
      { campo: 'tipo',          rotulo: 'Tipo', valor: (r) => (r.tipo === 'Jurídica' ? 'PJ' : 'PF') },
      { campo: 'razao_social',  rotulo: 'Razão social / Nome', largo: true },
      { campo: 'nome_fantasia', rotulo: 'Nome fantasia' },
      { campo: 'cnpj_cpf',      rotulo: 'CNPJ / CPF' },
      { campo: 'cidade',        rotulo: 'Cidade/UF', valor: (r) => (r.cidade ? `${r.cidade}${r.uf ? '/' + r.uf : ''}` : '') },
      { campo: 'telefone',      rotulo: 'Telefone', valor: (r) => r.telefone || r.celular || '' },
    ],
    descricao: (r) => `Credor ${r.razao_social} (${r.cnpj_cpf})`,
  },

  itens: {
    titulo: 'Itens', perm: ['contratos', 'itens'],
    model: 'ContratoItem', modo: 'status', statusExcluido: ['EXCLUÍDO'],
    // Status do item é derivado da categoria (mesma regra de contratosController)
    statusPadrao: (r) => ((r.categoria || '').trim() ? 'ATIVO' : 'INATIVO'),
    colunas: [
      { campo: 'codigo',         rotulo: 'Código' },
      { campo: 'descricao',      rotulo: 'Descrição', largo: true },
      { campo: 'categoria',      rotulo: 'Categoria' },
      { campo: 'unidade_medida', rotulo: 'Unidade' },
      { campo: 'classificacao',  rotulo: 'Classificação' },
      { campo: 'catmat_serv',    rotulo: 'CATMAT/CATSERV' },
    ],
    descricao: (r) => `Item ${r.codigo || ''} ${r.descricao}`.trim(),
  },

  contratos: {
    titulo: 'Contratos', perm: ['contratos', 'contratos'],
    model: 'Contrato', modo: 'status', statusExcluido: ['EXCLUÍDO'], statusPadrao: 'ATIVO',
    include: (m) => [{ model: m.Credor, as: 'credor', attributes: ['razao_social', 'cnpj_cpf', 'status'] }],
    colunas: [
      { campo: 'tipo_contrato',   rotulo: 'Tipo' },
      { campo: 'numero_contrato', rotulo: 'Nº contrato' },
      { campo: 'objeto',          rotulo: 'Objeto', largo: true },
      { campo: 'credor',          rotulo: 'Credor', valor: (r) => r.credor?.razao_social || '' },
      { campo: 'secretaria',      rotulo: 'Secretaria' },
      { campo: 'vigencia_fim',    rotulo: 'Fim da vigência', tipo: 'data' },
      { campo: 'valor',           rotulo: 'Valor', tipo: 'moeda' },
    ],
    descricao: (r) => `Contrato ${r.numero_contrato}`,
    antesDeRestaurar: async (req, r) => {
      if (r.credor?.status === 'EXCLUÍDO') bloquear(`O credor ${r.credor.razao_social} está excluído. Restaure o credor primeiro.`);
    },
    antesDeApagar: (m, r, transaction) =>
      m.ContratoItemVinculo.destroy({ where: { contrato_id: r.id }, transaction }),
  },

  ordens: {
    titulo: 'Ordens de Serviço/Compra', perm: ['contratos', 'ordens'],
    model: 'ContratoOrdem', modo: 'status', statusExcluido: ['EXCLUÍDA'], statusPadrao: 'CANCELADA',
    include: (m) => [{ model: m.Contrato, as: 'contrato', attributes: ['numero_contrato', 'status'] }],
    colunas: [
      { campo: 'numero',       rotulo: 'Número' },
      { campo: 'tipo',         rotulo: 'Tipo', valor: (r) => (r.tipo === 'COMPRA' ? 'Compra' : 'Serviço') },
      { campo: 'contrato',     rotulo: 'Contrato', valor: (r) => r.contrato?.numero_contrato || '' },
      { campo: 'objeto',       rotulo: 'Objeto', largo: true },
      { campo: 'secretaria',   rotulo: 'Secretaria' },
      { campo: 'data_emissao', rotulo: 'Emissão', tipo: 'data' },
      { campo: 'valor_total',  rotulo: 'Valor', tipo: 'moeda' },
    ],
    descricao: (r) => `Ordem ${r.numero}`,
    antesDeRestaurar: async (req, r) => {
      if (!r.contrato) bloquear('O contrato desta ordem não existe mais.');
      if (r.contrato.status === 'EXCLUÍDO') bloquear(`O contrato ${r.contrato.numero_contrato} está excluído. Restaure o contrato primeiro.`);
    },
    antesDeApagar: (m, r, transaction) =>
      m.ContratoOrdemItem.destroy({ where: { ordem_id: r.id }, transaction }),
  },

  // ── Processos ──────────────────────────────────────────────────────────────
  processos: {
    titulo: 'Processos', perm: ['processos'],
    model: 'Processo', modo: 'paranoid',
    include: (m) => [{ model: m.Setor, as: 'setorAtual', attributes: ['nome', 'sigla'] }],
    colunas: [
      { campo: 'numero',           rotulo: 'Número' },
      { campo: 'tipo_processo',    rotulo: 'Tipo' },
      { campo: 'assunto',          rotulo: 'Assunto', largo: true },
      { campo: 'interessado_nome', rotulo: 'Interessado' },
      { campo: 'setor',            rotulo: 'Estava em', valor: (r) => r.setorAtual?.nome || '' },
      { campo: 'data_abertura',    rotulo: 'Abertura', tipo: 'data' },
    ],
    descricao: (r) => `Processo ${r.numero}`,
    // Volta junto o que foi excluído com o processo (mesmo deleted_at)
    aoRestaurar: async (m, r, transaction) => {
      const juntos = { processo_id: r.id, deleted_at: r.deleted_at };
      for (const Model of [m.Tramitacao, m.Documento, m.Did]) {
        await Model.update({ deleted_at: null }, { where: juntos, paranoid: false, transaction });
      }
    },
    antesDeApagar: async (m, r, transaction) => {
      const docs = await m.Documento.findAll({ where: { processo_id: r.id }, paranoid: false, transaction });
      for (const d of docs) await apagarArquivo(d.url_arquivo);
      for (const Model of [m.Documento, m.Tramitacao, m.Did]) {
        await Model.destroy({ where: { processo_id: r.id }, force: true, transaction });
      }
    },
  },

  documentos: {
    titulo: 'Documentos', perm: ['processos'],
    model: 'Documento', modo: 'paranoid',
    // Só os excluídos um a um: os de processo excluído voltam/saem com o processo
    where: () => ({ [Op.or]: [{ processo_id: null }, { '$processo.id$': { [Op.ne]: null } }] }),
    include: (m) => [
      { model: m.Processo, as: 'processo', attributes: ['id', 'numero'], required: false },
      { model: m.User, as: 'uploadPor', attributes: ['nome'], required: false },
    ],
    colunas: [
      { campo: 'nome_arquivo', rotulo: 'Arquivo', largo: true },
      { campo: 'processo',     rotulo: 'Processo', valor: (r) => r.processo?.numero || (r.processo_id ? '' : 'Documento gerado avulso') },
      { campo: 'tipo_origem',  rotulo: 'Origem', valor: (r) => (!r.tipo_origem || r.tipo_origem === 'anexo' ? 'Anexo' : r.tipo_origem) },
      { campo: 'tamanho',      rotulo: 'Tamanho', valor: (r) => (r.tamanho_bytes ? `${(r.tamanho_bytes / 1024).toFixed(1)} KB` : '') },
      { campo: 'enviado_por',  rotulo: 'Enviado por', valor: (r) => r.uploadPor?.nome || '' },
      { campo: 'data_upload',  rotulo: 'Enviado em', tipo: 'data' },
    ],
    descricao: (r) => `Documento ${r.nome_arquivo}`,
    antesDeApagar: (m, r) => apagarArquivo(r.url_arquivo),
  },

  // ── Organização ────────────────────────────────────────────────────────────
  secretarias: {
    titulo: 'Secretarias', perm: ['organizacao', 'secretarias'],
    model: 'Secretaria', modo: 'marca',
    colunas: [
      { campo: 'sigla',        rotulo: 'Sigla' },
      { campo: 'nome',         rotulo: 'Nome', largo: true },
      { campo: 'cnpj',         rotulo: 'CNPJ', valor: (r) => fmtCnpj(r.cnpj) },
      { campo: 'email',        rotulo: 'E-mail' },
    ],
    descricao: (r) => `Secretaria ${r.sigla ? r.sigla + ' — ' : ''}${r.nome}`,
  },

  setores: {
    titulo: 'Setores', perm: ['organizacao', 'secretarias'],
    model: 'Setor', modo: 'marca',
    include: (m) => [{ model: m.Secretaria, as: 'secretaria', attributes: ['nome', 'sigla', 'excluido_em'] }],
    colunas: [
      { campo: 'sigla',      rotulo: 'Sigla' },
      { campo: 'nome',       rotulo: 'Nome', largo: true },
      { campo: 'secretaria', rotulo: 'Secretaria', valor: (r) => r.secretaria?.nome || '' },
    ],
    descricao: (r) => `Setor ${r.sigla ? r.sigla + ' — ' : ''}${r.nome}`,
    antesDeRestaurar: async (req, r) => {
      if (r.secretaria?.excluido_em) bloquear(`A secretaria ${r.secretaria.nome} está excluída. Restaure a secretaria primeiro.`);
    },
  },

  agentes: {
    titulo: 'Agentes', perm: ['organizacao', 'agentes'],
    model: 'Agente', modo: 'marca',
    include: (m) => [{ model: m.Secretaria, as: 'secretaria', attributes: ['nome'] }],
    colunas: [
      { campo: 'nome',       rotulo: 'Nome', largo: true },
      { campo: 'cargo',      rotulo: 'Cargo' },
      { campo: 'matricula',  rotulo: 'Matrícula' },
      { campo: 'cpf',        rotulo: 'CPF' },
      { campo: 'secretaria', rotulo: 'Secretaria', valor: (r) => r.secretaria?.nome || '' },
    ],
    descricao: (r) => `Agente ${r.nome}`,
  },

  usuarios: {
    titulo: 'Usuários', perm: ['organizacao', 'usuarios'],
    model: 'User', modo: 'marca',
    include: (m) => [{ model: m.Secretaria, as: 'secretaria', attributes: ['nome', 'sigla'] }],
    // Senha e permissões nunca saem do servidor
    atributos: ['id', 'nome', 'cpf', 'email', 'tipo', 'ativo', 'excluido_em', 'secretariaId'],
    colunas: [
      { campo: 'nome',       rotulo: 'Nome', largo: true },
      { campo: 'cpf',        rotulo: 'CPF' },
      { campo: 'email',      rotulo: 'E-mail' },
      { campo: 'tipo',       rotulo: 'Perfil', valor: (r) => ({ admin: 'Administrador', gestor: 'Gestor', operacional: 'Operacional', jeos: 'Administrador Jeos' }[r.tipo] || r.tipo) },
      { campo: 'secretaria', rotulo: 'Secretaria', valor: (r) => r.secretaria?.sigla || r.secretaria?.nome || '' },
    ],
    descricao: (r) => `Usuário ${r.nome}`,
  },

  // ── Almoxarifado ───────────────────────────────────────────────────────────
  almox_itens: {
    titulo: 'Itens do almoxarifado', perm: ['almoxarifado', 'estoque'],
    model: 'AlmoxarifadoItem', modo: 'marca',
    colunas: [
      { campo: 'codigo',        rotulo: 'Código' },
      { campo: 'nome',          rotulo: 'Nome', largo: true },
      { campo: 'categoria',     rotulo: 'Categoria' },
      { campo: 'unidade',       rotulo: 'Unidade' },
      { campo: 'estoque_atual', rotulo: 'Estoque' },
    ],
    descricao: (r) => `Item ${r.codigo ? r.codigo + ' — ' : ''}${r.nome}`,
  },

  almox_cotas: {
    titulo: 'Solicitações (cotas)', perm: ['almoxarifado', 'cotas'],
    model: 'AlmoxCota', modo: 'marca',
    include: (m) => [
      { model: m.Setor, as: 'setor', attributes: ['nome'] },
      { model: m.AlmoxarifadoItem, as: 'item', attributes: ['codigo', 'nome', 'excluido_em'] },
    ],
    colunas: [
      { campo: 'setor',           rotulo: 'Setor', valor: (r) => r.setor?.nome || '' },
      { campo: 'item',            rotulo: 'Item', largo: true, valor: (r) => r.item?.nome || '' },
      { campo: 'mes_ano',         rotulo: 'Mês/Ano' },
      { campo: 'quantidade_cota', rotulo: 'Cota' },
    ],
    descricao: (r) => `Cota ${r.mes_ano} — ${r.item?.nome || 'item'} (${r.setor?.nome || 'setor'})`,
    antesDeRestaurar: async (req, r) => {
      if (r.item?.excluido_em) bloquear(`O item ${r.item.nome} está excluído. Restaure o item primeiro.`);
    },
  },

  almox_inventarios: {
    titulo: 'Inventários', perm: ['almoxarifado', 'inventario'],
    model: 'AlmoxInventario', modo: 'paranoid',
    include: (m) => [{ model: m.User, as: 'responsavel', attributes: ['nome'] }],
    colunas: [
      { campo: 'numero',      rotulo: 'Número' },
      { campo: 'status',      rotulo: 'Situação' },
      { campo: 'data_inicio', rotulo: 'Início', tipo: 'data' },
      { campo: 'responsavel', rotulo: 'Responsável', valor: (r) => r.responsavel?.nome || '' },
      { campo: 'total_itens', rotulo: 'Itens' },
      { campo: 'observacao',  rotulo: 'Observação', largo: true },
    ],
    descricao: (r) => `Inventário ${r.numero}`,
    antesDeApagar: (m, r, transaction) =>
      m.AlmoxInventarioItem.destroy({ where: { inventario_id: r.id }, transaction }),
  },

  // ── Tesouraria ─────────────────────────────────────────────────────────────
  contas_bancarias: {
    titulo: 'Contas bancárias', perm: ['tesouraria', 'contas'],
    model: 'ContaBancaria', modo: 'paranoid',
    include: (m) => [{ model: m.Secretaria, as: 'secretaria', attributes: ['nome', 'sigla'] }],
    colunas: [
      { campo: 'nome',       rotulo: 'Nome', largo: true },
      { campo: 'banco_nome', rotulo: 'Banco' },
      { campo: 'agencia',    rotulo: 'Agência', valor: (r) => [r.agencia, r.agencia_digito].filter(Boolean).join('-') },
      { campo: 'conta',      rotulo: 'Conta', valor: (r) => [r.conta, r.conta_digito].filter(Boolean).join('-') },
      { campo: 'secretaria', rotulo: 'Secretaria', valor: (r) => r.secretaria?.sigla || r.secretaria?.nome || '' },
    ],
    descricao: (r) => `Conta ${r.nome}`,
  },

  receitas: {
    titulo: 'Receitas', perm: ['tesouraria', 'receitas'],
    model: 'TesReceita', modo: 'paranoid',
    include: (m) => [{ model: m.ContaBancaria, as: 'conta', attributes: ['nome'], paranoid: false }],
    colunas: [
      { campo: 'data',      rotulo: 'Data', tipo: 'data' },
      { campo: 'descricao', rotulo: 'Descrição', largo: true },
      { campo: 'conta',     rotulo: 'Conta', valor: (r) => r.conta?.nome || '' },
      { campo: 'valor',     rotulo: 'Valor', tipo: 'moeda' },
    ],
    descricao: (r) => `Receita ${r.descricao || ''} (${r.data || ''})`.trim(),
    antesDeRestaurar: async (req, r) => {
      if (r.conta_id && !(await req.models.ContaBancaria.findByPk(r.conta_id))) {
        bloquear('A conta bancária desta receita está excluída. Restaure a conta primeiro.');
      }
    },
  },

  pagamentos: {
    titulo: 'Pagamentos estornados', perm: ['tesouraria', 'despesas'],
    model: 'TesDespesa', modo: 'paranoid',
    include: (m) => [
      { model: m.ContaBancaria, as: 'conta', attributes: ['nome'], paranoid: false },
      { model: m.ContratoOrdem, as: 'ordem', attributes: ['numero', 'objeto'] },
    ],
    colunas: [
      { campo: 'ordem',          rotulo: 'Ordem', valor: (r) => r.ordem?.numero || '' },
      { campo: 'objeto',         rotulo: 'Objeto', largo: true, valor: (r) => r.ordem?.objeto || '' },
      { campo: 'data_pagamento', rotulo: 'Pago em', tipo: 'data' },
      { campo: 'conta',          rotulo: 'Conta', valor: (r) => r.conta?.nome || '' },
      { campo: 'valor_bruto',    rotulo: 'Valor bruto', tipo: 'moeda' },
      { campo: 'valor_liquido',  rotulo: 'Valor líquido', tipo: 'moeda' },
    ],
    descricao: (r) => `Pagamento da ordem ${r.ordem?.numero || r.ordem_id || ''}`.trim(),
    antesDeRestaurar: async (req, r) => {
      const { TesDespesa, ContaBancaria } = req.models;
      if (r.conta_id && !(await ContaBancaria.findByPk(r.conta_id))) {
        bloquear('A conta bancária deste pagamento está excluída. Restaure a conta primeiro.');
      }
      if (r.ordem_id && (await TesDespesa.count({ where: { ordem_id: r.ordem_id } })) > 0) {
        bloquear('Esta ordem já tem outro pagamento registrado.');
      }
    },
  },
};

const ACOES = { ver: 'excluidos', restaurar: 'restaurar', apagar: 'apagar_excluidos' };

// Admin e Administrador Jeos sempre podem. Os demais só com a ação ligada
// explicitamente no editor de permissões (sem configuração = não pode).
const pode = (user, entidade, acao) => {
  if (user?.tipo === 'admin' || user?.tipo === 'jeos') return true;
  const c = ENTIDADES[entidade];
  if (!c) return false;
  let obj = user?.permissoes;
  for (const k of c.perm) obj = obj?.[k];
  return obj?.[ACOES[acao]] === true;
};

const config = (entidade) => {
  const c = ENTIDADES[entidade];
  if (!c) {
    const err = new Error('Tela sem lixeira');
    err.status = 404;
    throw err;
  }
  return c;
};

const nomeDoUsuario = async (req, transaction) => {
  if (req.user?.nome) return req.user.nome;
  if (!req.user?.id) return null;
  const u = await req.models.User.findByPk(req.user.id, { attributes: ['nome'], transaction }).catch(() => null);
  return u?.nome || null;
};

const estadoAtual = (c, obj) => (c.modo === 'marca' ? String(obj.ativo !== false) : (obj.status ?? null));

/**
 * Registra quem excluiu. No modo status chamar ANTES de marcar o status (guarda o
 * anterior). Para os demais modos use excluir(), que já chama esta função.
 * @param registros instâncias ou objetos com o registro antes da exclusão
 * @param opts.restauravel / opts.motivoBloqueio — exclusão que não pode voltar atrás
 */
async function registrarExclusao(req, entidade, registros, { transaction, restauravel = true, motivoBloqueio = null } = {}) {
  const lista = (Array.isArray(registros) ? registros : [registros]).filter(Boolean);
  if (!lista.length) return;
  const c = config(entidade);
  const nome = await nomeDoUsuario(req, transaction);

  const linhas = lista.map((r) => {
    const obj = typeof r.toJSON === 'function' ? r.toJSON() : r;
    return {
      entidade,
      registro_id: String(obj.id),
      descricao: c.descricao(obj),
      status_anterior: estadoAtual(c, obj),
      excluido_por_id: req.user?.id || null,
      excluido_por_nome: nome,
      excluido_em: new Date(),
      restauravel,
      motivo_bloqueio: restauravel ? null : motivoBloqueio,
    };
  });
  await req.models.RegistroExcluido.bulkCreate(linhas, {
    updateOnDuplicate: ['descricao', 'status_anterior', 'excluido_por_id', 'excluido_por_nome', 'excluido_em', 'restauravel', 'motivo_bloqueio'],
    transaction,
  });
}

/** Exclui (sem apagar) conforme o modo da entidade e registra quem excluiu */
async function excluir(req, entidade, instancia, opts = {}) {
  const c = config(entidade);
  const { transaction } = opts;
  await registrarExclusao(req, entidade, instancia, opts);
  if (c.modo === 'paranoid') {
    await instancia.destroy({ transaction });
  } else if (c.modo === 'marca') {
    await instancia.update({ excluido_em: new Date(), ativo: false }, { transaction });
  } else {
    throw new Error(`excluir(): use registrarExclusao + status na entidade ${entidade}`);
  }
}

// Consulta dos excluídos de uma entidade (opcionalmente só alguns ids)
const buscarExcluidos = (req, c, ids, transaction) => {
  const m = req.models;
  const conds = [];
  if (c.modo === 'status') conds.push({ status: { [Op.in]: c.statusExcluido } });
  if (c.modo === 'paranoid') conds.push({ deleted_at: { [Op.ne]: null } });
  if (c.modo === 'marca') conds.push({ excluido_em: { [Op.ne]: null } });
  if (c.where) conds.push(c.where(m));
  if (ids) conds.push({ id: { [Op.in]: ids } });
  return m[c.model].findAll({
    where: { [Op.and]: conds },
    include: c.include ? c.include(m) : undefined,
    attributes: c.atributos,
    paranoid: c.modo === 'paranoid' ? false : undefined,
    transaction,
  });
};

/** Registros excluídos de uma tela, com quem excluiu e quando */
async function listarExcluidos(req, entidade) {
  const c = config(entidade);
  const registros = await buscarExcluidos(req, c);
  const metas = await req.models.RegistroExcluido.findAll({ where: { entidade }, raw: true });
  const porId = new Map(metas.map((x) => [x.registro_id, x]));

  const linhas = registros.map((inst) => {
    const r = inst.toJSON();
    const meta = porId.get(String(r.id));
    const valores = {};
    for (const col of c.colunas) {
      const v = col.valor ? col.valor(r) : r[col.campo];
      valores[col.campo] = v === undefined ? null : v;
    }
    return {
      id: r.id,
      valores,
      // Sem registro de lixeira (exclusões anteriores a ela): data do próprio registro
      excluido_em: meta?.excluido_em || r.deleted_at || r.excluido_em || null,
      excluido_por_id: meta?.excluido_por_id || null,
      excluido_por_nome: meta?.excluido_por_nome || null,
      restauravel: meta ? meta.restauravel !== false : true,
      motivo_bloqueio: meta?.motivo_bloqueio || null,
    };
  });

  linhas.sort((a, b) => new Date(b.excluido_em || 0) - new Date(a.excluido_em || 0));

  return {
    entidade,
    titulo: c.titulo,
    colunas: c.colunas.map(({ campo, rotulo, tipo, largo }) => ({ campo, rotulo, tipo: tipo || null, largo: !!largo })),
    registros: linhas,
    pode: {
      restaurar: pode(req.user, entidade, 'restaurar'),
      apagar: pode(req.user, entidade, 'apagar'),
    },
  };
}

const ehConflitoUnico = (err) => err.name === 'SequelizeUniqueConstraintError';
const ehVinculo = (err) => err.name === 'SequelizeForeignKeyConstraintError';

/**
 * Restaura os registros. Cada um numa transação própria; o que não puder voltar
 * (bloqueado, dependência excluída, dado repetido) é informado sem parar os demais.
 */
async function restaurar(req, entidade, ids) {
  const c = config(entidade);
  const m = req.models;
  const alvos = await buscarExcluidos(req, c, ids === 'todos' ? null : ids);
  const metas = await m.RegistroExcluido.findAll({ where: { entidade, registro_id: alvos.map((a) => String(a.id)) }, raw: true });
  const porId = new Map(metas.map((x) => [x.registro_id, x]));

  const restaurados = [];
  const falhas = [];
  for (const inst of alvos) {
    const r = inst.toJSON();
    const meta = porId.get(String(r.id));
    const desc = c.descricao(r);
    try {
      if (meta && meta.restauravel === false) bloquear(meta.motivo_bloqueio || 'Esta exclusão não pode ser desfeita.');
      if (c.antesDeRestaurar) await c.antesDeRestaurar(req, r);
    } catch (err) {
      if (err instanceof RestauracaoBloqueada) { falhas.push({ id: r.id, descricao: desc, motivo: err.message }); continue; }
      throw err;
    }

    const t = await req.tenantDb.transaction();
    try {
      if (c.modo === 'status') {
        const padrao = typeof c.statusPadrao === 'function' ? c.statusPadrao(r) : c.statusPadrao;
        const anterior = meta?.status_anterior && !c.statusExcluido.includes(meta.status_anterior) ? meta.status_anterior : padrao;
        await inst.update({ status: anterior }, { transaction: t });
      } else if (c.modo === 'paranoid') {
        await inst.restore({ transaction: t });
        if (c.aoRestaurar) await c.aoRestaurar(m, r, t);
      } else {
        await inst.update({ excluido_em: null, ativo: meta ? meta.status_anterior !== 'false' : true }, { transaction: t });
      }
      await m.RegistroExcluido.destroy({ where: { entidade, registro_id: String(r.id) }, transaction: t });
      await t.commit();
      restaurados.push(desc);
    } catch (err) {
      await t.rollback();
      falhas.push({
        id: r.id,
        descricao: desc,
        motivo: ehConflitoUnico(err)
          ? 'Já existe outro registro ativo com os mesmos dados (ex.: mesmo número, CPF ou código).'
          : 'Erro ao restaurar.',
      });
      if (!ehConflitoUnico(err)) console.error(`lixeira.restaurar ${entidade}#${r.id}:`, err);
    }
  }
  return { restaurados, falhas };
}

/**
 * Apaga de vez. Cada registro numa transação própria: se um estiver preso a outro
 * dado (ex.: credor de contrato excluído ainda não apagado), os demais seguem.
 * @param ids lista de ids ou 'todos'
 */
async function apagarDefinitivamente(req, entidade, ids) {
  const c = config(entidade);
  const m = req.models;
  const Model = m[c.model];
  const alvos = await buscarExcluidos(req, c, ids === 'todos' ? null : ids);

  const apagados = [];
  const falhas = [];
  for (const inst of alvos) {
    const r = inst.toJSON();
    const t = await req.tenantDb.transaction();
    try {
      if (c.antesDeApagar) await c.antesDeApagar(m, r, t);
      await Model.destroy({ where: { id: r.id }, force: true, transaction: t });
      await m.RegistroExcluido.destroy({ where: { entidade, registro_id: String(r.id) }, transaction: t });
      await t.commit();
      apagados.push(c.descricao(r));
    } catch (err) {
      await t.rollback();
      falhas.push({
        id: r.id,
        descricao: c.descricao(r),
        motivo: ehVinculo(err)
          ? 'Ainda está ligado a outros registros do sistema (apague antes o que depende dele).'
          : 'Erro ao apagar.',
      });
      if (!ehVinculo(err)) console.error(`lixeira.apagar ${entidade}#${r.id}:`, err);
    }
  }
  return { apagados, falhas };
}

module.exports = {
  ENTIDADES,
  pode,
  registrarExclusao,
  excluir,
  listarExcluidos,
  restaurar,
  apagarDefinitivamente,
};
