// Superadmin › município › Legislação: normas exibidas no botão "Legislação"
// da tela de login (decretos, instruções normativas que regulamentam o sistema).
import { useEffect, useState } from 'react'
import { Plus, Edit2, Trash2, Eye, Loader2, ShieldCheck, Scale, X, Check } from 'lucide-react'
import api, { apiUrl } from '../../services/api'
import { Paginacao, usePaginacao } from '../../components/ui'

const VAZIO = { titulo: '', descricao: '', data_publicacao: '', regulamenta_assinatura: false, ordem: 0, ativo: true }
const fmtData = (d) => d ? String(d).slice(0, 10).split('-').reverse().join('/') : '—'

export default function AbaLegislacao({ tenant }) {
  const [lista, setLista] = useState(null)
  const pgLeis = usePaginacao('superadmin-legislacao', lista?.length || 0)
  const [form, setForm] = useState(null)       // null | { ...campos, id? }
  const [arquivo, setArquivo] = useState(null)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')

  const carregar = () =>
    api.get(`/superadmin/tenants/${tenant.id}/legislacoes`).then(r => setLista(r.data)).catch(() => setLista([]))
  useEffect(() => { carregar() }, [tenant.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const abrir = (item) => {
    setErro(''); setArquivo(null)
    setForm(item ? { ...VAZIO, ...item, data_publicacao: item.data_publicacao ? String(item.data_publicacao).slice(0, 10) : '' } : { ...VAZIO })
  }

  const salvar = async (e) => {
    e.preventDefault()
    setErro('')
    if (!form.titulo.trim()) return setErro('Informe o título da norma.')
    if (!form.id && !arquivo) return setErro('Anexe o PDF da norma.')
    const fd = new FormData()
    ;['titulo', 'descricao', 'data_publicacao', 'regulamenta_assinatura', 'ordem', 'ativo'].forEach(k => fd.append(k, form[k] ?? ''))
    if (arquivo) fd.append('arquivo', arquivo)
    setSalvando(true)
    try {
      const url = `/superadmin/tenants/${tenant.id}/legislacoes${form.id ? `/${form.id}` : ''}`
      await (form.id ? api.put(url, fd) : api.post(url, fd))
      setForm(null); setArquivo(null)
      carregar()
    } catch (er) {
      setErro(er.response?.data?.error || 'Erro ao salvar.')
    } finally { setSalvando(false) }
  }

  const remover = async (item) => {
    if (!confirm(`Remover "${item.titulo}"? O PDF também será apagado.`)) return
    try { await api.delete(`/superadmin/tenants/${tenant.id}/legislacoes/${item.id}`); carregar() }
    catch (er) { alert(er.response?.data?.error || 'Erro ao remover.') }
  }

  const urlPublica = `${window.location.origin}/${tenant.subdominio}/legislacao`

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="font-semibold text-ink-800 dark:text-white flex items-center gap-2"><Scale className="h-5 w-5" /> Legislação do município</h3>
          <p className="text-xs text-ink-500 mt-0.5">
            Exibida no botão "Legislação" da tela de login — <a href={urlPublica} target="_blank" rel="noopener noreferrer" className="text-brand-600 dark:text-info-400 hover:underline break-all">{urlPublica}</a>
          </p>
        </div>
        {!form && (
          <button onClick={() => abrir(null)} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold">
            <Plus className="h-4 w-4" /> Nova norma
          </button>
        )}
      </div>

      {form && (
        <form onSubmit={salvar} className="border border-ink-200 rounded-xl p-4 space-y-3 bg-ink-50">
          {erro && <p className="text-sm text-danger-600">{erro}</p>}
          <div>
            <label className="block text-xs font-semibold text-ink-600 mb-1">Título *</label>
            <input value={form.titulo} onChange={e => set('titulo', e.target.value)} className="input-field"
              placeholder="Ex.: DECRETO Nº 045, de 10 de outubro de 2026" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-ink-600 mb-1">Ementa / descrição</label>
            <textarea value={form.descricao || ''} onChange={e => set('descricao', e.target.value)} rows={3} className="input-field resize-none"
              placeholder="Dispõe sobre o processo eletrônico e o uso de assinatura eletrônica no âmbito do Poder Executivo Municipal..." />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-ink-600 mb-1">Data de publicação</label>
              <input type="date" value={form.data_publicacao || ''} onChange={e => set('data_publicacao', e.target.value)} className="input-field" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-ink-600 mb-1">Ordem de exibição</label>
              <input type="number" value={form.ordem} onChange={e => set('ordem', e.target.value)} className="input-field" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-ink-600 mb-1">PDF {form.id ? '(substituir)' : '*'}</label>
              <input type="file" accept="application/pdf" onChange={e => setArquivo(e.target.files[0] || null)}
                className="block w-full text-xs text-ink-500 file:mr-2 file:py-1.5 file:px-3 file:rounded-sm file:border-0 file:text-xs file:font-medium file:bg-info-50 file:text-brand-700" />
            </div>
          </div>
          <label className="flex items-start gap-2 text-sm text-ink-700 cursor-pointer">
            <input type="checkbox" checked={!!form.regulamenta_assinatura} onChange={e => set('regulamenta_assinatura', e.target.checked)} className="mt-0.5" />
            <span>
              <strong>Regulamenta a assinatura eletrônica</strong>
              <span className="block text-xs text-ink-500">O título desta norma passa a constar na tarja de cada ato assinado, junto à Lei Federal nº 14.063/2020.</span>
            </span>
          </label>
          <label className="flex items-center gap-2 text-sm text-ink-700 cursor-pointer">
            <input type="checkbox" checked={!!form.ativo} onChange={e => set('ativo', e.target.checked)} /> Publicada (visível na tela de login)
          </label>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setForm(null)} disabled={salvando} className="inline-flex items-center gap-1 px-3 py-2 rounded-lg border border-ink-200 text-sm text-ink-600 hover:bg-ink-100">
              <X className="h-4 w-4" /> Cancelar
            </button>
            <button type="submit" disabled={salvando} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold disabled:opacity-60">
              {salvando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} Salvar
            </button>
          </div>
        </form>
      )}

      {lista === null ? (
        <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-ink-400" /></div>
      ) : lista.length === 0 ? (
        <p className="text-sm text-ink-500 text-center py-8">Nenhuma norma cadastrada para este município.</p>
      ) : (
        <ul className="divide-y divide-ink-100 border border-ink-200 rounded-xl">
          {pgLeis.fatia(lista).map(l => (
            <li key={l.id} className="p-3 flex items-start gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-ink-800 dark:text-white">{l.titulo}</p>
                <div className="flex flex-wrap items-center gap-2 mt-0.5">
                  <span className="text-xs text-ink-500">{fmtData(l.data_publicacao)}</span>
                  {l.regulamenta_assinatura && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-success-100 text-success-700"><ShieldCheck className="w-3 h-3" /> Assinatura eletrônica</span>
                  )}
                  {!l.ativo && <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-ink-100 text-ink-600">Não publicada</span>}
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                {l.arquivo_path && l.ativo && (
                  <a href={apiUrl(`/tenants/${tenant.subdominio}/legislacoes/${l.id}/arquivo`)} target="_blank" rel="noopener noreferrer"
                    title="Visualizar PDF" className="p-1.5 rounded-lg text-ink-500 hover:bg-ink-100"><Eye className="h-4 w-4" /></a>
                )}
                <button onClick={() => abrir(l)} title="Editar" className="p-1.5 rounded-lg text-ink-500 hover:bg-ink-100"><Edit2 className="h-4 w-4" /></button>
                <button onClick={() => remover(l)} title="Remover" className="p-1.5 rounded-lg text-danger-500 hover:bg-danger-50"><Trash2 className="h-4 w-4" /></button>
              </div>
            </li>
          ))}
        </ul>
      )}
      {lista?.length > 0 && <Paginacao {...pgLeis} total={lista.length} rotulo="norma" />}
    </div>
  )
}
