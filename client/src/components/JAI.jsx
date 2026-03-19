/**
 * Ayla — Assistente de Inteligência Artificial do jProcesso
 * ─────────────────────────────────────────────────────────
 * Exporta:
 *   default    → Floating chat widget (usado no Layout)
 *   JAIButton  → Botão inline para campos de formulário
 */

import { useState, useRef, useEffect, useCallback } from 'react'
import { useLocation } from 'react-router-dom'
import {
  X, Send, Sparkles, Bot, RotateCcw, Copy, Check,
  Lightbulb, Zap, ChevronDown, Minimize2, Maximize2,
  Wand2, CheckCheck, ClipboardCopy
} from 'lucide-react'
import api from '../services/api'

// ── Ayla Avatar ─────────────────────────────────────────────────────────
function AylaAvatar({ size = 32, className = '', ring = false, float = false, glow = false }) {
  const [ok, setOk] = useState(true)
  const base = {
    flexShrink: 0, width: size, height: size, borderRadius: '50%',
    objectFit: 'cover', objectPosition: 'top center',
    ...(ring ? { border: '2.5px solid rgba(255,255,255,0.8)', boxShadow: '0 0 0 2px #7C3AED' } : {}),
    ...(glow ? { boxShadow: '0 0 12px 4px rgba(168,85,247,0.55), 0 4px 12px rgba(0,0,0,0.25)' } : {}),
  }
  const fallback = {
    ...base, display: 'flex', alignItems: 'center', justifyContent: 'center',
    background: 'linear-gradient(135deg,#7C3AED,#a855f7)',
    fontSize: size * 0.42, fontWeight: 700, color: 'white',
  }
  const wrap = float ? { animation: 'aylaFloat 3s ease-in-out infinite' } : {}
  return (
    <div className={className} style={{ ...wrap, flexShrink: 0, width: size, height: size }}>
      {ok
        ? <img src="/ayla.png" alt="Ayla" width={size} height={size} style={base} onError={() => setOk(false)} />
        : <div style={fallback}>A</div>
      }
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════
//  BASE DE CONHECIMENTO
// ══════════════════════════════════════════════════════════════════════════

const PAGINAS = {
  dashboard:    { nome: 'Dashboard',     icone: '🏠', dicas: ['Veja o resumo do sistema no Dashboard', 'Os totalizadores mostram os processos do dia'] },
  processos:    { nome: 'Processos',     icone: '📥', dicas: ['Clique em "+ Novo" para abrir um processo', 'Use a busca para localizar processos por número ou interessado', 'Dê duplo clique na linha para ver os detalhes'] },
  novo:         { nome: 'Novo Processo', icone: '📄', dicas: ['Escolha o tipo de processo antes de preencher', 'Para DID, informe objeto e período de referência', 'O número do processo é gerado automaticamente'] },
  enviados:     { nome: 'Enviados',      icone: '📤', dicas: ['Processos enviados ficam aqui até serem respondidos', 'Você pode visualizar o histórico de tramitações'] },
  did:          { nome: 'DID',           icone: '📋', dicas: ['Preencha as seções do DID na ordem apresentada', 'A Seção I contém os dados gerais do documento', 'Salve cada seção separadamente'] },
  almoxarifado: { nome: 'Almoxarifado',  icone: '📦', dicas: ['Este módulo não está liberado para este cliente', 'Entre em contato com o comercial para contratar', 'WhatsApp: (88) 99722-4066'] },
  financeiro:   { nome: 'Financeiro',    icone: '💵', dicas: ['Registre lançamentos de receitas e despesas', 'Filtre por período para relatórios mensais'] },
  contratos:    { nome: 'Contratos',     icone: '📝', dicas: ['Cadastre itens com código sequencial automático', 'Use palavras-chave para facilitar a busca', 'Classifique entre COMPRAS e SERVIÇOS'] },
  secretarias:  { nome: 'Organização',   icone: '🏛️', dicas: ['Gerencie secretarias e setores', 'Defina a estrutura organizacional aqui'] },
  usuarios:     { nome: 'Usuários',      icone: '👥', dicas: ['Crie usuários com perfis: admin, gestor ou operacional', 'Vincule usuários às secretarias corretas'] },
  relatorios:   { nome: 'Relatórios',    icone: '📊', dicas: ['Gere relatórios por período e setor', 'Exporte dados em PDF ou Excel'] },
  configuracoes:{ nome: 'Configurações', icone: '⚙️', dicas: ['Ajuste as configurações do sistema aqui'] },
}

function detectarPagina(pathname) {
  if (pathname.includes('/did'))            return 'did'
  if (pathname.includes('/processos/novo')) return 'novo'
  if (pathname.includes('/processos'))      return 'processos'
  if (pathname.includes('/enviados'))       return 'enviados'
  if (pathname.includes('/almoxarifado'))   return 'almoxarifado'
  if (pathname.includes('/financeiro'))     return 'financeiro'
  if (pathname.includes('/contratos'))      return 'contratos'
  if (pathname.includes('/organizacao'))     return 'secretarias'
  if (pathname.includes('/secretarias'))    return 'secretarias'
  if (pathname.includes('/usuarios'))       return 'usuarios'
  if (pathname.includes('/relatorios'))     return 'relatorios'
  if (pathname.includes('/configuracoes'))  return 'configuracoes'
  return 'dashboard'
}

// Detecta a aba ativa a partir do pathname (/:subdomain/modulo/:tab)
function detectarAba(pathname) {
  const segs = pathname.split('/').filter(Boolean) // ['subdomain','modulo','tab',...]
  if (segs.length < 3) return null
  const modulo = segs[1]
  const tab    = segs[2]
  // Evita confundir com sub-rotas de processo (ID ou 'novo' ou 'did')
  if (modulo === 'processos') {
    if (tab === 'enviados') return 'enviados'
    if (tab === 'entrada')  return 'entrada'
    return null // 'novo', UUID, etc.
  }
  return tab || null
}

// Contexto textual da aba para exibição no header e mensagens
const ABA_LABEL = {
  // Processos
  entrada:      { label: 'Entrada',           icone: '📥' },
  enviados:     { label: 'Enviados',           icone: '📤' },
  // Organização
  entidade:     { label: 'Entidade',           icone: '🏢' },
  secretarias:  { label: 'Secretarias e Setores', icone: '🏛️' },
  agentes:      { label: 'Cadastro de Agentes',icone: '🪪' },
  responsaveis: { label: 'Responsáveis',       icone: '👤' },
  // Almoxarifado
  painel:       { label: 'Painel',             icone: '📊' },
  itens:        { label: 'Itens',              icone: '📦' },
  lotes:        { label: 'Entradas',           icone: '⬇️' },
  saidas:       { label: 'Saídas',             icone: '⬆️' },
  requisicoes:  { label: 'Requisições',        icone: '📋' },
  cotas:        { label: 'Cotas',              icone: '📅' },
  inventario:   { label: 'Inventário',         icone: '🗂️' },
  auditoria:    { label: 'Auditoria',          icone: '🔍' },
  // Financeiro
  processos:    { label: 'Processos DID',      icone: '📋' },
  relatorio:    { label: 'Relatório',          icone: '📊' },
  // Contratos
  credor:       { label: 'Credor',             icone: '🏢' },
  contratos:    { label: 'Contratos',          icone: '📋' },
  // Configurações
  gerais:       { label: 'Configurações Gerais',icone: '⚙️' },
  notificacoes: { label: 'Notificações',       icone: '🔔' },
  tema:         { label: 'Tema',               icone: '🎨' },
  importexport: { label: 'Importações/Exportações', icone: '🔄' },
}

// Dicas específicas por aba
const DICAS_ABA = {
  // Processos
  entrada:      ['Estes são processos recebidos no seu setor', 'Dê duplo clique para ver os detalhes', 'Use a busca para localizar por número ou interessado'],
  enviados:     ['Processos que você já encaminhou para outro setor', 'Você pode acompanhar o status de cada processo aqui'],
  // Organização
  entidade:     ['Cadastre os dados do município aqui', 'Informe CNPJ, endereço, brasão e informações da prefeitura', 'Esses dados aparecem nos documentos oficiais'],
  secretarias:  ['Crie secretarias com sigla e nome completo', 'Cada secretaria pode ter setores vinculados', 'Selecione uma secretaria e clique em "Setores" para gerenciar'],
  agentes:      ['Agentes são servidores públicos do município', 'Vincule o agente a uma secretaria', 'Esses agentes aparecem como responsáveis nos documentos'],
  responsaveis: ['Defina quem é responsável por cada secretaria', 'Informe cargo, período e amparo legal', 'Um agente pode ser responsável por períodos diferentes'],
  // Almoxarifado
  painel:       ['Veja o resumo do estoque no painel', 'Monitore entradas, saídas e saldo disponível'],
  itens_alm:    ['Cadastre materiais e produtos aqui', 'Use a busca para localizar itens pelo nome'],
  lotes:        ['Registre entradas de materiais no estoque', 'Informe nota fiscal e fornecedor'],
  saidas:       ['Registre saídas de materiais do estoque', 'Relacione cada saída a uma secretaria/setor'],
  requisicoes:  ['Solicitações de material entre setores', 'Aprove ou reprove requisições pendentes'],
  // Financeiro
  painel_fin:   ['Veja o resumo financeiro por período', 'Filtre por secretaria, credor e mês de referência'],
  processos_fin:['Lista de processos DID com lançamentos', 'Clique para ver detalhes do processo'],
  relatorio:    ['Gere relatórios financeiros aqui', 'Filtre por período e exporte em PDF'],
  // Contratos
  itens:        ['Cadastre itens com código sequencial automático', 'Use palavras-chave para facilitar buscas'],
  credor:       ['Cadastre empresas fornecedoras (credores)', 'Informe CNPJ, razão social e dados bancários'],
  contratos_aba:['Registre contratos e atas de registro de preço', 'Vincule contratos a credores e itens'],
  // Configurações
  gerais:       ['Configure nome, logo e brasão do município', 'Esses dados aparecem no sistema e nos documentos'],
  notificacoes: ['Defina quando receber e-mails do sistema', 'Ative notificações push para alertas em tempo real'],
  tema:         ['Alterne entre tema claro e escuro', 'Personalize as cores do sistema'],
  importexport: ['Exporte dados do sistema em JSON', 'Use para backup ou migração de dados'],
}

const BASE = {
  saudacoes:    ['oi','olá','ola','hey','e aí','eaí','bom dia','boa tarde','boa noite','oi tudo','oi ayla'],
  identificacao: ['quem é você','quem és','você é','qual seu nome','como se chama','me apresente'],
  ajuda:        ['ajuda','help','como','o que','o que é','o que faz','explica','explique','me ajuda'],
  navegar:      ['onde','como ir','como acessar','onde fica','como chegar','achar','encontrar','navegar'],
  processos:    ['processo','processos','tramitar','tramitação','abrir processo','novo processo','criar processo','enviar processo'],
  did:          ['did','demonstrativo','despesa','conta fixa','conta variada','objeto','período de referência','modalidade','licitação'],
  contratos:    ['contrato','contratos','item','itens','credor','credores','código do item','catálogo','cnbs','pncp','palavra-chave','palavras'],
  almoxarifado: ['almoxarifado','estoque','material','materials','requisição','entrada','saída'],
  financeiro:   ['financeiro','finanças','lançamento','receita','despesa','orçamento'],
  usuario:      ['usuário','usuarios','login','senha','acesso','perfil','permissão'],
  relatorio:    ['relatório','relatorio','relatórios','exportar','imprimir','pdf','excel'],
  sugestao_desc:['sugerir descrição','gerar descrição','sugestão de descrição','como descrever','como escrever'],
  sugestao_obj: ['sugerir objeto','gerar objeto','sugestão de objeto','como preencher objeto'],
  sugestao_pal: ['sugerir palavras','gerar palavras','palavras chave','palavras-chave'],
  banco:        ['quais tabelas','quais cadastros','estrutura do banco','tabelas do banco','tabelas existem','banco de dados','que tabelas','lista de tabelas','schema','esquema do banco','quais módulos no banco','mostrar banco'],
  tabela_col:   ['colunas da tabela','campos da tabela','o que tem na tabela','estrutura da tabela','colunas de','campos de','detalhes da tabela'],
}

function classificar(texto) {
  const t = texto.toLowerCase()
  for (const [cat, termos] of Object.entries(BASE)) {
    if (termos.some(term => t.includes(term))) return cat
  }
  return 'geral'
}

function gerarResposta(texto, pagKey, schemaCtx, abaKey) {
  const pag    = PAGINAS[pagKey] || PAGINAS.dashboard
  const abaInf = abaKey ? ABA_LABEL[abaKey] : null
  const cat    = classificar(texto)
  const t      = texto.toLowerCase()
  const localCtx = abaInf ? `**${pag.nome}** ${pag.icone} › **${abaInf.label}** ${abaInf.icone}` : `**${pag.nome}** ${pag.icone}`

  if (cat === 'saudacoes') return `Olá! 👋 Sou a **Ayla**, assistente inteligente do **jProcesso**.\n\nVocê está em ${localCtx}.\n\nPosso te ajudar com:\n• Navegar pelo sistema\n• Preencher formulários\n• Explicar funcionalidades\n• Sugerir textos e descrições\n\nO que precisa?`

  if (cat === 'navegar' || cat === 'ajuda') {
    if (pagKey === 'almoxarifado') return `**Módulo Almoxarifado** 🔒\n\nEste módulo **não está liberado** para este cliente.\n\nPara contratar, entre em contato com o comercial:\n\n📞 **WhatsApp:** [(88) 99722-4066](https://wa.me/5588997224066)`
    if (pagKey === 'contratos') return `**Módulo Contratos** 📝\n\n**Aba Itens:**\n• Cadastre itens com código automático (00001, 00002...)\n• Filtre por descrição, catálogo, categoria ou status\n• Selecione um item e use os botões: Incluir, Alterar, Excluir, Visualizar\n\n**Formulário do item:**\n• Descrição: nome/nomenclatura do produto\n• Categoria: COMPRAS ou SERVIÇOS\n• Catálogo: código CNBS do PNCP\n• Palavras-chave: para facilitar busca`
    if (pagKey === 'did') return `**Formulário DID** 📋\n\n**Seção I — Dados Gerais:**\n• Objeto: descrição do bem/serviço\n• Período: mês e ano de referência\n• Fornecedor: empresa contratada\n• Modalidade: forma de contratação\n\n**Seções II a VI:** tramitação entre setores (CI, Compras, Contabilidade, Finanças, Tesouraria)\n\nSalve cada seção após preencher.`
    if (pagKey === 'novo') return `**Abrindo um Processo** 📄\n\n1. Escolha o **tipo**: Despacho, DID, Pauta ou Requisição\n2. Preencha os **dados principais**\n3. Para DID: escolha entre **Contas Fixas** ou **Contas Variadas**\n4. Clique em **"Criar Processo"**\n\nO número é gerado automaticamente pelo sistema.`
    // Dicas da aba específica ou do módulo
    const dicas = (abaKey && DICAS_ABA[abaKey]) || pag.dicas
    return `**${localCtx}**\n\n💡 **Dicas:**\n${dicas.map(d => `• ${d}`).join('\n')}\n\nTem alguma dúvida específica?`
  }

  if (cat === 'processos') {
    if (t.includes('tramit')) return `**Tramitar um Processo** 📤\n\n1. Abra o processo pelos **Detalhes**\n2. Clique em **"Tramitar"**\n3. Selecione o **setor de destino**\n4. Adicione uma **observação** (opcional)\n5. Confirme — o processo vai para a caixa do setor destino`
    if (t.includes('abrir') || t.includes('novo') || t.includes('criar')) return `**Abrir Novo Processo** 📄\n\n1. No menu lateral, clique em **"Processos"**\n2. Clique no botão **"+ Novo"**\n3. Escolha o **tipo de processo**\n4. Preencha os campos obrigatórios\n5. Clique em **"Criar Processo"**`
    return `**Processos Administrativos** 📥\n\nNo sistema jProcesso, os processos são:\n\n• 📤 **Despacho** — Ato administrativo de deliberação\n• 📋 **DID** — Demonstrativo de despesa\n• 📅 **Pauta** — Solicitação de contratação\n• 📦 **Requisição** — Retirada de material do almoxarifado`
  }

  if (cat === 'did') {
    if (t.includes('objeto')) return `**Preenchendo o Objeto do DID** ✍️\n\nO objeto descreve o **bem ou serviço** a ser contratado.\n\n**Exemplos:**\n• "Fornecimento de energia elétrica para as dependências da Secretaria de Educação"\n• "Prestação de serviços de limpeza e conservação predial"\n• "Aquisição de material de expediente para o exercício de 2026"\n• "Contratação de empresa especializada em software de gestão"\n\n**Dica:** Seja específico, indique a secretaria e o exercício.`
    if (t.includes('modalidade') || t.includes('licitação')) return `**Modalidades de Licitação** ⚖️\n\n• **Dispensa** — Valor abaixo do limite (R$ 57.900 bens / R$ 86.500 serviços)\n• **Inexigibilidade** — Fornecedor único ou profissional notório\n• **Pregão Eletrônico** — Compras pela internet (COMPRASNET)\n• **Pregão Presencial** — Sessão com lances presenciais\n• **Concorrência** — Contratos de grande valor\n• **Tomada de Preços** — Valores médios, fornecedores cadastrados`
    if (t.includes('fixas') || t.includes('variadas')) return `**Tipos de DID:**\n\n📌 **Contas Fixas:**\nDespesas recorrentes e previsíveis\n• Conta de energia elétrica\n• Conta de água e esgoto\n• Aluguel de imóvel\n• Serviço de telefonia\n\n📊 **Contas Variadas:**\nDespesas eventuais ou variáveis\n• Compra de materiais\n• Contratação de serviços\n• Manutenção de equipamentos`
    return `**DID — Demonstrativo de Identificação da Despesa** 📋\n\nDocumento que identifica e justifica uma despesa pública.\n\n**Estrutura:**\n• Seção I: Dados gerais (objeto, fornecedor, período)\n• Seção II: Secretaria/CI\n• Seção III: Compras\n• Seção IV: Contabilidade\n• Seção V: Finanças\n• Seção VI: Tesouraria`
  }

  if (cat === 'contratos') {
    if (t.includes('código') || t.includes('codigo')) return `**Código do Item** 🔢\n\nOs códigos são gerados automaticamente em ordem crescente:\n• Primeiro item: **00001**\n• Segundo item: **00002**\n• E assim por diante...\n\nO código é único e sequencial, não pode ser repetido.`
    if (t.includes('catálogo') || t.includes('catalogo') || t.includes('cnbs') || t.includes('pncp')) return `**Catálogo CNBS — PNCP** 🗃️\n\nO **CNBS** (Catálogo Nacional de Bens e Serviços) é o catálogo padrão do PNCP (Portal Nacional de Contratações Públicas).\n\nComo encontrar o código:\n1. Acesse pncp.gov.br\n2. Pesquise pelo nome do item\n3. Copie o código CNBS\n4. Cole no campo "Catálogo" do formulário`
    if (t.includes('palavra')) return `**Palavras-chave do Item** 🔑\n\nAs palavras-chave facilitam encontrar o item em buscas.\n\n**Dicas:**\n• Use sinônimos do item\n• Adicione a categoria (ex: PAPEL, INFORMÁTICA)\n• Use termos técnicos se aplicável\n\n**Exemplo para "Resma de Papel A4":**\n• Palavra 1: PAPEL\n• Palavra 2: A4\n• Palavra 3: RESMA\n• Palavra 4: SULFITE`
    return `**Módulo Contratos** 📝\n\n**Aba Itens:** Cadastro de produtos e serviços\n**Aba Credor:** Empresas fornecedoras\n**Aba Contratos:** Contratos e atas de registro de preço\n\nCódigos de itens são sequenciais (00001, 00002...)\nCategorias: COMPRAS ou SERVIÇOS`
  }

  if (cat === 'almoxarifado') return `**Módulo Almoxarifado** 🔒\n\nEste módulo **não está liberado** para este cliente.\n\nPara contratar o módulo de Almoxarifado, entre em contato com o comercial:\n\n📞 **WhatsApp:** [(88) 99722-4066](https://wa.me/5588997224066)\n\nNosso time ficará feliz em apresentar o módulo completo!`

  if (cat === 'financeiro') return `**Financeiro** 💵\n\n• **Lançamentos:** Registre receitas e despesas\n• **Dotação:** Controle de dotações orçamentárias\n• **Empenhos:** Acompanhe empenhos por secretaria\n\nFiltros disponíveis: período, secretaria, tipo de lançamento`

  if (cat === 'usuario') return `**Usuários do Sistema** 👥\n\n**Perfis disponíveis:**\n• 👑 **Admin** — Acesso total + gerenciamento do sistema\n• 🎯 **Gestor** — Visualização ampla + relatórios\n• 👤 **Operacional** — Processos e tramitações\n\nPara cadastrar: Administração → Usuários → Novo Usuário`

  if (cat === 'relatorio') return `**Relatórios** 📊\n\nGere relatórios sobre:\n• Processos por período / secretaria / tipo\n• Movimentações de almoxarifado\n• Lançamentos financeiros\n• Tramitações e histórico\n\nExporte em PDF para impressão ou arquivamento.`

  if (cat === 'sugestao_desc') return `**Sugestões de Descrição de Item**\n\nA descrição deve ser a **nomenclatura** do item, não a especificação.\n\n✅ Correto: "RESMA DE PAPEL A4"\n❌ Errado: "Papel branco de 75g/m², tamanho A4, 500 folhas..."\n\nA especificação técnica vai no campo **"Especificação do item"** (abaixo).`

  if (cat === 'sugestao_obj') return `**Como preencher o campo Objeto** ✍️\n\nO objeto deve ser **claro e objetivo**.\n\nEstrutura sugerida:\n*[Ação] + [Bem/Serviço] + [Finalidade] + [Secretaria]*\n\n**Exemplos:**\n• "Aquisição de material de escritório para a Secretaria Municipal de Educação"\n• "Contratação de serviços de manutenção predial para as unidades da Prefeitura"\n• "Fornecimento parcelado de combustível para a frota municipal"`

  if (cat === 'sugestao_pal') return `**Sugestão de Palavras-chave** 🔑\n\nPense em como você buscaria este item. Use:\n• Nome principal do produto\n• Abreviações comuns\n• Categoria ou grupo\n• Material ou composição\n\nExemplo para **"Cadeira Giratória de Escritório":**\n• Palavra 1: CADEIRA\n• Palavra 2: GIRATÓRIA\n• Palavra 3: ESCRITÓRIO\n• Palavra 4: MOBILIÁRIO`

  // ── Respostas baseadas no Schema Context (introspecção ao vivo) ──────────

  if (cat === 'banco') {
    if (!schemaCtx) return `Ainda estou carregando a estrutura do banco... 🔄\n\nAguarde um momento e pergunte novamente!`
    const { tables, schema, generated_at } = schemaCtx
    if (!tables || !tables.length) return `Não encontrei tabelas no banco. Verifique se o schema **${schema}** está correto.`

    // Agrupa por módulo
    const byMod = {}
    for (const t of tables) {
      if (!byMod[t.modulo]) byMod[t.modulo] = []
      byMod[t.modulo].push(t.nome)
    }

    const dt = new Date(generated_at).toLocaleString('pt-BR')
    let resp = `**Estrutura do Banco de Dados** 🗄️\n*Atualizado em ${dt} — ${tables.length} tabelas*\n\n`
    for (const [mod, nomes] of Object.entries(byMod).sort()) {
      resp += `**${mod}:**\n`
      for (const n of nomes) resp += `  • \`${n}\`\n`
    }
    resp += `\nPara ver as colunas de uma tabela, pergunte:\n_"colunas da tabela nome_da_tabela"_`
    return resp
  }

  if (cat === 'tabela_col') {
    if (!schemaCtx) return `Ainda estou carregando a estrutura do banco... 🔄\n\nAguarde um momento e pergunte novamente!`
    const { tables } = schemaCtx

    // Tenta detectar o nome da tabela na mensagem do usuário
    let nomeTabela = null
    if (tables) {
      const lower = texto.toLowerCase()
      // Procura pelo nome exato da tabela na mensagem
      nomeTabela = tables.find(tb => lower.includes(tb.nome.toLowerCase()))?.nome
      // Se não achou exato, tenta correspondência parcial (ex: "usuários" → "usuarios")
      if (!nomeTabela) {
        nomeTabela = tables.find(tb => {
          const partes = tb.nome.split('_')
          return partes.some(p => p.length > 3 && lower.includes(p.toLowerCase()))
        })?.nome
      }
    }

    if (!nomeTabela) {
      const listaNomes = (tables || []).map(tb => `\`${tb.nome}\``).join(', ')
      return `Não identifiquei qual tabela você quer ver. 🤔\n\nTabelas disponíveis:\n${listaNomes}\n\nPergunta exemplo: _"colunas da tabela processos"_`
    }

    const tabela = tables.find(tb => tb.nome === nomeTabela)
    let resp = `**Tabela: \`${nomeTabela}\`** (Módulo: ${tabela.modulo})\n${tabela.colunas.length} colunas:\n\n`
    for (const col of tabela.colunas) {
      const obrig = col.obrigatorio ? ' ✦' : ''
      const pad   = col.padrao ? ` _(padrão: ${col.padrao.replace(/::[\w\s]+/g, '').trim()})_` : ''
      resp += `• **${col.nome}**: ${col.tipo}${obrig}${pad}\n`
    }
    resp += `\n_✦ = campo obrigatório_`
    return resp
  }

  return `Entendi sua pergunta sobre **"${texto}"**! 🤔\n\nVocê está em ${localCtx}.\n\nPosso te ajudar melhor se você especificar o que precisa:\n\n• 🧭 **Navegar** no sistema\n• 📋 **Preencher** um formulário\n• 💡 **Entender** uma funcionalidade\n• ✍️ **Sugestões** de texto para campos\n• 🗄️ **Banco de dados** — pergunte _"quais tabelas existem"_\n\nTente reformular sua pergunta!`
}

const RAPIDAS_POR_PAGINA = {
  dashboard:    ['O que posso fazer aqui?', 'Como abrir um processo?', 'Quais tabelas existem?'],
  processos:    ['Como abrir processo?', 'Como tramitar?', 'Tipos de processo'],
  novo:         ['Como preencher?', 'Tipos de processo', 'O que é DID?'],
  did:          ['Como preencher o objeto?', 'Tipos de DID', 'Modalidades de licitação'],
  contratos:    ['Como cadastrar item?', 'O que é catálogo CNBS?', 'Colunas da tabela contratos'],
  almoxarifado: ['Como contratar o módulo?', 'Falar com o comercial', 'O que tem no módulo?'],
  financeiro:   ['Como fazer lançamento?', 'Como ver dotação?'],
  enviados:     ['O que são enviados?', 'Como ver tramitações?'],
  secretarias:  ['Como criar secretaria?', 'Como adicionar setor?', 'Colunas da tabela secretarias'],
  usuarios:     ['Como criar usuário?', 'Quais os perfis?', 'Colunas da tabela usuarios'],
  relatorios:   ['Que relatórios existem?', 'Como exportar PDF?'],
  configuracoes:['O que posso configurar?'],
}

// Perguntas rápidas refinadas por aba
const RAPIDAS_POR_ABA = {
  entrada:      ['Como tramitar um processo?', 'Como abrir novo processo?', 'O que é DID?'],
  enviados:     ['O que são processos enviados?', 'Como ver histórico de tramitações?'],
  entidade:     ['O que preencher aqui?', 'Para que serve o brasão?'],
  secretarias:  ['Como criar uma secretaria?', 'Como adicionar setores?'],
  agentes:      ['O que é um agente?', 'Como vincular a uma secretaria?'],
  responsaveis: ['Como cadastrar um responsável?', 'O que é amparo legal?'],
  painel:       ['O que vejo no painel?', 'Como filtrar por período?'],
  itens:        ['Como cadastrar um item?', 'O que é catálogo CNBS?', 'Como usar palavras-chave?'],
  credor:       ['Como cadastrar credor?', 'O que é credor?'],
  contratos:    ['Como criar um contrato?', 'Como vincular itens?'],
  gerais:       ['O que posso configurar?', 'Como alterar o logo?'],
  notificacoes: ['Como ativar e-mail?', 'O que são notificações push?'],
  tema:         ['Como mudar o tema?', 'Como ativar modo escuro?'],
  importexport: ['Como exportar dados?', 'Como fazer backup?'],
  relatorio:    ['Como gerar relatório?', 'Como exportar PDF?'],
  processos:    ['Como ver os processos DID?', 'Como filtrar por período?'],
  lotes:        ['Como registrar entrada?', 'O que informar na nota fiscal?'],
  saidas:       ['Como registrar saída?', 'Como vincular ao setor?'],
  requisicoes:  ['Como aprovar uma requisição?', 'Como criar nova requisição?'],
}

// ══════════════════════════════════════════════════════════════════════════
//  UTILITÁRIOS
// ══════════════════════════════════════════════════════════════════════════

function Markdown({ texto }) {
  const html = texto
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\n/g, '<br/>')
  return <span dangerouslySetInnerHTML={{ __html: html }} />
}

function MsgBolha({ msg }) {
  const [copiado, setCopiado] = useState(false)
  const copiar = () => {
    navigator.clipboard.writeText(msg.texto).then(() => {
      setCopiado(true)
      setTimeout(() => setCopiado(false), 2000)
    })
  }
  if (msg.role === 'user') {
    return (
      <div className="flex justify-end">
        <div className="bg-blue-600 text-white px-3 py-2 rounded-xl rounded-tr-sm max-w-[85%] text-xs leading-relaxed shadow-sm">
          {msg.texto}
        </div>
      </div>
    )
  }
  return (
    <div className="flex items-start gap-1.5">
      <AylaAvatar size={28} ring className="shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        {msg.loading ? (
          <div className="bg-gray-100 dark:bg-gray-700 px-3 py-2 rounded-xl rounded-tl-sm inline-flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 bg-violet-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
            <span className="w-1.5 h-1.5 bg-violet-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
            <span className="w-1.5 h-1.5 bg-violet-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
          </div>
        ) : (
          <div className="group relative">
            <div className="bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-100 px-3 py-2 rounded-xl rounded-tl-sm text-xs leading-relaxed shadow-sm">
              <Markdown texto={msg.texto} />
            </div>
            <button
              onClick={copiar}
              className="absolute -bottom-0.5 right-0 opacity-0 group-hover:opacity-100 transition-opacity p-0.5 bg-white dark:bg-gray-600 rounded shadow-sm border border-gray-200 dark:border-gray-500"
              title="Copiar">
              {copiado
                ? <CheckCheck className="w-3 h-3 text-green-500" />
                : <ClipboardCopy className="w-3 h-3 text-gray-400" />}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════
//  COMPONENTE GLOBAL — FLOATING CHAT
// ══════════════════════════════════════════════════════════════════════════

export default function JAI() {
  const location = useLocation()
  const pagKey   = detectarPagina(location.pathname)
  const abaKey   = detectarAba(location.pathname)
  const pag      = PAGINAS[pagKey] || PAGINAS.dashboard
  const abaInfo  = abaKey ? ABA_LABEL[abaKey] : null
  const abaDicas = abaKey ? (DICAS_ABA[abaKey] || []) : []
  // Label exibido no header: "Módulo > Aba" ou só "Módulo"
  const headerLabel = abaInfo ? `${pag.nome} › ${abaInfo.label}` : pag.nome
  const headerIcone = abaInfo ? abaInfo.icone : pag.icone

  const [aberto,    setAberto]    = useState(false)
  const [input,     setInput]     = useState('')
  const [msgs,      setMsgs]      = useState([])
  const [minimized, setMinimized] = useState(false)
  const [pulsar,    setPulsar]    = useState(true)
  const [schemaCtx, setSchemaCtx] = useState(null) // Schema Context do banco
  const bottomRef = useRef(null)
  const inputRef  = useRef(null)

  // Carrega o Schema Context do banco uma única vez ao montar
  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) return // não autenticado, pula
    api.get('/schema-context')
      .then(res => setSchemaCtx(res.data))
      .catch(() => {/* falha silenciosa — JAI continua funcionando sem schema */})
  }, [])

  // Mensagem de boas-vindas ao abrir pela 1ª vez
  useEffect(() => {
    if (aberto && msgs.length === 0) {
      const abaCtx = abaInfo ? ` — aba **${abaInfo.label}** ${abaInfo.icone}` : ''
      addResposta(`Olá! 👋 Sou a **Ayla**, assistente inteligente do **jProcesso**.\n\nVocê está em **${pag.nome}** ${pag.icone}${abaCtx}.\n\nComo posso te ajudar?`)
    }
    if (aberto) {
      setPulsar(false)
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [aberto])

  // Atualiza contexto ao mudar de página ou aba
  useEffect(() => {
    if (aberto && msgs.length > 0) {
      const abaCtx = abaInfo ? ` — **${abaInfo.label}** ${abaInfo.icone}` : ''
      const dicaFinal = (abaDicas.length > 0 ? abaDicas : pag.dicas)[0]
      addResposta(`📍 Você foi para **${pag.nome}** ${pag.icone}${abaCtx}.\n\n${dicaFinal}`)
    }
  }, [location.pathname])

  const scrollBottom = () => setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50)

  const addResposta = useCallback((texto) => {
    const idLoading = Date.now()
    setMsgs(p => [...p, { id: idLoading, role: 'jai', loading: true }])
    scrollBottom()
    setTimeout(() => {
      setMsgs(p => p.map(m => m.id === idLoading ? { id: idLoading, role: 'jai', texto } : m))
      scrollBottom()
    }, 600 + Math.random() * 400)
  }, [])

  const enviar = (textoOverride) => {
    const texto = (textoOverride ?? input).trim()
    if (!texto) return
    setMsgs(p => [...p, { id: Date.now(), role: 'user', texto }])
    setInput('')
    scrollBottom()
    const resposta = gerarResposta(texto, pagKey, schemaCtx, abaKey)
    addResposta(resposta)
  }

  const limpar = () => {
    setMsgs([])
    const abaCtx = abaInfo ? ` — ${abaInfo.label} ${abaInfo.icone}` : ''
    addResposta(`Histórico limpo! 🧹\n\nEstou aqui se precisar de ajuda com **${pag.nome}** ${pag.icone}${abaCtx}.`)
  }

  const rapidas = (abaKey && RAPIDAS_POR_ABA[abaKey]) || RAPIDAS_POR_PAGINA[pagKey] || RAPIDAS_POR_PAGINA.dashboard

  return (
    <>
      {/* ── Botão flutuante 3D ── */}
      <style>{`
        @keyframes aylaFloat { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-6px)} }
        @keyframes aylaGlow  { 0%,100%{box-shadow:0 0 14px 4px rgba(168,85,247,.5),0 6px 20px rgba(0,0,0,.3)} 50%{box-shadow:0 0 22px 8px rgba(168,85,247,.75),0 6px 24px rgba(0,0,0,.35)} }
      `}</style>
      <button
        onClick={() => setAberto(p => !p)}
        title="Ayla — Assistente Inteligente"
        className={`
          fixed bottom-14 right-5 z-[65] flex flex-col items-center gap-1
          bg-transparent border-none outline-none p-0
          transition-all duration-300
          ${aberto ? 'opacity-0 pointer-events-none scale-75' : 'opacity-100 scale-100'}
        `}
        style={{ background: 'none', boxShadow: 'none' }}
      >
        <div className="relative">
          <AylaAvatar size={64} float glow
            style={{ filter: 'drop-shadow(0 8px 18px rgba(124,58,237,.65))' }}
          />
          <span className="absolute bottom-1 right-1 w-3 h-3 bg-green-400 border-2 border-white rounded-full" />
        </div>
      </button>

      {/* ── Painel de chat ── */}
      {aberto && (
        <div className={`
          fixed right-4 z-[65] flex flex-col
          bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700
          transition-all duration-300 overflow-hidden
          ${minimized ? 'bottom-14 h-12 w-72' : 'bottom-14 w-80 h-[480px] max-h-[calc(100vh-6rem)]'}
        `}>
          {/* Header */}
          <div className="flex items-center justify-between px-3 py-2.5 bg-gradient-to-r from-violet-600 to-purple-700 shrink-0">
            <div className="flex items-center gap-2">
              <AylaAvatar size={36} ring />
              <div>
                <span className="text-sm font-bold text-white">Ayla</span>
                <span className="text-[10px] text-violet-200 ml-1.5">• online</span>
                {schemaCtx && (
                  <span className="ml-1.5 text-[9px] text-green-300" title={`${schemaCtx.tables?.length || 0} tabelas — atualizado em ${new Date(schemaCtx.generated_at).toLocaleString('pt-BR')}`}>
                    🗄️ {schemaCtx.tables?.length || 0}t
                  </span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-[10px] text-violet-200">{headerIcone} {headerLabel}</span>
              <button onClick={limpar} title="Limpar conversa" className="p-1 rounded hover:bg-white/20 text-white/70 hover:text-white transition-colors">
                <RotateCcw className="w-3 h-3" />
              </button>
              <button onClick={() => setMinimized(p => !p)} className="p-1 rounded hover:bg-white/20 text-white/70 hover:text-white transition-colors">
                {minimized ? <Maximize2 className="w-3 h-3" /> : <Minimize2 className="w-3 h-3" />}
              </button>
              <button onClick={() => setAberto(false)} className="p-1 rounded hover:bg-white/20 text-white/70 hover:text-white transition-colors">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {!minimized && (
            <>
              {/* Mensagens */}
              <div className="flex-1 overflow-y-auto p-3 space-y-3 scroll-smooth">
                {msgs.map(m => <MsgBolha key={m.id} msg={m} />)}
                <div ref={bottomRef} />
              </div>

              {/* Ações rápidas */}
              <div className="px-3 pb-1.5 flex gap-1.5 flex-wrap shrink-0">
                {rapidas.map(r => (
                  <button key={r} onClick={() => enviar(r)}
                    className="px-2 py-0.5 bg-violet-50 dark:bg-violet-900/20 hover:bg-violet-100 dark:hover:bg-violet-900/40 text-violet-700 dark:text-violet-300 rounded-full text-[10px] font-medium border border-violet-200 dark:border-violet-700 transition-colors whitespace-nowrap">
                    {r}
                  </button>
                ))}
              </div>

              {/* Input */}
              <div className="px-3 pb-3 shrink-0 border-t border-gray-100 dark:border-gray-700 pt-2">
                <div className="flex gap-2 items-center bg-gray-50 dark:bg-gray-700/50 rounded-xl border border-gray-200 dark:border-gray-600 px-3 py-1.5">
                  <input
                    ref={inputRef}
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), enviar())}
                    placeholder="Pergunte algo..."
                    className="flex-1 bg-transparent text-xs text-gray-700 dark:text-gray-200 placeholder-gray-400 outline-none"
                  />
                  <button onClick={() => enviar()} disabled={!input.trim()}
                    className="p-1 rounded-lg bg-violet-600 hover:bg-violet-700 text-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                    <Send className="w-3 h-3" />
                  </button>
                </div>
                <p className="text-center text-[9px] text-gray-300 dark:text-gray-600 mt-1.5">
                  Ayla · JEOS Sistemas de Governo
                </p>
              </div>
            </>
          )}
        </div>
      )}
    </>
  )
}

