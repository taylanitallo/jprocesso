// Campo de texto que já abre com uma sugestão da Ayla quando vem em branco.
// Substitui o <textarea> direto: aceita as mesmas props (name, value, onChange,
// rows, className, placeholder, required…) e mais:
//   campo    — chave estável do campo (ex. 'processo.tramitar.despacho'); o histórico
//              de textos do usuário é guardado por ela
//   rotulo   — nome legível para a IA (ex. 'Despacho de tramitação do processo')
//   contexto — dados da tela que a IA pode usar (assunto, descrição, destino…)
//   pronto   — false enquanto o contexto ainda está carregando (adia a sugestão)
// Ao entrar no campo aparece também a lista dos textos que o usuário mais usa nele.
//   quando   — 'abrir' (padrão): sugere assim que o campo aparece; 'focar': só quando o
//              usuário entra no campo (telas em que o contexto é digitado logo acima)
//   extenso  — documento (ofício, portaria…): até alguns parágrafos em vez de 1–4 frases
// O texto que o usuário enviar é registrado ao submeter o <form> do campo ou quando o
// campo passa a bloqueado depois de salvar (seções do DID: disabled false → true); fora de
// um form (ou quando o envio ainda depende de assinatura — registrarNoEnvio={false}),
// chame registrarTextoUsado (utils/sugestaoAyla) depois do envio dar certo.
// onChange recebe um evento (real ao digitar; { target: { name, value } } quando a
// sugestão é aplicada), então funciona com handleChange(e) e e => set(e.target.value).
import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react'
import { Sparkles, RotateCw, X, Loader2, History } from 'lucide-react'
import { pedirSugestao, registrarTextoUsado, buscarFrequentes } from '../../utils/sugestaoAyla'

