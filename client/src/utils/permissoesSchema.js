// ══════════════════════════════════════════════════════════════════════════════
//  Schema de permissões — fonte única para o editor de permissões de usuário.
//
//  ⚠ Ao criar/renomear/remover uma aba ou módulo no sistema, atualize este
//    arquivo junto. Cada página de módulo chama conferirAbasDoModulo() e, em
//    desenvolvimento, o console avisa quando a página e o schema divergem.
//
//  Estrutura:
//    módulo: { key, label, comAcesso?, acoes?, abas? }
//    aba:    { key, label, acoes, escopo? }
//      - key        → 2º nível do caminho (ex.: ['contratos', 'licitacoes', 'ver'])
//      - escopo     → false: a ação "ver" é liga/desliga (sem escopo de secretaria)
//    Ordem dos módulos = ordem do menu lateral; ordem das abas = ordem na tela.
// ══════════════════════════════════════════════════════════════════════════════

const VER = { key: 'ver', label: 'Ver' }
const CRUD = [VER, { key: 'criar', label: 'Criar' }, { key: 'editar', label: 'Editar' }, { key: 'excluir', label: 'Excluir' }]

export const MODULOS = [
  {
    key: 'processos', label: 'Processos',
    acoes: [
      VER,
      { key: 'criar',             label: 'Criar' },
      { key: 'editar',            label: 'Editar' },
      { key: 'excluir',           label: 'Excluir' },
      { key: 'tramitar',          label: 'Tramitar' },
      { key: 'devolver',          label: 'Devolver' },
      { key: 'concluir',          label: 'Concluir' },
      { key: 'arquivar',          label: 'Arquivar' },
      { key: 'anexar_documento',  label: 'Anexar doc.' },
      { key: 'excluir_documento', label: 'Excluir doc.' },
    ],
  },
  {
    key: 'arquivo', label: 'Ger. de Arquivos', comAcesso: true,
  },
  {
    key: 'almoxarifado', label: 'Almoxarifado', comAcesso: true,
    abas: [
      { key: 'painel',      label: 'Painel',       acoes: [VER] },
      { key: 'estoque',     label: 'Estoque',      acoes: [VER, { key: 'editar', label: 'Editar' }] },
      { key: 'entradas',    label: 'Entradas',     acoes: [VER, { key: 'registrar', label: 'Registrar' }] },
      { key: 'saidas',      label: 'Saídas',       acoes: [VER, { key: 'registrar', label: 'Registrar' }] },
      { key: 'requisicoes', label: 'Requisições',  acoes: [VER, { key: 'criar', label: 'Criar' }, { key: 'aprovar', label: 'Aprovar' }, { key: 'cancelar', label: 'Cancelar' }] },
      // chave 'cotas' mantida por compatibilidade com permissões já salvas
      { key: 'cotas',       label: 'Solicitações', acoes: [VER, { key: 'gerenciar', label: 'Gerenciar' }] },
      { key: 'inventario',  label: 'Inventário',   acoes: [VER, { key: 'realizar', label: 'Realizar' }] },
      { key: 'auditoria',   label: 'Auditoria',    acoes: [VER] },
    ],
  },
  {
    key: 'patrimonio', label: 'Patrimônio', comAcesso: true,
    abas: [
      { key: 'painel',        label: 'Painel',        acoes: [VER] },
      { key: 'bens',          label: 'Bens',          acoes: CRUD },
      { key: 'tombamento',    label: 'Tombamento',    acoes: [VER, { key: 'realizar', label: 'Realizar' }] },
      { key: 'transferencia', label: 'Transferência', acoes: [VER, { key: 'realizar', label: 'Realizar' }] },
      { key: 'baixa',         label: 'Baixa',         acoes: [VER, { key: 'realizar', label: 'Realizar' }] },
      { key: 'inventario',    label: 'Inventário',    acoes: [VER, { key: 'realizar', label: 'Realizar' }] },
      { key: 'grupos',        label: 'Grupos',        acoes: [VER, { key: 'gerenciar', label: 'Gerenciar' }] },
    ],
  },
  {
    key: 'financeiro', label: 'Financeiro', comAcesso: true,
    abas: [
      { key: 'painel',        label: 'Painel',        acoes: [VER] },
      { key: 'processos_did', label: 'Processos DID', acoes: [VER] },
      { key: 'relatorio',     label: 'Relatório',     acoes: [VER] },
    ],
  },
  {
    key: 'contratos', label: 'Contratos', comAcesso: true,
    abas: [
      { key: 'licitacoes', label: 'Licitação',               acoes: CRUD },
      { key: 'credores',   label: 'Credores',                acoes: CRUD },
      { key: 'itens',      label: 'Itens',                   acoes: CRUD },
      { key: 'contratos',  label: 'Contratos',               acoes: CRUD },
      { key: 'ordens',     label: 'Ordem de Serviço/Compra', acoes: CRUD },
      { key: 'relatorios', label: 'Relatórios',              acoes: [VER] },
      { key: 'dashboard',  label: 'Dashboard',               acoes: [VER], escopo: false },
    ],
  },
  {
    key: 'tesouraria', label: 'Tesouraria', comAcesso: true,
    abas: [
      { key: 'contas',     label: 'Contas Bancárias', acoes: CRUD },
      { key: 'receitas',   label: 'Receitas',         acoes: CRUD },
      { key: 'despesas',   label: 'Despesas',         acoes: CRUD },
      { key: 'relatorios', label: 'Relatórios',       acoes: [VER] },
    ],
  },
  {
    // Acesso ao módulo vem de Administração › Gerenciar Organização / Usuários;
    // aqui se restringe aba a aba.
    key: 'organizacao', label: 'Organização',
    abas: [
      { key: 'entidade',     label: 'Entidade',              acoes: [VER], escopo: false },
      { key: 'secretarias',  label: 'Secretarias e Setores', acoes: [VER], escopo: false },
      { key: 'agentes',      label: 'Cadastro de Agentes',   acoes: [VER], escopo: false },
      { key: 'responsaveis', label: 'Responsáveis',          acoes: [VER], escopo: false },
      { key: 'usuarios',     label: 'Usuários',              acoes: [VER], escopo: false },
    ],
  },
  {
    key: 'administracao', label: 'Administração',
    acoes: [
      { key: 'gerenciar_secretarias',   label: 'Organização (entidade, secretarias, agentes, responsáveis)' },
      { key: 'gerenciar_usuarios',      label: 'Organização › Usuários' },
      { key: 'visualizar_relatorios',   label: 'Relatórios' },
      { key: 'gerenciar_configuracoes', label: 'Configurações' },
      { key: 'visualizar_registros',    label: 'Registros' },
    ],
  },
]

/**
 * Em desenvolvimento, avisa no console quando as abas de uma página e o schema divergem.
 * @param {string}   moduloKey — chave do módulo no schema (ex.: 'contratos')
 * @param {string[]} abaKeys   — chaves de permissão das abas da página (2º nível do permPath)
 */
export function conferirAbasDoModulo(moduloKey, abaKeys) {
  if (!import.meta.env.DEV) return
  const mod = MODULOS.find(m => m.key === moduloKey)
  if (!mod) {
    console.warn(`[permissões] Módulo "${moduloKey}" não existe em utils/permissoesSchema.js`)
    return
  }
  const doSchema = (mod.abas || []).map(a => a.key)
  const semPermissao = abaKeys.filter(k => !doSchema.includes(k))
  const semAba = doSchema.filter(k => !abaKeys.includes(k))
  if (semPermissao.length || semAba.length) {
    console.warn(
      `[permissões] "${moduloKey}" fora de sincronia com utils/permissoesSchema.js.` +
      (semPermissao.length ? `\n  Abas sem permissão no editor: ${semPermissao.join(', ')}` : '') +
      (semAba.length ? `\n  Permissões sem aba na página: ${semAba.join(', ')}` : '')
    )
  }
}
