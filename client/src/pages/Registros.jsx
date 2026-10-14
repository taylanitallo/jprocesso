import { useState, useEffect, useCallback } from 'react'
import { Search, Filter, X, RefreshCw, Download, ChevronLeft, ChevronRight, Clock, User, Building2, Layers, ClipboardList, Activity, Users, LayoutGrid } from 'lucide-react'
import api from '../services/api'
import PageHeader from '../components/ui/PageHeader'
import LoadingBar from '../components/LoadingBar'
import { Paginacao, usePorPagina } from '../components/ui'

// Mapa de cores e ícones por módulo
const moduloConfig = {
  processos:     { cor: 'blue',   label: 'Processos' },
  financeiro:    { cor: 'emerald', label: 'Financeiro' },
  almoxarifado:  { cor: 'orange', label: 'Almoxarifado' },
  patrimonio:    { cor: 'yellow', label: 'Patrimônio' },
  contratos:     { cor: 'purple', label: 'Contratos' },
  sessao:        { cor: 'gray',   label: 'Sessão' },
  sistema:       { cor: 'gray',   label: 'Sistema' },
}

const corClasses = {
  blue:    'bg-info-100 dark:bg-info-900/30 text-brand-700 dark:text-info-300',
  emerald: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300',
  orange:  'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300',
  yellow:  'bg-warning-100 dark:bg-warning-900/30 text-warning-700 dark:text-warning-300',
  purple:  'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300',
  gray:    'bg-ink-100 text-ink-600',
}

const tipoUsuarioLabel = {
  admin:       '👑 Admin',
  gestor:      '🎯 Gestor',
  operacional: '👤 Operacional',
}

