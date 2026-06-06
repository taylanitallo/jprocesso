import { useQuery, useMutation, useQueryClient } from 'react-query';
import { useState, useRef, useCallback } from 'react';
import JSZip from 'jszip';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
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
  { id: 'relatorio',  label: 'Relatório',   Icon: Activity },
  { id: 'backup',     label: 'Backup',      Icon: HardDrive },
  { id: 'restore',    label: 'Restore',     Icon: RotateCcw },
  { id: 'configurar', label: 'Configurar',  Icon: Settings },
];

const UFS = ['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'];

const DEFAULT_PERMS = {
  criar_processo: true, editar_processo: true, excluir_processo: false,
  tramitar_processo: true, acessar_almoxarifado: false, acessar_financeiro: false,
  acessar_contratos: false, acessar_patrimonio: false, visualizar_relatorios: false,
  gerenciar_usuarios: false, gerenciar_secretarias: false, gerenciar_configuracoes: false,
  modulos_visiveis: ['processos'],
};

const PERM_GROUPS = [
  {
    label: 'Processos', color: 'blue',
    perms: [
      { key: 'criar_processo',    label: 'Criar processo' },
      { key: 'editar_processo',   label: 'Editar processo' },
      { key: 'tramitar_processo', label: 'Tramitar processo' },
      { key: 'excluir_processo',  label: 'Excluir processo' },
    ],
  },
  {
    label: 'Acesso a módulos', color: 'purple',
    perms: [
      { key: 'acessar_almoxarifado', label: 'Almoxarifado' },
      { key: 'acessar_financeiro',   label: 'Financeiro' },
      { key: 'acessar_contratos',    label: 'Contratos' },
      { key: 'acessar_patrimonio',   label: 'Patrimônio' },
    ],
  },
  {
    label: 'Administração', color: 'orange',
    perms: [
      { key: 'visualizar_relatorios',    label: 'Ver relatórios' },
      { key: 'gerenciar_usuarios',       label: 'Gerenciar usuários' },
      { key: 'gerenciar_secretarias',    label: 'Gerenciar secretarias' },
      { key: 'gerenciar_configuracoes',  label: 'Configurações do sistema' },
    ],
  },
];

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

function formatCPF(v) {
  const d = v.replace(/\D/g, '').slice(0, 11);
  if (d.length <= 3) return d;
  if (d.length <= 6) return `${d.slice(0,3)}.${d.slice(3)}`;
  if (d.length <= 9) return `${d.slice(0,3)}.${d.slice(3,6)}.${d.slice(6)}`;
  return `${d.slice(0,3)}.${d.slice(3,6)}.${d.slice(6,9)}-${d.slice(9)}`;
}

