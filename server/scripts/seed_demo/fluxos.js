// Fluxos do DID do município de demonstração (Configurações › Fluxos de Processo)
//   Contas Variáveis: sequência padrão do sistema (versão 1)
//   Contas Fixas: versão 1 = padrão; versão 2 = + "Assessoria Jurídica — Parecer"
//   (etapa personalizada) depois do Controle Interno. DIDs abertos antes da
//   versão 2 seguem a versão 1 (foto do fluxo em dids.fluxo).
const cat = require('../../config/didBlocos');

// Setor que preenche cada bloco (chaves de org.js)
const SETOR_DO_BLOCO = {
  controle_interno: 'CI',
  financas_autorizacao: 'GSEFIN',
  compras_solicitacao: 'COMPRAS',
  contab_empenho: 'CONTAB',
  contab_empenho_liquidacao: 'CONTAB',
  compras_ordem: 'COMPRAS',
  almox_recebimento: 'ALMOX',
  compras_ateste: 'COMPRAS',
  contab_liquidacao: 'CONTAB',
  financas_pagamento: 'GSEFIN',
  tesouraria: 'TESOUR',
  fechamento: 'CONTAB',
};

// Etapa personalizada (ids no formato aceito por normalizarFluxo)
const PARECER = {
  id: 'p_a1b2c3d4e5',
  bloco: 'personalizada',
  nome: 'Assessoria Jurídica — Parecer',
  setKey: 'AJUR',
  personalizada: {
    campos: [
      { id: 'c_parecer', tipo: 'texto', rotulo: 'Parecer jurídico', obrigatorio: true },
      { id: 'c_regular', tipo: 'simnao', rotulo: 'A despesa está regular para pagamento?', obrigatorio: true },
      { id: 'c_docs', tipo: 'checklist', rotulo: 'Documentos conferidos', obrigatorio: true,
        itens: ['Contrato vigente', 'Certidões de regularidade válidas', 'Nota fiscal atestada'] },
      { id: 'c_numero', tipo: 'documento', rotulo: 'Nº do parecer', obrigatorio: false },
    ],
  },
};

/** Etapas (com setor) de um tipo/versão: [{ id, bloco, nome, setKey, personalizada? }] */
function etapasDe(tipo, versao = 1) {
  const base = cat.fluxoPadrao(tipo).etapas.map(e => ({
    id: e.id, bloco: e.bloco, nome: e.nome, setKey: SETOR_DO_BLOCO[e.bloco] || null,
  }));
  if (tipo === 'fixas' && versao === 2) base.splice(2, 0, { ...PARECER });
  return base.map((e, i) => ({ ...e, numero: i + 1, titulo: `Seção ${cat.ROMANOS[i]} — ${e.nome}` }));
}

/** Foto do fluxo gravada no DID / configuração do município (setores explícitos) */
function fotoDoFluxo(ctx, tipo, versao = 1) {
  return {
    tipo,
    versao,
    etapas: etapasDe(tipo, versao).map(e => ({
      id: e.id,
      bloco: e.bloco,
      nome: e.nome,
      todos: e.bloco === 'abertura',
      setores: e.setKey ? [ctx.set[e.setKey].id] : [],
      obrigatorios: {},
      ...(e.personalizada ? { personalizada: e.personalizada } : {}),
    })),
  };
}

module.exports = { SETOR_DO_BLOCO, PARECER, etapasDe, fotoDoFluxo };