// ══════════════════════════════════════════════════════════════════════════
//  JAIButton — Botão inline para campos de formulário
// ══════════════════════════════════════════════════════════════════════════

const SUGESTOES_CAMPO = {
  descricao_item: [
    'RESMA DE PAPEL A4 75G/M²',
    'CANETA ESFEROGRÁFICA AZUL',
    'TONER PARA IMPRESSORA',
    'CADEIRA GIRATÓRIA DE ESCRITÓRIO',
    'NOTEBOOK PROCESSADOR I5',
    'MATERIAL DE LIMPEZA GERAL',
  ],
  especificacao: [
    'Produto de primeira qualidade, conforme normas técnicas vigentes e especificações do fabricante.',
    'Material a ser entregue em perfeitas condições de uso, embalado e identificado, conforme solicitação.',
    'Serviço a ser executado por profissional habilitado, conforme normas técnicas e legislação vigente.',
  ],
  objeto: [
    'Aquisição de material de escritório para as secretarias municipais, exercício {ANO}.',
    'Contratação de serviços de manutenção predial para unidades da Prefeitura Municipal.',
    'Fornecimento parcelado de combustível para a frota de veículos da Prefeitura Municipal.',
    'Prestação de serviços de limpeza e conservação predial para as unidades municipais.',
    'Aquisição de equipamentos de informática para modernização das secretarias.',
  ],
  observacoes: [
    'Processo referente à necessidade identificada pela secretaria solicitante.',
    'Despesa devidamente justificada e dentro dos limites orçamentários previstos.',
    'Conforme solicitação da secretaria, atendendo demanda urgente do período.',
  ],
  palavras: {
    p1: ['PAPEL','CANETA','TONER','CADEIRA','NOTEBOOK','COMBUSTÍVEL','SERVIÇO'],
    p2: ['ESCRITÓRIO','INFORMÁTICA','LIMPEZA','MANUTENÇÃO','DIGITAL','MATERIAL'],
    p3: ['MUNICIPAL','PÚBLICO','FEDERAL','ESTADUAL','REGIONAL'],
    p4: ['2026','GOVERNO','GESTÃO','ADMINISTRATIVO','TÉCNICO'],
  },
}