function validateCPF(cpf) {
  const d = cpf.replace(/\D/g, '');
  if (d.length !== 11 || /^(\d)\1{10}$/.test(d)) return false;
  let sum = 0;
  for (let i = 0; i < 9; i++) sum += parseInt(d[i]) * (10 - i);
  let r = (sum * 10) % 11; if (r >= 10) r = 0;
  if (r !== parseInt(d[9])) return false;
  sum = 0;
  for (let i = 0; i < 10; i++) sum += parseInt(d[i]) * (11 - i);
  r = (sum * 10) % 11; if (r >= 10) r = 0;
  return r === parseInt(d[10]);
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
        href={`https://processo.jeossistemas.com/${tenant.subdominio}`}
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
  const EMPTY_USER = { nome: '', email: '', cpf: '', senha: '', tipo: 'operacional', ativo: true, secretaria_id: '', setor_id: '', permissoes: { ...DEFAULT_PERMS } };
  const [userForm, setUserForm] = useState(EMPTY_USER);

  const [logCategoria, setLogCategoria] = useState('');
  const [logBusca, setLogBusca]         = useState('');
  const [logPage, setLogPage]           = useState(1);
  const LOG_LIMIT = 20;
  const [clearLogsModal, setClearLogsModal] = useState({ open: false, modo: 'antigos', loading: false });

  const [relBusca,      setRelBusca]      = useState('');
  const [relStatus,     setRelStatus]     = useState('todos');
  const [relUsuario,    setRelUsuario]    = useState('');
  const [relDataInicio, setRelDataInicio] = useState('');
  const [relDataFim,    setRelDataFim]    = useState('');

  const [backupLoading, setBackupLoading] = useState(false);
  const [showSchedule, setShowSchedule]   = useState(false);
  const [scheduleForm, setScheduleForm]   = useState({ ativo: false, frequencia: 'diario', hora: 2, minuto: 0, retencao_dias: 7 });

  const [deleteModal, setDeleteModal] = useState({ open: false, backup: null, modo: 'registro', confirmado: false });
  const [clearModal,  setClearModal]  = useState({ open: false, modo: 'falhas', deleteFiles: false, loading: false });

  const [deleteUserModal, setDeleteUserModal] = useState({ open: false, userId: null, userName: '' });

  const [restoreFile, setRestoreFile]         = useState(null);
  const [restoreInfo, setRestoreInfo]         = useState(null);  // parsed metadata
  const [restoreError, setRestoreError]       = useState('');
  const [restoreAnalyzing, setRestoreAnalyzing] = useState(false);
  const [restoreConfirm, setRestoreConfirm]   = useState('');
  const [restoreLoading, setRestoreLoading]   = useState(false);
  const restoreRef = useRef();
  const editFormRef = useRef();

  const [logoLoginFile, setLogoLoginFile]       = useState(null);
  const [logoInternaFile, setLogoInternaFile]   = useState(null);
  const [logoLoading, setLogoLoading]           = useState('');

  const [editNome, setEditNome]   = useState(tenant.nome_municipio);
  const [editAtivo, setEditAtivo] = useState(tenant.ativo);
  const [cor, setCor]             = useState(tenant.configuracoes?.cor_primaria || '#1e3a5f');
  const [modulosHabilitados, setModulosHabilitados] = useState(tenant.configuracoes?.modulos_habilitados || []);
  const [saveLoading, setSaveLoading] = useState(false);

  const Q_OPTS = { retry: false, refetchOnWindowFocus: false };

  // Data fetching
  const { data: usersData,   refetch: refetchUsers   } = useQuery(
    ['sa-users', tenant.id],
    () => api.get(`/superadmin/tenants/${tenant.id}/usuarios`).then(r => r.data),
    { ...Q_OPTS, enabled: tab === 'usuarios', staleTime: 30000 }
  );
  const { data: secretariasData } = useQuery(
    ['sa-secretarias', tenant.id],
    () => api.get(`/superadmin/tenants/${tenant.id}/secretarias-setores`).then(r => r.data),
    { ...Q_OPTS, enabled: tab === 'usuarios', staleTime: 60000 }
  );
  const { data: logsData,    refetch: refetchLogs    } = useQuery(
    ['sa-logs', tenant.id, logCategoria, logBusca, logPage],
    () => api.get(`/superadmin/tenants/${tenant.id}/logs`, {
      params: { categoria: logCategoria || undefined, busca: logBusca || undefined, page: logPage, limit: LOG_LIMIT }
    }).then(r => r.data),
    { ...Q_OPTS, enabled: tab === 'logs', staleTime: 0, keepPreviousData: true }
  );
  const { data: backupsData, refetch: refetchBackups } = useQuery(
    ['sa-backups', tenant.id],
    () => api.get(`/superadmin/tenants/${tenant.id}/backups`).then(r => r.data),
    { ...Q_OPTS, enabled: tab === 'backup', staleTime: 15000 }
  );
  const { data: relatorioData, refetch: refetchRelatorio } = useQuery(
    ['sa-relatorio', tenant.id, relBusca, relStatus, relUsuario, relDataInicio, relDataFim],
    () => api.get(`/superadmin/tenants/${tenant.id}/access-report`, {
      params: {
        busca:       relUsuario || relBusca || undefined,
        status:      relStatus !== 'todos' ? relStatus : undefined,
        data_inicio: relDataInicio || undefined,
        data_fim:    relDataFim    || undefined,
      }
    }).then(r => r.data),
    { ...Q_OPTS, enabled: tab === 'relatorio', staleTime: 15000 }
  );

  const { data: scheduleData, refetch: refetchSchedule } = useQuery(
    ['sa-schedule', tenant.id],
    () => api.get(`/superadmin/tenants/${tenant.id}/schedule`).then(r => r.data),
    {
      ...Q_OPTS,
      enabled: tab === 'backup',
      staleTime: 30000,
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
    const cpfDigits = (userForm.cpf || '').replace(/\D/g, '');
    if (cpfDigits && !validateCPF(userForm.cpf)) {
      alert('CPF inválido. Verifique os dígitos informados.');
      return;
    }
    try {
      if (editUser) {
        await api.put(`/superadmin/tenants/${tenant.id}/usuarios/${editUser.id}`, userForm);
      } else {
        await api.post(`/superadmin/tenants/${tenant.id}/usuarios`, userForm);
      }
      setEditUser(null); setNewUser(false);
      setUserForm(EMPTY_USER);
      refetchUsers();
    } catch (err) {
      alert(err.response?.data?.error || 'Erro ao salvar usuário');
    }
  };

  const handleDeleteUser = (userId, userName) => {
    setDeleteUserModal({ open: true, userId, userName });
  };

  const confirmDeleteUser = async () => {
    try {
      await api.delete(`/superadmin/tenants/${tenant.id}/usuarios/${deleteUserModal.userId}`);
      setDeleteUserModal({ open: false, userId: null, userName: '' });
      refetchUsers();
    } catch (err) {
      alert(err.response?.data?.error || 'Erro ao remover usuário');
    }
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

  const handleDeleteBackup = (backup) => {
    setDeleteModal({ open: true, backup, modo: 'registro', confirmado: false });
  };

  const confirmDeleteBackup = async () => {
    const { backup, modo } = deleteModal;
    try {
      await api.delete(
        `/superadmin/tenants/${tenant.id}/backups/${encodeURIComponent(backup.id)}`,
        { params: { deleteFile: modo === 'arquivo' } }
      );
      setDeleteModal({ open: false, backup: null, modo: 'registro', confirmado: false });
      refetchBackups();
    } catch (err) {
      alert(err.response?.data?.error || 'Erro ao excluir backup');
    }
  };

  const handleClearHistory = () => {
    setClearModal({ open: true, modo: 'falhas', deleteFiles: false, loading: false });
  };

  const confirmClearHistory = async () => {
    const { modo, deleteFiles } = clearModal;
    setClearModal(s => ({ ...s, loading: true }));
    try {
      await api.delete(`/superadmin/tenants/${tenant.id}/backups`, {
        data: { modo, deleteFiles }
      });
      setClearModal({ open: false, modo: 'falhas', deleteFiles: false, loading: false });
      refetchBackups();
    } catch (err) {
      setClearModal(s => ({ ...s, loading: false }));
      alert(err.response?.data?.error || 'Erro ao limpar histórico');
    }
  };

  const confirmClearLogs = async () => {
    const { modo } = clearLogsModal;
    setClearLogsModal(s => ({ ...s, loading: true }));
    try {
      await api.delete(`/superadmin/tenants/${tenant.id}/logs`, { data: { modo } });
      setClearLogsModal({ open: false, modo: 'antigos', loading: false });
      setLogPage(1);
      refetchLogs();
    } catch (err) {
      setClearLogsModal(s => ({ ...s, loading: false }));
      alert(err.response?.data?.error || 'Erro ao limpar logs');
    }
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

  const handleRestoreFileChange = async (file) => {
    if (!file) { setRestoreFile(null); setRestoreInfo(null); setRestoreError(''); setRestoreConfirm(''); return; }
    if (!file.name.toLowerCase().endsWith('.zip')) {
      setRestoreFile(null); setRestoreInfo(null);
      setRestoreError('Apenas arquivos .zip gerados por este sistema são aceitos.');
      return;
    }
    setRestoreFile(file); setRestoreInfo(null); setRestoreError(''); setRestoreConfirm('');
    setRestoreAnalyzing(true);
    try {
      const zip = await JSZip.loadAsync(file);
      const metaFile = zip.file('metadata.json');
      if (!metaFile) { setRestoreError('metadata.json não encontrado — não é um backup válido deste sistema'); setRestoreFile(null); setRestoreAnalyzing(false); return; }
      const meta = JSON.parse(await metaFile.async('string'));
      const tables = meta.tables || [];
      const totalRows = tables.reduce((s, t) => s + (t.rows || 0), 0);
      setRestoreInfo({
        origem: meta.municipio || meta.tenant || '—',
        data: meta.created_at || meta.date || '—',
        tabelas: tables.length,
        totalRows,
        tamanho: fmtBytes(file.size),
        tables,
      });
    } catch {
      setRestoreError('Arquivo corrompido ou não é um backup válido deste sistema.');
      setRestoreFile(null);
    } finally {
      setRestoreAnalyzing(false);
    }
  };

  const handleRestore = async () => {
    if (!restoreFile || !restoreInfo) return;
    setRestoreLoading(true);
    try {
      const form = new FormData();
      form.append('backup', restoreFile);
      const { data } = await api.post(`/superadmin/tenants/${tenant.id}/restore`, form, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      alert(`Restauração concluída!\n${data.tables_restored} tabelas · ${data.rows_restored} registros`);
      setRestoreFile(null); setRestoreInfo(null); setRestoreConfirm('');
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

  const [desativarModal, setDesativarModal] = useState(false);

  const handleDesativar = () => setDesativarModal(true);

  const confirmDesativar = async () => {
    try {
      await api.delete(`/superadmin/tenants/${tenant.id}`);
      onUpdate(); onClose();
    } catch (err) {
      alert(err.response?.data?.error || 'Erro ao desativar');
    }
  };

  const [excluirModal, setExcluirModal] = useState(false);

  const handleExcluir = () => setExcluirModal(true);

  const confirmExcluir = async () => {
    try {
      await api.delete(`/superadmin/tenants/${tenant.id}`, { data: { confirmar_exclusao: true } });
      onUpdate(); onClose();
    } catch (err) {
      alert(err.response?.data?.error || 'Erro ao excluir');
    }
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
                  onClick={() => { setNewUser(true); setEditUser(null); setUserForm(EMPTY_USER); }}
                  className="flex items-center gap-1.5 bg-blue-600 text-white px-3 py-1.5 rounded-lg text-sm hover:bg-blue-700"
                >
                  <UserPlus className="h-4 w-4" /> Novo Usuário
                </button>
              </div>

              {(newUser || editUser) && (() => {
                  const secretarias = secretariasData?.secretarias || [];
                  const setoresDaSecretaria = secretarias.find(s => s.id === userForm.secretaria_id)?.setores || [];
                  const isFullAccess = userForm.tipo === 'admin' || userForm.tipo === 'jeos';
                  const setP = (key, val) => setUserForm(f => ({ ...f, permissoes: { ...f.permissoes, [key]: val } }));
                  const toggleMod = (id) => {
                    const cur = userForm.permissoes?.modulos_visiveis || [];
                    setP('modulos_visiveis', cur.includes(id) ? cur.filter(m => m !== id) : [...cur, id]);
                  };

                  return (
                    <div ref={editFormRef} className="border border-blue-200 dark:border-blue-800 rounded-xl overflow-hidden">
                      {/* Cabeçalho do form */}
                      <div className="bg-blue-600 px-4 py-2.5 flex items-center justify-between">
                        <h4 className="font-semibold text-white text-sm">
                          {editUser ? 'Editar Usuário' : 'Novo Usuário'}
                        </h4>
                        <button onClick={() => { setNewUser(false); setEditUser(null); }}
                          className="text-blue-200 hover:text-white text-xs">✕ Fechar</button>
                      </div>

                      <div className="p-4 space-y-4 bg-white dark:bg-slate-800">
                        {/* Dados básicos */}
                        <div className="grid grid-cols-2 gap-3">
                          {[
                            ['Nome completo', 'nome', 'text'],
                            ['E-mail', 'email', 'email'],
                            ['Senha', 'senha', 'password'],
                          ].map(([label, field, type]) => (
                            <div key={field}>
                              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">{label}</label>
                              <input type={type} value={userForm[field] || ''}
                                onChange={e => setUserForm(f => ({ ...f, [field]: e.target.value }))}
                                className="w-full px-3 py-1.5 border border-gray-300 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-700 dark:text-white focus:ring-2 focus:ring-blue-500"
                                placeholder={editUser && field === 'senha' ? '(deixe em branco para manter)' : ''}
                              />
                            </div>
                          ))}
                          <div>
                            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">CPF</label>
                            <input type="text" value={userForm.cpf || ''}
                              onChange={e => setUserForm(f => ({ ...f, cpf: formatCPF(e.target.value) }))}
                              maxLength={14} placeholder="000.000.000-00"
                              className={`w-full px-3 py-1.5 border rounded-lg text-sm bg-white dark:bg-slate-700 dark:text-white focus:ring-2 focus:ring-blue-500 ${
                                userForm.cpf && userForm.cpf.replace(/\D/g,'').length === 11 && !validateCPF(userForm.cpf)
                                  ? 'border-red-400' : 'border-gray-300 dark:border-slate-600'
                              }`}
                            />
                            {userForm.cpf && userForm.cpf.replace(/\D/g,'').length === 11 && !validateCPF(userForm.cpf) && (
                              <p className="text-xs text-red-500 mt-0.5">CPF inválido</p>
                            )}
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Tipo</label>
                            <select value={userForm.tipo} onChange={e => setUserForm(f => ({ ...f, tipo: e.target.value }))}
                              className="w-full px-3 py-1.5 border border-gray-300 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-700 dark:text-white">
                              <option value="operacional">Operacional</option>
                              <option value="gestor">Gestor</option>
                              <option value="admin">Administrador</option>
                              <option value="jeos">Administrador Jeos</option>
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

                        {/* Secretaria / Setor (apenas para não-admin) */}
                        {!isFullAccess && (
                          <div className="border-t border-gray-100 dark:border-slate-700 pt-4">
                            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
                              Lotação
                            </p>
                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Secretaria</label>
                                <select
                                  value={userForm.secretaria_id || ''}
                                  onChange={e => setUserForm(f => ({ ...f, secretaria_id: e.target.value, setor_id: '' }))}
                                  className="w-full px-3 py-1.5 border border-gray-300 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-700 dark:text-white"
                                >
                                  <option value="">— Todas as secretarias —</option>
                                  {secretarias.map(s => (
                                    <option key={s.id} value={s.id}>{s.sigla} — {s.nome}</option>
                                  ))}
                                </select>
                              </div>
                              <div>
                                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Setor</label>
                                <select
                                  value={userForm.setor_id || ''}
                                  onChange={e => setUserForm(f => ({ ...f, setor_id: e.target.value }))}
                                  disabled={!userForm.secretaria_id}
                                  className="w-full px-3 py-1.5 border border-gray-300 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-700 dark:text-white disabled:opacity-50"
                                >
                                  <option value="">— Todos os setores —</option>
                                  {setoresDaSecretaria.map(st => (
                                    <option key={st.id} value={st.id}>{st.sigla ? `${st.sigla} — ` : ''}{st.nome}</option>
                                  ))}
                                </select>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Abas visíveis (apenas para não-admin) */}
                        {!isFullAccess && (
                          <div className="border-t border-gray-100 dark:border-slate-700 pt-4">
                            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
                              Módulos visíveis
                            </p>
                            <div className="flex flex-wrap gap-2">
                              {SYSTEM_MODULES.map(({ id, label, Icon }) => {
                                const ativo = (userForm.permissoes?.modulos_visiveis || []).includes(id);
                                return (
                                  <button key={id} type="button" onClick={() => toggleMod(id)}
                                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs border-2 font-medium transition-all ${
                                      ativo
                                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                                        : 'border-gray-200 dark:border-slate-600 text-gray-400 dark:text-gray-500 line-through'
                                    }`}>
                                    <Icon className="h-3 w-3" /> {label}
                                  </button>
                                );
                              })}
                            </div>
                            <p className="text-xs text-gray-400 mt-2">Módulos não selecionados serão ocultos para este usuário</p>
                          </div>
                        )}

                        {/* Permissões (apenas para não-admin) */}
                        {!isFullAccess && (
                          <div className="border-t border-gray-100 dark:border-slate-700 pt-4 space-y-4">
                            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                              Permissões
                            </p>
                            {PERM_GROUPS.map(({ label, color, perms }) => {
                              const colors = {
                                blue:   'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800',
                                purple: 'bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800',
                                orange: 'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800',
                              };
                              const textColors = {
                                blue:   'text-blue-700 dark:text-blue-300',
                                purple: 'text-purple-700 dark:text-purple-300',
                                orange: 'text-orange-700 dark:text-orange-300',
                              };
                              return (
                                <div key={label} className={`rounded-xl border p-3 ${colors[color]}`}>
                                  <p className={`text-xs font-semibold mb-2 ${textColors[color]}`}>{label}</p>
                                  <div className="grid grid-cols-2 gap-2">
                                    {perms.map(({ key, label: pLabel }) => {
                                      const val = userForm.permissoes?.[key] ?? false;
                                      return (
                                        <label key={key} className="flex items-center gap-2 cursor-pointer select-none">
                                          <button type="button" onClick={() => setP(key, !val)}
                                            className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors shrink-0 ${val ? 'bg-green-500' : 'bg-gray-300 dark:bg-slate-600'}`}>
                                            <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform shadow ${val ? 'translate-x-4' : 'translate-x-0.5'}`} />
                                          </button>
                                          <span className="text-xs text-gray-700 dark:text-gray-300">{pLabel}</span>
                                        </label>
                                      );
                                    })}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}

                        {isFullAccess && (
                          <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl">
                            <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400 shrink-0" />
                            <p className="text-xs text-green-700 dark:text-green-300">
                              {userForm.tipo === 'jeos' ? 'Administrador Jeos' : 'Administrador'} tem acesso irrestrito a todas as secretarias, setores e funcionalidades do sistema.
                            </p>
                          </div>
                        )}

                        <div className="flex gap-2 justify-end pt-1 border-t border-gray-100 dark:border-slate-700">
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
                    </div>
                  );
                })()}

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
                        onClick={() => {
                          setEditUser(u); setNewUser(false);
                          setUserForm({
                            nome: u.nome, email: u.email || '', cpf: u.cpf || '', senha: '',
                            tipo: u.tipo, ativo: u.ativo,
                            secretaria_id: u.secretaria_id || '',
                            setor_id:      u.setor_id      || '',
                            permissoes:    { ...DEFAULT_PERMS, ...(u.permissoes || {}) },
                          });
                          setTimeout(() => editFormRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
                        }}
                        className="p-1 text-blue-500 hover:text-blue-700">
                        <Edit2 className="h-4 w-4" />
                      </button>
                      <button onClick={() => handleDeleteUser(u.id, u.nome)} className="p-1 text-red-400 hover:text-red-600">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
                {!usuarios.length && <p className="text-center text-gray-400 py-8 text-sm">Nenhum usuário encontrado</p>}
              </div>

              {/* Modal Excluir Usuário */}
              {deleteUserModal.open && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[60] p-4">
                  <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-sm shadow-2xl p-6 space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-red-100 dark:bg-red-900/40 flex items-center justify-center shrink-0">
                        <Trash2 className="h-5 w-5 text-red-600 dark:text-red-400" />
                      </div>
                      <div>
                        <h3 className="font-bold text-gray-900 dark:text-white">Remover Usuário</h3>
                        <p className="text-sm text-gray-500">{deleteUserModal.userName}</p>
                      </div>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      O usuário será removido permanentemente. Esta ação não pode ser desfeita.
                    </p>
                    <div className="flex gap-3">
                      <button
                        onClick={() => setDeleteUserModal({ open: false, userId: null, userName: '' })}
                        className="flex-1 px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-xl text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700"
                      >
                        Cancelar
                      </button>
                      <button
                        onClick={confirmDeleteUser}
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-red-600 text-white rounded-xl text-sm hover:bg-red-700"
                      >
                        <Trash2 className="h-4 w-4" /> Remover
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── Logs ────────────────────────────────────────────────────────── */}
          {tab === 'logs' && (() => {
            const logTotal = logsData?.total || 0;
            const totalPages = Math.max(1, Math.ceil(logTotal / LOG_LIMIT));

            return (
              <div className="space-y-4">
                {/* Barra de filtros + ações */}
                <div className="flex items-center gap-2 flex-wrap">
                  <select value={logCategoria} onChange={e => { setLogCategoria(e.target.value); setLogPage(1); }}
                    className="px-3 py-1.5 border border-gray-300 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-700 dark:text-white">
                    <option value="">Todas categorias</option>
                    {['processos','almoxarifado','patrimonio','financeiro','contratos','sessao','configuracoes'].map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                  <input
                    value={logBusca}
                    onChange={e => { setLogBusca(e.target.value); setLogPage(1); }}
                    placeholder="Buscar..."
                    className="flex-1 min-w-[120px] px-3 py-1.5 border border-gray-300 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-700 dark:text-white"
                  />
                  <button onClick={() => { setLogPage(1); refetchLogs(); }}
                    className="p-1.5 rounded-lg border border-gray-300 dark:border-slate-600 hover:bg-gray-50 dark:hover:bg-slate-700">
                    <RefreshCw className="h-4 w-4 text-gray-500" />
                  </button>
                  <span className="text-sm text-gray-500 whitespace-nowrap">{logTotal} registros</span>
                  <button
                    onClick={() => setClearLogsModal({ open: true, modo: 'antigos', loading: false })}
                    className="flex items-center gap-1.5 px-3 py-1.5 border border-red-200 dark:border-red-800 text-red-500 dark:text-red-400 rounded-lg text-sm hover:bg-red-50 dark:hover:bg-red-900/20"
                  >
                    <Trash2 className="h-4 w-4" /> Apagar Logs
                  </button>
                </div>

                {/* Lista de logs */}
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

                {/* Paginação */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between pt-2 border-t border-gray-200 dark:border-slate-700">
                    <button
                      onClick={() => setLogPage(p => Math.max(1, p - 1))}
                      disabled={logPage <= 1}
                      className="flex items-center gap-1 px-3 py-1.5 border border-gray-300 dark:border-slate-600 rounded-lg text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      ← Anterior
                    </button>
                    <span className="text-sm text-gray-500">
                      Página {logPage} de {totalPages}
                    </span>
                    <button
                      onClick={() => setLogPage(p => Math.min(totalPages, p + 1))}
                      disabled={logPage >= totalPages}
                      className="flex items-center gap-1 px-3 py-1.5 border border-gray-300 dark:border-slate-600 rounded-lg text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      Próxima →
                    </button>
                  </div>
                )}

                {/* Modal Apagar Logs */}
                {clearLogsModal.open && (
                  <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[60] p-4">
                    <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-md shadow-2xl p-6 space-y-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-red-100 dark:bg-red-900/40 flex items-center justify-center shrink-0">
                          <Trash2 className="h-5 w-5 text-red-600 dark:text-red-400" />
                        </div>
                        <h3 className="font-bold text-gray-900 dark:text-white">Apagar Logs</h3>
                      </div>

                      <div className="space-y-2">
                        {[
                          { val: 'antigos', label: 'Logs com mais de 7 dias', desc: 'Remove apenas registros mais antigos que 7 dias (regra padrão do sistema)' },
                          { val: 'todos',   label: 'Todos os logs',           desc: 'Remove completamente o histórico de atividades — ação irreversível' },
                        ].map(({ val, label, desc }) => (
                          <label key={val} className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${
                            clearLogsModal.modo === val
                              ? 'border-red-400 bg-red-50 dark:bg-red-900/20'
                              : 'border-gray-200 dark:border-slate-600 hover:bg-gray-50 dark:hover:bg-slate-700/40'
                          }`}>
                            <input type="radio" name="clearLogsModo" value={val}
                              checked={clearLogsModal.modo === val}
                              onChange={() => setClearLogsModal(s => ({ ...s, modo: val }))}
                              className="mt-0.5 accent-red-600" />
                            <div>
                              <p className="text-sm font-medium text-gray-900 dark:text-white">{label}</p>
                              <p className="text-xs text-gray-500 dark:text-gray-400">{desc}</p>
                            </div>
                          </label>
                        ))}
                      </div>

                      <div className="flex gap-3 pt-1">
                        <button onClick={() => setClearLogsModal({ open: false, modo: 'antigos', loading: false })}
                          className="flex-1 px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-xl text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700">
                          Cancelar
                        </button>
                        <button onClick={confirmClearLogs} disabled={clearLogsModal.loading}
                          className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-red-600 text-white rounded-xl text-sm hover:bg-red-700 disabled:opacity-50">
                          {clearLogsModal.loading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                          {clearLogsModal.loading ? 'Apagando...' : 'Apagar'}
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })()}

          {/* ── Relatório de Acessos ─────────────────────────────────────── */}
          {tab === 'relatorio' && (() => {
            const relLogs   = relatorioData?.logs  || [];
            const relTotal  = relatorioData?.total || 0;
            const relAtivos = relatorioData?.ativos || 0;

            const usuariosUnicos = [...new Map(relLogs.map(l => [l.usuario_nome, l])).values()].map(l => l.usuario_nome).filter(Boolean);

            const exportCSV = () => {
              const header = 'Usuário,Ação,Data/Hora,IP\n';
              const rows   = relLogs.map(l =>
                `"${l.usuario_nome || ''}","${l.acao || ''}","${fmtDate(l.created_at)}","${l.ip || ''}"`
              ).join('\n');
              const blob = new Blob([header + rows], { type: 'text/csv;charset=utf-8;' });
              const url  = URL.createObjectURL(blob);
              const a    = Object.assign(document.createElement('a'), { href: url, download: `acessos_${tenant.subdominio}.csv` });
              a.click(); URL.revokeObjectURL(url);
            };

            const exportPDF = async () => {
              const doc = new jsPDF({ orientation: 'portrait', format: 'a4', unit: 'mm' });
              const pw = doc.internal.pageSize.getWidth();
              const ph = doc.internal.pageSize.getHeight();

              // Carrega timbrado como fundo da página
              let timbradoB64 = null;
              try {
                const resp = await fetch('/TIMBRADO - A4 (RETRATO).png');
                const blob = await resp.blob();
                timbradoB64 = await new Promise(res => {
                  const r = new FileReader(); r.onload = () => res(r.result); r.readAsDataURL(blob);
                });
                doc.addImage(timbradoB64, 'PNG', 0, 0, pw, ph);
              } catch (_) {}

              // Título
              doc.setFont('helvetica', 'bold');
              doc.setFontSize(11);
              doc.setTextColor(30, 64, 175);
              doc.text('jProcesso - Sistema de Tramitação Digital', pw / 2, 48, { align: 'center' });
              doc.setFontSize(10);
              doc.setFont('helvetica', 'normal');
              doc.setTextColor(40);
              doc.text(`Relatório de Acessos — ${tenant.nome_municipio}`, pw / 2, 55, { align: 'center' });
              doc.setFontSize(8);
              doc.setTextColor(120);
              doc.text(`Gerado em ${fmtDate(new Date())} · ${relTotal} registros`, pw / 2, 61, { align: 'center' });
              doc.setTextColor(0);

              autoTable(doc, {
                startY: 67,
                head: [['Data/Hora', 'Usuário', 'Evento', 'IP']],
                body: relLogs.map(l => [
                  fmtDate(l.created_at),
                  l.usuario_nome || '—',
                  l.acao === 'login' ? 'Login' : l.acao === 'logout' ? 'Logout' : l.acao,
                  l.ip || '—',
                ]),
                styles: { fontSize: 8, cellPadding: 3 },
                headStyles: { fillColor: [37, 99, 235], textColor: 255, fontStyle: 'bold' },
                alternateRowStyles: { fillColor: [245, 247, 250] },
                columnStyles: { 0: { cellWidth: 40 }, 1: { cellWidth: 68 }, 2: { cellWidth: 24 } },
                margin: { left: 14, right: 14 },
                didDrawPage: ({ pageNumber }) => {
                  if (pageNumber > 1 && timbradoB64) doc.addImage(timbradoB64, 'PNG', 0, 0, pw, ph);
                },
              });

              doc.save(`acessos_${tenant.subdominio}_${new Date().toISOString().slice(0,10)}.pdf`);
            };

            return (
              <div className="space-y-4">
                {/* Usuários ativos */}
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4 flex items-center justify-between">
                  <span className="text-sm font-medium text-blue-700 dark:text-blue-300">Usuários Ativos no Momento</span>
                  <span className="text-2xl font-bold text-blue-700 dark:text-blue-300">{relAtivos}</span>
                </div>

                {/* Barra de filtros */}
                <div className="flex flex-wrap gap-2 items-center">
                  <input
                    value={relBusca}
                    onChange={e => setRelBusca(e.target.value)}
                    placeholder="Buscar por nome..."
                    className="flex-1 min-w-[140px] px-3 py-1.5 border border-gray-300 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-700 dark:text-white"
                  />

                  <select value={relStatus} onChange={e => setRelStatus(e.target.value)}
                    className="px-3 py-1.5 border border-gray-300 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-700 dark:text-white">
                    <option value="todos">Todos</option>
                    <option value="login">Login</option>
                    <option value="logout">Logout</option>
                  </select>

                  <input type="date" value={relDataInicio} onChange={e => setRelDataInicio(e.target.value)}
                    className="px-3 py-1.5 border border-gray-300 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-700 dark:text-white" />
                  <input type="date" value={relDataFim} onChange={e => setRelDataFim(e.target.value)}
                    className="px-3 py-1.5 border border-gray-300 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-700 dark:text-white" />

                  <button onClick={refetchRelatorio}
                    className="p-1.5 rounded-lg border border-gray-300 dark:border-slate-600 hover:bg-gray-50 dark:hover:bg-slate-700">
                    <RefreshCw className="h-4 w-4 text-gray-500" />
                  </button>
                  <button onClick={exportCSV}
                    className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-300 dark:border-slate-600 rounded-lg text-sm hover:bg-gray-50 dark:hover:bg-slate-700 dark:text-gray-300">
                    <Download className="h-4 w-4" /> CSV
                  </button>
                  <button onClick={exportPDF}
                    className="flex items-center gap-1.5 px-3 py-1.5 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 rounded-lg text-sm hover:bg-red-50 dark:hover:bg-red-900/20">
                    <Download className="h-4 w-4" /> PDF
                  </button>
                  <span className="text-sm text-gray-500">{relTotal} registros</span>
                </div>

                {/* Lista */}
                <div className="space-y-2">
                  {relLogs.map(l => {
                    const isLogin  = l.acao === 'login';
                    const isLogout = l.acao === 'logout';
                    return (
                      <div key={l.id} className="flex items-center gap-3 p-3 border border-gray-200 dark:border-slate-700 rounded-xl hover:bg-gray-50 dark:hover:bg-slate-700/30">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                          isLogin  ? 'bg-green-100 dark:bg-green-900/40 text-green-600 dark:text-green-400' :
                          isLogout ? 'bg-red-100   dark:bg-red-900/40   text-red-600   dark:text-red-400'   :
                                     'bg-blue-100  dark:bg-blue-900/40  text-blue-600  dark:text-blue-400'
                        }`}>
                          {isLogin  ? <Zap    className="h-4 w-4" /> :
                           isLogout ? <LogOut className="h-4 w-4" /> :
                                      <Eye    className="h-4 w-4" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 dark:text-white">
                            {l.usuario_nome || 'Usuário desconhecido'}
                          </p>
                          <p className="text-xs text-gray-500">
                            {l.descricao || (isLogin ? 'Entrou no sistema' : isLogout ? 'Saiu do sistema' : l.acao)}
                          </p>
                          {l.ip && <p className="text-xs text-gray-400 font-mono">IP {l.ip}</p>}
                        </div>
                        <div className="shrink-0 text-right">
                          <Badge color={isLogin ? 'green' : isLogout ? 'red' : 'blue'}>
                            {isLogin ? 'Login' : isLogout ? 'Logout' : 'Ativo'}
                          </Badge>
                          <p className="text-xs text-gray-400 mt-1">{fmtDate(l.created_at)}</p>
                        </div>
                      </div>
                    );
                  })}
                  {!relLogs.length && (
                    <div className="text-center py-10">
                      <Activity className="h-10 w-10 text-gray-300 mx-auto mb-2" />
                      <p className="text-gray-400 text-sm">Nenhum acesso registrado</p>
                      <p className="text-gray-400 text-xs mt-1">Os logins e logouts aparecem aqui</p>
                    </div>
                  )}
                </div>
              </div>
            );
          })()}

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
                      <button onClick={() => handleDeleteBackup(b)}
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

              {/* ── Modal Excluir Backup ─────────────────────────────────────── */}
              {deleteModal.open && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[60] p-4">
                  <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-md shadow-2xl p-6 space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-red-100 dark:bg-red-900/40 flex items-center justify-center">
                        <Trash2 className="h-5 w-5 text-red-600 dark:text-red-400" />
                      </div>
                      <h3 className="font-bold text-gray-900 dark:text-white">Excluir este backup</h3>
                    </div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Backup de {fmtDate(deleteModal.backup?.criado_em)}
                      {deleteModal.backup?.tamanho_bytes ? ` · ${fmtBytes(deleteModal.backup.tamanho_bytes)}` : ''}
                    </p>

                    <div className="space-y-2">
                      {[
                        { val: 'registro', label: 'Somente o registro do histórico', desc: 'O arquivo no Supabase Storage é mantido' },
                        { val: 'arquivo',  label: 'Registro + arquivo do Supabase Storage', desc: 'O ZIP será apagado permanentemente' },
                      ].map(({ val, label, desc }) => (
                        <label key={val} className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${
                          deleteModal.modo === val
                            ? 'border-red-400 bg-red-50 dark:bg-red-900/20'
                            : 'border-gray-200 dark:border-slate-600 hover:bg-gray-50 dark:hover:bg-slate-700/40'
                        }`}>
                          <input type="radio" name="deleteModo" value={val} checked={deleteModal.modo === val}
                            onChange={() => setDeleteModal(s => ({ ...s, modo: val }))}
                            className="mt-0.5 accent-red-600" />
                          <div>
                            <p className="text-sm font-medium text-gray-900 dark:text-white">{label}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">{desc}</p>
                          </div>
                        </label>
                      ))}
                    </div>

                    <label className={`flex items-center gap-2 p-3 rounded-xl border cursor-pointer transition-colors ${
                      deleteModal.confirmado ? 'border-orange-400 bg-orange-50 dark:bg-orange-900/20' : 'border-gray-200 dark:border-slate-600'
                    }`}>
                      <input type="checkbox" checked={deleteModal.confirmado}
                        onChange={e => setDeleteModal(s => ({ ...s, confirmado: e.target.checked }))}
                        className="accent-orange-500" />
                      <span className="text-sm text-gray-700 dark:text-gray-300">Entendo que esta ação é irreversível</span>
                    </label>

                    <div className="flex gap-3 pt-1">
                      <button onClick={() => setDeleteModal({ open: false, backup: null, modo: 'registro', confirmado: false })}
                        className="flex-1 px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-xl text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700">
                        Cancelar
                      </button>
                      <button onClick={confirmDeleteBackup} disabled={!deleteModal.confirmado}
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-red-600 text-white rounded-xl text-sm hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed">
                        <Trash2 className="h-4 w-4" /> Excluir
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* ── Modal Limpar Histórico ───────────────────────────────────── */}
              {clearModal.open && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[60] p-4">
                  <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-md shadow-2xl p-6 space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-red-100 dark:bg-red-900/40 flex items-center justify-center">
                        <Trash2 className="h-5 w-5 text-red-600 dark:text-red-400" />
                      </div>
                      <h3 className="font-bold text-gray-900 dark:text-white">Limpar Histórico de Backups</h3>
                    </div>

                    <div className="space-y-2">
                      {[
                        { val: 'falhas',  label: 'Limpar apenas falhas',       desc: 'Remove somente registros com status "Falhou"' },
                        { val: 'antigos', label: 'Limpar concluídos antigos',  desc: 'Remove concluídos mais antigos que 30 dias' },
                        { val: 'todos',   label: 'Limpar tudo visível',        desc: 'Remove tudo exceto backups em andamento' },
                      ].map(({ val, label, desc }) => (
                        <label key={val} className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${
                          clearModal.modo === val
                            ? 'border-red-400 bg-red-50 dark:bg-red-900/20'
                            : 'border-gray-200 dark:border-slate-600 hover:bg-gray-50 dark:hover:bg-slate-700/40'
                        }`}>
                          <input type="radio" name="clearModo" value={val} checked={clearModal.modo === val}
                            onChange={() => setClearModal(s => ({ ...s, modo: val }))}
                            className="mt-0.5 accent-red-600" />
                          <div>
                            <p className="text-sm font-medium text-gray-900 dark:text-white">{label}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">{desc}</p>
                          </div>
                        </label>
                      ))}
                    </div>

                    <label className={`flex items-center gap-2 p-3 rounded-xl border cursor-pointer transition-colors ${
                      clearModal.deleteFiles ? 'border-orange-400 bg-orange-50 dark:bg-orange-900/20' : 'border-gray-200 dark:border-slate-600'
                    }`}>
                      <input type="checkbox" checked={clearModal.deleteFiles}
                        onChange={e => setClearModal(s => ({ ...s, deleteFiles: e.target.checked }))}
                        className="accent-orange-500" />
                      <span className="text-sm text-gray-700 dark:text-gray-300">Também apagar arquivos do storage</span>
                    </label>

                    <div className="flex gap-3 pt-1">
                      <button onClick={() => setClearModal({ open: false, modo: 'falhas', deleteFiles: false, loading: false })}
                        className="flex-1 px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-xl text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700">
                        Cancelar
                      </button>
                      <button onClick={confirmClearHistory} disabled={clearModal.loading}
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-red-600 text-white rounded-xl text-sm hover:bg-red-700 disabled:opacity-50">
                        {clearModal.loading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                        {clearModal.loading ? 'Limpando...' : 'Limpar'}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── Restore ─────────────────────────────────────────────────────── */}
          {tab === 'restore' && (
            <div className="space-y-5">
              {/* Aviso */}
              <div className="bg-yellow-50 dark:bg-yellow-900/20 border-2 border-yellow-300 dark:border-yellow-700 rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-6 w-6 text-yellow-600 dark:text-yellow-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold text-yellow-800 dark:text-yellow-300">ATENÇÃO — Operação Irreversível</p>
                    <p className="text-sm text-yellow-700 dark:text-yellow-400 mt-1">
                      Restaurar um backup substitui <strong>TODOS</strong> os dados atuais do schema{' '}
                      <code className="bg-yellow-100 dark:bg-yellow-800 px-1 rounded font-mono">{tenant.schema}</code>.
                      Um backup preventivo será criado automaticamente antes da restauração.
                      Somente backups no formato <strong>.zip</strong> gerados por este sistema são compatíveis.
                    </p>
                  </div>
                </div>
              </div>

              {/* Drop zone */}
              <div
                className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-colors ${
                  restoreAnalyzing
                    ? 'border-blue-400 bg-blue-50/30 dark:bg-blue-900/10'
                    : restoreInfo
                    ? 'border-green-400 bg-green-50/30 dark:bg-green-900/10'
                    : restoreError
                    ? 'border-red-300 bg-red-50/30 dark:bg-red-900/10'
                    : 'border-gray-300 dark:border-slate-600 hover:border-blue-400 hover:bg-blue-50/30 dark:hover:bg-blue-900/10'
                }`}
                onClick={() => !restoreAnalyzing && restoreRef.current?.click()}
                onDragOver={e => e.preventDefault()}
                onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleRestoreFileChange(f); }}
              >
                {restoreAnalyzing ? (
                  <>
                    <RefreshCw className="h-10 w-10 text-blue-500 mx-auto mb-3 animate-spin" />
                    <p className="text-sm text-blue-600 dark:text-blue-400 font-medium">Analisando arquivo...</p>
                  </>
                ) : restoreInfo ? (
                  <>
                    <CheckCircle className="h-10 w-10 text-green-500 mx-auto mb-2" />
                    <p className="text-sm text-green-700 dark:text-green-400 font-medium">{restoreFile?.name}</p>
                    <p className="text-xs text-gray-400 mt-1">Clique para trocar o arquivo</p>
                  </>
                ) : (
                  <>
                    <RotateCcw className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                    <p className="text-sm text-blue-600 dark:text-blue-400 font-medium">
                      Clique ou arraste o arquivo de backup
                    </p>
                    <p className="text-xs text-gray-400 mt-1">Apenas arquivos .zip gerados por este sistema</p>
                    {restoreError && <p className="text-xs text-red-500 mt-2 font-medium">{restoreError}</p>}
                  </>
                )}
                <input ref={restoreRef} type="file" accept=".zip" className="hidden"
                  onChange={e => { const f = e.target.files[0]; if (f) handleRestoreFileChange(f); }} />
              </div>

              {/* Conteúdo do backup */}
              {restoreInfo && (
                <div className="border border-gray-200 dark:border-slate-700 rounded-xl overflow-hidden">
                  <div className="bg-gray-50 dark:bg-slate-700/50 px-4 py-3 border-b border-gray-200 dark:border-slate-700">
                    <h4 className="font-semibold text-sm text-gray-800 dark:text-white">Conteúdo do backup</h4>
                  </div>
                  <div className="p-4 space-y-1.5 text-sm">
                    {[
                      ['Origem', restoreInfo.origem],
                      ['Data do backup', typeof restoreInfo.data === 'string' ? restoreInfo.data : fmtDate(restoreInfo.data)],
                      ['Total de registros', restoreInfo.totalRows],
                      ['Tabelas', restoreInfo.tabelas],
                      ['Tamanho ZIP', restoreInfo.tamanho],
                    ].map(([k, v]) => (
                      <div key={k} className="flex justify-between">
                        <span className="text-gray-500">{k}:</span>
                        <span className="font-medium text-gray-900 dark:text-white">{v}</span>
                      </div>
                    ))}
                  </div>
                  {restoreInfo.tables?.length > 0 && (
                    <div className="border-t border-gray-200 dark:border-slate-700 max-h-40 overflow-y-auto">
                      <table className="w-full text-xs">
                        <thead className="bg-gray-50 dark:bg-slate-700/40">
                          <tr>
                            <th className="px-4 py-2 text-left font-medium text-gray-600 dark:text-gray-400">Tabela</th>
                            <th className="px-4 py-2 text-right font-medium text-gray-600 dark:text-gray-400">Registros</th>
                          </tr>
                        </thead>
                        <tbody>
                          {restoreInfo.tables.map(t => (
                            <tr key={t.name || t.table} className="border-t border-gray-100 dark:border-slate-700">
                              <td className="px-4 py-1.5 text-gray-700 dark:text-gray-300 font-mono">{t.name || t.table}</td>
                              <td className="px-4 py-1.5 text-right text-gray-500">{t.rows ?? 0}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* Confirmação */}
              {restoreInfo && (
                <div className="bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800 rounded-xl p-4 space-y-3">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
                    <p className="text-sm font-semibold text-red-700 dark:text-red-400">Atenção: ação irreversível</p>
                  </div>
                  <p className="text-xs text-red-600 dark:text-red-400">
                    Esta operação irá <strong>deletar todos os dados atuais</strong> de{' '}
                    <code className="bg-red-100 dark:bg-red-900/40 px-1 rounded">{tenant.schema}</code> e substituí-los
                    pelo conteúdo do backup. Um backup de segurança será criado antes do restore.
                  </p>
                  <p className="text-xs text-red-700 dark:text-red-400">
                    Para confirmar, digite:{' '}
                    <code className="bg-red-100 dark:bg-red-900/40 px-1.5 py-0.5 rounded font-bold">RESTAURAR {tenant.subdominio}</code>
                  </p>
                  <input
                    value={restoreConfirm}
                    onChange={e => setRestoreConfirm(e.target.value)}
                    placeholder={`RESTAURAR ${tenant.subdominio}`}
                    className="w-full px-3 py-2 border border-red-300 dark:border-red-700 rounded-lg text-sm bg-white dark:bg-slate-700 dark:text-white font-mono focus:ring-red-500 focus:border-red-500"
                  />
                  <div className="flex gap-3">
                    <button
                      onClick={() => { setRestoreFile(null); setRestoreInfo(null); setRestoreError(''); setRestoreConfirm(''); if (restoreRef.current) restoreRef.current.value = ''; }}
                      className="flex-1 px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-xl text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={handleRestore}
                      disabled={restoreConfirm !== `RESTAURAR ${tenant.subdominio}` || restoreLoading}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-red-600 text-white rounded-xl text-sm hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      {restoreLoading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />}
                      {restoreLoading ? 'Restaurando...' : 'Restaurar dados'}
                    </button>
                  </div>
                </div>
              )}
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

      {/* Modal Desativar */}
      {desativarModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[70] p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-sm shadow-2xl p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-orange-100 dark:bg-orange-900/40 flex items-center justify-center shrink-0">
                <Power className="h-5 w-5 text-orange-600 dark:text-orange-400" />
              </div>
              <h3 className="font-bold text-gray-900 dark:text-white">Desativar Município</h3>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              <strong>{tenant.nome_municipio}</strong> ficará inacessível, mas todos os dados serão preservados.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setDesativarModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-xl text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700">
                Cancelar
              </button>
              <button onClick={confirmDesativar}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-xl text-sm hover:bg-orange-700">
                <Power className="h-4 w-4" /> Desativar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Excluir Definitivamente */}
      {excluirModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[70] p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-sm shadow-2xl p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-red-100 dark:bg-red-900/40 flex items-center justify-center shrink-0">
                <Trash2 className="h-5 w-5 text-red-600 dark:text-red-400" />
              </div>
              <h3 className="font-bold text-gray-900 dark:text-white">Excluir Definitivamente</h3>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Excluir <strong>{tenant.nome_municipio}</strong>? Todos os dados, usuários e o schema do banco serão
              apagados permanentemente. Esta ação não pode ser desfeita.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setExcluirModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-xl text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700">
                Cancelar
              </button>
              <button onClick={confirmExcluir}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-red-600 text-white rounded-xl text-sm hover:bg-red-700">
                <Trash2 className="h-4 w-4" /> Excluir
              </button>
            </div>
          </div>
        </div>
      )}
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
    { staleTime: 30000, retry: false, refetchOnWindowFocus: false }
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
