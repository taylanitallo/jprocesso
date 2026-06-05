import { useQuery, useMutation, useQueryClient } from 'react-query';
import { useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import {
  Plus, Building, Edit2, Trash2, Globe, MapPin, CheckCircle, XCircle,
  Database, Shield, BarChart3, LogOut, Upload, UserPlus, AlertTriangle,
  Lock, Unlock, Package, Inbox, DollarSign, ScrollText, Landmark,
  Users, FileText, HardDrive, RotateCcw, Settings, ExternalLink,
  RefreshCw, Download, Power, ChevronRight, Image, Palette,
  Upload as CloudUpload, Layers, Archive, Clock, Calendar, Bell, Zap,
  TrendingUp, Activity, Server, Eye, MoreVertical,
} from 'lucide-react';

// ─── Constants ────────────────────────────────────────────────────────────────

const SYSTEM_MODULES = [
  { id: 'processos',    label: 'Processos',    Icon: Inbox },
  { id: 'almoxarifado', label: 'Almoxarifado', Icon: Package },
  { id: 'patrimonio',   label: 'Patrimônio',   Icon: Landmark },
  { id: 'financeiro',   label: 'Financeiro',   Icon: DollarSign },
  { id: 'contratos',    label: 'Contratos',    Icon: ScrollText },
];

const TABS = [
  { id: 'info',       label: 'Informações', Icon: Building },
  { id: 'usuarios',   label: 'Usuários',    Icon: Users },
  { id: 'logs',       label: 'Logs',        Icon: FileText },
  { id: 'backup',     label: 'Backup',      Icon: HardDrive },
  { id: 'restore',    label: 'Restore',     Icon: RotateCcw },
  { id: 'configurar', label: 'Configurar',  Icon: Settings },
];

const UFS = ['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'];

// ─── Helpers ──────────────────────────────────────────────────────────────────

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

function fmtDateShort(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('pt-BR');
}

function slugify(str) {
  return str
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 50);
}

