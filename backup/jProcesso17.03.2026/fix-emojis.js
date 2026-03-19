const fs = require('fs')
const F = '\uFFFD'  // replacement char

function fix(content, pairs) {
  for (const [broken, fixed] of pairs) {
    content = content.split(broken).join(fixed)
  }
  return content
}

// ──────────────────────────────────────
// NovoProcesso.jsx
// ──────────────────────────────────────
const npPath = 'client/src/pages/NovoProcesso.jsx'
let np = fs.readFileSync(npPath, 'utf8')

np = fix(np, [
  // Título
  [`${F}Y"" Novo Processo`,             '📋 Novo Processo'],
  // Erro
  [`${F}s${F}️ {error}`,               '⚠️ {error}'],
  // Labels – precisa contexto para diferenciar os com padrão igual
  [`${F}Y"${F} Assunto *`,              '📝 Assunto *'],
  [`${F}Y"< Descrição *`,               '📝 Descrição *'],
  [`${F}Y'${F} Nome do Interessado *`,  '👤 Nome do Interessado *'],
  [`${F}Y${F}${F} CPF/CNPJ *`,         '🪪 CPF/CNPJ *'],
  [`${F}Y"${F} E-mail`,                 '📧 E-mail'],
  [`${F}Y"${F} Telefone`,               '📱 Telefone'],
  [`${F}YZ${F} Prioridade`,             '🎯 Prioridade'],
  // Select options  
  [`${F}Y"${F} Normal`,                 '📄 Normal'],
  [`${F}s${F} Baixa`,                   '🔽 Baixa'],
  [`${F}YY${F} Alta`,                   '🔼 Alta'],
  [`${F}Y"${F} Urgente`,                '🚨 Urgente'],
  // Botões
  [`${F}?${F} Voltar`,                  '← Voltar'],
  [`${F}o. Criar Processo`,             '✅ Criar Processo'],
])

fs.writeFileSync(npPath, np, 'utf8')
console.log('✅ NovoProcesso.jsx corrigido')

// ──────────────────────────────────────
// Configuracoes.jsx
// ──────────────────────────────────────
const cfgPath = 'client/src/pages/Configuracoes.jsx'
let cfg = fs.readFileSync(cfgPath, 'utf8')

cfg = fix(cfg, [
  // Feedback de sucesso
  [`${F}o. Perfil atualizado com sucesso!`,  '✅ Perfil atualizado com sucesso!'],
  [`${F}o. Senha alterada com sucesso!`,     '✅ Senha alterada com sucesso!'],
  [`${F}o. Preferências salvas!`,            '✅ Preferências salvas!'],
  // Tabs
  [`'${F}Y'${F}', label: 'Meu Perfil'`,     `'👤', label: 'Meu Perfil'`],
  [`'${F}Y"${F}', label: 'Segurança'`,      `'🔒', label: 'Segurança'`],
  [`'${F}Y""', label: 'Notificações'`,      `'🔔', label: 'Notificações'`],
  [`'${F}YZ${F}', label: 'Tema'`,           `'🎨', label: 'Tema'`],
  // Título
  [`${F}sT️ Configurações`,                  '⚙️ Configurações'],
  // Erro
  [`${F}s${F}️ {error}`,                    '⚠️ {error}'],
  // Seção perfil
  [`${F}Y'${F} Informações Pessoais`,       '👤 Informações Pessoais'],
  [`${F}Y"${F} E-mail`,                      '📧 E-mail'],
  [`${F}Y"${F} Telefone`,                    '📱 Telefone'],
  [`${F}Y${F}${F} CPF`,                      '🪪 CPF'],
  [`${F}Y${F}${F} Informações do Sistema`,   '🔧 Informações do Sistema'],
  [`'${F}Y>${F}️ Administrador'`,            `'🛡️ Administrador'`],
  [`'${F}Y'" Gestor'`,                       `'👔 Gestor'`],
  [`'${F}Y'${F} Operacional'`,              `'👤 Operacional'`],
  [`${F}Y${F}T️ Município`,                  '🗺️ Município'],
  [`'${F}Y'${F} Salvar Alterações'`,        `'✅ Salvar Alterações'`],
  // Seção senha
  [`${F}Y"${F} Alterar Senha`,              '🔒 Alterar Senha'],
  [`${F}Y>${F}️ Dicas de Segurança`,        '🛡️ Dicas de Segurança'],
  [`${F}?${F} Use letras`,                  '✓ Use letras'],
  [`${F}?${F} Não compartilhe`,             '✓ Não compartilhe'],
  [`${F}?${F} Altere periodicamente`,       '✓ Altere periodicamente'],
  // Seção notificações
  [`${F}Y"" Preferências de Noti`,         '🔔 Preferências de Noti'],
  [`'${F}Y"${F}', title: 'E-mail ${F}?" Novos Processos'`,  `'📧', title: 'E-mail 🔔 Novos Processos'`],
  [`'${F}Y"?', title: 'E-mail ${F}?" Tramitações'`,         `'📧', title: 'E-mail 🔔 Tramitações'`],
  [`'${F}Y'${F}', title: 'E-mail ${F}?" Menções'`,          `'👤', title: 'E-mail 🔔 Menções'`],
  [`'${F}Y""', title: 'Push ${F}?" Notificações do Navegador'`, `'🔔', title: 'Push 🔔 Notificações do Navegador'`],
  // Salvamentos sobressalentes
  [`${F}?\" Novos Processos`,              '🔔 Novos Processos'],
  [`${F}?\" Tramitações`,                  '🔔 Tramitações'],
  [`${F}?\" Menções`,                      '🔔 Menções'],
  [`${F}?\" Notificações do Navegador`,    '🔔 Notificações do Navegador'],
  [`'${F}Y'${F} Salvar Preferências'`,    `'✅ Salvar Preferências'`],
  // Seção tema
  [`${F}YZ${F} Aparência do Sistema`,      '🎨 Aparência do Sistema'],
  [`${F}~?️`,                              '☀️'],   // Modo Claro ícone
  [`${F}YOT`,                              '🌙'],   // Modo Escuro ícone
  [`${F}o" Ativo`,                         '✅ Ativo'],
  [`${F}Y'${F} A preferência de tema`,    'ℹ️ A preferência de tema'],
])

fs.writeFileSync(cfgPath, cfg, 'utf8')
console.log('✅ Configuracoes.jsx corrigido')

// Verificar resíduos
for (const [label, p] of [['NovoProcesso', npPath], ['Configuracoes', cfgPath]]) {
  const c = fs.readFileSync(p, 'utf8')
  const count = (c.match(new RegExp('\uFFFD', 'g')) || []).length
  console.log(`  ${label}: ${count} chars U+FFFD restantes`)
}
