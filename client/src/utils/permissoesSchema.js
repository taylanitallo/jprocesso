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
// Mesmos nomes dos botões das telas (Incluir / Alterar / Excluir). Só "Ver" = a tela
// abre só para consulta, sem nenhum botão de ação.
const INCLUIR = { key: 'criar', label: 'Incluir' }
const ALTERAR = { key: 'editar', label: 'Alterar' }
const EXCLUIR = { key: 'excluir', label: 'Excluir' }
const CRUD = [VER, INCLUIR, ALTERAR, EXCLUIR]

// Tela "Excluídos" da aba/módulo. padrao:false → sem configuração = negado (só
// administradores até alguém ligar). As chaves são conferidas no servidor (lixeiraService).
export const LIXEIRA = [
  { key: 'excluidos',        label: 'Ver excluídos',    padrao: false },
  { key: 'restaurar',        label: 'Restaurar',        padrao: false },
  { key: 'apagar_excluidos', label: 'Apagar excluídos', padrao: false },
]
const CRUD_LIXEIRA = [...CRUD, ...LIXEIRA]

export const MODULOS = [
  {
    key: 'processos', label: 'Processos',
    acoes: [
      VER,
      INCLUIR,
      EXCLUIR,
      { key: 'tramitar',          label: 'Tramitar' },
      { key: 'devolver',          label: 'Devolver' },
      { key: 'concluir',          label: 'Concluir' },
      { key: 'anexar_documento',  label: 'Anexar doc.' },
      { key: 'excluir_documento', label: 'Excluir doc.' },
      ...LIXEIRA, // excluídos de processos e de documentos
    ],
  },
  {
    key: 'arquivo', label: 'Ger. de Arquivos', comAcesso: true,
    abas: [
      { key: 'processos', label: 'Processos Concluídos', escopo: false, acoes: [
        VER,
        { key: 'mover',  label: 'Mover' },
        { key: 'baixar', label: 'Baixar ZIP' },
      ] },
      // Excluir documento gerado: só administradores, com a ação ligada
      { key: 'gerados',   label: 'Documentos Gerados',   escopo: false, acoes: [VER, EXCLUIR] },
    ],
  },
  {
    key: 'almoxarifado', label: 'Almoxarifado', comAcesso: true,
    abas: [
      { key: 'painel',      label: 'Painel',       acoes: [VER] },
      { key: 'estoque',     label: 'Estoque',      acoes: [VER, ALTERAR, ...LIXEIRA] },
      { key: 'entradas',    label: 'Entradas',     acoes: [VER, { key: 'registrar', label: 'Registrar' }] },
      { key: 'saidas',      label: 'Saídas',       acoes: [VER, { key: 'registrar', label: 'Registrar' }] },
      { key: 'requisicoes', label: 'Requisições',  acoes: [VER, INCLUIR, { key: 'aprovar', label: 'Aprovar' }, { key: 'cancelar', label: 'Cancelar' }] },
      // chave 'cotas' mantida por compatibilidade com permissões já salvas
      { key: 'cotas',       label: 'Solicitações', acoes: [VER, { key: 'gerenciar', label: 'Gerenciar' }, ...LIXEIRA] },
      { key: 'inventario',  label: 'Inventário',   acoes: [VER, { key: 'realizar', label: 'Realizar' }, ...LIXEIRA] },
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
      { key: 'licitacoes', label: 'Licitação',               acoes: CRUD_LIXEIRA },
      { key: 'credores',   label: 'Credores',                acoes: CRUD_LIXEIRA },
      { key: 'itens',      label: 'Itens',                   acoes: CRUD_LIXEIRA },
      { key: 'contratos',  label: 'Contratos',               acoes: CRUD_LIXEIRA },
      { key: 'ordens',     label: 'Ordem de Serviço/Compra', acoes: CRUD_LIXEIRA },
      { key: 'relatorios', label: 'Relatórios',              acoes: [VER] },
      { key: 'dashboard',  label: 'Dashboard',               acoes: [VER], escopo: false },
    ],
  },
  {
    key: 'tesouraria', label: 'Tesouraria', comAcesso: true,
    abas: [
      { key: 'contas',     label: 'Contas Bancárias', acoes: CRUD_LIXEIRA },
      { key: 'receitas',   label: 'Receitas',         acoes: CRUD_LIXEIRA },
      // Excluídos de Despesas = pagamentos estornados
      { key: 'despesas',   label: 'Despesas',         acoes: CRUD_LIXEIRA },
      { key: 'relatorios', label: 'Relatórios',       acoes: [VER] },
    ],
  },
  {
    // Acesso ao módulo (organizacao.acessar) + aba a aba. Permissões salvas antes
    // usavam Administração › Gerenciar Organização / Usuários (ver migrarPermissoesAntigas).
    // Gestor: a aba Usuários vale pelo papel, só na própria secretaria.
    key: 'organizacao', label: 'Organização', comAcesso: true,
    abas: [
      { key: 'entidade',     label: 'Entidade',              acoes: [VER, ALTERAR], escopo: false },
      { key: 'secretarias',  label: 'Secretarias e Setores', acoes: [...CRUD_LIXEIRA], escopo: false },
      // Importar planilha: só administradores e gestores (e precisa de Incluir)
      { key: 'agentes',      label: 'Cadastro de Agentes',   acoes: [...CRUD, { key: 'importar', label: 'Importar planilha' }, ...LIXEIRA], escopo: false },
      { key: 'responsaveis', label: 'Responsáveis',          acoes: CRUD, escopo: false },
      { key: 'usuarios',     label: 'Usuários',              escopo: false, acoes: [
        ...CRUD,
        { key: 'permissoes',   label: 'Permissões' },
        { key: 'autenticador', label: 'Autenticador (configurar/revogar)' },
        // Link/QR Code de cadastro: só administradores e gestores (e precisa de Incluir)
        { key: 'convite',      label: 'Link de cadastro (QR Code)' },
        ...LIXEIRA,
      ] },
    ],
  },
  {
    // Acesso ao módulo (configuracoes.acessar) + aba a aba. Permissões salvas antes
    // usavam Administração › Gerenciar Configurações (ver migrarPermissoesAntigas).
    key: 'configuracoes', label: 'Configurações', comAcesso: true,
    abas: [
      { key: 'gerais',       label: 'Gerais',             acoes: [VER, ALTERAR], escopo: false },
      { key: 'notificacoes', label: 'Notificações',       acoes: [VER], escopo: false },
      { key: 'tema',         label: 'Tema',               acoes: [VER], escopo: false },
      { key: 'importexport', label: 'Import / Export',    escopo: false, acoes: [
        VER,
        { key: 'exportar', label: 'Exportar' },
        { key: 'importar', label: 'Importar' },
      ] },
      // Só administradores veem a aba, mesmo com "Ver" ligado
      { key: 'fluxos',       label: 'Fluxos de Processo', acoes: [VER], escopo: false },
    ],
  },
  {
    // Telas do menu Administração que não são módulos com abas (Organização e
    // Configurações têm o próprio acesso acima)
    key: 'administracao', label: 'Administração',
    acoes: [
      { key: 'visualizar_relatorios',   label: 'Relatórios' },
      { key: 'visualizar_registros',    label: 'Registros' },
    ],
  },
]

