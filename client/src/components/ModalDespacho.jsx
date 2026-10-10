import { useState, useEffect } from 'react'
import { FileDown, Pencil, Save, X, FileText, ChevronDown, Printer } from 'lucide-react'
import api from '../services/api'
import { useAuth } from '../context/AuthContext'
import { gerarOficioPDF, gerarDespachoPDF } from '../utils/gerarDocumentoPDF'

/* ── Tipos de Despacho ──────────────────────────────────────────────────────── */
const TIPOS = [
  { value: 'oficio',                    label: 'Ofício' },
  { value: 'determinacao_institucional', label: 'Determinação Institucional' },
  { value: 'comunicado',                label: 'Comunicado' },
  { value: 'portaria',                  label: 'Portaria' },
  { value: 'decreto',                   label: 'Decreto' },
  { value: 'encaminhamento',            label: 'Encaminhamento' },
  { value: 'outros',                    label: 'Outros' },
]

const CAMPOS_TIPO = {
  oficio:                    { numero: 'Número do Ofício',    para: true,  ementa: false, referencia: false, titulo_outro: false },
  determinacao_institucional:{ numero: 'Número',              para: true,  ementa: false, referencia: false, titulo_outro: false },
  comunicado:                { numero: 'Número',              para: true,  ementa: false, referencia: false, titulo_outro: false },
  portaria:                  { numero: 'Número da Portaria',  para: false, ementa: true,  referencia: false, titulo_outro: false },
  decreto:                   { numero: 'Número do Decreto',   para: false, ementa: true,  referencia: false, titulo_outro: false },
  encaminhamento:            { numero: false,                 para: true,  ementa: false, referencia: true,  titulo_outro: false },
  outros:                    { numero: false,                 para: true,  ementa: false, referencia: false, titulo_outro: true  },
}

const FORM_VAZIO = {
  tipo_despacho:     '',
  numero:            '',
  ementa:            '',
  referencia:        '',
  titulo_outro:      '',
  para:              '',
  cargo_emissor:     '',
  portaria_nomeacao: '',
  setor_emissor:     '',
  secretaria_emissora:'',
  data_despacho:     new Date().toISOString().slice(0, 10),
  assunto:           '',
  texto:             '',
  nome_assinante:    '',
}