// Rótulo objetivo de fallback, usado apenas quando não há descrição detalhada
const acaoLabel = {
  login:                    'Entrou no sistema',
  logout:                   'Saiu do sistema',
  criar_processo:           'Abriu um processo',
  tramitar_processo:        'Tramitou um processo',
  devolver_processo:        'Devolveu um processo',
  concluir_processo:        'Concluiu um processo',
  excluir_processo:         'Excluiu um processo',
  criar_item_almoxarifado:  'Adicionou um item ao almoxarifado',
  criar_requisicao:         'Fez uma requisição de material',
  autorizar_requisicao:     'Autorizou uma requisição de material',
  atender_requisicao:       'Atendeu uma requisição de material',
  registrar_entrada_estoque:'Registrou entrada de estoque',
  criar_ordem:              'Fez uma ordem de compra/serviço',
  criar_contrato:           'Cadastrou um contrato',
  criar_lancamento:         'Registrou um lançamento financeiro',
  excluir_lancamento:       'Excluiu um lançamento financeiro',
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

  const [limitesPorPagina, setLimitesPorPagina] = usePorPagina('registros', 50)

  // Carrega dados auxiliares para os filtros
  useEffect(() => {
    const load = async () => {
      try {
        const [secRes, userRes, modRes] = await Promise.all([
          api.get('/organizacao/secretarias'),
          api.get('/auth/users'),
          api.get('/logs/modulos'),
        ])
        setSecretarias(secRes.data.secretarias || [])
        setUsuarios(userRes.data.users || [])
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
  }, [filtros, limitesPorPagina])

  useEffect(() => { buscarLogs(1) }, [limitesPorPagina]) // eslint-disable-line

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
    <div className="space-y-4 animate-fade-in">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <PageHeader
          icon={ClipboardList}
          title="Registros de Atividade"
          subtitle="Histórico completo de ações realizadas no sistema"
        />
        <div className="flex items-center gap-2 shrink-0">
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
                : 'bg-surface text-ink-700 border-ink-300 hover:bg-ink-50'
            }`}
          >
            <Filter className="h-4 w-4" />
            <span>Filtros</span>
            {filtrosAtivos > 0 && (
              <span className="bg-surface text-teal-700 rounded-full px-1.5 text-xs font-bold">{filtrosAtivos}</span>
            )}
          </button>
        </div>
      </div>

      {/* Cards de resumo */}
      {!isLoading && total > 0 && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="card p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-info-100 dark:bg-info-900/30 flex items-center justify-center shrink-0">
              <Activity className="h-5 w-5 text-brand-600 dark:text-info-400" />
            </div>
            <div className="min-w-0">
              <p className="text-2xl font-bold text-ink-900 dark:text-white tabular-nums">{total.toLocaleString('pt-BR')}</p>
              <p className="text-xs text-ink-500 truncate">Total de registros</p>
            </div>
          </div>
          <div className="card p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center shrink-0">
              <Users className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div className="min-w-0">
              <p className="text-2xl font-bold text-ink-900 dark:text-white tabular-nums">
                {new Set(logs.map(l => l.usuario?.id).filter(Boolean)).size}
              </p>
              <p className="text-xs text-ink-500 truncate">Usuários na página</p>
            </div>
          </div>
          <div className="card p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center shrink-0">
              <LayoutGrid className="h-5 w-5 text-violet-600 dark:text-violet-400" />
            </div>
            <div className="min-w-0">
              <p className="text-2xl font-bold text-ink-900 dark:text-white tabular-nums">
                {new Set(logs.map(l => l.modulo).filter(Boolean)).size}
              </p>
              <p className="text-xs text-ink-500 truncate">Módulos ativos</p>
            </div>
          </div>
          <div className="card p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center shrink-0">
              <Clock className="h-5 w-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-ink-900 dark:text-white leading-tight">
                {logs[0]?.created_at ? formatarData(logs[0].created_at) : '—'}
              </p>
              <p className="text-xs text-ink-500 truncate">Última atividade</p>
            </div>
          </div>
        </div>
      )}

      {/* Painel de Filtros */}
      {filtrosAbertos && (
        <div className="card p-4">
          <form onSubmit={handleFiltrar} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">

              {/* Tipo de Usuário */}
              <div>
                <label className="block text-xs font-medium text-ink-600 mb-1">
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
                <label className="block text-xs font-medium text-ink-600 mb-1">
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
                <label className="block text-xs font-medium text-ink-600 mb-1">
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
                <label className="block text-xs font-medium text-ink-600 mb-1">
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
                <label className="block text-xs font-medium text-ink-600 mb-1">
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
                <label className="block text-xs font-medium text-ink-600 mb-1">
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
                <label className="block text-xs font-medium text-ink-600 mb-1">
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

            <div className="flex items-center gap-3 pt-2 border-t">
              <button type="submit" className="btn-primary flex items-center gap-2">
                <Search className="h-4 w-4" />
                Aplicar Filtros
              </button>
              <button type="button" onClick={handleLimpar} className="btn-secondary flex items-center gap-2">
                <X className="h-4 w-4" />
                Limpar
              </button>
              <span className="text-sm text-ink-500 ml-auto">
                {total.toLocaleString('pt-BR')} registro(s) encontrado(s)
              </span>
            </div>
          </form>
        </div>
      )}

      {/* Erro */}
      {error && (
        <div className="p-4 bg-danger-50 dark:bg-danger-900/30 border border-danger-200 dark:border-danger-700 rounded-lg text-danger-700 dark:text-danger-300 text-sm">
          {error}
        </div>
      )}

      {/* Tabela */}
      <div className="card overflow-hidden">
        {isLoading ? (
          <LoadingBar label="Carregando registros de atividade..." />
        ) : logs.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-ink-400 text-sm">Nenhum registro encontrado para os filtros selecionados.</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-ink-200 bg-ink-50">
                    <th className="text-left px-4 py-3 text-xs font-semibold text-ink-500 uppercase tracking-wider whitespace-nowrap">Data/Hora</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-ink-500 uppercase tracking-wider">Usuário</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-ink-500 uppercase tracking-wider hidden md:table-cell">Secretaria / Setor</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-ink-500 uppercase tracking-wider">Módulo</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-ink-500 uppercase tracking-wider">Ação / Descrição</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ink-100">
                  {logs.map((log) => {
                    const modCfg = moduloConfig[log.modulo] || { cor: 'gray', label: log.modulo }
                    return (
                      <tr key={log.id} className="group hover:bg-info-50/40 transition-colors cursor-pointer">
                        {/* Data */}
                        <td className="px-4 py-3 whitespace-nowrap">
                          <p className="text-xs text-ink-500 font-mono">
                            {formatarData(log.created_at)}
                          </p>
                        </td>

                        {/* Usuário */}
                        <td className="px-4 py-3">
                          <p className="font-medium text-ink-900 dark:text-white text-sm leading-tight">
                            {log.usuario?.nomeReduzido || log.usuario?.nome || <span className="text-ink-400 italic">Sistema</span>}
                          </p>
                          {log.usuario?.tipo && (
                            <p className="text-xs text-ink-400">
                              {tipoUsuarioLabel[log.usuario.tipo] || log.usuario.tipo}
                            </p>
                          )}
                        </td>

                        {/* Secretaria / Setor */}
                        <td className="px-4 py-3 hidden md:table-cell">
                          {log.secretaria ? (
                            <div>
                              <p className="text-xs font-medium text-ink-700">{log.secretaria.sigla || log.secretaria.nome}</p>
                              {log.setor && <p className="text-xs text-ink-400">{log.setor.nome}</p>}
                            </div>
                          ) : <span className="text-ink-400">—</span>}
                        </td>

                        {/* Módulo */}
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${corClasses[modCfg.cor] || corClasses.gray}`}>
                            <span className="w-1.5 h-1.5 rounded-full bg-current opacity-70 shrink-0" />
                            {modCfg.label}
                          </span>
                        </td>

                        {/* Ação / Descrição */}
                        <td className="px-4 py-3">
                          <p className="text-sm font-medium text-ink-800">
                            {log.descricao || acaoLabel[log.acao] || log.acao}
                          </p>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* Paginação */}
            <Paginacao total={total} pagina={page} setPagina={buscarLogs} porPagina={limitesPorPagina}
              setPorPagina={setLimitesPorPagina} className="border-t border-ink-100" />
          </>
        )}
      </div>
    </div>
  )
}
