/**
 * Ayla — Assistente Inteligente do jProcesso
 * ─────────────────────────────────────────────
 * Motor: NVIDIA NIM (meta/llama-3.1-70b-instruct) via backend seguro.
 * Exporta:
 *   default   → Widget flutuante (usado no Layout)
 *   JAIButton → Botão inline para campos de formulário
 */

import { useState, useRef, useEffect, useCallback } from 'react'
import { useLocation } from 'react-router-dom'
import {
  X, Send, Sparkles, RotateCcw, Wand2,
  CheckCheck, ClipboardCopy, Minimize2, Maximize2,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { sendAylaMessage, buildAylaContext } from '../services/aylaApi'

// ── Ayla Avatar ───────────────────────────────────────────────────────────────
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

// ── Markdown seguro (SEC-01B — sem dangerouslySetInnerHTML) ───────────────────
function Markdown({ texto }) {
  const segments = texto.split(/(\*\*.+?\*\*)/g)
  return (
    <span>
      {segments.map((seg, i) => {
        if (seg.startsWith('**') && seg.endsWith('**')) {
          return <strong key={i}>{seg.slice(2, -2)}</strong>
        }
        return seg.split('\n').map((line, j, arr) => (
          <span key={`${i}-${j}`}>
            {line}
            {j < arr.length - 1 && <br />}
          </span>
        ))
      })}
    </span>
  )
}

// ── Bolha de mensagem ─────────────────────────────────────────────────────────
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
          <div className="bg-gray-100 dark:bg-slate-700/30 px-3 py-2 rounded-xl rounded-tl-sm inline-flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 bg-violet-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
            <span className="w-1.5 h-1.5 bg-violet-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
            <span className="w-1.5 h-1.5 bg-violet-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
          </div>
        ) : (
          <div className="group relative">
            <div className="bg-gray-100 dark:bg-slate-700/30 text-gray-800 dark:text-slate-100 px-3 py-2 rounded-xl rounded-tl-sm text-xs leading-relaxed shadow-sm">
              <Markdown texto={msg.texto} />
            </div>
            <button
              onClick={copiar}
              className="absolute -bottom-0.5 right-0 opacity-0 group-hover:opacity-100 transition-opacity p-0.5 bg-white dark:bg-slate-600 rounded shadow-sm border border-gray-200 dark:border-slate-500"
              title="Copiar"
            >
              {copiado
                ? <CheckCheck className="w-3 h-3 text-green-500" />
                : <ClipboardCopy className="w-3 h-3 text-gray-400" />
              }
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Perguntas rápidas por módulo ──────────────────────────────────────────────
const RAPIDAS = {
  Dashboard:      ['Resumo geral do sistema', 'Há processos urgentes?', 'Alertas importantes?'],
  Processos:      ['Quantos processos em andamento?', 'Gargalos de tramitação?', 'Como criar um processo?'],
  Contratos:      ['Contratos vencendo em 30 dias?', 'Quais contratos estão vencidos?', 'Como cadastrar contrato?'],
  Almoxarifado:   ['Itens com estoque baixo?', 'Requisições pendentes?', 'Como funciona inventário?'],
  Financeiro:     ['Resumo das despesas do ano', 'Empenhos pendentes?', 'Como registrar DID?'],
  Organização:    ['Como cadastrar secretaria?', 'Como cadastrar responsável?', 'Diferença entre agente e responsável?'],
  Usuários:       ['Como criar usuário?', 'Quais perfis existem?', 'Como definir permissões?'],
  Registros:      ['Quais usuários mais movimentaram?', 'Onde está o processo X?', 'Atividades recentes?'],
  Patrimônio:     ['Como cadastrar um bem?', 'Como registrar tombamento?', 'Como lançar uma baixa?'],
  Relatórios:     ['Como gerar relatório?', 'Como exportar PDF?'],
  Configurações:  ['Como alterar o logo?', 'Como configurar identidade visual?'],
}

const MSG_BOAS_VINDAS = 'Olá! 👋 Sou a **Ayla**, sua assistente inteligente no jProcesso.\n\nPosso responder perguntas sobre o sistema, analisar indicadores, contratos, estoque, processos e muito mais.\n\nO que você precisa saber?'

// ── Componente principal ──────────────────────────────────────────────────────
export default function JAI() {
  const location          = useLocation()
  const { user, tenant }  = useAuth()

  const [aberto,    setAberto]    = useState(false)
  const [minimized, setMinimized] = useState(false)
  const [input,     setInput]     = useState('')
  const [msgs,      setMsgs]      = useState([])          // display list
  const [aiHistory, setAiHistory] = useState([])          // API history {role, content}[]
  const [aiLoading, setAiLoading] = useState(false)
  const [pulsar,    setPulsar]    = useState(true)

  const bottomRef = useRef(null)
  const inputRef  = useRef(null)

  // Contexto da tela atual
  const ctx = buildAylaContext(location.pathname, user, tenant)
  const moduleName = ctx.module || 'Dashboard'
  const rapidas    = RAPIDAS[moduleName] || RAPIDAS.Dashboard

  const scrollBottom = () => setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50)

  // Boas-vindas ao abrir pela 1ª vez
  useEffect(() => {
    if (aberto && msgs.length === 0) {
      setMsgs([{ id: Date.now(), role: 'jai', texto: MSG_BOAS_VINDAS }])
    }
    if (aberto) {
      setPulsar(false)
      setTimeout(() => inputRef.current?.focus(), 120)
    }
  }, [aberto])

  // Notifica mudança de módulo enquanto o chat está aberto
  useEffect(() => {
    if (aberto && msgs.length > 0) {
      setMsgs(p => [...p, {
        id: Date.now(), role: 'jai',
        texto: `📍 Você foi para **${moduleName}**.\n\nComo posso ajudar nesta tela?`,
      }])
      scrollBottom()
    }
  }, [location.pathname])

  // ── Enviar mensagem ─────────────────────────────────────────────────────────
  const enviar = useCallback(async (textoOverride) => {
    const texto = (textoOverride ?? input).trim()
    if (!texto || aiLoading) return

    setInput('')
    setAiLoading(true)

    const idUser    = Date.now()
    const idLoading = idUser + 1

    // Exibir bolha do usuário + indicador de carregamento
    setMsgs(p => [
      ...p,
      { id: idUser,    role: 'user', texto },
      { id: idLoading, role: 'jai',  texto: '', loading: true },
    ])
    scrollBottom()

    // Histórico atualizado com a nova mensagem do usuário
    const updatedHistory = [...aiHistory, { role: 'user', content: texto }]

    try {
      const response = await sendAylaMessage(texto, ctx, aiHistory)

      setMsgs(p => p.map(m =>
        m.id === idLoading ? { id: idLoading, role: 'jai', texto: response } : m
      ))
      // Salvar troca no histórico para contexto futuro
      setAiHistory([...updatedHistory, { role: 'assistant', content: response }])

    } catch (err) {
      const errMsg = err.response?.data?.error || 'Não consegui processar sua pergunta. Tente novamente.'
      setMsgs(p => p.map(m =>
        m.id === idLoading ? { id: idLoading, role: 'jai', texto: errMsg } : m
      ))
    } finally {
      setAiLoading(false)
      scrollBottom()
    }
  }, [input, aiLoading, aiHistory, ctx])

  // ── Limpar conversa ─────────────────────────────────────────────────────────
  const limpar = () => {
    setMsgs([{
      id: Date.now(), role: 'jai',
      texto: `Conversa reiniciada! 🧹\n\nEstou aqui para ajudar com **${moduleName}**. O que precisa saber?`,
    }])
    setAiHistory([])
    setInput('')
  }

  return (
    <>
      <style>{`
        @keyframes aylaFloat { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-6px)} }
        @keyframes aylaGlow  { 0%,100%{box-shadow:0 0 14px 4px rgba(168,85,247,.5),0 6px 20px rgba(0,0,0,.3)} 50%{box-shadow:0 0 22px 8px rgba(168,85,247,.75),0 6px 24px rgba(0,0,0,.35)} }
      `}</style>

      {/* ── Botão flutuante ───────────────────────────────────────────────── */}
      <button
        onClick={() => setAberto(p => !p)}
        title="Ayla — Assistente Inteligente"
        className={`
          fixed bottom-14 right-5 z-[65] flex flex-col items-center gap-1
          bg-transparent border-none outline-none p-0 transition-all duration-300
          ${aberto ? 'opacity-0 pointer-events-none scale-75' : 'opacity-100 scale-100'}
        `}
        style={{ background: 'none', boxShadow: 'none' }}
      >
        <div className="relative">
          <AylaAvatar size={64} float glow />
          <span className="absolute bottom-1 right-1 w-3 h-3 bg-green-400 border-2 border-white rounded-full" />
        </div>
      </button>

      {/* ── Painel de chat ────────────────────────────────────────────────── */}
      {aberto && (
        <div className={`
          fixed right-4 z-[65] flex flex-col
          bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-slate-700/50
          transition-all duration-300 overflow-hidden
          ${minimized ? 'bottom-14 h-12 w-72' : 'bottom-14 w-80 h-[480px] max-h-[calc(100vh-6rem)]'}
        `}>

          {/* Header */}
          <div className="flex items-center justify-between px-3 py-2.5 bg-gradient-to-r from-violet-600 to-purple-700 shrink-0">
            <div className="flex items-center gap-2">
              <AylaAvatar size={36} ring />
              <div>
                <span className="text-sm font-bold text-white">Ayla</span>
                <span className="text-[10px] text-violet-200 ml-1.5">• IA ativa</span>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-[10px] text-violet-200 mr-1 hidden sm:inline">{moduleName}</span>
              <button onClick={limpar} title="Limpar conversa"
                className="p-1 rounded hover:bg-white/20 text-white/70 hover:text-white transition-colors">
                <RotateCcw className="w-3 h-3" />
              </button>
              <button onClick={() => setMinimized(p => !p)}
                className="p-1 rounded hover:bg-white/20 text-white/70 hover:text-white transition-colors">
                {minimized ? <Maximize2 className="w-3 h-3" /> : <Minimize2 className="w-3 h-3" />}
              </button>
              <button onClick={() => setAberto(false)}
                className="p-1 rounded hover:bg-white/20 text-white/70 hover:text-white transition-colors">
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

              {/* Perguntas rápidas */}
              <div className="px-3 pb-1.5 flex gap-1.5 flex-wrap shrink-0">
                {rapidas.map(r => (
                  <button key={r} onClick={() => enviar(r)} disabled={aiLoading}
                    className="px-2 py-0.5 bg-violet-50 dark:bg-violet-900/20 hover:bg-violet-100 dark:hover:bg-violet-900/40
                               text-violet-700 dark:text-violet-300 rounded-full text-[10px] font-medium
                               border border-violet-200 dark:border-violet-700 transition-colors whitespace-nowrap
                               disabled:opacity-40 disabled:cursor-not-allowed">
                    {r}
                  </button>
                ))}
              </div>

              {/* Input */}
              <div className="px-3 pb-3 shrink-0 border-t border-gray-100 dark:border-slate-700/50 pt-2">
                <div className="flex gap-2 items-center bg-gray-50 dark:bg-slate-700/30 rounded-xl border border-gray-200 dark:border-slate-600 px-3 py-1.5">
                  <input
                    ref={inputRef}
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), enviar())}
                    placeholder={aiLoading ? 'Ayla está pensando...' : 'Pergunte algo...'}
                    disabled={aiLoading}
                    maxLength={2000}
                    className="flex-1 bg-transparent text-xs text-gray-700 dark:text-slate-200 placeholder-gray-400 outline-none disabled:opacity-60"
                  />
                  <button onClick={() => enviar()} disabled={!input.trim() || aiLoading}
                    className="p-1 rounded-lg bg-violet-600 hover:bg-violet-700 text-white
                               disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                    <Send className="w-3 h-3" />
                  </button>
                </div>
                <p className="text-center text-[9px] text-gray-300 dark:text-slate-600 mt-1.5">
                  Ayla · JEOS SISTEMAS E ASSESSORIAS LTDA
                </p>
              </div>
            </>
          )}
        </div>
      )}
    </>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