const CampoSugerido = forwardRef(function CampoSugerido(
  { campo, rotulo, contexto, quando = 'abrir', extenso = false, pronto = true, sugerir = true, registrarNoEnvio = true, value, defaultValue, onChange, name, disabled, readOnly, className = 'input-field resize-none', ...props },
  ref
) {
  const controlado = value !== undefined
  const [interno, setInterno] = useState(defaultValue ?? '')
  const atual = controlado ? (value ?? '') : interno

  const [carregando, setCarregando] = useState(false)
  const [sugerido, setSugerido] = useState('') // última sugestão aplicada
  const [falhou, setFalhou] = useState(false)   // a IA não respondeu (mostra "tentar de novo")
  const textareaRef = useRef(null)
  useImperativeHandle(ref, () => textareaRef.current)

  // Refs com o valor/contexto mais recentes (as respostas da IA chegam depois)
  const atualRef = useRef(atual); atualRef.current = atual
  const contextoRef = useRef(contexto); contextoRef.current = contexto
  const pedidoRef = useRef(0)
  const editadoRef = useRef(false) // digitou ou aplicou sugestão desde que o campo foi liberado
  const ativoRef = useRef(false)

  const aplicar = useCallback((texto) => {
    editadoRef.current = true
    if (!controlado) setInterno(texto)
    onChange?.({ target: { name, value: texto }, currentTarget: { name, value: texto } })
  }, [controlado, onChange, name])

  const gerar = useCallback(async ({ outra = false } = {}) => {
    const id = ++pedidoRef.current
    const antes = atualRef.current
    setCarregando(true)
    setFalhou(false)
    const texto = await pedirSugestao({ campo, rotulo, extenso, contexto: contextoRef.current, anterior: outra ? antes : undefined })
    if (id !== pedidoRef.current) return
    setCarregando(false)
    if (!texto) { setFalhou(true); return }
    // Se o usuário escreveu algo enquanto a IA respondia (ou o campo foi bloqueado), não aplica
    if (atualRef.current !== antes || !ativoRef.current) return
    setSugerido(texto)
    aplicar(texto)
  }, [campo, rotulo, extenso, aplicar])

  // Sugestão automática: uma vez, quando o campo está em branco e o contexto pronto
  const jaPediu = useRef(false)
  const ativo = sugerir && !disabled && !readOnly && !!campo
  ativoRef.current = ativo
  useEffect(() => {
    if (quando !== 'abrir' || !ativo || !pronto || jaPediu.current || String(atual).trim()) return
    jaPediu.current = true
    let disparou = false
    const t = setTimeout(() => { disparou = true; if (!String(atualRef.current).trim()) gerar() }, 300)
    // Bloqueado logo em seguida (seção já salva): pode sugerir quando for liberado de novo
    return () => { clearTimeout(t); if (!disparou) jaPediu.current = false }
  }, [ativo, pronto]) // eslint-disable-line react-hooks/exhaustive-deps

  // Registra o texto enviado quando o formulário do campo é submetido
  useEffect(() => {
    const form = textareaRef.current?.form
    if (!form || !campo || !registrarNoEnvio) return
    const aoEnviar = () => registrarTextoUsado(campo, atualRef.current, contextoRef.current)
    form.addEventListener('submit', aoEnviar)
    return () => form.removeEventListener('submit', aoEnviar)
  }, [campo, registrarNoEnvio])

  // Seções que bloqueiam o campo depois de salvar (DID): bloqueou com texto = enviado
  // (só se o usuário mexeu no texto enquanto estava liberado — nada de registrar o já salvo)
  const estavaLivre = useRef(!disabled && !readOnly)
  useEffect(() => {
    const livre = !disabled && !readOnly
    if (estavaLivre.current && !livre && registrarNoEnvio && campo && editadoRef.current) {
      registrarTextoUsado(campo, atualRef.current, contextoRef.current)
    }
    if (estavaLivre.current !== livre) editadoRef.current = false
    estavaLivre.current = livre
  }, [disabled, readOnly]) // eslint-disable-line react-hooks/exhaustive-deps

  // "Seus textos mais usados": lista ao entrar no campo, filtrada pelo que se digita
  // (como o autocompletar do navegador no assunto do processo)
  const [frequentes, setFrequentes] = useState([])
  const [focado, setFocado] = useState(false)
  const [listaFechada, setListaFechada] = useState(false)
  const normal = (t) => String(t || '').toLowerCase().replace(/\s+/g, ' ').trim()
  const digitado = normal(atual)
  const mostrarTodos = !digitado || atual === sugerido || frequentes.some(f => normal(f.texto) === digitado)
  const listaVisivel = (mostrarTodos ? frequentes : frequentes.filter(f => normal(f.texto).includes(digitado)))
    .filter(f => normal(f.texto) !== digitado)
    .slice(0, 6)
  const abrirLista = ativo && focado && !listaFechada && listaVisivel.length > 0

  const escolher = (texto) => {
    pedidoRef.current++
    setCarregando(false)
    setSugerido('')
    aplicar(texto)
    setListaFechada(true)
  }

  const limpouAgora = useRef(false) // o foco veio do botão Limpar: deixa o usuário escrever
  const aoFocar = (e) => {
    props.onFocus?.(e)
    setFocado(true)
    setListaFechada(false)
    if (ativo && campo) buscarFrequentes(campo).then(setFrequentes)
    if (!ativo || !pronto || carregando || String(atualRef.current).trim() || limpouAgora.current) return
    // Entrou num campo vazio: sugere ('abrir' só depois da sugestão automática da abertura;
    // depois de Limpar, sugere de novo quando o usuário sair e voltar ao campo)
    if (quando === 'abrir' && !jaPediu.current) return
    jaPediu.current = true
    gerar()
  }

  const digitar = (e) => {
    pedidoRef.current++ // descarta sugestão em andamento
    editadoRef.current = true
    setCarregando(false)
    if (!controlado) setInterno(e.target.value)
    setListaFechada(false)
    onChange?.(e)
  }

  const ehSugestao = !!sugerido && !!String(atual).trim()

  return (
    <div className="relative">
      <textarea
        {...props}
        ref={textareaRef}
        name={name}
        value={atual}
        onChange={digitar}
        onFocus={aoFocar}
        onBlur={(e) => { props.onBlur?.(e); setFocado(false); limpouAgora.current = false }}
        onKeyDown={(e) => { if (e.key === 'Escape' && abrirLista) { e.stopPropagation(); setListaFechada(true) } props.onKeyDown?.(e) }}
        disabled={disabled}
        readOnly={readOnly}
        className={className}
      />
      {abrirLista && (
        <div className="absolute left-0 right-0 z-30 mt-1 max-h-60 overflow-auto rounded-lg border border-ink-200 bg-surface shadow-lg" role="listbox">
          <p className="flex items-center gap-1 px-3 pt-2 pb-1 text-[10px] font-semibold uppercase tracking-wide text-ink-400">
            <History className="h-3 w-3" /> Seus textos mais usados
          </p>
          {listaVisivel.map((f, i) => (
            <button key={i} type="button" role="option" aria-selected="false"
              onMouseDown={(e) => { e.preventDefault(); escolher(f.texto) }}
              className="block w-full px-3 py-1.5 text-left text-xs text-ink-700 hover:bg-violet-50 dark:hover:bg-violet-900/20">
              <span className="line-clamp-2">{f.texto}</span>
              {f.vezes > 1 && <span className="text-[10px] text-ink-400">usado {f.vezes} vezes</span>}
            </button>
          ))}
        </div>
      )}
      {ativo && (
        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px]">
          {carregando ? (
            <span className="flex items-center gap-1 text-violet-600 dark:text-violet-300">
              <Loader2 className="h-3 w-3 animate-spin" /> Ayla escrevendo uma sugestão…
            </span>
          ) : ehSugestao ? (
            <>
              <span className="flex items-center gap-1 font-medium text-violet-600 dark:text-violet-300">
                <Sparkles className="h-3 w-3" /> Sugestão da Ayla — revise antes de enviar
              </span>
              <button type="button" onClick={() => gerar({ outra: true })} className="flex items-center gap-1 text-ink-500 hover:text-violet-600">
                <RotateCw className="h-3 w-3" /> Gerar outra
              </button>
              <button type="button" onClick={() => { pedidoRef.current++; setSugerido(''); aplicar(''); limpouAgora.current = true; textareaRef.current?.focus() }} className="flex items-center gap-1 text-ink-500 hover:text-danger-600">
                <X className="h-3 w-3" /> Limpar
              </button>
            </>
          ) : !String(atual).trim() ? (
            <>
              {falhou && <span className="text-ink-500">A Ayla não conseguiu sugerir agora.</span>}
              <button type="button" onClick={() => gerar()} className="flex items-center gap-1 font-medium text-violet-600 hover:text-violet-700 dark:text-violet-300">
                <Sparkles className="h-3 w-3" /> {falhou ? 'Tentar de novo' : 'Sugerir texto com a Ayla'}
              </button>
            </>
          ) : null}
        </div>
      )}
    </div>
  )
})

export default CampoSugerido
