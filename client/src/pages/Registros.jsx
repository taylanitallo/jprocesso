import { useState, useEffect, useCallback } from 'react'
import { Search, Filter, X, RefreshCw, Download, ChevronLeft, ChevronRight, Clock, User, Building2, Layers } from 'lucide-react'
import api from '../services/api'

// Mapa de cores e ícones por módulo
const moduloConfig = {
  processos:     { cor: 'blue',   label: 'Processos' },
  financeiro:    { cor: 'emerald', label: 'Financeiro' },
  almoxarifado:  { cor: 'orange', label: 'Almoxarifado' },
  patrimonio:    { cor: 'yellow', label: 'Patrimônio' },
  contratos:     { cor: 'purple', label: 'Contratos' },
  autenticacao:  { cor: 'gray',   label: 'Autenticação' },
  sistema:       { cor: 'gray',   label: 'Sistema' },
}

const corClasses = {
  blue:    'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300',
  emerald: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300',
  orange:  'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300',
  yellow:  'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300',
  purple:  'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300',
  gray:    'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300',
}

const tipoUsuarioLabel = {
  admin:       '👑 Admin',
  gestor:      '🎯 Gestor',
  operacional: '👤 Operacional',
}

function formatarData(str) {
  if (!str) return '—'
  const d = new Date(str)
  return d.toLocaleDateString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit'
  })
}