/**
 * Converte as permissões do formato antigo antes de abrir no editor: o acesso a
 * Organização/Configurações vinha de Administração (gerenciar_secretarias,
 * gerenciar_usuarios, gerenciar_configuracoes). O editor mostra o equivalente no
 * formato novo (organizacao.acessar, abas, configuracoes.acessar) e é isso que se salva.
 * Sem configuração = liberado (mesma regra de hasPerm).
 */
export function migrarPermissoesAntigas(permissoes, tipoAlvo) {
  const p = JSON.parse(JSON.stringify(permissoes || {}))
  const adm = p.administracao || {}
  if (p.organizacao?.acessar === undefined) {
    const sec = adm.gerenciar_secretarias !== false
    const usu = adm.gerenciar_usuarios !== false || tipoAlvo === 'gestor' // gestor: Usuários pelo papel
    p.organizacao = { ...(p.organizacao || {}), acessar: sec || usu }
    if (!sec) ['entidade', 'secretarias', 'agentes', 'responsaveis'].forEach(a => { p.organizacao[a] = { ...(p.organizacao[a] || {}), ver: false } })
    if (!usu) p.organizacao.usuarios = { ...(p.organizacao.usuarios || {}), ver: false }
  }
  if (p.configuracoes?.acessar === undefined) {
    p.configuracoes = { ...(p.configuracoes || {}), acessar: adm.gerenciar_configuracoes !== false }
  }
  return p
}

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