function substituirAno(texto) {
  return texto.replace('{ANO}', new Date().getFullYear())
}

export function JAIButton({ campo, valorAtual, onSugestao, label, className = '' }) {
  const [aberto,       setAberto]       = useState(false)
  const [sugestoes,    setSugestoes]    = useState([])
  const [copiado,      setCopiado]      = useState(null)
  const [popoverStyle, setPopoverStyle] = useState({ bottom: 'calc(100% + 4px)', top: 'auto', left: 0, right: 'auto' })
  const ref = useRef(null)

  useEffect(() => {
    const fechar = (e) => { if (ref.current && !ref.current.contains(e.target)) setAberto(false) }
    document.addEventListener('mousedown', fechar)
    return () => document.removeEventListener('mousedown', fechar)
  }, [])

  const abrir = () => {
    if (ref.current) {
      const rect          = ref.current.getBoundingClientRect()
      const acimaDaMetade = rect.top < window.innerHeight / 2
      const cabeDireita   = rect.left + 288 < window.innerWidth
      setPopoverStyle({
        ...(acimaDaMetade
          ? { top: 'calc(100% + 4px)', bottom: 'auto' }
          : { bottom: 'calc(100% + 4px)', top: 'auto' }),
        ...(cabeDireita
          ? { left: 0, right: 'auto' }
          : { right: 0, left: 'auto' }),
      })
    }
    let lista = []
    if (campo === 'objeto')             lista = SUGESTOES_CAMPO.objeto.map(substituirAno)
    else if (campo === 'especificacao') lista = SUGESTOES_CAMPO.especificacao
    else if (campo === 'observacoes')   lista = SUGESTOES_CAMPO.observacoes
    else if (campo === 'descricao_item') lista = SUGESTOES_CAMPO.descricao_item
    else if (campo === 'palavra1')      lista = SUGESTOES_CAMPO.palavras.p1
    else if (campo === 'palavra2')      lista = SUGESTOES_CAMPO.palavras.p2
    else if (campo === 'palavra3')      lista = SUGESTOES_CAMPO.palavras.p3
    else if (campo === 'palavra4')      lista = SUGESTOES_CAMPO.palavras.p4
    else lista = ['Sugestão 1 para este campo', 'Sugestão 2 para este campo']
    setSugestoes(lista)
    setAberto(true)
  }

  const usar = (s) => {
    onSugestao(s)
    setCopiado(s)
    setTimeout(() => setCopiado(null), 1500)
    setAberto(false)
  }

  return (
    <div className={`relative inline-block ${className}`} ref={ref}>
      <button
        type="button"
        onClick={abrir}
        title="Ayla — Sugestões inteligentes"
        className="flex items-center gap-1 px-2 py-1 bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 text-white rounded text-[11px] font-semibold shadow-sm transition-all duration-150 whitespace-nowrap"
      >
        <Sparkles className="w-3 h-3" />
        {label || 'Ayla'}
      </button>

      {aberto && (
        <div className="absolute z-[60] bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 w-72 overflow-hidden"
          style={popoverStyle}>
          {/* Header do popover */}
          <div className="flex items-center justify-between px-3 py-2 bg-gradient-to-r from-violet-600 to-purple-700">
            <div className="flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-white" />
              <span className="text-[11px] font-bold text-white">Ayla — Sugestões</span>
            </div>
            <button onClick={() => setAberto(false)} className="text-white/70 hover:text-white">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="p-2">
            <p className="text-[10px] text-gray-400 dark:text-gray-500 px-1 mb-1.5">
              Clique para usar a sugestão no campo:
            </p>
            <div className="space-y-1 max-h-48 overflow-y-auto">
              {sugestoes.map((s, i) => (
                <button key={i} onClick={() => usar(s)}
                  className="w-full text-left px-2.5 py-2 rounded-lg hover:bg-violet-50 dark:hover:bg-violet-900/20 text-xs text-gray-700 dark:text-gray-300 border border-transparent hover:border-violet-200 dark:hover:border-violet-700 transition-colors leading-snug">
                  <Wand2 className="w-3 h-3 inline mr-1.5 text-violet-400 shrink-0" />
                  {s}
                </button>
              ))}
            </div>
            <p className="text-[9px] text-gray-300 dark:text-gray-600 text-center mt-2">
              Ayla · JEOS Sistemas
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
