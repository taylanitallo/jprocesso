import { useQuery, useMutation, useQueryClient } from 'react-query';
import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import {
  Plus, Building, Edit2, Trash2, Globe, MapPin, CheckCircle, XCircle,
  Database, Shield, BarChart3, LogOut, Upload, UserPlus, AlertTriangle,
  Lock, Unlock, Package, Inbox, DollarSign, ScrollText, Landmark,
  Users, FileText, HardDrive, RotateCcw, Settings, ExternalLink,
  RefreshCw, Download, Power, ChevronRight, Image, Palette,
  CloudUpload, Layers, Archive, Clock,
} from 'lucide-react';

const SYSTEM_MODULES = [
  { id: 'processos',    label: 'Processos',    emoji: '📋', descricao: 'Gestão de protocolos e processos', Icon: Inbox },
  { id: 'almoxarifado', label: 'Almoxarifado', emoji: '📦', descricao: 'Controle de estoque e materiais',  Icon: Package },
  { id: 'patrimonio',   label: 'Patrimônio',   emoji: '🏛️', descricao: 'Controle de bens – TCE-CE',       Icon: Landmark },
  { id: 'financeiro',   label: 'Financeiro',   emoji: '💵', descricao: 'Gestão financeira e DIDs',        Icon: DollarSign },
  { id: 'contratos',    label: 'Contratos',    emoji: '📝', descricao: 'Gestão de contratos',             Icon: ScrollText },
];

const TABS = [
  { id: 'info',       label: 'Informações', Icon: Building },
  { id: 'usuarios',   label: 'Usuários',    Icon: Users },
  { id: 'logs',       label: 'Logs',        Icon: FileText },
  { id: 'backup',     label: 'Backup',      Icon: HardDrive },
  { id: 'restore',    label: 'Restore',     Icon: RotateCcw },
  { id: 'configurar', label: 'Configurar',  Icon: Settings },
];

