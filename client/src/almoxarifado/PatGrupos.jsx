import { useState, useEffect, useCallback } from 'react'
import { RefreshCw, Plus, Pencil } from 'lucide-react'
import api from '../services/api'

const base = 'w-full border rounded-lg px-3 py-2 text-sm dark:bg-gray-800 dark:border-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-300'

export default function PatGrupos() {
  const [grupos, setGrupos]   = useState([])
  const [loading, setLoading] = useState(true)
  const [edit, setEdit]       = useState(null)   // null = novo; objeto = editar
  const [show, setShow]       = useState(false)
  const [saving, setSaving]   = useState(false)
  const [form, setForm] = useState({
    codigo: '', nome: '', descricao: '',
    vida_util_anos: '', taxa_depreciacao: '', conta_contabil: '', ativo: true
  })

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const { data } = await api.get('/patrimonio/grupos')
      setGrupos(data.grupos || [])
    } catch { } finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  const abrirNovo = () => {
    setEdit(null)
    setForm({ codigo: '', nome: '', descricao: '', vida_util_anos: '', taxa_depreciacao: '', conta_contabil: '', ativo: true })
    setShow(true)
  }

  const abrirEdit = (g) => {
    setEdit(g)
    setForm({
      codigo: g.codigo || '', nome: g.nome || '', descricao: g.descricao || '',
      vida_util_anos: g.vida_util_anos || '', taxa_depreciacao: g.taxa_depreciacao || '',
      conta_contabil: g.conta_contabil || '', ativo: g.ativo !== false
    })
    setShow(true)
  }

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const submit = async (e) => {
    e.preventDefault()
    if (!form.codigo || !form.nome) { alert('Código e nome são obrigatórios'); return }
    setSaving(true)
    try {
      if (edit) {
        await api.put(`/patrimonio/grupos/${edit.id}`, form)
      } else {
        await api.post('/patrimonio/grupos', form)
      }
      setShow(false)
      await load()
    } catch (err) {
      alert(err.response?.data?.error || 'Erro ao salvar grupo')
    } finally { setSaving(false) }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-gray-900 dark:text-white">Grupos de Bens Permanentes</h3>
          <p className="text-sm text-gray-500">Classificação TCE-Ceará — Art. 94 Lei 4.320/64</p>
        </div>
        <div className="flex gap-2">
          <button onClick={load} className="p-2 rounded-lg border hover:bg-gray-50 dark:hover:bg-gray-700">
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button onClick={abrirNovo}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">
            <Plus className="h-4 w-4" /> Novo Grupo
          </button>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
            <tr>
              <th className="px-4 py-3 text-left font-medium w-16">Código</th>
              <th className="px-4 py-3 text-left font-medium">Nome</th>
              <th className="px-4 py-3 text-left font-medium hidden md:table-cell">Conta Contábil</th>
              <th className="px-4 py-3 text-right font-medium hidden sm:table-cell">Vida Útil</th>
              <th className="px-4 py-3 text-right font-medium hidden sm:table-cell">Taxa Dep. %</th>
              <th className="px-4 py-3 text-center font-medium w-16">Ativo</th>
              <th className="px-4 py-3 text-center font-medium w-16">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
            {loading ? (
              <tr><td colSpan="7" className="text-center py-8">
                <RefreshCw className="h-6 w-6 animate-spin text-blue-500 mx-auto" />
              </td></tr>
            ) : grupos.length === 0 ? (
              <tr><td colSpan="7" className="text-center py-8 text-gray-500">
                Nenhum grupo cadastrado
              </td></tr>
            ) : grupos.map(g => (
              <tr key={g.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                <td className="px-4 py-3 font-mono font-semibold text-gray-700 dark:text-gray-300">{g.codigo}</td>
                <td className="px-4 py-3">
                  <p className="font-medium text-gray-900 dark:text-white">{g.nome}</p>
                  {g.descricao && <p className="text-xs text-gray-500 truncate max-w-[240px]">{g.descricao}</p>}
                </td>
                <td className="px-4 py-3 hidden md:table-cell text-gray-500 text-xs">{g.conta_contabil || '–'}</td>
                <td className="px-4 py-3 text-right hidden sm:table-cell text-gray-600 dark:text-gray-300">
                  {g.vida_util_anos ? `${g.vida_util_anos} anos` : '–'}
                </td>
                <td className="px-4 py-3 text-right hidden sm:table-cell text-gray-600 dark:text-gray-300">
                  {g.taxa_depreciacao ? `${g.taxa_depreciacao}%` : '–'}
                </td>
                <td className="px-4 py-3 text-center">
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${g.ativo ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                    {g.ativo ? 'Sim' : 'Não'}
                  </span>
                </td>
                <td className="px-4 py-3 text-center">
                  <button onClick={() => abrirEdit(g)}
                    className="p-1.5 rounded hover:bg-blue-50 dark:hover:bg-blue-900/30 text-blue-600">
                    <Pencil className="h-4 w-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal formulário */}
      {show && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShow(false)}>
          <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-md" onClick={e => e.stopPropagation()}>
            <div className="p-6">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
                {edit ? 'Editar Grupo' : 'Novo Grupo'}
              </h2>
              <form onSubmit={submit} className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Código <span className="text-red-500">*</span>
                    </label>
                    <input className={base} value={form.codigo} onChange={e => set('codigo', e.target.value)} placeholder="01" required />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Conta Contábil</label>
                    <input className={base} value={form.conta_contabil} onChange={e => set('conta_contabil', e.target.value)} placeholder="1.2.3.1.1.00.00" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Nome <span className="text-red-500">*</span>
                  </label>
                  <input className={base} value={form.nome} onChange={e => set('nome', e.target.value)} placeholder="Ex: Móveis e Utensílios" required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Descrição</label>
                  <textarea className={`${base} resize-none`} rows={2} value={form.descricao} onChange={e => set('descricao', e.target.value)} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Vida Útil (anos)</label>
                    <input type="number" className={base} value={form.vida_util_anos} onChange={e => set('vida_util_anos', e.target.value)} placeholder="10" min="1" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Taxa Dep. (%/ano)</label>
                    <input type="number" step="0.01" className={base} value={form.taxa_depreciacao} onChange={e => set('taxa_depreciacao', e.target.value)} placeholder="10.00" />
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <input type="checkbox" id="ativoGrupo" checked={form.ativo} onChange={e => set('ativo', e.target.checked)} className="h-4 w-4" />
                  <label htmlFor="ativoGrupo" className="text-sm text-gray-700 dark:text-gray-300">Grupo ativo</label>
                </div>
                <div className="flex justify-end gap-3 pt-2 border-t dark:border-gray-700">
                  <button type="button" onClick={() => setShow(false)}
                    className="px-5 py-2 border rounded-lg text-sm hover:bg-gray-50 dark:hover:bg-gray-700">
                    Cancelar
                  </button>
                  <button type="submit" disabled={saving}
                    className="flex items-center gap-2 px-5 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-60">
                    {saving && <RefreshCw className="h-4 w-4 animate-spin" />}
                    Salvar
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