export default function Registros() {
  const [logs, setLogs] = useState([])
  const [total, setTotal] = useState(0)
  const [pages, setPages] = useState(1)
  const [page, setPage] = useState(1)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  // Dados p/ filtros
  const [secretarias, setSecretarias] = useState([])
  const [setores, setSetores] = useState([])
  const [usuarios, setUsuarios] = useState([])
  const [modulos, setModulos] = useState([])

  // Filtros
  const [filtros, setFiltros] = useState({
    usuario_id: '',
    tipo_usuario: '',
    secretaria_id: '',
    setor_id: '',
    modulo: '',
    data_inicio: '',
    data_fim: '',
  })
  const [filtrosAbertos, setFiltrosAbertos] = useState(false)

  const limitesPorPagina = 50

  // Carrega dados auxiliares para os filtros
  useEffect(() => {
    const load = async () => {
      try {
        const [secRes, userRes, modRes] = await Promise.all([
          api.get('/organizacao/secretarias'),
          api.get('/auth/usuarios'),
          api.get('/logs/modulos'),
        ])
        setSecretarias(secRes.data.secretarias || [])
        setUsuarios(userRes.data.usuarios || [])
        setModulos(modRes.data.modulos || [])
      } catch { /* silencioso */ }
    }
    load()
  }, [])

  // Atualizar setores quando secretaria mudar
  useEffect(() => {
    if (!filtros.secretaria_id) { setSetores([]); return }
    api.get(`/organizacao/secretarias/${filtros.secretaria_id}/setores`)
      .then(r => setSetores(r.data.setores || []))
      .catch(() => setSetores([]))
  }, [filtros.secretaria_id])

  const buscarLogs = useCallback(async (pg = 1) => {
    setIsLoading(true)
    setError('')
    try {
      const params = { ...filtros, page: pg, limit: limitesPorPagina }
      // Remove filtros vazios
      Object.keys(params).forEach(k => { if (!params[k]) delete params[k] })
      const { data } = await api.get('/logs', { params })
      setLogs(data.logs || [])
      setTotal(data.total || 0)
      setPages(data.pages || 1)
      setPage(pg)
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao buscar registros')
    } finally {
      setIsLoading(false)
    }
  }, [filtros])

  useEffect(() => { buscarLogs(1) }, []) // eslint-disable-line

  const handleFiltrar = (e) => {
    e.preventDefault()
    buscarLogs(1)
  }

  const handleLimpar = () => {
    setFiltros({ usuario_id: '', tipo_usuario: '', secretaria_id: '', setor_id: '', modulo: '', data_inicio: '', data_fim: '' })
    setTimeout(() => buscarLogs(1), 50)
  }

  const filtrosAtivos = Object.values(filtros).filter(Boolean).length

  const handleExportar = async () => {
    try {
      const params = { ...filtros, limit: 10000 }
      Object.keys(params).forEach(k => { if (!params[k]) delete params[k] })
      const { data } = await api.get('/logs', { params })

      const cabecalho = ['Data/Hora', 'Usuário', 'Tipo', 'Secretaria', 'Setor', 'Módulo', 'Ação', 'Descrição', 'Referência', 'IP']
      const linhas = (data.logs || []).map(l => [
        formatarData(l.created_at),
        l.usuario?.nome || '—',
        tipoUsuarioLabel[l.usuario?.tipo] || l.usuario?.tipo || '—',
        l.secretaria?.nome || '—',
        l.setor?.nome || '—',
        l.modulo,
        l.acao,
        l.descricao || '—',
        l.referencia_numero || l.referencia_id || '—',
        l.ip || '—',
      ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(';'))

      const csv = [cabecalho.join(';'), ...linhas].join('\r\n')
      const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `registros_${new Date().toISOString().slice(0, 10)}.csv`
      a.click()
      URL.revokeObjectURL(url)
    } catch { /* silencioso */ }
  }

  return (
    <div className="max-w-7xl mx-auto space-y-5 animate-fade-in">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="page-title">📋 Registros de Atividade</h1>
          <p className="page-subtitle">Histórico completo de ações realizadas no sistema</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => buscarLogs(page)}
            className="btn-secondary flex items-center gap-2"
            title="Atualizar"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Atualizar</span>
          </button>
          <button
            onClick={handleExportar}
            className="btn-secondary flex items-center gap-2"
          >
            <Download className="h-4 w-4" />
            <span className="hidden sm:inline">Exportar CSV</span>
          </button>
          <button
            onClick={() => setFiltrosAbertos(!filtrosAbertos)}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium border transition-colors ${
              filtrosAtivos > 0
                ? 'bg-teal-600 text-white border-teal-600'
                : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
            }`}
          >
            <Filter className="h-4 w-4" />
            <span>Filtros</span>
            {filtrosAtivos > 0 && (
              <span className="bg-white text-teal-700 rounded-full px-1.5 text-xs font-bold">{filtrosAtivos}</span>
            )}
          </button>
        </div>
      </div>

      {/* Painel de Filtros */}
      {filtrosAbertos && (
        <div className="card p-5">
          <form onSubmit={handleFiltrar} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">

              {/* Tipo de Usuário */}
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                  <User className="inline h-3.5 w-3.5 mr-1" />Tipo de Usuário
                </label>
                <select
                  value={filtros.tipo_usuario}
                  onChange={e => setFiltros(f => ({ ...f, tipo_usuario: e.target.value }))}
                  className="input-field text-sm"
                >
                  <option value="">Todos os tipos</option>
                  <option value="admin">👑 Admin</option>
                  <option value="gestor">🎯 Gestor</option>
                  <option value="operacional">👤 Operacional</option>
                </select>
              </div>

              {/* Usuário */}
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                  <User className="inline h-3.5 w-3.5 mr-1" />Usuário
                </label>
                <select
                  value={filtros.usuario_id}
                  onChange={e => setFiltros(f => ({ ...f, usuario_id: e.target.value }))}
                  className="input-field text-sm"
                >
                  <option value="">Todos os usuários</option>
                  {usuarios.map(u => (
                    <option key={u.id} value={u.id}>{u.nome} ({tipoUsuarioLabel[u.tipo] || u.tipo})</option>
                  ))}
                </select>
              </div>

              {/* Secretaria */}
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                  <Building2 className="inline h-3.5 w-3.5 mr-1" />Secretaria
                </label>
                <select
                  value={filtros.secretaria_id}
                  onChange={e => setFiltros(f => ({ ...f, secretaria_id: e.target.value, setor_id: '' }))}
                  className="input-field text-sm"
                >
                  <option value="">Todas as secretarias</option>
                  {secretarias.map(s => (
                    <option key={s.id} value={s.id}>{s.nome}</option>
                  ))}
                </select>
              </div>

              {/* Setor */}
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                  <Layers className="inline h-3.5 w-3.5 mr-1" />Setor
                </label>
                <select
                  value={filtros.setor_id}
                  onChange={e => setFiltros(f => ({ ...f, setor_id: e.target.value }))}
                  className="input-field text-sm"
                  disabled={!filtros.secretaria_id}
                >
                  <option value="">Todos os setores</option>
                  {setores.map(s => (
                    <option key={s.id} value={s.id}>{s.nome}</option>
                  ))}
                </select>
              </div>

              {/* Módulo */}
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                  Módulo
                </label>
                <select
                  value={filtros.modulo}
                  onChange={e => setFiltros(f => ({ ...f, modulo: e.target.value }))}
                  className="input-field text-sm"
                >
                  <option value="">Todos os módulos</option>
                  {modulos.map(m => (
                    <option key={m} value={m}>{moduloConfig[m]?.label || m}</option>
                  ))}
                </select>
              </div>

              {/* Data Início */}
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                  <Clock className="inline h-3.5 w-3.5 mr-1" />Data Início
                </label>
                <input
                  type="date"
                  value={filtros.data_inicio}
                  onChange={e => setFiltros(f => ({ ...f, data_inicio: e.target.value }))}
                  className="input-field text-sm"
                />
              </div>

              {/* Data Fim */}
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                  <Clock className="inline h-3.5 w-3.5 mr-1" />Data Fim
                </label>
                <input
                  type="date"
                  value={filtros.data_fim}
                  onChange={e => setFiltros(f => ({ ...f, data_fim: e.target.value }))}
                  className="input-field text-sm"
                />
              </div>
            </div>

            <div className="flex items-center gap-3 pt-2 border-t dark:border-gray-700">
              <button type="submit" className="btn-primary flex items-center gap-2">
                <Search className="h-4 w-4" />
                Aplicar Filtros
              </button>
              <button type="button" onClick={handleLimpar} className="btn-secondary flex items-center gap-2">
                <X className="h-4 w-4" />
                Limpar
              </button>
              <span className="text-sm text-gray-500 dark:text-gray-400 ml-auto">
                {total.toLocaleString('pt-BR')} registro(s) encontrado(s)
              </span>
            </div>
          </form>
        </div>
      )}

      {/* Erro */}
      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 rounded-lg text-red-700 dark:text-red-300 text-sm">
          {error}
        </div>
      )}

      {/* Tabela */}
      <div className="card overflow-hidden">
        {isLoading ? (
          <div className="flex justify-center items-center py-20">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-teal-600" />
          </div>
        ) : logs.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-gray-400 dark:text-gray-600 text-sm">Nenhum registro encontrado para os filtros selecionados.</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap">Data/Hora</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Usuário</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider hidden md:table-cell">Secretaria / Setor</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Módulo</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Ação / Descrição</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider hidden lg:table-cell">Referência</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {logs.map((log) => {
                    const modCfg = moduloConfig[log.modulo] || { cor: 'gray', label: log.modulo }
                    return (
                      <tr key={log.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                        {/* Data */}
                        <td className="px-4 py-3 whitespace-nowrap">
                          <p className="text-xs text-gray-500 dark:text-gray-400 font-mono">
                            {formatarData(log.created_at)}
                          </p>
                        </td>

                        {/* Usuário */}
                        <td className="px-4 py-3">
                          <p className="font-medium text-gray-900 dark:text-white text-sm leading-tight">
                            {log.usuario?.nomeReduzido || log.usuario?.nome || <span className="text-gray-400 italic">Sistema</span>}
                          </p>
                          {log.usuario?.tipo && (
                            <p className="text-xs text-gray-400 dark:text-gray-500">
                              {tipoUsuarioLabel[log.usuario.tipo] || log.usuario.tipo}
                            </p>
                          )}
                        </td>

                        {/* Secretaria / Setor */}
                        <td className="px-4 py-3 hidden md:table-cell">
                          {log.secretaria ? (
                            <div>
                              <p className="text-xs font-medium text-gray-700 dark:text-gray-300">{log.secretaria.sigla || log.secretaria.nome}</p>
                              {log.setor && <p className="text-xs text-gray-400 dark:text-gray-500">{log.setor.nome}</p>}
                            </div>
                          ) : <span className="text-gray-300 dark:text-gray-600">—</span>}
                        </td>

                        {/* Módulo */}
                        <td className="px-4 py-3">
                          <span className={`inline-block px-2 py-0.5 rounded text-xs font-semibold ${corClasses[modCfg.cor] || corClasses.gray}`}>
                            {modCfg.label}
                          </span>
                        </td>

                        {/* Ação / Descrição */}
                        <td className="px-4 py-3 max-w-xs">
                          <p className="text-xs font-mono text-gray-600 dark:text-gray-400 mb-0.5">{log.acao}</p>
                          {log.descricao && (
                            <p className="text-sm text-gray-700 dark:text-gray-300 truncate" title={log.descricao}>{log.descricao}</p>
                          )}
                        </td>

                        {/* Referência */}
                        <td className="px-4 py-3 hidden lg:table-cell">
                          {log.referencia_numero || log.referencia_id
                            ? <span className="text-xs font-mono text-gray-500 dark:text-gray-400">{log.referencia_numero || log.referencia_id}</span>
                            : <span className="text-gray-300 dark:text-gray-600">—</span>}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* Paginação */}
            {pages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 dark:border-gray-700">
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Página {page} de {pages} &nbsp;·&nbsp; {total.toLocaleString('pt-BR')} registros
                </p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => buscarLogs(page - 1)}
                    disabled={page <= 1}
                    className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                  {Array.from({ length: Math.min(pages, 7) }, (_, i) => {
                    let pg = i + 1
                    if (pages > 7) {
                      if (page <= 4) pg = i + 1
                      else if (page >= pages - 3) pg = pages - 6 + i
                      else pg = page - 3 + i
                    }
                    return (
                      <button
                        key={pg}
                        onClick={() => buscarLogs(pg)}
                        className={`w-8 h-8 rounded text-sm font-medium transition-colors ${
                          pg === page
                            ? 'bg-teal-600 text-white'
                            : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400'
                        }`}
                      >
                        {pg}
                      </button>
                    )
                  })}
                  <button
                    onClick={() => buscarLogs(page + 1)}
                    disabled={page >= pages}
                    className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <ChevronRight className="h-5 w-5" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
