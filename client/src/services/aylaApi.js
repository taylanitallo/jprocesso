import api from './api'

const MODULE_NAMES = {
  processos:    'Processos',
  contratos:    'Contratos',
  almoxarifado: 'Almoxarifado',
  financeiro:   'Financeiro',
  organizacao:  'Organização',
  usuarios:     'Usuários',
  relatorios:   'Relatórios',
  configuracoes:'Configurações',
  registros:    'Registros',
  patrimonio:   'Patrimônio',
  dashboard:    'Dashboard',
  did:          'DID',
}

/**
 * Constrói o objeto de contexto da tela atual para enviar à Ayla.
 * Recebe pathname, user e tenant do React.
 */
export function buildAylaContext(pathname, user, tenant) {
  const segments = pathname.split('/').filter(Boolean)
  // segments: [subdomain, module, tab?, ...]
  const moduleKey = segments[1] || 'dashboard'
  const tabKey    = segments[2] || null

  const moduleName = MODULE_NAMES[moduleKey] || moduleKey
  const screen     = tabKey ? `${moduleName} — ${tabKey}` : moduleName

  return {
    route:      pathname,
    module:     moduleName,
    screen,
    userRole:   user?.tipo    || null,
    tenantName: tenant?.nome  || tenant?.nome_municipio || null,
  }
}

/**
 * Envia mensagem para a Ayla e retorna a resposta da IA.
 * @param {string} message  — pergunta do usuário
 * @param {object} context  — contexto da tela atual (buildAylaContext)
 * @param {Array}  history  — histórico {role, content}[] (últimas N mensagens)
 */
export async function sendAylaMessage(message, context, history = []) {
  const { data } = await api.post('/ayla/chat', {
    message,
    context,
    // Envia apenas as últimas 10 trocas para economizar tokens
    history: history.slice(-10),
  })
  return data.response
}