function daysSince(d) {
  if (!d) return null;
  return Math.floor((Date.now() - new Date(d).getTime()) / (1000 * 60 * 60 * 24));
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function Badge({ children, color = 'gray' }) {
  const colors = {
    green:  'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
    red:    'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
    orange: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300',
    blue:   'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
    purple: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300',
    gray:   'bg-gray-100 text-gray-600 dark:bg-gray-700/60 dark:text-gray-300',
    yellow: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300',
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${colors[color]}`}>
      {children}
    </span>
  );
}

function StatMini({ label, value, color = 'blue', Icon }) {
  const cols = {
    blue:   'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400',
    green:  'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400',
    red:    'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400',
    purple: 'bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400',
    orange: 'bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400',
  };
  return (
    <div className={`rounded-xl p-4 ${cols[color]}`}>
      <div className="flex items-center gap-2 mb-1">
        {Icon && <Icon className="h-4 w-4 opacity-70" />}
        <p className="text-xs font-medium opacity-80">{label}</p>
      </div>
      <p className="text-2xl font-bold">{value}</p>
    </div>
  );
}

// ─── TenantCard ───────────────────────────────────────────────────────────────

function TenantCard({ tenant, onGerenciar, onDelete, onAtivar }) {
  const dias = daysSince(tenant.ultimoBackup || tenant.ultimo_backup);
  const backupAtrasado = dias !== null && dias > 7;

  return (
    <div className={`bg-white dark:bg-slate-800 rounded-2xl border-2 shadow-sm p-5 flex flex-col gap-4 transition-all hover:shadow-md ${
      tenant.ativo
        ? 'border-green-200 dark:border-green-900/50'
        : 'border-gray-200 dark:border-slate-700 opacity-70'
    }`}>
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center shrink-0 shadow-sm">
            {tenant.configuracoes?.logo_interna_url
              ? <img src={tenant.configuracoes.logo_interna_url} alt="" className="w-8 h-8 object-contain rounded-lg" />
              : <Building className="h-5 w-5 text-white" />}
          </div>
          <div className="min-w-0">
            <h3 className="font-bold text-gray-900 dark:text-white text-sm leading-tight truncate">
              {tenant.nome_municipio}
            </h3>
            <p className="text-xs text-gray-500 truncate">{tenant.cidade}/{tenant.estado}</p>
          </div>
        </div>
        <Badge color={tenant.ativo ? 'green' : 'gray'}>{tenant.ativo ? 'Ativo' : 'Inativo'}</Badge>
      </div>

      {/* Info */}
      <div className="space-y-1.5 text-xs">
        <div className="flex items-center gap-2 text-gray-500">
          <Globe className="h-3.5 w-3.5 shrink-0" />
          <code className="bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-1.5 py-0.5 rounded font-mono">
            {tenant.subdominio}
          </code>
        </div>
        <div className="flex items-center gap-2 text-gray-500">
          <Clock className="h-3.5 w-3.5 shrink-0" />
          <span>Criado: {fmtDateShort(tenant.created_at)}</span>
        </div>
        {dias !== null && (
          <div className={`flex items-center gap-2 ${backupAtrasado ? 'text-red-600 dark:text-red-400' : 'text-gray-500'}`}>
            <HardDrive className="h-3.5 w-3.5 shrink-0" />
            <span>{backupAtrasado ? `Último backup: ${dias}d atrás` : `Backup: ${dias === 0 ? 'hoje' : `${dias}d atrás`}`}</span>
            {backupAtrasado && <AlertTriangle className="h-3 w-3" />}
          </div>
        )}
        {tenant.backups24h > 0 && (
          <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
            <Archive className="h-3.5 w-3.5 shrink-0" />
            <span>{tenant.backups24h} backup(s) nas últimas 24h</span>
          </div>
        )}
      </div>

      {/* Acessar */}
      <a
        href={`https://${tenant.subdominio}.jeossistemas.com/${tenant.subdominio}`}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center justify-center gap-2 w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-xl text-sm font-medium transition-colors"
      >
        <ExternalLink className="h-4 w-4" /> Acessar Sistema
      </a>

      {/* Actions */}
      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={onGerenciar}
          className="flex items-center justify-center gap-1.5 text-xs py-2 border border-blue-200 dark:border-blue-700 text-blue-700 dark:text-blue-300 rounded-xl hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors font-medium"
        >
          <Layers className="h-3.5 w-3.5" /> Gerenciar
        </button>
        <button
          onClick={() => onGerenciar('configurar')}
          className="flex items-center justify-center gap-1.5 text-xs py-2 border border-gray-200 dark:border-slate-600 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
        >
          <Settings className="h-3.5 w-3.5" /> Configurar
        </button>
        <button
          onClick={() => onGerenciar('usuarios')}
          className="flex items-center justify-center gap-1.5 text-xs py-2 border border-gray-200 dark:border-slate-600 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
        >
          <Users className="h-3.5 w-3.5" /> Usuários
        </button>
        {tenant.ativo ? (
          <button
            onClick={() => onDelete(tenant, 'desativar')}
            className="flex items-center justify-center gap-1.5 text-xs py-2 border border-orange-200 dark:border-orange-700 text-orange-600 dark:text-orange-400 rounded-xl hover:bg-orange-50 dark:hover:bg-orange-900/20 transition-colors"
          >
            <Power className="h-3.5 w-3.5" /> Desativar
          </button>
        ) : (
          <button
            onClick={() => onAtivar(tenant.id)}
            className="flex items-center justify-center gap-1.5 text-xs py-2 border border-green-200 dark:border-green-700 text-green-600 dark:text-green-400 rounded-xl hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors"
          >
            <Power className="h-3.5 w-3.5" /> Ativar
          </button>
        )}
      </div>

      {/* Delete */}
      <button
        onClick={() => onDelete(tenant, 'excluir')}
        className="flex items-center justify-center gap-1.5 text-xs py-1.5 text-red-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-colors w-full"
      >
        <Trash2 className="h-3.5 w-3.5" /> Excluir definitivamente
      </button>
    </div>
  );
}

// ─── Modal Novo Município ─────────────────────────────────────────────────────

function ModalNovo({ onClose, onSuccess }) {
  const [form, setForm] = useState({
    nome: '', subdominio: '', cidade: '', cnpj: '', estado: '',
    adminNome: '', adminEmail: '', adminCpf: '', adminSenha: '',
    modulosHabilitados: [],
  });
  const [loading, setLoading] = useState(false);
  const [slugManual, setSlugManual] = useState(false);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleNomeChange = (v) => {
    set('nome', v);
    if (!slugManual) set('subdominio', slugify(v));
  };

  const toggleModulo = (id) => {
    set('modulosHabilitados', form.modulosHabilitados.includes(id)
      ? form.modulosHabilitados.filter(m => m !== id)
      : [...form.modulosHabilitados, id]
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.nome || !form.subdominio || !form.cidade) {
      return alert('Preencha os campos obrigatórios.');
    }
    setLoading(true);
    try {
      await api.post('/superadmin/tenants', {
        nome: form.nome,
        subdominio: form.subdominio,
        cidade: form.cidade,
        cnpj: form.cnpj || '00000000000000',
        estado: form.estado || 'CE',
        adminNome: form.adminNome,
        adminEmail: form.adminEmail,
        adminCpf: form.adminCpf,
        adminSenha: form.adminSenha,
        configuracoes: {
          cor_primaria: '#1e3a5f',
          modulos_habilitados: form.modulosHabilitados
        }
      });
      onSuccess();
      onClose();
    } catch (err) {
      alert(err.response?.data?.error || 'Erro ao criar prefeitura');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-2xl max-h-[92vh] overflow-y-auto shadow-2xl">
        <div className="px-6 py-5 border-b border-gray-200 dark:border-slate-700 flex items-center justify-between sticky top-0 bg-white dark:bg-slate-800 z-10">
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Nova Prefeitura</h2>
            <p className="text-sm text-gray-500 mt-0.5">Cria um schema PostgreSQL isolado</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-slate-700">
            <XCircle className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Dados da prefeitura */}
          <div>
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
              <Building className="h-4 w-4" /> Dados da Prefeitura
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                  Nome da Prefeitura *
                </label>
                <input
                  value={form.nome}
                  onChange={e => handleNomeChange(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-xl text-sm bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Ex: Prefeitura Municipal de Exemplo"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                  Identificador (Slug) *
                </label>
                <input
                  value={form.subdominio}
                  onChange={e => { setSlugManual(true); set('subdominio', e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '')); }}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-xl text-sm font-mono bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                  placeholder="municipio-exemplo"
                  required
                />
                <p className="text-xs text-gray-400 mt-1">Não pode ser alterado depois</p>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                  Nome da Cidade *
                </label>
                <input
                  value={form.cidade}
                  onChange={e => set('cidade', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-xl text-sm bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                  placeholder="Ex: Fortaleza"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                  CNPJ
                </label>
                <input
                  value={form.cnpj}
                  onChange={e => set('cnpj', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-xl text-sm bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                  placeholder="00.000.000/0000-00"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                  Estado (UF)
                </label>
                <select
                  value={form.estado}
                  onChange={e => set('estado', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-xl text-sm bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Selecione...</option>
                  {UFS.map(uf => <option key={uf} value={uf}>{uf}</option>)}
                </select>
              </div>
            </div>
          </div>

          {/* Admin */}
          <div className="border-t dark:border-slate-700 pt-5">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
              <Shield className="h-4 w-4" /> Usuário Administrador
            </h3>
            <div className="grid grid-cols-2 gap-4">
              {[
                ['Nome Completo', 'adminNome', 'text', 'Maria Silva'],
                ['E-mail', 'adminEmail', 'email', 'admin@prefeitura.gov.br'],
                ['CPF', 'adminCpf', 'text', '000.000.000-00'],
                ['Senha', 'adminSenha', 'password', ''],
              ].map(([label, key, type, ph]) => (
                <div key={key}>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">{label}</label>
                  <input
                    type={type}
                    value={form[key]}
                    onChange={e => set(key, e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-xl text-sm bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                    placeholder={ph}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Módulos */}
          <div className="border-t dark:border-slate-700 pt-5">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
              <Lock className="h-4 w-4" /> Módulos Habilitados
            </h3>
            <div className="flex flex-wrap gap-2">
              {SYSTEM_MODULES.map(({ id, label, Icon }) => {
                const ativo = form.modulosHabilitados.includes(id);
                return (
                  <button key={id} type="button" onClick={() => toggleModulo(id)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm border-2 font-medium transition-all ${
                      ativo
                        ? 'border-green-500 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300'
                        : 'border-gray-200 dark:border-slate-600 bg-gray-50 dark:bg-slate-700 text-gray-500 dark:text-gray-400'
                    }`}>
                    <Icon className="h-3.5 w-3.5" /> {label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t dark:border-slate-700">
            <button type="button" onClick={onClose}
              className="px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-xl text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700 text-sm">
              Cancelar
            </button>
            <button type="submit" disabled={loading}
              className="flex items-center gap-2 px-5 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 text-sm disabled:opacity-50">
              {loading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              {loading ? 'Criando...' : 'Criar Prefeitura'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Modal Gerenciar (com abas) ───────────────────────────────────────────────

function ModalGerenciar({ tenant, initialTab = 'info', onClose, onUpdate }) {
  const [tab, setTab] = useState(initialTab);
  const [editUser, setEditUser] = useState(null);
  const [newUser, setNewUser] = useState(false);
  const [userForm, setUserForm] = useState({ nome: '', email: '', cpf: '', senha: '', tipo: 'operacional', ativo: true });

  const [logCategoria, setLogCategoria] = useState('');
  const [logBusca, setLogBusca]         = useState('');

  const [backupLoading, setBackupLoading] = useState(false);
  const [showSchedule, setShowSchedule]   = useState(false);
  const [scheduleForm, setScheduleForm]   = useState({ ativo: false, frequencia: 'diario', hora: 2, minuto: 0, retencao_dias: 7 });

  const [restoreFile, setRestoreFile]       = useState(null);
  const [restoreLoading, setRestoreLoading] = useState(false);
  const restoreRef = useRef();

  const [logoLoginFile, setLogoLoginFile]       = useState(null);
  const [logoInternaFile, setLogoInternaFile]   = useState(null);
  const [logoLoading, setLogoLoading]           = useState('');

  const [editNome, setEditNome]   = useState(tenant.nome_municipio);
  const [editAtivo, setEditAtivo] = useState(tenant.ativo);
  const [cor, setCor]             = useState(tenant.configuracoes?.cor_primaria || '#1e3a5f');
  const [modulosHabilitados, setModulosHabilitados] = useState(tenant.configuracoes?.modulos_habilitados || []);
  const [saveLoading, setSaveLoading] = useState(false);

  // Data fetching
  const { data: usersData,   refetch: refetchUsers   } = useQuery(
    ['sa-users', tenant.id],
    () => api.get(`/superadmin/tenants/${tenant.id}/usuarios`).then(r => r.data),
    { enabled: tab === 'usuarios', staleTime: 0 }
  );
  const { data: logsData,    refetch: refetchLogs    } = useQuery(
    ['sa-logs', tenant.id, logCategoria, logBusca],
    () => api.get(`/superadmin/tenants/${tenant.id}/logs`, { params: { categoria: logCategoria || undefined, busca: logBusca || undefined } }).then(r => r.data),
    { enabled: tab === 'logs', staleTime: 0 }
  );
  const { data: backupsData, refetch: refetchBackups } = useQuery(
    ['sa-backups', tenant.id],
    () => api.get(`/superadmin/tenants/${tenant.id}/backups`).then(r => r.data),
    { enabled: tab === 'backup', staleTime: 0 }
  );
  const { data: scheduleData, refetch: refetchSchedule } = useQuery(
    ['sa-schedule', tenant.id],
    () => api.get(`/superadmin/tenants/${tenant.id}/schedule`).then(r => r.data),
    {
      enabled: tab === 'backup',
      staleTime: 0,
      onSuccess: (d) => {
        if (d?.schedule) setScheduleForm({
          ativo:         d.schedule.ativo ?? false,
          frequencia:    d.schedule.frequencia || 'diario',
          hora:          d.schedule.hora ?? 2,
          minuto:        d.schedule.minuto ?? 0,
          retencao_dias: d.schedule.retencao_dias ?? 7,
        });
      }
    }
  );

  const usuarios = usersData?.usuarios || [];
  const logs     = logsData?.logs || [];
  const backups  = backupsData?.backups || [];
  const bStats   = backupsData?.stats || {};
  const schedule = scheduleData?.schedule || null;

  // ── User handlers ─────────────────────────────────────────────────────────

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

  // ── Backup handlers ───────────────────────────────────────────────────────

  const handleCreateBackup = async () => {
    setBackupLoading(true);
    try {
      await api.post(`/superadmin/tenants/${tenant.id}/backups`);
      refetchBackups();
    } catch (err) {
      alert(err.response?.data?.error || 'Erro ao criar backup');
    } finally {
      setBackupLoading(false);
    }
  };

  const handleDownloadBackup = async (backupId) => {
    try {
      const { data } = await api.get(`/superadmin/tenants/${tenant.id}/backups/${encodeURIComponent(backupId)}/download`);
      if (data.url) window.open(data.url, '_blank');
    } catch (err) {
      alert(err.response?.data?.error || 'Erro ao baixar backup');
    }
  };

  const handleDeleteBackup = async (backupId) => {
    if (!window.confirm('Excluir este backup?')) return;
    await api.delete(`/superadmin/tenants/${tenant.id}/backups/${encodeURIComponent(backupId)}`);
    refetchBackups();
  };

  const handleClearHistory = async () => {
    if (!window.confirm('Limpar todo o histórico de backups? Os arquivos no storage serão mantidos.')) return;
    await api.delete(`/superadmin/tenants/${tenant.id}/backups`);
    refetchBackups();
  };

  const handleSaveSchedule = async () => {
    try {
      await api.put(`/superadmin/tenants/${tenant.id}/schedule`, scheduleForm);
      setShowSchedule(false);
      refetchSchedule();
      alert('Agendamento salvo!');
    } catch (err) {
      alert(err.response?.data?.error || 'Erro ao salvar agendamento');
    }
  };

  // ── Restore handler ───────────────────────────────────────────────────────

  const handleRestore = async () => {
    if (!restoreFile) return alert('Selecione um arquivo de backup.');
    if (!window.confirm(
      `ATENÇÃO: Esta ação substituirá TODOS os dados do schema "${tenant.schema}".\n\nUm backup preventivo será criado automaticamente antes.\n\nContinuar?`
    )) return;

    setRestoreLoading(true);
    try {
      const form = new FormData();
      form.append('backup', restoreFile);
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

  // ── Logo handlers ─────────────────────────────────────────────────────────

  const handleUploadLogo = async (tipo, file) => {
    if (!file) return;
    setLogoLoading(tipo);
    try {
      const form = new FormData();
      form.append('logo', file);
      await api.post(`/superadmin/tenants/${tenant.id}/logos/${tipo}`, form, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      onUpdate();
      alert('Logo enviada com sucesso!');
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

  // ── Config handler ────────────────────────────────────────────────────────

  const handleSaveConfig = async () => {
    setSaveLoading(true);
    try {
      await api.put(`/superadmin/tenants/${tenant.id}/config`, {
        nome: editNome,
        ativo: editAtivo,
        configuracoes: {
          ...(tenant.configuracoes || {}),
          cor_primaria: cor,
          modulos_habilitados: modulosHabilitados
        }
      });
      onUpdate();
      alert('Configurações salvas!');
    } catch (err) {
      alert(err.response?.data?.error || 'Erro ao salvar');
    } finally {
      setSaveLoading(false);
    }
  };

  const handleDesativar = async () => {
    if (!window.confirm(`Desativar ${tenant.nome_municipio}? Os dados serão preservados.`)) return;
    await api.delete(`/superadmin/tenants/${tenant.id}`);
    onUpdate(); onClose();
  };

  const handleExcluir = async () => {
    const ok1 = window.confirm(`ATENÇÃO: Excluir definitivamente "${tenant.nome_municipio}"?\n\nTodos os dados, usuários e o schema do banco serão apagados permanentemente.`);
    if (!ok1) return;
    const confirm2 = window.prompt('Digite o nome do município para confirmar:');
    if (confirm2 !== tenant.nome_municipio) return alert('Nome incorreto. Operação cancelada.');
    await api.delete(`/superadmin/tenants/${tenant.id}`, { data: { confirmar_exclusao: true } });
    onUpdate(); onClose();
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl">

        {/* Modal header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-slate-700 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center">
              <Building className="h-5 w-5 text-white" />
            </div>
            <div>
              <h2 className="font-bold text-gray-900 dark:text-white">{tenant.nome_municipio}</h2>
              <p className="text-xs text-gray-500 font-mono">/{tenant.subdominio} · {tenant.schema}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge color={tenant.ativo ? 'green' : 'gray'}>{tenant.ativo ? 'Ativo' : 'Inativo'}</Badge>
            <button onClick={onClose} className="p-1.5 rounded-xl text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-slate-700">
              <XCircle className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 dark:border-slate-700 px-4 overflow-x-auto shrink-0">
          {TABS.map(({ id, label, Icon }) => (
            <button key={id} onClick={() => setTab(id)}
              className={`flex items-center gap-1.5 px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                tab === id
                  ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              <Icon className="h-4 w-4" /> {label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">

          {/* ── Informações ─────────────────────────────────────────────────── */}
          {tab === 'info' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                {[
                  ['Município',  tenant.nome_municipio],
                  ['CNPJ',       tenant.cnpj || '—'],
                  ['Cidade/UF',  `${tenant.cidade}/${tenant.estado}`],
                  ['Subdomínio', tenant.subdominio],
                  ['Schema DB',  tenant.schema],
                  ['Criado em',  fmtDate(tenant.created_at)],
                ].map(([k, v]) => (
                  <div key={k} className="bg-gray-50 dark:bg-slate-700/40 rounded-xl p-4">
                    <p className="text-xs text-gray-500 mb-1">{k}</p>
                    <p className="font-medium text-gray-900 dark:text-white text-sm break-all">{v}</p>
                  </div>
                ))}
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-2">Módulos habilitados</p>
                <div className="flex flex-wrap gap-2">
                  {(tenant.configuracoes?.modulos_habilitados || []).map(m => (
                    <Badge key={m} color="blue">{m}</Badge>
                  ))}
                  {!(tenant.configuracoes?.modulos_habilitados?.length) && (
                    <span className="text-gray-400 text-sm">Nenhum módulo habilitado</span>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ── Usuários ────────────────────────────────────────────────────── */}
          {tab === 'usuarios' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-gray-800 dark:text-white">
                  Usuários cadastrados
                  {usuarios.length > 0 && (
                    <Badge color="blue">{usuarios.length}</Badge>
                  )}
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
                  <h4 className="font-medium text-gray-800 dark:text-white text-sm">
                    {editUser ? 'Editar Usuário' : 'Novo Usuário'}
                  </h4>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      ['Nome completo', 'nome', 'text'],
                      ['E-mail', 'email', 'email'],
                      ['CPF', 'cpf', 'text'],
                      ['Senha', 'senha', 'password'],
                    ].map(([label, field, type]) => (
                      <div key={field}>
                        <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">{label}</label>
                        <input type={type} value={userForm[field] || ''}
                          onChange={e => setUserForm(f => ({ ...f, [field]: e.target.value }))}
                          className="w-full px-3 py-1.5 border border-gray-300 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-700 dark:text-white focus:ring-blue-500 focus:border-blue-500"
                          placeholder={editUser && field === 'senha' ? '(deixe em branco para manter)' : ''}
                        />
                      </div>
                    ))}
                    <div>
                      <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Tipo</label>
                      <select value={userForm.tipo} onChange={e => setUserForm(f => ({ ...f, tipo: e.target.value }))}
                        className="w-full px-3 py-1.5 border border-gray-300 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-700 dark:text-white">
                        <option value="operacional">Operacional</option>
                        <option value="gestor">Gestor</option>
                        <option value="admin">Administrador</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Status</label>
                      <select value={String(userForm.ativo)} onChange={e => setUserForm(f => ({ ...f, ativo: e.target.value === 'true' }))}
                        className="w-full px-3 py-1.5 border border-gray-300 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-700 dark:text-white">
                        <option value="true">Ativo</option>
                        <option value="false">Inativo</option>
                      </select>
                    </div>
                  </div>
                  <div className="flex gap-2 justify-end pt-1">
                    <button onClick={() => { setNewUser(false); setEditUser(null); }}
                      className="px-3 py-1.5 border border-gray-300 dark:border-slate-600 rounded-lg text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700">
                      Cancelar
                    </button>
                    <button onClick={handleSaveUser}
                      className="px-4 py-1.5 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">
                      Salvar
                    </button>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                {usuarios.map(u => (
                  <div key={u.id} className="flex items-center justify-between p-3 border border-gray-200 dark:border-slate-700 rounded-xl hover:bg-gray-50 dark:hover:bg-slate-700/40">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                        u.tipo === 'admin' ? 'bg-orange-100 text-orange-700' : 'bg-blue-100 text-blue-700'
                      }`}>
                        {u.nome?.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-medium text-sm text-gray-900 dark:text-white">{u.nome}</p>
                        <p className="text-xs text-gray-500">{u.email || '—'} · {u.tipo}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge color={u.ativo ? 'green' : 'gray'}>{u.ativo ? 'Ativo' : 'Inativo'}</Badge>
                      <button
                        onClick={() => { setEditUser(u); setNewUser(false); setUserForm({ nome: u.nome, email: u.email || '', cpf: u.cpf || '', senha: '', tipo: u.tipo, ativo: u.ativo }); }}
                        className="p-1 text-blue-500 hover:text-blue-700">
                        <Edit2 className="h-4 w-4" />
                      </button>
                      <button onClick={() => handleDeleteUser(u.id)} className="p-1 text-red-400 hover:text-red-600">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
                {!usuarios.length && <p className="text-center text-gray-400 py-8 text-sm">Nenhum usuário encontrado</p>}
              </div>
            </div>
          )}

          {/* ── Logs ────────────────────────────────────────────────────────── */}
          {tab === 'logs' && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 flex-wrap">
                <select value={logCategoria} onChange={e => setLogCategoria(e.target.value)}
                  className="px-3 py-1.5 border border-gray-300 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-700 dark:text-white">
                  <option value="">Todas categorias</option>
                  {['processos','almoxarifado','patrimonio','financeiro','contratos','auth','configuracoes'].map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
                <input
                  value={logBusca}
                  onChange={e => setLogBusca(e.target.value)}
                  placeholder="Buscar..."
                  className="px-3 py-1.5 border border-gray-300 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-700 dark:text-white flex-1 min-w-[120px]"
                />
                <button onClick={refetchLogs} className="p-1.5 rounded-lg border border-gray-300 dark:border-slate-600 hover:bg-gray-50 dark:hover:bg-slate-700">
                  <RefreshCw className="h-4 w-4 text-gray-500" />
                </button>
                <span className="text-sm text-gray-500">{logsData?.total || 0} registros</span>
              </div>

              <div className="space-y-2">
                {logs.map(l => (
                  <div key={l.id} className="flex items-start gap-3 p-3 border border-gray-200 dark:border-slate-700 rounded-xl">
                    <div className="w-2 h-2 rounded-full bg-green-500 mt-2 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-white">{l.acao}</p>
                      <p className="text-xs text-gray-500 truncate">{l.usuario_nome || 'Sistema'} · {l.ip || '—'}</p>
                      {l.descricao && <p className="text-xs text-gray-400 mt-0.5 truncate">{l.descricao}</p>}
                    </div>
                    <div className="text-right shrink-0">
                      <Badge color="blue">{l.modulo || 'sistema'}</Badge>
                      <p className="text-xs text-gray-400 mt-1">{fmtDate(l.created_at)}</p>
                    </div>
                  </div>
                ))}
                {!logs.length && <p className="text-center text-gray-400 py-8 text-sm">Nenhum log encontrado</p>}
              </div>
            </div>
          )}

          {/* ── Backup ──────────────────────────────────────────────────────── */}
          {tab === 'backup' && (
            <div className="space-y-4">
              {/* Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <StatMini label="Concluídos" value={bStats.concluidos ?? 0} color="green" Icon={CheckCircle} />
                <StatMini label="Falhas"     value={bStats.falhas ?? 0}     color="red"   Icon={XCircle} />
                <StatMini label="Storage"    value={`${bStats.storageUsed ?? 0} MB`} color="blue" Icon={Server} />
                <StatMini label="Último"     value={bStats.ultimoBackup ? fmtDateShort(bStats.ultimoBackup) : '—'} color="purple" Icon={Clock} />
              </div>

              {/* Actions */}
              <div className="flex flex-wrap gap-2">
                <button onClick={handleCreateBackup} disabled={backupLoading}
                  className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-xl text-sm hover:bg-blue-700 disabled:opacity-50">
                  {backupLoading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <CloudUpload className="h-4 w-4" />}
                  {backupLoading ? 'Criando...' : 'Fazer Backup'}
                </button>
                <button onClick={() => setShowSchedule(!showSchedule)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm border ${
                    showSchedule
                      ? 'bg-purple-600 text-white border-purple-600'
                      : 'border-gray-300 dark:border-slate-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700'
                  }`}>
                  <Calendar className="h-4 w-4" /> Agendamento
                </button>
                <button onClick={refetchBackups}
                  className="flex items-center gap-2 border border-gray-300 dark:border-slate-600 px-4 py-2 rounded-xl text-sm hover:bg-gray-50 dark:hover:bg-slate-700 dark:text-gray-300">
                  <RefreshCw className="h-4 w-4" /> Atualizar
                </button>
                <button onClick={handleClearHistory}
                  className="flex items-center gap-2 border border-red-200 text-red-500 dark:border-red-800 dark:text-red-400 px-4 py-2 rounded-xl text-sm hover:bg-red-50 dark:hover:bg-red-900/20">
                  <Trash2 className="h-4 w-4" /> Limpar Histórico
                </button>
              </div>

              {/* Schedule inline panel */}
              {showSchedule && (
                <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-xl p-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-semibold text-purple-800 dark:text-purple-300 flex items-center gap-2">
                      <Calendar className="h-4 w-4" /> Configurar Agendamento
                    </h4>
                    {schedule && (
                      <div className="text-xs text-purple-600 dark:text-purple-400 space-y-0.5">
                        {schedule.proximo_backup && <p>Próximo: {fmtDate(schedule.proximo_backup)}</p>}
                        {schedule.ultimo_backup_automatico && <p>Último automático: {fmtDate(schedule.ultimo_backup_automatico)}</p>}
                      </div>
                    )}
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <div className="flex items-center gap-3">
                      <label className="text-sm font-medium text-purple-800 dark:text-purple-300">Ativo</label>
                      <button type="button"
                        onClick={() => setScheduleForm(f => ({ ...f, ativo: !f.ativo }))}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${scheduleForm.ativo ? 'bg-purple-600' : 'bg-gray-300 dark:bg-slate-600'}`}>
                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${scheduleForm.ativo ? 'translate-x-6' : 'translate-x-1'}`} />
                      </button>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-purple-700 dark:text-purple-400 mb-1">Frequência</label>
                      <select value={scheduleForm.frequencia}
                        onChange={e => setScheduleForm(f => ({ ...f, frequencia: e.target.value }))}
                        className="w-full px-3 py-1.5 border border-purple-300 dark:border-purple-700 rounded-lg text-sm bg-white dark:bg-slate-700 dark:text-white">
                        <option value="diario">Diário</option>
                        <option value="semanal">Semanal</option>
                        <option value="mensal">Mensal</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-purple-700 dark:text-purple-400 mb-1">Horário</label>
                      <div className="flex gap-2">
                        <select value={scheduleForm.hora}
                          onChange={e => setScheduleForm(f => ({ ...f, hora: parseInt(e.target.value) }))}
                          className="flex-1 px-2 py-1.5 border border-purple-300 dark:border-purple-700 rounded-lg text-sm bg-white dark:bg-slate-700 dark:text-white">
                          {Array.from({ length: 24 }, (_, i) => (
                            <option key={i} value={i}>{String(i).padStart(2, '0')}h</option>
                          ))}
                        </select>
                        <select value={scheduleForm.minuto}
                          onChange={e => setScheduleForm(f => ({ ...f, minuto: parseInt(e.target.value) }))}
                          className="flex-1 px-2 py-1.5 border border-purple-300 dark:border-purple-700 rounded-lg text-sm bg-white dark:bg-slate-700 dark:text-white">
                          {[0, 15, 30, 45].map(m => (
                            <option key={m} value={m}>{String(m).padStart(2, '0')}min</option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-purple-700 dark:text-purple-400 mb-1">Retenção (dias)</label>
                      <input type="number" min="1" max="365" value={scheduleForm.retencao_dias}
                        onChange={e => setScheduleForm(f => ({ ...f, retencao_dias: parseInt(e.target.value) }))}
                        className="w-full px-3 py-1.5 border border-purple-300 dark:border-purple-700 rounded-lg text-sm bg-white dark:bg-slate-700 dark:text-white"
                      />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={handleSaveSchedule}
                      className="flex items-center gap-2 bg-purple-600 text-white px-4 py-2 rounded-xl text-sm hover:bg-purple-700">
                      <CheckCircle className="h-4 w-4" /> Salvar Agendamento
                    </button>
                    <button onClick={() => setShowSchedule(false)}
                      className="px-4 py-2 border border-purple-300 dark:border-purple-700 text-purple-700 dark:text-purple-300 rounded-xl text-sm hover:bg-purple-100 dark:hover:bg-purple-900/40">
                      Fechar
                    </button>
                  </div>
                </div>
              )}

              {/* Backup list */}
              <div className="space-y-2">
                {backups.map(b => (
                  <div key={b.id} className="flex items-center justify-between p-3 border border-gray-200 dark:border-slate-700 rounded-xl hover:bg-gray-50 dark:hover:bg-slate-700/30">
                    <div className="flex items-center gap-3 min-w-0">
                      <Archive className="h-5 w-5 text-blue-500 shrink-0" />
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge color={b.status === 'concluido' ? 'green' : b.status === 'falhou' ? 'red' : 'yellow'}>
                            {b.status === 'concluido' ? 'Concluído' : b.status === 'falhou' ? 'Falhou' : 'Pendente'}
                          </Badge>
                          <Badge color={b.tipo === 'automatico' ? 'purple' : b.tipo === 'pre-restore' ? 'orange' : 'blue'}>
                            {b.tipo === 'automatico' ? 'Automático' : b.tipo === 'pre-restore' ? 'Pre-Restore' : 'Manual'}
                          </Badge>
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                          {fmtDate(b.criado_em)}
                          {b.tamanho_bytes ? ` · ${fmtBytes(b.tamanho_bytes)}` : ''}
                          {b.tabelas_count ? ` · ${b.tabelas_count} tabelas` : ''}
                          {b.linhas_count ? ` · ${b.linhas_count} linhas` : ''}
                          {b.iniciado_por ? ` · ${b.iniciado_por}` : ''}
                        </p>
                        {b.erro && <p className="text-xs text-red-500 mt-0.5 truncate">{b.erro}</p>}
                      </div>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      {b.storage_path && (
                        <button onClick={() => handleDownloadBackup(b.id)}
                          className="p-1.5 rounded-lg border border-gray-200 dark:border-slate-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:border-blue-300 hover:text-blue-600" title="Baixar">
                          <Download className="h-4 w-4" />
                        </button>
                      )}
                      <button onClick={() => handleDeleteBackup(b.id)}
                        className="p-1.5 rounded-lg border border-gray-200 dark:border-slate-600 hover:bg-red-50 dark:hover:bg-red-900/20 hover:border-red-300 hover:text-red-600" title="Excluir">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
                {!backups.length && (
                  <div className="text-center py-8">
                    <Archive className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-400 text-sm">Nenhum backup encontrado</p>
                    <p className="text-gray-400 text-xs mt-1">Clique em "Fazer Backup" para criar o primeiro</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── Restore ─────────────────────────────────────────────────────── */}
          {tab === 'restore' && (
            <div className="space-y-5">
              <div className="bg-yellow-50 dark:bg-yellow-900/20 border-2 border-yellow-300 dark:border-yellow-700 rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-6 w-6 text-yellow-600 dark:text-yellow-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold text-yellow-800 dark:text-yellow-300">ATENÇÃO — Operação Irreversível</p>
                    <p className="text-sm text-yellow-700 dark:text-yellow-400 mt-1">
                      Restaurar um backup substitui <strong>TODOS</strong> os dados atuais do schema{' '}
                      <code className="bg-yellow-100 dark:bg-yellow-800 px-1 rounded font-mono">{tenant.schema}</code>.
                    </p>
                    <p className="text-sm text-yellow-700 dark:text-yellow-400 mt-1">
                      Um backup preventivo será criado automaticamente antes da restauração.
                    </p>
                  </div>
                </div>
              </div>

              <div
                className="border-2 border-dashed border-gray-300 dark:border-slate-600 rounded-xl p-10 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50/30 dark:hover:bg-blue-900/10 transition-colors"
                onClick={() => restoreRef.current?.click()}
                onDragOver={e => e.preventDefault()}
                onDrop={e => { e.preventDefault(); setRestoreFile(e.dataTransfer.files[0] || null); }}
              >
                <RotateCcw className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                <p className="text-sm text-blue-600 dark:text-blue-400 font-medium">
                  Arraste o arquivo .zip ou .sql aqui ou clique para selecionar
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  {restoreFile ? restoreFile.name : 'Nenhum arquivo selecionado'}
                </p>
                <input ref={restoreRef} type="file" accept=".zip,.sql,.gz" className="hidden"
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

          {/* ── Configurar ──────────────────────────────────────────────────── */}
          {tab === 'configurar' && (
            <div className="space-y-6">
              {/* Logos */}
              <div>
                <h3 className="font-semibold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
                  <Image className="h-5 w-5" /> Identidade Visual
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  {[
                    { tipo: 'login',   label: 'Logo da tela de login',   field: 'logo_login_url',   file: logoLoginFile,   setFile: setLogoLoginFile },
                    { tipo: 'interna', label: 'Logo interna do sistema', field: 'logo_interna_url', file: logoInternaFile, setFile: setLogoInternaFile },
                  ].map(({ tipo, label, field, file, setFile }) => {
                    const currentUrl = tenant.configuracoes?.[field];
                    return (
                      <div key={tipo} className="border border-gray-200 dark:border-slate-700 rounded-xl p-4">
                        <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">{label}</p>
                        <div className="flex gap-3 items-start">
                          <div className="w-20 h-20 border-2 border-dashed border-gray-300 dark:border-slate-600 rounded-lg flex items-center justify-center bg-gray-50 dark:bg-slate-700 overflow-hidden shrink-0">
                            {currentUrl
                              ? <img src={currentUrl} alt="Logo" className="max-w-full max-h-full object-contain" />
                              : <Image className="h-8 w-8 text-gray-300" />}
                          </div>
                          <div className="flex-1 space-y-2">
                            <input type="file" accept="image/*"
                              onChange={e => setFile(e.target.files[0] || null)}
                              className="block w-full text-xs text-gray-500 file:mr-2 file:py-1 file:px-3 file:rounded file:border-0 file:text-xs file:font-medium file:bg-blue-50 file:text-blue-700 dark:text-gray-400" />
                            <div className="flex gap-2">
                              <button onClick={() => { handleUploadLogo(tipo, file); setFile(null); }}
                                disabled={!file || logoLoading === tipo}
                                className="flex items-center gap-1 text-xs bg-blue-600 text-white px-2 py-1 rounded hover:bg-blue-700 disabled:opacity-50">
                                {logoLoading === tipo ? <RefreshCw className="h-3 w-3 animate-spin" /> : <Upload className="h-3 w-3" />}
                                Enviar
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

              {/* Config geral */}
              <div>
                <h3 className="font-semibold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
                  <Palette className="h-5 w-5" /> Configurações
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nome do Município</label>
                    <input value={editNome} onChange={e => setEditNome(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-700 dark:text-white" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Status</label>
                    <select value={String(editAtivo)} onChange={e => setEditAtivo(e.target.value === 'true')}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-700 dark:text-white">
                      <option value="true">Ativo</option>
                      <option value="false">Inativo</option>
                    </select>
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Cor do Menu Lateral</label>
                    <div className="flex items-center gap-2">
                      <input type="color" value={cor} onChange={e => setCor(e.target.value)}
                        className="w-10 h-10 rounded border border-gray-300 dark:border-slate-600 cursor-pointer" />
                      <input value={cor} onChange={e => setCor(e.target.value)}
                        className="flex-1 px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg text-sm font-mono bg-white dark:bg-slate-700 dark:text-white" />
                    </div>
                  </div>
                </div>
                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Módulos Habilitados</label>
                  <div className="flex flex-wrap gap-2">
                    {SYSTEM_MODULES.map(({ id, label, Icon }) => {
                      const ativo = modulosHabilitados.includes(id);
                      return (
                        <button key={id} type="button"
                          onClick={() => setModulosHabilitados(prev => prev.includes(id) ? prev.filter(m => m !== id) : [...prev, id])}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm border-2 font-medium transition-all ${
                            ativo
                              ? 'border-green-500 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300'
                              : 'border-gray-200 dark:border-slate-600 bg-gray-50 dark:bg-slate-700 text-gray-500 dark:text-gray-400'
                          }`}>
                          <Icon className="h-3.5 w-3.5" /> {label}
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
              <div className="border-2 border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/10 rounded-xl p-5">
                <h3 className="font-bold text-red-700 dark:text-red-400 mb-4 flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5" /> Zona de Perigo
                </h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-red-800 dark:text-red-300 text-sm">Desativar município</p>
                      <p className="text-xs text-red-600 dark:text-red-400">Ficará inacessível, mas os dados serão mantidos.</p>
                    </div>
                    <button onClick={handleDesativar}
                      className="px-3 py-1.5 bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 border border-orange-300 dark:border-orange-700 rounded-lg text-sm hover:bg-orange-200">
                      Desativar
                    </button>
                  </div>
                  <div className="border-t border-red-200 dark:border-red-800 pt-4 flex items-center justify-between">
                    <div>
                      <p className="font-medium text-red-800 dark:text-red-300 text-sm">Excluir definitivamente</p>
                      <p className="text-xs text-red-600 dark:text-red-400">Apaga município, usuários, arquivos e schema do banco.</p>
                    </div>
                    <button onClick={handleExcluir}
                      className="px-3 py-1.5 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700">
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

// ─── Main Component ───────────────────────────────────────────────────────────

export default function AdminTenants() {
  const navigate = useNavigate();
  const qc = useQueryClient();

  const [showNovo,    setShowNovo]    = useState(false);
  const [showPainel,  setShowPainel]  = useState(false);
  const [painelTab,   setPainelTab]   = useState('info');
  const [selectedTenant, setSelectedTenant] = useState(null);
  const [deleteTarget,   setDeleteTarget]   = useState(null);
  const [deleteMode,     setDeleteMode]     = useState('desativar');

  const handleLogout = async () => {
    try { await api.post('/auth/logout'); } catch {}
    localStorage.removeItem('token');
    localStorage.removeItem('subdomain');
    localStorage.removeItem('isAdmin');
    navigate('/');
  };

  const { data: tenantsData, refetch, isLoading } = useQuery(
    'sa-tenants',
    () => api.get('/superadmin/tenants').then(r => r.data),
    { staleTime: 30000 }
  );

  const ativarMutation = useMutation(
    id => api.patch(`/superadmin/tenants/${id}/ativar`).then(r => r.data),
    { onSuccess: () => refetch(), onError: e => alert(e.response?.data?.error || 'Erro ao ativar') }
  );

  const desativarMutation = useMutation(
    id => api.delete(`/superadmin/tenants/${id}`).then(r => r.data),
    { onSuccess: () => { refetch(); setDeleteTarget(null); },
      onError: e => alert(e.response?.data?.error || 'Erro ao desativar') }
  );

  const excluirMutation = useMutation(
    id => api.delete(`/superadmin/tenants/${id}`, { data: { confirmar_exclusao: true } }).then(r => r.data),
    { onSuccess: () => { refetch(); setDeleteTarget(null); },
      onError: e => alert(e.response?.data?.error || 'Erro ao excluir') }
  );

  const openModal = useCallback((tenant, tab = 'info') => {
    setSelectedTenant(tenant);
    setPainelTab(tab);
    setShowPainel(true);
  }, []);

  const handleDelete = useCallback((tenant, mode) => {
    setDeleteTarget(tenant);
    setDeleteMode(mode);
  }, []);

  const tenants  = tenantsData?.tenants || [];
  const stats    = tenantsData?.stats || {};

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900">
      {/* Header */}
      <header className="bg-white dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700 shadow-sm sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-br from-blue-500 to-blue-700 p-2.5 rounded-xl shadow">
              <Globe className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">Painel do Administrador Geral</h1>
              <p className="text-xs text-gray-500">Gerenciamento de Prefeituras · jProcesso</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300 hidden sm:block">Administrador Geral</span>
            <button onClick={handleLogout}
              className="flex items-center gap-1.5 text-sm text-gray-600 dark:text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 px-3 py-1.5 rounded-lg transition-colors">
              <LogOut className="h-4 w-4" /> Sair
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-8 space-y-6">

        {/* Stats row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Prefeituras',    value: stats.total    || 0, color: 'blue',   Icon: Building   },
            { label: 'Ativas',         value: stats.ativos   || 0, color: 'green',  Icon: CheckCircle },
            { label: 'Inativas',       value: stats.inativos || 0, color: 'red',    Icon: XCircle    },
            { label: 'Backups (24h)',  value: stats.backups24h || 0, color: 'purple', Icon: Archive    },
          ].map(({ label, value, color, Icon }) => (
            <StatMini key={label} label={label} value={value} color={color} Icon={Icon} />
          ))}
        </div>

        {/* Section header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-bold text-gray-800 dark:text-white text-lg">Prefeituras Cadastradas</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              {tenants.length} prefeitura{tenants.length !== 1 ? 's' : ''} cadastrada{tenants.length !== 1 ? 's' : ''}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => refetch()}
              className="flex items-center gap-1.5 px-3 py-2 text-sm border border-gray-300 dark:border-slate-600 text-gray-600 dark:text-gray-400 rounded-xl hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors">
              <RefreshCw className="h-4 w-4" /> Atualizar
            </button>
            <button onClick={() => setShowNovo(true)}
              className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-xl hover:bg-blue-700 text-sm shadow-sm font-medium transition-colors">
              <Plus className="h-4 w-4" /> Nova Prefeitura
            </button>
          </div>
        </div>

        {/* Tenants grid */}
        {isLoading ? (
          <div className="text-center py-12 text-gray-400">
            <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-3" />
            Carregando...
          </div>
        ) : tenants.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <Building className="h-16 w-16 mx-auto mb-4 opacity-30" />
            <p className="font-medium">Nenhuma prefeitura cadastrada</p>
            <p className="text-sm mt-1">Clique em "Nova Prefeitura" para começar</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {tenants.map(tenant => (
              <TenantCard
                key={tenant.id}
                tenant={tenant}
                onGerenciar={(tab) => openModal(tenant, tab || 'info')}
                onDelete={handleDelete}
                onAtivar={(id) => ativarMutation.mutate(id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Modal Painel de Gerenciamento */}
      {showPainel && selectedTenant && (
        <ModalGerenciar
          tenant={selectedTenant}
          initialTab={painelTab}
          onClose={() => { setShowPainel(false); setSelectedTenant(null); }}
          onUpdate={() => refetch()}
        />
      )}

      {/* Modal Nova Prefeitura */}
      {showNovo && (
        <ModalNovo
          onClose={() => setShowNovo(false)}
          onSuccess={() => { refetch(); alert('Prefeitura criada com sucesso!'); }}
        />
      )}

      {/* Modal Confirmar Ação */}
      {deleteTarget && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-md w-full shadow-2xl">
            <div className="px-6 py-5 border-b border-gray-200 dark:border-slate-700">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  deleteMode === 'excluir' ? 'bg-red-100 dark:bg-red-900/30' : 'bg-orange-100 dark:bg-orange-900/30'
                }`}>
                  <AlertTriangle className={`h-5 w-5 ${deleteMode === 'excluir' ? 'text-red-600' : 'text-orange-600'}`} />
                </div>
                <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                  {deleteMode === 'excluir' ? 'Excluir Definitivamente' : 'Confirmar Desativação'}
                </h2>
              </div>
            </div>
            <div className="p-6">
              <p className="text-gray-700 dark:text-gray-300 mb-2">
                {deleteMode === 'excluir' ? 'Excluir ' : 'Desativar '}
                <strong>{deleteTarget.nome_municipio}</strong>?
              </p>
              <p className="text-sm text-gray-500">
                {deleteMode === 'excluir'
                  ? 'TODOS os dados serão apagados permanentemente. Esta ação não pode ser desfeita.'
                  : 'Os dados serão preservados, mas o município ficará inacessível.'}
              </p>
            </div>
            <div className="px-6 py-4 bg-gray-50 dark:bg-slate-700/50 border-t border-gray-200 dark:border-slate-700 flex justify-end gap-3">
              <button onClick={() => setDeleteTarget(null)}
                className="px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-xl text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700">
                Cancelar
              </button>
              <button
                onClick={() => {
                  if (deleteMode === 'excluir') {
                    const name = window.prompt('Digite o nome do município para confirmar:');
                    if (name !== deleteTarget.nome_municipio) { alert('Nome incorreto.'); return; }
                    excluirMutation.mutate(deleteTarget.id);
                  } else {
                    desativarMutation.mutate(deleteTarget.id);
                  }
                }}
                disabled={desativarMutation.isLoading || excluirMutation.isLoading}
                className={`px-4 py-2 rounded-xl text-sm text-white disabled:opacity-50 ${
                  deleteMode === 'excluir' ? 'bg-red-600 hover:bg-red-700' : 'bg-orange-600 hover:bg-orange-700'
                }`}
              >
                {deleteMode === 'excluir' ? 'Excluir' : 'Desativar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