//  JAIButton — Botão inline de sugestões para campos de formulário
// ══════════════════════════════════════════════════════════════════════════════

const SUGESTOES_CAMPO = {
  descricao_item: [
    'RESMA DE PAPEL A4 75G/M²', 'CANETA ESFEROGRÁFICA AZUL', 'TONER PARA IMPRESSORA',
    'CADEIRA GIRATÓRIA DE ESCRITÓRIO', 'NOTEBOOK PROCESSADOR I5', 'MATERIAL DE LIMPEZA GERAL',
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
      const rect        = ref.current.getBoundingClientRect()
      const acima       = rect.top < window.innerHeight / 2
      const cabeDireita = rect.left + 288 < window.innerWidth
      setPopoverStyle({
        ...(acima ? { top: 'calc(100% + 4px)', bottom: 'auto' } : { bottom: 'calc(100% + 4px)', top: 'auto' }),
        ...(cabeDireita ? { left: 0, right: 'auto' } : { right: 0, left: 'auto' }),
      })
    }
    let lista = []
    if (campo === 'objeto')              lista = SUGESTOES_CAMPO.objeto.map(substituirAno)
    else if (campo === 'especificacao')  lista = SUGESTOES_CAMPO.especificacao
    else if (campo === 'observacoes')    lista = SUGESTOES_CAMPO.observacoes
    else if (campo === 'descricao_item') lista = SUGESTOES_CAMPO.descricao_item
    else if (campo === 'palavra1')       lista = SUGESTOES_CAMPO.palavras.p1
    else if (campo === 'palavra2')       lista = SUGESTOES_CAMPO.palavras.p2
    else if (campo === 'palavra3')       lista = SUGESTOES_CAMPO.palavras.p3
    else if (campo === 'palavra4')       lista = SUGESTOES_CAMPO.palavras.p4
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
        className="flex items-center gap-1 px-2 py-1 bg-gradient-to-r from-violet-500 to-purple-600
                   hover:from-violet-600 hover:to-purple-700 text-white rounded text-[11px] font-semibold
                   shadow-sm transition-all duration-150 whitespace-nowrap"
      >
        <Sparkles className="w-3 h-3" />
        {label || 'Ayla'}
      </button>

      {aberto && (
        <div className="absolute z-[60] bg-white dark:bg-slate-900 rounded-xl shadow-xl
                        border border-gray-200 dark:border-slate-700/50 w-72 overflow-hidden"
          style={popoverStyle}>
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
            <p className="text-[10px] text-gray-400 dark:text-slate-500 px-1 mb-1.5">
              Clique para usar a sugestão no campo:
            </p>
            <div className="space-y-1 max-h-48 overflow-y-auto">
              {sugestoes.map((s, i) => (
                <button key={i} onClick={() => usar(s)}
                  className="w-full text-left px-2.5 py-2 rounded-lg hover:bg-violet-50 dark:hover:bg-violet-900/20
                             text-xs text-gray-700 dark:text-slate-300 border border-transparent
                             hover:border-violet-200 dark:hover:border-violet-700 transition-colors leading-snug">
                  <Wand2 className="w-3 h-3 inline mr-1.5 text-violet-400 shrink-0" />
                  {s}
                </button>
              ))}
            </div>
            <p className="text-[9px] text-gray-300 dark:text-slate-600 text-center mt-2">
              Ayla · JEOS Sistemas
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