function fmtBytes(b) {
  if (!b) return '0 B';
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / (1024 * 1024)).toFixed(1)} MB`;
}
function fmtDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleString('pt-BR');
}

// ── Modal Panel ───────────────────────────────────────────────────────────────
function PainelModal({ tenant, onClose, onUpdate }) {
  const qc = useQueryClient();
  const [tab, setTab]       = useState('info');
  const [editUser, setEditUser]   = useState(null);
  const [newUser, setNewUser]     = useState(false);
  const [userForm, setUserForm]   = useState({ nome: '', email: '', cpf: '', senha: '', tipo: 'operacional', ativo: true });
  const [logCategoria, setLogCategoria] = useState('');
  const [backupLoading, setBackupLoading] = useState(false);
  const [restoreFile, setRestoreFile]     = useState(null);
  const [restoreLoading, setRestoreLoading] = useState(false);
  const [logoLoginFile, setLogoLoginFile]   = useState(null);
  const [logoInternaFile, setLogoInternaFile] = useState(null);
  const [logoLoading, setLogoLoading]       = useState('');
  const [editNome, setEditNome]   = useState(tenant.nome_municipio);
  const [editAtivo, setEditAtivo] = useState(tenant.ativo);
  const [saveLoading, setSaveLoading]     = useState(false);
  const [cor, setCor]   = useState(tenant.configuracoes?.cor_primaria || '#1e3a5f');
  const [modulosHabilitados, setModulosHabilitados] = useState(tenant.configuracoes?.modulos_habilitados || []);
  const restoreRef = useRef();

  // Users
  const { data: usersData, refetch: refetchUsers } = useQuery(
    ['sa-users', tenant.id],
    () => api.get(`/superadmin/tenants/${tenant.id}/usuarios`).then(r => r.data),
    { enabled: tab === 'usuarios', staleTime: 0 }
  );
  // Logs
  const { data: logsData, refetch: refetchLogs } = useQuery(
    ['sa-logs', tenant.id, logCategoria],
    () => api.get(`/superadmin/tenants/${tenant.id}/logs`, { params: { categoria: logCategoria || undefined } }).then(r => r.data),
    { enabled: tab === 'logs', staleTime: 0 }
  );
  // Backups
  const { data: backupsData, refetch: refetchBackups } = useQuery(
    ['sa-backups', tenant.id],
    () => api.get(`/superadmin/tenants/${tenant.id}/backups`).then(r => r.data),
    { enabled: tab === 'backup', staleTime: 0 }
  );

  const usuarios = usersData?.usuarios || [];
  const logs     = logsData?.logs || [];
  const backups  = backupsData?.backups || [];

  // ── Handlers ─────────────────────────────────────────────────────────────

  const handleSaveUser = async () => {
    try {
      if (editUser) {
        await api.put(`/superadmin/tenants/${tenant.id}/usuarios/${editUser.id}`, userForm);
      } else {
        await api.post(`/superadmin/tenants/${tenant.id}/usuarios`, userForm);
      }
      setEditUser(null); setNewUser(false);
      setUserForm({ nome: '', email: '', cpf: '', senha: '', tipo: 'operacional', ativo: true });
      refetchUsers();
    } catch (err) {
      alert(err.response?.data?.error || 'Erro ao salvar usuário');
    }
  };

  const handleDeleteUser = async (userId) => {
    if (!window.confirm('Remover este usuário?')) return;
    await api.delete(`/superadmin/tenants/${tenant.id}/usuarios/${userId}`);
    refetchUsers();
  };

  const handleCreateBackup = async () => {
    setBackupLoading(true);
    try {
      await api.post(`/superadmin/tenants/${tenant.id}/backup`);
      refetchBackups();
    } catch (err) {
      alert(err.response?.data?.error || 'Erro ao criar backup');
    } finally {
      setBackupLoading(false);
    }
  };

  const handleDownloadBackup = async (backupId) => {
    const url = `/api/superadmin/tenants/${tenant.id}/backups/${encodeURIComponent(backupId)}/download`;
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', backupId);
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  const handleDeleteBackup = async (backupId) => {
    if (!window.confirm('Excluir este backup?')) return;
    await api.delete(`/superadmin/tenants/${tenant.id}/backups/${encodeURIComponent(backupId)}`);
    refetchBackups();
  };

  const handleRestore = async () => {
    if (!restoreFile) return alert('Selecione um arquivo de backup.');
    if (!window.confirm('Atenção: esta ação substituirá TODOS os dados atuais do município. Continuar?')) return;
    setRestoreLoading(true);
    try {
      const form = new FormData();
      form.append('arquivo', restoreFile);
      const { data } = await api.post(`/superadmin/tenants/${tenant.id}/restore`, form, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      alert(`Restauração concluída!\n${data.tables_restored} tabelas · ${data.rows_restored} registros`);
      setRestoreFile(null);
      if (restoreRef.current) restoreRef.current.value = '';
    } catch (err) {
      alert(err.response?.data?.error || 'Erro ao restaurar');
    } finally {
      setRestoreLoading(false);
    }
  };

  const handleUploadLogo = async (tipo, file) => {
    if (!file) return;
    setLogoLoading(tipo);
    try {
      const form = new FormData();
      form.append('logo', file);
      await api.post(`/superadmin/tenants/${tenant.id}/logos/${tipo}`, form, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      alert('Logo enviada com sucesso!');
      onUpdate();
    } catch (err) {
      alert(err.response?.data?.error || 'Erro ao enviar logo');
    } finally {
      setLogoLoading('');
    }
  };

  const handleRemoveLogo = async (tipo) => {
    if (!window.confirm('Remover esta logo?')) return;
    await api.delete(`/superadmin/tenants/${tenant.id}/logos/${tipo}`);
    onUpdate();
  };

  const handleSaveConfig = async () => {
    setSaveLoading(true);
    try {
      await api.put(`/tenants/${tenant.id}`, {
        nome: editNome, ativo: editAtivo,
        configuracoes: { ...(tenant.configuracoes || {}), cor_primaria: cor, modulos_habilitados: modulosHabilitados }
      });
      alert('Configurações salvas!');
      onUpdate();
    } catch (err) {
      alert(err.response?.data?.error || 'Erro ao salvar');
    } finally {
      setSaveLoading(false);
    }
  };

  const handleDesativar = async () => {
    if (!window.confirm(`Desativar ${tenant.nome_municipio}? Os dados serão preservados.`)) return;
    await api.delete(`/tenants/${tenant.id}`);
    onUpdate(); onClose();
  };

  const handleExcluir = async () => {
    const confirm1 = window.confirm(`ATENÇÃO: Excluir definitivamente ${tenant.nome_municipio}?\nTodos os dados serão apagados permanentemente.`);
    if (!confirm1) return;
    const confirm2 = window.prompt(`Digite o nome do município para confirmar:`);
    if (confirm2 !== tenant.nome_municipio) return alert('Nome incorreto. Operação cancelada.');
    await api.delete(`/tenants/${tenant.id}`, { data: { confirmar_exclusao: true } });
    onUpdate(); onClose();
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-slate-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center">
              <Building className="h-5 w-5 text-white" />
            </div>
            <div>
              <h2 className="font-bold text-gray-900 dark:text-white">{tenant.nome_municipio}</h2>
              <p className="text-xs text-gray-500">/{tenant.subdominio} · {tenant.schema}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${tenant.ativo ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
              {tenant.ativo ? 'Ativo' : 'Inativo'}
            </span>
            <button onClick={onClose} className="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100">
              <XCircle className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 dark:border-slate-700 px-4 overflow-x-auto">
          {TABS.map(({ id, label, Icon }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`flex items-center gap-1.5 px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                tab === id
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <Icon className="h-4 w-4" />
              {label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">

          {/* ── Informações ── */}
          {tab === 'info' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                {[
                  ['Município', tenant.nome_municipio],
                  ['CNPJ',      tenant.cnpj],
                  ['Cidade/UF', `${tenant.cidade}/${tenant.estado}`],
                  ['Subdomínio', tenant.subdominio],
                  ['Schema DB', tenant.schema],
                  ['Criado em', fmtDate(tenant.created_at)],
                ].map(([k, v]) => (
                  <div key={k} className="bg-gray-50 dark:bg-slate-700/40 rounded-xl p-4">
                    <p className="text-xs text-gray-500 mb-1">{k}</p>
                    <p className="font-medium text-gray-900 dark:text-white text-sm">{v}</p>
                  </div>
                ))}
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-2">Módulos habilitados</p>
                <div className="flex flex-wrap gap-2">
                  {(tenant.configuracoes?.modulos_habilitados || []).map(m => (
                    <span key={m} className="px-2 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-medium capitalize">{m}</span>
                  ))}
                  {!(tenant.configuracoes?.modulos_habilitados?.length) && (
                    <span className="text-gray-400 text-sm">Nenhum módulo habilitado</span>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ── Usuários ── */}
          {tab === 'usuarios' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-gray-800 dark:text-white">
                  Usuários cadastrados {usuarios.length > 0 && <span className="ml-1 px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs">{usuarios.length}</span>}
                </h3>
                <button
                  onClick={() => { setNewUser(true); setEditUser(null); setUserForm({ nome: '', email: '', cpf: '', senha: '', tipo: 'operacional', ativo: true }); }}
                  className="flex items-center gap-1.5 bg-blue-600 text-white px-3 py-1.5 rounded-lg text-sm hover:bg-blue-700"
                >
                  <UserPlus className="h-4 w-4" /> Novo Usuário
                </button>
              </div>

              {(newUser || editUser) && (
                <div className="bg-blue-50 dark:bg-slate-700/50 rounded-xl p-4 space-y-3">
                  <h4 className="font-medium text-gray-800 dark:text-white">{editUser ? 'Editar Usuário' : 'Novo Usuário'}</h4>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      ['Nome completo', 'nome', 'text'],
                      ['E-mail', 'email', 'email'],
                      ['CPF', 'cpf', 'text'],
                      ['Senha', 'senha', 'password'],
                    ].map(([label, field, type]) => (
                      <div key={field}>
                        <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
                        <input type={type} value={userForm[field] || ''} onChange={e => setUserForm(f => ({ ...f, [field]: e.target.value }))}
                          className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-blue-500 focus:border-blue-500"
                          placeholder={editUser && field === 'senha' ? '(deixe em branco p/ não alterar)' : ''}
                        />
                      </div>
                    ))}
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Tipo</label>
                      <select value={userForm.tipo} onChange={e => setUserForm(f => ({ ...f, tipo: e.target.value }))}
                        className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm">
                        <option value="operacional">Operacional</option>
                        <option value="gestor">Gestor</option>
                        <option value="admin">Administrador</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Status</label>
                      <select value={userForm.ativo} onChange={e => setUserForm(f => ({ ...f, ativo: e.target.value === 'true' }))}
                        className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm">
                        <option value="true">Ativo</option>
                        <option value="false">Inativo</option>
                      </select>
                    </div>
                  </div>
                  <div className="flex gap-2 justify-end pt-1">
                    <button onClick={() => { setNewUser(false); setEditUser(null); }} className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50">Cancelar</button>
                    <button onClick={handleSaveUser} className="px-4 py-1.5 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">Salvar</button>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                {usuarios.map(u => (
                  <div key={u.id} className="flex items-center justify-between p-3 border border-gray-200 dark:border-slate-700 rounded-xl hover:bg-gray-50 dark:hover:bg-slate-700/40">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${u.tipo === 'admin' ? 'bg-orange-100 text-orange-700' : 'bg-blue-100 text-blue-700'}`}>
                        {u.nome?.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-medium text-sm text-gray-900 dark:text-white">{u.nome}</p>
                        <p className="text-xs text-gray-500">{u.email} · {u.tipo}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded-full text-xs ${u.ativo ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                        {u.ativo ? 'Ativo' : 'Inativo'}
                      </span>
                      <button onClick={() => { setEditUser(u); setNewUser(false); setUserForm({ nome: u.nome, email: u.email || '', cpf: u.cpf || '', senha: '', tipo: u.tipo, ativo: u.ativo }); }}
                        className="p-1 text-blue-500 hover:text-blue-700"><Edit2 className="h-4 w-4" /></button>
                      <button onClick={() => handleDeleteUser(u.id)} className="p-1 text-red-400 hover:text-red-600"><Trash2 className="h-4 w-4" /></button>
                    </div>
                  </div>
                ))}
                {!usuarios.length && <p className="text-center text-gray-400 py-8 text-sm">Nenhum usuário encontrado</p>}
              </div>
            </div>
          )}

          {/* ── Logs ── */}
          {tab === 'logs' && (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <select value={logCategoria} onChange={e => setLogCategoria(e.target.value)}
                  className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm">
                  <option value="">Todas categorias</option>
                  {['processos','almoxarifado','patrimonio','financeiro','contratos','auth','configuracoes'].map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
                <button onClick={refetchLogs} className="p-1.5 rounded-lg border border-gray-300 hover:bg-gray-50"><RefreshCw className="h-4 w-4" /></button>
                <span className="text-sm text-gray-500">{logsData?.total || 0} registros</span>
              </div>
              <div className="space-y-2">
                {logs.map(l => (
                  <div key={l.id} className="flex items-start gap-3 p-3 border border-gray-200 dark:border-slate-700 rounded-xl">
                    <div className="w-2 h-2 rounded-full bg-green-500 mt-2 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-white">{l.acao}</p>
                      <p className="text-xs text-gray-500 truncate">{l.usuario_nome} · {l.ip}</p>
                      {l.descricao && <p className="text-xs text-gray-400 mt-0.5 truncate">{l.descricao}</p>}
                    </div>
                    <div className="text-right shrink-0">
                      <span className="text-xs px-2 py-0.5 bg-blue-50 text-blue-600 rounded-full">{l.modulo || 'sistema'}</span>
                      <p className="text-xs text-gray-400 mt-1">{fmtDate(l.created_at)}</p>
                    </div>
                  </div>
                ))}
                {!logs.length && <p className="text-center text-gray-400 py-8 text-sm">Nenhum log encontrado</p>}
              </div>
            </div>
          )}

          {/* ── Backup ── */}
          {tab === 'backup' && (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-green-50 rounded-xl p-4 text-center">
                  <p className="text-2xl font-bold text-green-700">{backups.length}</p>
                  <p className="text-xs text-green-600 mt-1">Backups</p>
                </div>
                <div className="bg-blue-50 rounded-xl p-4 text-center">
                  <p className="text-lg font-bold text-blue-700">{fmtBytes(backups.reduce((s, b) => s + (b.size_bytes || 0), 0))}</p>
                  <p className="text-xs text-blue-600 mt-1">Storage</p>
                </div>
                <div className="bg-purple-50 rounded-xl p-4 text-center">
                  <p className="text-sm font-bold text-purple-700">{backups[0] ? fmtDate(backups[0].created_at).split(',')[0] : '—'}</p>
                  <p className="text-xs text-purple-600 mt-1">Último backup</p>
                </div>
              </div>

              <div className="flex gap-2">
                <button onClick={handleCreateBackup} disabled={backupLoading}
                  className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-xl text-sm hover:bg-blue-700 disabled:opacity-50">
                  {backupLoading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <CloudUpload className="h-4 w-4" />}
                  {backupLoading ? 'Criando...' : 'Fazer Backup'}
                </button>
                <button onClick={refetchBackups} className="flex items-center gap-2 border border-gray-300 px-4 py-2 rounded-xl text-sm hover:bg-gray-50">
                  <RefreshCw className="h-4 w-4" /> Atualizar
                </button>
              </div>

              <div className="space-y-2">
                {backups.map(b => (
                  <div key={b.id} className="flex items-center justify-between p-3 border border-gray-200 dark:border-slate-700 rounded-xl">
                    <div className="flex items-center gap-3">
                      <Archive className="h-5 w-5 text-blue-500 shrink-0" />
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-white truncate max-w-xs">{b.nome}</p>
                        <p className="text-xs text-gray-500">{fmtDate(b.created_at)} · {fmtBytes(b.size_bytes)}</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => handleDownloadBackup(b.id)}
                        className="p-1.5 rounded-lg border border-gray-200 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-600">
                        <Download className="h-4 w-4" />
                      </button>
                      <button onClick={() => handleDeleteBackup(b.id)}
                        className="p-1.5 rounded-lg border border-gray-200 hover:bg-red-50 hover:border-red-300 hover:text-red-600">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
                {!backups.length && <p className="text-center text-gray-400 py-6 text-sm">Nenhum backup encontrado</p>}
              </div>
            </div>
          )}

          {/* ── Restore ── */}
          {tab === 'restore' && (
            <div className="space-y-5">
              <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-yellow-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-yellow-800 text-sm">Atenção</p>
                    <p className="text-xs text-yellow-700 mt-1">
                      Restaurar um backup substitui <strong>todos</strong> os dados atuais do schema <code className="bg-yellow-100 px-1 rounded">{tenant.schema}</code>.
                      Esta ação é irreversível. Um backup preventivo é recomendado antes da operação.
                    </p>
                  </div>
                </div>
              </div>

              <div
                className="border-2 border-dashed border-gray-300 rounded-xl p-10 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50/30 transition-colors"
                onClick={() => restoreRef.current?.click()}
              >
                <RotateCcw className="h-10 w-10 text-gray-400 mx-auto mb-3" />
                <p className="text-sm text-blue-600 font-medium">Arraste o arquivo .json.gz aqui ou clique para selecionar</p>
                <p className="text-xs text-gray-400 mt-1">{restoreFile ? restoreFile.name : 'Nenhum arquivo selecionado'}</p>
                <input ref={restoreRef} type="file" accept=".gz,.json" className="hidden"
                  onChange={e => setRestoreFile(e.target.files[0] || null)} />
              </div>

              <button
                onClick={handleRestore}
                disabled={!restoreFile || restoreLoading}
                className="w-full flex items-center justify-center gap-2 bg-red-600 text-white py-3 rounded-xl font-medium hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {restoreLoading ? <RefreshCw className="h-5 w-5 animate-spin" /> : <RotateCcw className="h-5 w-5" />}
                {restoreLoading ? 'Restaurando...' : 'Restaurar dados'}
              </button>
            </div>
          )}

          {/* ── Configurar ── */}
          {tab === 'configurar' && (
            <div className="space-y-6">
              {/* Identidade visual */}
              <div>
                <h3 className="font-semibold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
                  <Image className="h-5 w-5" /> Identidade Visual
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  {[
                    { tipo: 'login',   label: 'Logo da tela de login',     field: 'logo_login_url',   file: logoLoginFile,   setFile: setLogoLoginFile },
                    { tipo: 'interna', label: 'Logo interna do sistema',    field: 'logo_interna_url', file: logoInternaFile, setFile: setLogoInternaFile },
                  ].map(({ tipo, label, field, file, setFile }) => {
                    const currentUrl = tenant.configuracoes?.[field];
                    return (
                      <div key={tipo} className="border border-gray-200 dark:border-slate-700 rounded-xl p-4">
                        <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">{label}</p>
                        <div className="flex gap-3 items-start">
                          <div className="w-20 h-20 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center bg-gray-50 overflow-hidden shrink-0">
                            {currentUrl
                              ? <img src={currentUrl} alt="Logo" className="max-w-full max-h-full object-contain" />
                              : <Image className="h-8 w-8 text-gray-300" />}
                          </div>
                          <div className="flex-1 space-y-2">
                            <input type="file" accept="image/*" onChange={e => setFile(e.target.files[0] || null)}
                              className="block w-full text-xs text-gray-500 file:mr-2 file:py-1 file:px-3 file:rounded file:border-0 file:text-xs file:font-medium file:bg-blue-50 file:text-blue-700" />
                            <div className="flex gap-2">
                              <button onClick={() => { handleUploadLogo(tipo, file); setFile(null); }}
                                disabled={!file || logoLoading === tipo}
                                className="flex items-center gap-1 text-xs bg-blue-600 text-white px-2 py-1 rounded hover:bg-blue-700 disabled:opacity-50">
                                {logoLoading === tipo ? <RefreshCw className="h-3 w-3 animate-spin" /> : <Upload className="h-3 w-3" />}
                                Enviar logo
                              </button>
                              {currentUrl && (
                                <button onClick={() => handleRemoveLogo(tipo)}
                                  className="flex items-center gap-1 text-xs bg-red-50 text-red-600 border border-red-200 px-2 py-1 rounded hover:bg-red-100">
                                  <Trash2 className="h-3 w-3" /> Remover
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Cor e configurações */}
              <div>
                <h3 className="font-semibold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
                  <Palette className="h-5 w-5" /> Configurações do Município
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Nome do Município</label>
                    <input value={editNome} onChange={e => setEditNome(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Cor do Menu Lateral</label>
                    <div className="flex items-center gap-2">
                      <input type="color" value={cor} onChange={e => setCor(e.target.value)}
                        className="w-10 h-10 rounded border border-gray-300 cursor-pointer" />
                      <input value={cor} onChange={e => setCor(e.target.value)}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono" />
                    </div>
                  </div>
                </div>
                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Módulos Habilitados</label>
                  <div className="flex flex-wrap gap-2">
                    {SYSTEM_MODULES.map(({ id, label }) => {
                      const ativo = modulosHabilitados.includes(id);
                      return (
                        <button key={id} type="button"
                          onClick={() => setModulosHabilitados(prev => prev.includes(id) ? prev.filter(m => m !== id) : [...prev, id])}
                          className={`px-3 py-1.5 rounded-full text-sm border-2 font-medium transition-all ${ativo ? 'border-green-500 bg-green-50 text-green-700' : 'border-gray-200 bg-gray-50 text-gray-500'}`}>
                          {label}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <button onClick={handleSaveConfig} disabled={saveLoading}
                  className="mt-4 flex items-center gap-2 bg-blue-600 text-white px-5 py-2 rounded-xl text-sm hover:bg-blue-700 disabled:opacity-50">
                  {saveLoading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
                  {saveLoading ? 'Salvando...' : 'Salvar Alterações'}
                </button>
              </div>

              {/* Zona de perigo */}
              <div className="border border-red-200 bg-red-50 rounded-xl p-5">
                <h3 className="font-semibold text-red-700 mb-4 flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5" /> Zona de Perigo
                </h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-red-800 text-sm">Desativar município</p>
                      <p className="text-xs text-red-600">Ficará inacessível, mas os dados serão mantidos.</p>
                    </div>
                    <button onClick={handleDesativar} className="px-3 py-1.5 bg-orange-100 text-orange-700 border border-orange-300 rounded-lg text-sm hover:bg-orange-200">
                      Desativar
                    </button>
                  </div>
                  <div className="border-t border-red-200 pt-3 flex items-center justify-between">
                    <div>
                      <p className="font-medium text-red-800 text-sm">Excluir definitivamente</p>
                      <p className="text-xs text-red-600">Apaga o município, usuários, arquivos e schema do banco.</p>
                    </div>
                    <button onClick={handleExcluir} className="px-3 py-1.5 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700">
                      Excluir definitivamente
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function AdminTenants() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [showModal,        setShowModal]        = useState(false);
  const [showEditModal,    setShowEditModal]     = useState(false);
  const [showPainel,       setShowPainel]        = useState(false);
  const [selectedTenant,   setSelectedTenant]    = useState(null);
  const [showStats,        setShowStats]         = useState(true);
  const [modulosHabilitados, setModulosHabilitados] = useState([]);
  const [adminForm, setAdminForm] = useState({ nome: '', cpf: '', email: '', senha: '', confirmaSenha: '' });
  const [showDeleteModal,  setShowDeleteModal]   = useState(false);
  const [deleteTarget,     setDeleteTarget]      = useState(null);
  const [bucketMsg,        setBucketMsg]         = useState('');

  const handleLogout = async () => {
    try { await api.post('/auth/logout'); } catch {}
    localStorage.removeItem('token');
    localStorage.removeItem('subdomain');
    localStorage.removeItem('isAdmin');
    navigate('/');
  };

  const { data: tenantsData, refetch, isLoading } = useQuery('tenants', () =>
    api.get('/tenants').then(r => r.data)
  );
  const { data: statsData } = useQuery('tenant-statistics', () =>
    api.get('/tenants/statistics').then(r => r.data)
  );

  const createMutation = useMutation(
    data => api.post('/tenants', data).then(r => r.data),
    { onSuccess: () => { setShowModal(false); refetch(); alert('Município cadastrado com sucesso!'); },
      onError: e => alert(e.response?.data?.error || 'Erro ao criar município') }
  );

  const ativarMutation = useMutation(
    id => api.patch(`/superadmin/tenants/${id}/ativar`).then(r => r.data),
    { onSuccess: () => refetch(), onError: e => alert(e.response?.data?.error || 'Erro ao ativar') }
  );

  const deleteMutation = useMutation(
    id => api.delete(`/tenants/${id}`).then(r => r.data),
    { onSuccess: () => { refetch(); setShowDeleteModal(false); setDeleteTarget(null); },
      onError: e => alert(e.response?.data?.error || 'Erro ao desativar') }
  );

  const handleSubmit = (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    createMutation.mutate({
      nome: fd.get('nome'), cnpj: fd.get('cnpj'),
      subdominio: fd.get('subdominio'), cidade: fd.get('cidade'), estado: fd.get('estado'),
      adminNome: fd.get('adminNome'), adminEmail: fd.get('adminEmail'),
      adminCpf: fd.get('adminCpf'), adminSenha: fd.get('adminSenha'),
      configuracoes: { cor_primaria: '#1e3a5f', modulos_habilitados: modulosHabilitados }
    });
  };

  const handleCriarBucket = async () => {
    try {
      const { data } = await api.post('/superadmin/bucket');
      setBucketMsg(data.mensagem || (data.criado ? 'Bucket criado com sucesso!' : 'Bucket já existe'));
      setTimeout(() => setBucketMsg(''), 4000);
    } catch (err) {
      alert(err.response?.data?.error || 'Erro ao criar bucket');
    }
  };

  const tenants = tenantsData?.tenants || [];
  const stats   = statsData?.estatisticas || {};

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900">
      {/* Header */}
      <div className="bg-white dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-blue-600 p-2.5 rounded-xl shadow">
              <Globe className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">Painel do Administrador Geral</h1>
              <p className="text-xs text-gray-500">Gerenciamento de Prefeituras</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Administrador Geral</span>
            <button onClick={handleLogout}
              className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-red-600 hover:bg-red-50 px-3 py-1.5 rounded-lg transition-colors">
              <LogOut className="h-4 w-4" /> Sair
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8 space-y-6">
        {/* Monitoramento */}
        {showStats && (
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-sm border border-gray-200 dark:border-slate-700">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-gray-800 dark:text-white text-sm uppercase tracking-wide">Monitoramento do Sistema</h2>
              <button onClick={() => refetch()} className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700">
                <RefreshCw className="h-3.5 w-3.5" /> Atualizar
              </button>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: 'Prefeituras', value: stats.total || 0, color: 'text-blue-600' },
                { label: 'Ativos', value: stats.ativos || 0, color: 'text-green-600' },
                { label: 'Inativos', value: stats.inativos || 0, color: 'text-red-500' },
                { label: 'Schemas Isolados', value: stats.total || 0, color: 'text-purple-600' },
              ].map(({ label, value, color }) => (
                <div key={label} className="text-center">
                  <p className={`text-3xl font-bold ${color}`}>{value}</p>
                  <p className="text-xs text-gray-500 mt-1">{label}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex gap-2">
            <button onClick={() => setShowStats(!showStats)}
              className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-600 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-50 text-sm">
              <BarChart3 className="h-4 w-4" />
              {showStats ? 'Ocultar' : 'Mostrar'} Estatísticas
            </button>
            <button onClick={handleCriarBucket}
              className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-600 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-50 text-sm">
              <Database className="h-4 w-4" /> Criar Bucket
            </button>
            {bucketMsg && (
              <span className="flex items-center gap-1 text-sm text-green-700 bg-green-50 px-3 py-2 rounded-xl border border-green-200">
                <CheckCircle className="h-4 w-4" /> {bucketMsg}
              </span>
            )}
          </div>
          <button onClick={() => { setModulosHabilitados([]); setShowModal(true); }}
            className="flex items-center gap-2 bg-blue-600 text-white px-5 py-2 rounded-xl hover:bg-blue-700 text-sm shadow-sm">
            <Plus className="h-4 w-4" /> Nova Prefeitura
          </button>
        </div>

        {/* Prefeituras Cards */}
        <div>
          <h2 className="font-semibold text-gray-800 dark:text-white mb-1">Prefeituras Cadastradas</h2>
          <p className="text-xs text-gray-500 mb-4">{tenants.length} prefeitura{tenants.length !== 1 ? 's' : ''} cadastrada{tenants.length !== 1 ? 's' : ''}</p>

          {isLoading ? (
            <div className="text-center py-12 text-gray-400">Carregando...</div>
          ) : tenants.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <Building className="h-16 w-16 mx-auto mb-4 opacity-30" />
              <p>Nenhuma prefeitura cadastrada</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
              {tenants.map(tenant => (
                <div key={tenant.id}
                  className={`bg-white dark:bg-slate-800 rounded-2xl shadow-sm border-2 p-5 transition-all ${
                    tenant.ativo ? 'border-green-200 dark:border-green-900/50' : 'border-gray-200 dark:border-slate-700 opacity-70'
                  }`}>
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
                        {tenant.configuracoes?.logo_interna_url
                          ? <img src={tenant.configuracoes.logo_interna_url} alt="" className="w-8 h-8 object-contain" />
                          : <Building className="h-5 w-5 text-blue-600" />}
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900 dark:text-white text-sm leading-tight">{tenant.nome_municipio}</h3>
                        <p className="text-xs text-gray-500">{tenant.cidade}/{tenant.estado}</p>
                      </div>
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${tenant.ativo ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                      {tenant.ativo ? 'Ativo' : 'Inativo'}
                    </span>
                  </div>

                  <div className="space-y-1.5 mb-4">
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <span className="text-gray-400">Slug:</span>
                      <code className="bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded text-xs">{tenant.subdominio}</code>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <span className="text-gray-400">Schema:</span>
                      <code className="bg-purple-50 text-purple-700 px-1.5 py-0.5 rounded text-xs">{tenant.schema}</code>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <span className="text-gray-400">Criado:</span>
                      <span>{fmtDate(tenant.created_at).split(',')[0]}</span>
                    </div>
                  </div>

                  <a href={`/${tenant.subdominio}/processos`} target="_blank" rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 w-full bg-blue-600 text-white py-2 rounded-xl text-sm font-medium hover:bg-blue-700 mb-3">
                    <ExternalLink className="h-4 w-4" /> Acessar Sistema
                  </a>

                  <div className="grid grid-cols-2 gap-2">
                    <button onClick={() => { setSelectedTenant(tenant); setShowPainel(true); }}
                      className="flex items-center justify-center gap-1.5 text-xs py-1.5 border border-gray-200 rounded-lg hover:bg-blue-50 hover:border-blue-300 hover:text-blue-700 transition-colors">
                      <Layers className="h-3.5 w-3.5" /> Gerenciar
                    </button>
                    <button onClick={() => { setSelectedTenant(tenant); setShowEditModal(true); setModulosHabilitados(tenant.configuracoes?.modulos_habilitados || []); }}
                      className="flex items-center justify-center gap-1.5 text-xs py-1.5 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                      <Edit2 className="h-3.5 w-3.5" /> Editar
                    </button>
                    {tenant.ativo ? (
                      <button onClick={() => { setDeleteTarget(tenant); setShowDeleteModal(true); }}
                        className="flex items-center justify-center gap-1.5 text-xs py-1.5 border border-orange-200 text-orange-600 rounded-lg hover:bg-orange-50 transition-colors">
                        <Power className="h-3.5 w-3.5" /> Desativar
                      </button>
                    ) : (
                      <button onClick={() => ativarMutation.mutate(tenant.id)}
                        className="flex items-center justify-center gap-1.5 text-xs py-1.5 border border-green-200 text-green-600 rounded-lg hover:bg-green-50 transition-colors">
                        <Power className="h-3.5 w-3.5" /> Ativar
                      </button>
                    )}
                    <button onClick={() => { setDeleteTarget(tenant); setShowDeleteModal(true); }}
                      className="flex items-center justify-center gap-1.5 text-xs py-1.5 border border-red-200 text-red-500 rounded-lg hover:bg-red-50 transition-colors">
                      <Trash2 className="h-3.5 w-3.5" /> Excluir
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Painel Modal (tabs) */}
      {showPainel && selectedTenant && (
        <PainelModal
          tenant={selectedTenant}
          onClose={() => { setShowPainel(false); setSelectedTenant(null); }}
          onUpdate={() => { refetch(); }}
        />
      )}

      {/* Modal Criar Município */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="px-6 py-5 border-b border-gray-200 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-gray-900">Cadastrar Nova Prefeitura</h2>
                <p className="text-sm text-gray-500 mt-0.5">Crie um novo banco de dados para uma prefeitura</p>
              </div>
              <button onClick={() => setShowModal(false)} className="p-1 text-gray-400 hover:text-gray-600"><XCircle className="h-6 w-6" /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                {[
                  ['Nome da Prefeitura *', 'nome', 'text', 'Ex: Prefeitura Municipal de...'],
                  ['CNPJ *',              'cnpj', 'text', 'Apenas números (14 dígitos)'],
                  ['Cidade *',            'cidade', 'text', ''],
                ].map(([label, name, type, ph]) => (
                  <div key={name}>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
                    <input type={type} name={name} required placeholder={ph}
                      className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:ring-blue-500 focus:border-blue-500" />
                  </div>
                ))}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Estado (UF) *</label>
                  <select name="estado" required className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm">
                    <option value="">Selecione...</option>
                    {['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'].map(uf => (
                      <option key={uf} value={uf}>{uf}</option>
                    ))}
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Identificador (Slug) *</label>
                  <input type="text" name="subdominio" required pattern="[a-z0-9-]+" placeholder="Ex: municipio-exemplo"
                    className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm" />
                  <p className="text-xs text-gray-400 mt-1">Este identificador será usado na URL e não pode ser alterado depois</p>
                </div>
              </div>
              <div className="border-t pt-5">
                <h3 className="font-semibold text-gray-800 mb-3">Usuário Administrador</h3>
                <div className="grid grid-cols-2 gap-4">
                  {[
                    ['Nome Completo *', 'adminNome', 'text', 'Ex: Maria Silva'],
                    ['E-mail *',        'adminEmail', 'email', 'Ex: maria@prefeitura.gov.br'],
                    ['CPF *',           'adminCpf', 'text', '000.000.000-00'],
                    ['Senha *',         'adminSenha', 'password', ''],
                  ].map(([label, name, type, ph]) => (
                    <div key={name}>
                      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
                      <input type={type} name={name} required placeholder={ph}
                        className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm" />
                    </div>
                  ))}
                </div>
              </div>
              <div className="border-t pt-5">
                <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2"><Lock className="h-4 w-4" /> Módulos Habilitados</h3>
                <div className="flex flex-wrap gap-2">
                  {SYSTEM_MODULES.map(({ id, label }) => {
                    const ativo = modulosHabilitados.includes(id);
                    return (
                      <button key={id} type="button"
                        onClick={() => setModulosHabilitados(prev => prev.includes(id) ? prev.filter(m => m !== id) : [...prev, id])}
                        className={`px-3 py-1.5 rounded-full text-sm border-2 font-medium transition-all ${ativo ? 'border-green-500 bg-green-50 text-green-700' : 'border-gray-200 bg-gray-50 text-gray-500'}`}>
                        {label}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t">
                <button type="button" onClick={() => setShowModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-xl text-gray-700 hover:bg-gray-50 text-sm">Cancelar</button>
                <button type="submit" disabled={createMutation.isLoading}
                  className="flex items-center gap-2 px-5 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 text-sm disabled:opacity-50">
                  {createMutation.isLoading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                  {createMutation.isLoading ? 'Criando...' : 'Criar Prefeitura'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Editar */}
      {showEditModal && selectedTenant && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="px-6 py-5 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900">Editar Município</h2>
              <button onClick={() => setShowEditModal(false)} className="p-1 text-gray-400 hover:text-gray-600"><XCircle className="h-5 w-5" /></button>
            </div>
            <form onSubmit={async (e) => {
              e.preventDefault();
              const fd = new FormData(e.target);
              try {
                await api.put(`/tenants/${selectedTenant.id}`, {
                  nome: fd.get('nome'), cnpj: fd.get('cnpj'),
                  cidade: fd.get('cidade'), estado: fd.get('estado'),
                  ativo: fd.get('ativo') === 'true',
                  configuracoes: { ...(selectedTenant.configuracoes || {}), modulos_habilitados: modulosHabilitados }
                });
                setShowEditModal(false); refetch();
              } catch (err) { alert(err.response?.data?.error || 'Erro ao atualizar'); }
            }} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                {[
                  ['Nome', 'nome', selectedTenant.nome_municipio],
                  ['CNPJ', 'cnpj', selectedTenant.cnpj],
                  ['Cidade', 'cidade', selectedTenant.cidade],
                  ['Estado', 'estado', selectedTenant.estado],
                ].map(([label, name, def]) => (
                  <div key={name}>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
                    <input name={name} defaultValue={def} required className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm" />
                  </div>
                ))}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <select name="ativo" defaultValue={String(selectedTenant.ativo)} className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm">
                    <option value="true">Ativo</option>
                    <option value="false">Inativo</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Módulos</label>
                <div className="flex flex-wrap gap-2">
                  {SYSTEM_MODULES.map(({ id, label }) => {
                    const ativo = modulosHabilitados.includes(id);
                    return (
                      <button key={id} type="button"
                        onClick={() => setModulosHabilitados(prev => prev.includes(id) ? prev.filter(m => m !== id) : [...prev, id])}
                        className={`px-3 py-1.5 rounded-full text-xs border-2 font-medium transition-all ${ativo ? 'border-green-500 bg-green-50 text-green-700' : 'border-gray-200 bg-gray-50 text-gray-500'}`}>
                        {label}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t">
                <button type="button" onClick={() => setShowEditModal(false)} className="px-4 py-2 border border-gray-300 rounded-xl text-sm text-gray-700 hover:bg-gray-50">Cancelar</button>
                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm hover:bg-blue-700">Salvar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Confirmar Desativação */}
      {showDeleteModal && deleteTarget && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl">
            <div className="px-6 py-5 border-b border-gray-200">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center"><AlertTriangle className="h-5 w-5 text-orange-600" /></div>
                <h2 className="text-lg font-bold text-gray-900">Confirmar Desativação</h2>
              </div>
            </div>
            <div className="p-6">
              <p className="text-gray-700 mb-2">Desativar <strong>{deleteTarget.nome_municipio}</strong>?</p>
              <p className="text-sm text-gray-500">Os dados serão preservados, mas o município ficará inacessível.</p>
            </div>
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end gap-3">
              <button onClick={() => { setShowDeleteModal(false); setDeleteTarget(null); }}
                className="px-4 py-2 border border-gray-300 rounded-xl text-sm text-gray-700 hover:bg-gray-50">Cancelar</button>
              <button onClick={() => deleteMutation.mutate(deleteTarget.id)}
                className="px-4 py-2 bg-orange-600 text-white rounded-xl text-sm hover:bg-orange-700">Desativar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