/* ── Componente ─────────────────────────────────────────────────────────────── */
export default function ModalDespacho({ processo, onClose, onSaved }) {
  const { user: currentUser } = useAuth()
  const existing = processo?.despacho_doc

  const [editing, setEditing] = useState(!existing?.texto)
  const [saving,  setSaving]  = useState(false)
  const [error,   setError]   = useState('')

  const buildFormFromExisting = (ex) => ({
    ...FORM_VAZIO,
    ...ex,
    assunto: ex.assunto || processo?.assunto || '',
  })

  const buildFormFromUser = () => ({
    ...FORM_VAZIO,
    assunto:             processo?.assunto || '',
    nome_assinante:      currentUser?.nome || '',
    cargo_emissor:       currentUser?.cargo || '',
    portaria_nomeacao:   currentUser?.portaria_nomeacao || '',
    setor_emissor:       currentUser?.setor?.nome || '',
    secretaria_emissora: currentUser?.secretaria?.nome || '',
  })

  const [form, setForm] = useState(() =>
    existing?.tipo_despacho ? buildFormFromExisting(existing) : buildFormFromUser()
  )

  // Sincroniza quando os dados do processo chegam do servidor (refetch após salvar)
  const despachoTipoSalvo = processo?.despacho_doc?.tipo_despacho || null
  useEffect(() => {
    const ex = processo?.despacho_doc
    if (ex?.tipo_despacho) {
      setForm(buildFormFromExisting(ex))
      setEditing(false)
    } else {
      setForm(buildFormFromUser())
      setEditing(true)
    }
  }, [processo?.id, despachoTipoSalvo])

  const set = (field) => (e) => setForm(f => ({ ...f, [field]: e.target.value }))

  const cfg = CAMPOS_TIPO[form.tipo_despacho] || null

  const handleSalvar = async () => {
    if (!form.tipo_despacho) { setError('Selecione o tipo de despacho.'); return }
    if (!form.texto.trim())  { setError('O texto é obrigatório.'); return }
    setError('')
    setSaving(true)
    try {
      const { data } = await api.patch(`/processos/${processo.id}/despacho-doc`, form)
      onSaved && onSaved(data.despacho_doc)
      setEditing(false)
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao salvar.')
    } finally {
      setSaving(false)
    }
  }

  const handleGerarPDF = (imprimir = false) => {
    if (form.tipo_despacho === 'oficio') {
      gerarOficioPDF({ processo, form, tenant: currentUser?.secretaria, imprimir })
    } else {
      gerarDespachoPDF({ ...processo, _despacho_doc_form: form }, imprimir)
    }
  }

  /* ── Estilos ── */
  const lbl = 'block text-xs font-semibold text-ink-600 uppercase tracking-wide mb-1'
  const inp = 'w-full border border-ink-300 rounded-lg px-3 py-2 text-sm bg-surface text-ink-900 focus:outline-hidden focus:ring-2 focus:ring-indigo-500'
  const ro  = 'w-full rounded-lg px-3 py-2 text-sm bg-ink-50 text-ink-800 border border-ink-200'
  const sel = inp + ' appearance-none cursor-pointer pr-8'

  const tipoLabel = TIPOS.find(t => t.value === form.tipo_despacho)?.label || '—'
  const savedAndClean = !editing && form.texto

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-surface rounded-xl shadow-2xl w-full max-w-2xl my-4">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-ink-200">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-indigo-600" />
            <h2 className="text-lg font-bold text-ink-900">
              {form.tipo_despacho ? tipoLabel : 'Despacho'}
            </h2>
            <span className="text-xs bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 px-2 py-0.5 rounded-full font-medium">
              {processo?.numero}
            </span>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-ink-100 text-ink-500">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Corpo */}
        <div className="px-6 py-5 space-y-4 max-h-[70vh] overflow-y-auto">

          {/* Tipo */}
          <div>
            <label className={lbl}>Tipo de Despacho <span className="text-danger-500">*</span></label>
            {editing ? (
              <div className="relative">
                <select className={sel} value={form.tipo_despacho} onChange={set('tipo_despacho')}>
                  <option value="">Selecione o tipo...</option>
                  {TIPOS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
                <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-400 pointer-events-none" />
              </div>
            ) : (
              <p className={ro + ' font-semibold text-indigo-700 dark:text-indigo-300'}>{tipoLabel}</p>
            )}
          </div>

          {/* ══ OFÍCIO — formulário específico ══════════════════════════════════ */}
          {form.tipo_despacho === 'oficio' && (
            <>
              {/* Número + Data */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={lbl}>Número do Ofício</label>
                  {editing
                    ? <input className={inp} value={form.numero} onChange={set('numero')} placeholder="Ex: 001/2026" />
                    : <p className={ro}>{form.numero || '—'}</p>}
                </div>
                <div>
                  <label className={lbl}>Data</label>
                  {editing
                    ? <input type="date" className={inp} value={form.data_despacho} onChange={set('data_despacho')} />
                    : <p className={ro}>{form.data_despacho ? new Date(form.data_despacho + 'T12:00:00').toLocaleDateString('pt-BR') : '—'}</p>}
                </div>
              </div>

              {/* Assunto */}
              <div>
                <label className={lbl}>Assunto</label>
                {editing
                  ? <input className={inp} value={form.assunto} onChange={set('assunto')} placeholder="Assunto do Ofício..." />
                  : <p className={ro}>{form.assunto || '—'}</p>}
              </div>

              {/* Destinatário */}
              <div>
                <label className={lbl}>Destinatário</label>
                {editing
                  ? <input className={inp} value={form.para} onChange={set('para')} placeholder="Nome / Órgão / Empresa destinatária" />
                  : <p className={ro}>{form.para || '—'}</p>}
              </div>

              {/* Texto */}
              <div>
                <label className={lbl}>Texto do Ofício <span className="text-danger-500">*</span></label>
                {editing
                  ? <textarea className={inp + ' resize-none'} rows={8} value={form.texto} onChange={set('texto')} placeholder="Corpo do ofício..." />
                  : <pre className={ro + ' whitespace-pre-wrap leading-relaxed min-h-[80px]'}>{form.texto || '—'}</pre>}
              </div>

              {/* Assinatura */}
              <div className="rounded-xl border border-indigo-200 dark:border-indigo-700/50 bg-indigo-50/50 dark:bg-indigo-900/10 p-4 space-y-3">
                <p className="text-xs font-bold text-indigo-700 dark:text-indigo-400 uppercase tracking-wide">Assinatura</p>

                <div>
                  <label className={lbl}>Nome do Assinante</label>
                  {editing
                    ? <input className={inp} value={form.nome_assinante} onChange={set('nome_assinante')} placeholder="Nome completo" />
                    : <p className={ro + ' font-semibold'}>{form.nome_assinante || '—'}</p>}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={lbl}>Cargo</label>
                    {editing
                      ? <input className={inp} value={form.cargo_emissor} onChange={set('cargo_emissor')} placeholder="Ex: Prefeito Municipal" />
                      : <p className={ro}>{form.cargo_emissor || '—'}</p>}
                  </div>
                  <div>
                    <label className={lbl}>Portaria de Nomeação</label>
                    {editing
                      ? <input className={inp} value={form.portaria_nomeacao} onChange={set('portaria_nomeacao')} placeholder="Ex: Portaria nº 001/2026" />
                      : <p className={ro}>{form.portaria_nomeacao || '—'}</p>}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={lbl}>Setor</label>
                    {editing
                      ? <input className={inp} value={form.setor_emissor} onChange={set('setor_emissor')} placeholder="Ex: Gabinete do Prefeito" />
                      : <p className={ro}>{form.setor_emissor || '—'}</p>}
                  </div>
                  <div>
                    <label className={lbl}>Secretaria</label>
                    {editing
                      ? <input className={inp} value={form.secretaria_emissora} onChange={set('secretaria_emissora')} placeholder="Ex: Secretaria de Administração" />
                      : <p className={ro}>{form.secretaria_emissora || '—'}</p>}
                  </div>
                </div>
              </div>
            </>
          )}

          {/* ══ OUTROS TIPOS ════════════════════════════════════════════════════ */}
          {form.tipo_despacho && form.tipo_despacho !== 'oficio' && cfg && (
            <>
              {cfg.numero && (
                <div>
                  <label className={lbl}>{cfg.numero}</label>
                  {editing
                    ? <input className={inp} value={form.numero} onChange={set('numero')} placeholder="Ex: 001/2026" />
                    : <p className={ro}>{form.numero || '—'}</p>}
                </div>
              )}
              {cfg.ementa && (
                <div>
                  <label className={lbl}>Ementa</label>
                  {editing
                    ? <input className={inp} value={form.ementa} onChange={set('ementa')} placeholder="Breve descrição do ato..." />
                    : <p className={ro}>{form.ementa || '—'}</p>}
                </div>
              )}
              {cfg.referencia && (
                <div>
                  <label className={lbl}>Referência / Documento</label>
                  {editing
                    ? <input className={inp} value={form.referencia} onChange={set('referencia')} placeholder="Ex: Ofício nº 010/2026" />
                    : <p className={ro}>{form.referencia || '—'}</p>}
                </div>
              )}
              {cfg.titulo_outro && (
                <div>
                  <label className={lbl}>Título / Denominação</label>
                  {editing
                    ? <input className={inp} value={form.titulo_outro} onChange={set('titulo_outro')} placeholder="Informe o tipo do documento..." />
                    : <p className={ro}>{form.titulo_outro || '—'}</p>}
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                {cfg.para && (
                  <div>
                    <label className={lbl}>Para (Destinatário)</label>
                    {editing
                      ? <input className={inp} value={form.para} onChange={set('para')} placeholder="Ex: Secretaria de Finanças" />
                      : <p className={ro}>{form.para || '—'}</p>}
                  </div>
                )}
                <div className={cfg.para ? '' : 'col-span-2'}>
                  <label className={lbl}>Data</label>
                  {editing
                    ? <input type="date" className={inp} value={form.data_despacho} onChange={set('data_despacho')} />
                    : <p className={ro}>{form.data_despacho ? new Date(form.data_despacho + 'T12:00:00').toLocaleDateString('pt-BR') : '—'}</p>}
                </div>
              </div>
              <div>
                <label className={lbl}>Cargo do Emissor</label>
                {editing
                  ? <input className={inp} value={form.cargo_emissor} onChange={set('cargo_emissor')} placeholder="Ex: Prefeito Municipal" />
                  : <p className={ro}>{form.cargo_emissor || '—'}</p>}
              </div>
              <div>
                <label className={lbl}>
                  {form.tipo_despacho === 'portaria' || form.tipo_despacho === 'decreto'
                    ? 'Considerandos e Dispositivo'
                    : 'Texto'}
                  {' '}<span className="text-danger-500">*</span>
                </label>
                {editing
                  ? <textarea
                      className={inp + ' resize-none'}
                      rows={8}
                      value={form.texto}
                      onChange={set('texto')}
                      placeholder={
                        form.tipo_despacho === 'portaria' || form.tipo_despacho === 'decreto'
                          ? 'CONSIDERANDO que...\n\nArt. 1º ...'
                          : form.tipo_despacho === 'encaminhamento'
                            ? 'Encaminho para conhecimento e providências...'
                            : 'Redigir o texto...'
                      }
                    />
                  : <pre className={ro + ' whitespace-pre-wrap leading-relaxed min-h-[80px]'}>{form.texto || '—'}</pre>}
              </div>
            </>
          )}

          {editing && !form.tipo_despacho && (
            <p className="text-sm text-ink-400 text-center py-4">
              Selecione o tipo de despacho para preencher o formulário.
            </p>
          )}

          {error && <p className="text-sm text-danger-600 dark:text-danger-400">{error}</p>}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-ink-200 bg-ink-50 rounded-b-xl">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-ink-700 hover:bg-ink-200 rounded-lg transition-colors"
          >
            Fechar
          </button>

          <div className="flex items-center gap-2">
            {!editing && (
              <button
                onClick={() => setEditing(true)}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 hover:bg-amber-200 transition-colors"
              >
                <Pencil className="h-3.5 w-3.5" />
                Alterar
              </button>
            )}

            {editing && (
              <button
                onClick={handleSalvar}
                disabled={saving}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg bg-success-600 text-white hover:bg-success-700 disabled:opacity-60 transition-colors"
              >
                <Save className="h-3.5 w-3.5" />
                {saving ? 'Salvando...' : 'Salvar'}
              </button>
            )}

            {savedAndClean && (
              <>
                <button
                  onClick={() => handleGerarPDF(false)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition-colors"
                >
                  <FileDown className="h-3.5 w-3.5" />
                  Ver PDF
                </button>
                <button
                  onClick={() => handleGerarPDF(true)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg bg-ink-700 text-white hover:bg-ink-800 transition-colors"
                >
                  <Printer className="h-3.5 w-3.5" />
                  Imprimir
                </button>
              </>
            )}
          </div>
        </div>

      </div>
    </div>
  )
}
