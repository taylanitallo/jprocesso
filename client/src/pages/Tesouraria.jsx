import { useState, useEffect, useRef, Fragment } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { hasPerm } from '../utils/permissions';
import { conferirAbasDoModulo } from '../utils/permissoesSchema';
import api from '../services/api';
import BotaoExcluidos from '../components/lixeira/BotaoExcluidos';
import { ContaPicker, ContaLink, PeriodoRapido, BotaoLimpar, contaLabel } from '../components/tesouraria/ContaBancaria';
import PageHeader from '../components/ui/PageHeader';
import SectionTitle from '../components/ui/SectionTitle';
import FilterBar from '../components/ui/FilterBar';
import ConfirmModal from '../components/ui/ConfirmModal';
import {
  Landmark, Plus, Edit2, Trash2, Save, X,
  TrendingUp, TrendingDown, BarChart2,
  Printer, Search, CheckCircle2, Clock, RotateCcw, CreditCard, ShoppingCart,
  Layers, Settings2, ChevronDown, ChevronUp, Check, AlertTriangle,
} from 'lucide-react';

// ─── Constantes ────────────────────────────────────────────────────────────────
const TABS = [
  { key: 'contas',    label: 'Contas Bancárias', Icon: Landmark,    permPath: ['tesouraria', 'contas',    'ver'] },
  { key: 'receitas',  label: 'Receitas',          Icon: TrendingUp,  permPath: ['tesouraria', 'receitas',  'ver'] },
  { key: 'despesas',  label: 'Despesas',          Icon: TrendingDown, permPath: ['tesouraria', 'despesas', 'ver'] },
  { key: 'relatorios', label: 'Relatórios',       Icon: BarChart2,   permPath: ['tesouraria', 'relatorios','ver'] },
];

const TIPOS_CONTA = [
  { value: 'corrente',     label: 'Conta Corrente' },
  { value: 'poupanca',    label: 'Conta Poupança' },
  { value: 'pagamento',   label: 'Conta Pagamento' },
  { value: 'investimento', label: 'Conta Investimento' },
  { value: 'especial',    label: 'Conta Especial' },
];
const NATUREZAS_CONTA = [
  { value: 'custeio',       label: 'Custeio' },
  { value: 'pessoal',       label: 'Pessoal e Encargos' },
  { value: 'investimento',  label: 'Investimento' },
  { value: 'transferencia', label: 'Transferência' },
  { value: 'receita',       label: 'Receita' },
  { value: 'convenio',      label: 'Convênio' },
  { value: 'outras',        label: 'Outras' },
];
const EMPTY_CONTA = {
  nome: '', secretaria_id: '', banco_nome: '', banco_codigo: '',
  agencia: '', agencia_digito: '', conta: '', conta_digito: '',
  tipo: 'corrente', natureza: 'custeio',
  titular: '', cnpj_titular: '', observacao: '', ativo: true,
};

// ─── Página principal ───────────────────────────────────────────────────────────
export default function Tesouraria() {
  const { tab, subdomain } = useParams();
  const navigate = useNavigate();
  const { tenant, user } = useAuth();
  conferirAbasDoModulo('tesouraria', TABS.map(t => t.permPath[1]));
  const visibleTabsTes = TABS.filter(t => hasPerm(user, ...t.permPath));
  const [activeTab, setActiveTab] = useState(() => {
    const validKeys = visibleTabsTes.map(t => t.key);
    return validKeys.includes(tab) ? tab : (visibleTabsTes[0]?.key || 'contas');
  });
  const [secretarias, setSecretarias] = useState([]);

  useEffect(() => {
    api.get('/organizacao/secretarias')
      .then(({ data }) => setSecretarias(data.secretarias || []))
      .catch(() => {});
  }, []);

  const handleTab = (key) => {
    setActiveTab(key);
    navigate(`/${subdomain}/tesouraria/${key}`);
  };

  return (
    <div className="space-y-5 animate-fade-in">
      <PageHeader
        icon={Landmark}
        title="Tesouraria"
        subtitle="Gestão financeira e controle de pagamentos do município"
      />

      {/* Tabs */}
      <div className="flex gap-1 border-b border-ink-200">
        {visibleTabsTes.map(({ key, label, Icon }) => (
          <button
            key={key}
            onClick={() => handleTab(key)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px
              ${activeTab === key
                ? 'border-success-500 text-success-600 dark:text-success-400'
                : 'border-transparent text-ink-500 hover:text-ink-700'
              }`}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        ))}
      </div>

      {/* Conteúdo das abas */}
      {activeTab === 'contas'     && <TabContas secretarias={secretarias} />}
      {activeTab === 'receitas'   && <TabReceitas />}
      {activeTab === 'despesas'   && <TabDespesas />}
      {activeTab === 'relatorios' && <TabRelatorios />}
    </div>
  );
}

// Seletor de conta da Tesouraria (busca acessível — ver components/tesouraria)
const ContaSelectInput = ({ value, contas, onChange, id, todasLabel }) => (
  <ContaPicker id={id} value={value} contas={contas} onChange={onChange} todasLabel={todasLabel} />
);

// ─── Combobox de busca de banco ─────────────────────────────────────────────────
function BankSearchInput({ value, onChange, onSelect, bancos }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const close = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  const filtered = value.length >= 1
    ? bancos.filter(b => {
        const q = value.toLowerCase();
        return b.name.toLowerCase().includes(q)
          || b.code.includes(q)
          || (b.fullName || '').toLowerCase().includes(q);
      }).slice(0, 9)
    : [];

  return (
    <div ref={ref} className="relative">
      <input
        value={value}
        onChange={(e) => { onChange(e.target.value); setOpen(true); }}
        onFocus={() => { if (value.length >= 1) setOpen(true); }}
        className="input-field text-sm"
        placeholder="Digite para buscar o banco..."
        autoComplete="off"
      />
      {open && filtered.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-surface border border-ink-200 rounded-xl shadow-xl max-h-56 overflow-y-auto">
          {filtered.map(b => (
            <button
              key={b.code}
              type="button"
              onMouseDown={(e) => { e.preventDefault(); onSelect(b); setOpen(false); }}
              className="w-full text-left px-3 py-2 hover:bg-ink-50 flex items-center gap-2.5 transition-colors"
            >
              <span className="shrink-0 text-xs font-mono bg-ink-100 text-ink-500 px-1.5 py-0.5 rounded-sm min-w-[2.5rem] text-center">{b.code}</span>
              <span className="text-sm text-ink-800 truncate">{b.name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Tab: Contas Bancárias ──────────────────────────────────────────────────────
function TabContas({ secretarias }) {
  const [contas, setContas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_CONTA);
  const [saving, setSaving] = useState(false);
  const [filtroSec, setFiltroSec] = useState('');
  const [busca, setBusca] = useState('');
  const [situacao, setSituacao] = useState(''); // '' | 'ativas' | 'inativas'
  const [bancos, setBancos] = useState([]);
  const [confirmarExcluir, setConfirmarExcluir] = useState(null);

  const load = () => {
    setLoading(true);
    api.get('/organizacao/contas-bancarias')
      .then(({ data }) => setContas(data.contas || []))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  useEffect(() => {
    if (!showModal || bancos.length > 0) return;
    api.get('/organizacao/bancos')
      .then(({ data }) => setBancos(data.bancos || []))
      .catch(() => {});
  }, [showModal]);

  const openNew = () => { setEditing(null); setForm(EMPTY_CONTA); setShowModal(true); };
  const openEdit = (c) => {
    setEditing(c);
    setForm({
      nome: c.nome || '', secretaria_id: c.secretaria_id || '',
      banco_nome: c.banco_nome || '', banco_codigo: c.banco_codigo || '',
      agencia: c.agencia || '', agencia_digito: c.agencia_digito || '',
      conta: c.conta || '', conta_digito: c.conta_digito || '',
      tipo: c.tipo || 'corrente', natureza: c.natureza || 'custeio',
      titular: c.titular || '', cnpj_titular: c.cnpj_titular || '',
      observacao: c.observacao || '', ativo: c.ativo !== false,
    });
    setShowModal(true);
  };

  const salvar = async () => {
    if (!form.nome) return alert('Nome da conta é obrigatório');
    setSaving(true);
    try {
      if (editing) {
        await api.put(`/organizacao/contas-bancarias/${editing.id}`, form);
      } else {
        await api.post('/organizacao/contas-bancarias', form);
      }
      setShowModal(false);
      load();
    } catch (err) {
      alert(err.response?.data?.error || 'Erro ao salvar');
    } finally {
      setSaving(false);
    }
  };

  const excluir = async (c) => {
    try {
      await api.delete(`/organizacao/contas-bancarias/${c.id}`);
      setConfirmarExcluir(null);
      load();
    } catch (err) {
      alert(err.response?.data?.error || 'Erro ao excluir conta.');
    }
  };

  const inp = k => e => setForm(p => ({ ...p, [k]: e.target.value }));
  const chk = k => e => setForm(p => ({ ...p, [k]: e.target.checked }));

  const normT = v => String(v ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const filtradas = contas.filter(c => {
    if (filtroSec && !normT(`${c.secretaria?.nome || ''} ${c.secretaria?.sigla || ''}`).includes(normT(filtroSec))) return false;
    if (situacao === 'ativas' && c.ativo === false) return false;
    if (situacao === 'inativas' && c.ativo !== false) return false;
    if (busca) {
      const alvo = normT([c.nome, c.banco_nome, c.banco_codigo, c.agencia, c.conta, `${c.conta || ''}-${c.conta_digito || ''}`, c.titular].join(' '));
      // Nº de conta/agência com ou sem traço: compara só os dígitos
      const dig = busca.replace(/\D/g, '');
      const casaNum = dig.length >= 2 && `${c.conta || ''}${c.conta_digito || ''} ${c.agencia || ''}${c.agencia_digito || ''}`.replace(/[^\d ]/g, '').includes(dig);
      if (!alvo.includes(normT(busca)) && !casaNum) return false;
    }
    return true;
  });
  const temFiltroContas = !!(busca || filtroSec || situacao);
  const limparContas = () => { setBusca(''); setFiltroSec(''); setSituacao(''); };

  return (
    <div className="space-y-3">
      <FilterBar>
        <div className="flex-1 min-w-56">
          <label htmlFor="contas-busca" className="block text-xs font-medium text-ink-600 mb-1">Buscar conta</label>
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-ink-400" aria-hidden="true" />
            <input id="contas-busca" value={busca} onChange={e => setBusca(e.target.value)}
              className="input-field text-sm pl-8" placeholder="Nome, nº da conta, agência, banco ou titular..." />
          </div>
        </div>
        <div className="min-w-44">
          <label htmlFor="contas-sec" className="block text-xs font-medium text-ink-600 mb-1">Secretaria</label>
          <input id="contas-sec" value={filtroSec} onChange={e => setFiltroSec(e.target.value)}
            className="input-field text-sm" placeholder="Nome ou sigla..." />
        </div>
        <div className="min-w-36">
          <label htmlFor="contas-sit" className="block text-xs font-medium text-ink-600 mb-1">Situação</label>
          <select id="contas-sit" value={situacao} onChange={e => setSituacao(e.target.value)} className="input-field text-sm">
            <option value="">Todas</option>
            <option value="ativas">Ativas</option>
            <option value="inativas">Inativas</option>
          </select>
        </div>
        <div className="self-end">
          <BotaoLimpar onClick={limparContas} ativo={temFiltroContas} />
        </div>
      </FilterBar>

      <div className="card overflow-hidden">
        <div className="px-4 py-3 border-b border-ink-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <SectionTitle icon={Landmark} title="Contas Bancárias Cadastradas" />
            {!loading && <span className="text-xs text-ink-500">{filtradas.length} de {contas.length}</span>}
          </div>
          <div className="flex items-center gap-2">
            <BotaoExcluidos entidade="contas_bancarias" rotulo="Contas excluídas" onAlterado={load} />
            <button onClick={openNew} className="btn-primary flex items-center gap-1.5 text-sm px-3 py-1.5">
              <Plus className="h-4 w-4" /> Nova Conta
            </button>
          </div>
        </div>
        <div className="overflow-x-auto">
          {loading ? (
            <div className="px-4 py-8 text-center text-sm text-ink-400">Carregando...</div>
          ) : filtradas.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-ink-400">
              {contas.length === 0 ? 'Nenhuma conta cadastrada.' : 'Nenhuma conta corresponde aos filtros.'}
              {temFiltroContas && <button onClick={limparContas} className="ml-2 text-brand-600 dark:text-info-400 hover:underline">Limpar filtros</button>}
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-ink-100 border-b border-ink-200">
                <tr>
                  <th className="text-left px-4 py-2.5 font-semibold text-ink-600">Nome</th>
                  <th className="text-left px-4 py-2.5 font-semibold text-ink-600">Secretaria</th>
                  <th className="text-left px-4 py-2.5 font-semibold text-ink-600">Banco</th>
                  <th className="text-left px-4 py-2.5 font-semibold text-ink-600">Agência</th>
                  <th className="text-left px-4 py-2.5 font-semibold text-ink-600">Conta</th>
                  <th className="text-left px-4 py-2.5 font-semibold text-ink-600 w-28">Tipo</th>
                  <th className="text-left px-4 py-2.5 font-semibold text-ink-600 w-20">Status</th>
                  <th className="px-4 py-2.5 w-20"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-100">
                {filtradas.map(c => (
                  <tr key={c.id} className="hover:bg-ink-50">
                    <td className="px-4 py-2.5"><ContaLink conta={c} mostrar="nome" /></td>
                    <td className="px-4 py-2.5">
                      {c.secretaria
                        ? <span className="text-xs bg-info-50 dark:bg-info-900/20 text-brand-700 dark:text-info-300 px-1.5 py-0.5 rounded-sm font-medium">{c.secretaria.sigla}</span>
                        : <span className="text-ink-400">—</span>}
                    </td>
                    <td className="px-4 py-2.5 text-ink-600">
                      {c.banco_codigo ? `${c.banco_nome} (${c.banco_codigo})` : c.banco_nome || '—'}
                    </td>
                    <td className="px-4 py-2.5 text-ink-600">
                      {c.agencia}{c.agencia_digito ? `-${c.agencia_digito}` : ''}
                    </td>
                    <td className="px-4 py-2.5"><ContaLink conta={c} mostrar="numero" /></td>
                    <td className="px-4 py-2.5 text-xs text-ink-500 capitalize">
                      {TIPOS_CONTA.find(t => t.value === c.tipo)?.label || c.tipo || '—'}
                    </td>
                    <td className="px-4 py-2.5">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${c.ativo
                        ? 'bg-success-100 text-success-700 dark:bg-success-900/30 dark:text-success-400'
                        : 'bg-ink-100 text-ink-500'}`}>
                        {c.ativo ? 'Ativa' : 'Inativa'}
                      </span>
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-1">
                        <button onClick={() => openEdit(c)} aria-label={`Editar conta ${c.nome}`} title="Editar" className="p-1 text-ink-400 hover:text-brand-600 dark:hover:text-info-400 rounded-sm transition-colors focus:outline-hidden focus-visible:ring-2 focus-visible:ring-brand-500">
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>
                        <button onClick={() => setConfirmarExcluir(c)} aria-label={`Excluir conta ${c.nome}`} title="Excluir" className="p-1 text-ink-400 hover:text-danger-600 dark:hover:text-danger-400 rounded-sm transition-colors focus:outline-hidden focus-visible:ring-2 focus-visible:ring-brand-500">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-surface rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-ink-200 flex items-center justify-between sticky top-0 bg-surface z-10">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-success-50 dark:bg-success-900/30 flex items-center justify-center">
                  <Landmark className="w-4 h-4 text-success-600 dark:text-success-400" />
                </div>
                <h3 className="text-base font-semibold text-ink-800">
                  {editing ? 'Alterar Conta Bancária' : 'Nova Conta Bancária'}
                </h3>
              </div>
              <button onClick={() => setShowModal(false)} className="text-ink-400 hover:text-ink-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 space-y-5">
              {/* Identificação */}
              <div>
                <p className="text-xs font-semibold text-ink-500 uppercase tracking-wide mb-3">Identificação</p>
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="block text-xs font-medium text-ink-600 mb-1">Nome da Conta *</label>
                    <input value={form.nome} onChange={inp('nome')} className="input-field text-sm" placeholder="Ex: Conta Principal Tesouraria" />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs font-medium text-ink-600 mb-1">Secretaria Vinculada</label>
                    <select value={form.secretaria_id} onChange={inp('secretaria_id')} className="input-field text-sm">
                      <option value="">— Selecione —</option>
                      {secretarias.map(s => (
                        <option key={s.id} value={s.id}>{s.nome} ({s.sigla})</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-ink-600 mb-1">Tipo de Conta</label>
                    <select value={form.tipo} onChange={inp('tipo')} className="input-field text-sm">
                      {TIPOS_CONTA.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-ink-600 mb-1">Natureza</label>
                    <select value={form.natureza} onChange={inp('natureza')} className="input-field text-sm">
                      {NATUREZAS_CONTA.map(n => <option key={n.value} value={n.value}>{n.label}</option>)}
                    </select>
                  </div>
                </div>
              </div>

              {/* Dados Bancários */}
              <div>
                <p className="text-xs font-semibold text-ink-500 uppercase tracking-wide mb-3">Dados Bancários</p>
                <div className="grid grid-cols-4 gap-3">
                  <div className="col-span-3">
                    <label className="block text-xs font-medium text-ink-600 mb-1">Nome do Banco</label>
                    <BankSearchInput
                      value={form.banco_nome}
                      onChange={v => setForm(f => ({ ...f, banco_nome: v }))}
                      onSelect={b => setForm(f => ({ ...f, banco_nome: b.name, banco_codigo: b.code }))}
                      bancos={bancos}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-ink-600 mb-1">Código COMPE</label>
                    <input value={form.banco_codigo} onChange={inp('banco_codigo')} className="input-field text-sm" placeholder="001" maxLength={10} />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs font-medium text-ink-600 mb-1">Agência</label>
                    <input value={form.agencia} onChange={inp('agencia')} className="input-field text-sm" placeholder="0000" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-ink-600 mb-1">Dígito Ag.</label>
                    <input value={form.agencia_digito} onChange={inp('agencia_digito')} className="input-field text-sm" placeholder="X" maxLength={2} />
                  </div>
                  <div></div>
                  <div className="col-span-2">
                    <label className="block text-xs font-medium text-ink-600 mb-1">Conta Corrente</label>
                    <input value={form.conta} onChange={inp('conta')} className="input-field text-sm" placeholder="00000-0" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-ink-600 mb-1">Dígito C/C</label>
                    <input value={form.conta_digito} onChange={inp('conta_digito')} className="input-field text-sm" placeholder="X" maxLength={2} />
                  </div>
                </div>
              </div>

              {/* Titular */}
              <div>
                <p className="text-xs font-semibold text-ink-500 uppercase tracking-wide mb-3">Titular</p>
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="block text-xs font-medium text-ink-600 mb-1">Nome do Titular / Órgão</label>
                    <input value={form.titular} onChange={inp('titular')} className="input-field text-sm" placeholder="Prefeitura Municipal de..." />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-ink-600 mb-1">CNPJ do Titular</label>
                    <input value={form.cnpj_titular} onChange={inp('cnpj_titular')} className="input-field text-sm" placeholder="00.000.000/0000-00" maxLength={18} />
                  </div>
                  <div className="flex items-center gap-2 pt-5">
                    <input type="checkbox" id="ativo_conta" checked={form.ativo} onChange={chk('ativo')} className="w-4 h-4 rounded-sm border-ink-300 text-success-600" />
                    <label htmlFor="ativo_conta" className="text-sm text-ink-700 cursor-pointer">Conta ativa</label>
                  </div>
                </div>
              </div>

              {/* Observação */}
              <div>
                <label className="block text-xs font-medium text-ink-600 mb-1">Observação</label>
                <textarea value={form.observacao} onChange={inp('observacao')} rows={2}
                  className="input-field text-sm resize-none" placeholder="Informações adicionais..." />
              </div>
            </div>

            <div className="px-6 py-4 border-t border-ink-200 flex justify-end gap-2 sticky bottom-0 bg-surface">
              <button onClick={() => setShowModal(false)} className="btn-secondary text-sm px-4 py-2">Cancelar</button>
              <button onClick={salvar} disabled={saving} className="btn-primary text-sm px-4 py-2 flex items-center gap-1.5 disabled:opacity-40">
                <Save className="h-4 w-4" /> {saving ? 'Salvando...' : 'Salvar Conta'}
              </button>
            </div>
          </div>
        </div>
      )}
      {confirmarExcluir && (
        <ConfirmModal
          title={`Excluir a conta "${confirmarExcluir.nome}"?`}
          message="A conta vai para as Contas excluídas, de onde pode ser restaurada."
          confirmLabel="Excluir"
          onConfirm={() => excluir(confirmarExcluir)}
          onClose={() => setConfirmarExcluir(null)}
        />
      )}
    </div>
  );
}

// ─── Tab: Receitas ──────────────────────────────────────────────────────────────
function TabReceitas() {
  const { tenant } = useAuth();
  const [contas, setContas] = useState([]);
  const [receitas, setReceitas] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ conta_id: '', data: '', descricao: '', valor: '', observacao: '' });
  const [saving, setSaving] = useState(false);
  const [filtros, setFiltros] = useState({ conta_id: '', data_de: '', data_ate: '', busca: '', banco: '', num_conta: '' });
  const [confirmarExcluir, setConfirmarExcluir] = useState(null);

  const fmt = v => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  const fmtDate = d => {
    if (!d) return '—';
    const [y, m, day] = String(d).slice(0, 10).split('-');
    return `${day}/${m}/${y}`;
  };
  const maskValor = (raw) => {
    const digits = String(raw).replace(/\D/g, '');
    if (!digits) return '';
    const num = parseInt(digits, 10) / 100;
    return num.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const load = (f) => {
    const filters = f !== undefined ? f : filtros;
    const params = new URLSearchParams();
    if (filters.conta_id)  params.set('conta_id',  filters.conta_id);
    if (filters.data_de)   params.set('data_de',   filters.data_de);
    if (filters.data_ate)  params.set('data_ate',  filters.data_ate);
    if (filters.busca)     params.set('busca',     filters.busca);
    if (filters.banco)     params.set('banco',     filters.banco);
    if (filters.num_conta) params.set('num_conta', filters.num_conta);
    setLoading(true);
    api.get(`/tesouraria/receitas?${params}`)
      .then(({ data }) => { setReceitas(data.receitas || []); setTotal(data.total || 0); })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    api.get('/organizacao/contas-bancarias')
      .then(({ data }) => setContas(data.contas || []))
      .catch(() => {});
    load({});
  }, []);

  const inp = k => e => setForm(p => ({ ...p, [k]: e.target.value }));
  const flt = k => e => setFiltros(p => ({ ...p, [k]: e.target.value }));

  const openNew = () => {
    const today = new Date().toISOString().slice(0, 10);
    setEditing(null);
    setForm({ conta_id: '', data: today, descricao: '', valor: '', observacao: '' });
    setShowModal(true);
  };

  const openEdit = (r) => {
    setEditing(r);
    setForm({
      conta_id:   r.conta_id || '',
      data:       String(r.data).slice(0, 10),
      descricao:  r.descricao || '',
      valor:      maskValor(String(Math.round(parseFloat(r.valor) * 100))),
      observacao: r.observacao || '',
    });
    setShowModal(true);
  };

  const salvar = async () => {
    if (!form.conta_id) return alert('Selecione uma conta');
    if (!form.data) return alert('Informe a data');
    if (!form.descricao.trim()) return alert('Informe a descrição');
    const v = parseFloat(String(form.valor).replace(/\./g, '').replace(',', '.'));
    if (isNaN(v) || v <= 0) return alert('Informe um valor válido');
    setSaving(true);
    try {
      const body = { ...form, valor: v };
      if (editing) {
        await api.put(`/tesouraria/receitas/${editing.id}`, body);
      } else {
        await api.post('/tesouraria/receitas', body);
      }
      setShowModal(false);
      load();
    } catch (err) {
      alert(err.response?.data?.error || 'Erro ao salvar');
    } finally {
      setSaving(false);
    }
  };

  const excluir = async (r) => {
    try {
      await api.delete(`/tesouraria/receitas/${r.id}`);
      setConfirmarExcluir(null);
      load();
    } catch { alert('Erro ao excluir'); }
  };

  const filtrar = () => load(filtros);
  const limparFiltros = () => {
    const f = { conta_id: '', data_de: '', data_ate: '', busca: '', banco: '', num_conta: '' };
    setFiltros(f);
    load(f);
  };
  const temFiltroReceitas = !!(filtros.conta_id || filtros.data_de || filtros.data_ate || filtros.busca);
  // Conta e período aplicam na hora; a busca por texto aplica no Enter ou em Filtrar
  const aplicar = (parcial) => { const f = { ...filtros, ...parcial }; setFiltros(f); load(f); };

  // Agrupamento por data para exibição estilo extrato
  const grouped = {};
  receitas.forEach(r => {
    const key = String(r.data).slice(0, 10);
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(r);
  });
  const dates = Object.keys(grouped).sort((a, b) => b.localeCompare(a));

  const printExtrato = () => {
    const contaNomeFiltro = filtros.conta_id
      ? (contas.find(c => c.id === filtros.conta_id)?.nome || 'Conta selecionada')
      : 'Todas as contas';
    const periodoStr = filtros.data_de && filtros.data_ate
      ? `${fmtDate(filtros.data_de)} a ${fmtDate(filtros.data_ate)}`
      : filtros.data_de ? `A partir de ${fmtDate(filtros.data_de)}`
      : filtros.data_ate ? `Até ${fmtDate(filtros.data_ate)}`
      : 'Todo o período';

    const rows = dates.map(date => {
      const items = grouped[date];
      const dayTotal = items.reduce((s, r) => s + parseFloat(r.valor), 0);
      const hdr = `<tr class="ghdr"><td colspan="4">${fmtDate(date)}&nbsp;&nbsp;·&nbsp;&nbsp;${items.length} lançamento${items.length > 1 ? 's' : ''}&nbsp;&nbsp;·&nbsp;&nbsp;${fmt(dayTotal)}</td></tr>`;
      const itens = items.map(r => `<tr>
        <td class="desc">${r.descricao}${r.observacao ? `<div class="obs">${r.observacao}</div>` : ''}</td>
        <td class="conta">${r.conta?.nome || '—'}${r.conta?.banco_nome ? `<div class="banco">${r.conta.banco_nome}</div>` : ''}</td>
        <td class="val">${fmt(r.valor)}</td>
        <td></td>
      </tr>`).join('');
      return hdr + itens;
    }).join('');

    const now = new Date();
    const html = `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8">
<title>Extrato de Receitas</title>
<style>
*{margin:0;padding:0;box-sizing:border-box;-webkit-print-color-adjust:exact;print-color-adjust:exact}
body{font-family:'Segoe UI',Arial,sans-serif;font-size:12px;color:#1a1a1a;background:#fff}
.layout{width:100%;border-collapse:collapse}
.layout>thead>tr>td,.layout>tfoot>tr>td{border:0;padding:0}
.layout>tbody>tr>td{border:0}
.layout>thead>tr,.layout>tfoot>tr{background:transparent!important}
.sp-top{height:${tenant?.configuracoes?.margens?.top??20}mm}.sp-bottom{height:${tenant?.configuracoes?.margens?.bottom??20}mm}
.content{padding:0 ${tenant?.configuracoes?.margens?.right??14}mm 0 ${tenant?.configuracoes?.margens?.left??14}mm!important}
.hdr{border-bottom:3px solid #16a34a;padding-bottom:12px;margin-bottom:14px;display:flex;justify-content:space-between;align-items:flex-end}
.hdr h1{font-size:22px;font-weight:700;color:#166534;letter-spacing:-.3px}
.hdr .sub{font-size:11px;color:#6b7280;margin-top:3px}
.hdr .gen{font-size:10px;color:#6b7280;text-align:right}
.meta{display:flex;flex-wrap:wrap;gap:20px;background:#f0fdf4 !important;border:1px solid #bbf7d0;border-radius:6px;padding:10px 16px;margin-bottom:16px}
.mi .lbl{font-size:10px;color:#6b7280;text-transform:uppercase;letter-spacing:.5px}
.mi .v{font-size:12px;font-weight:600;color:#15803d;margin-top:2px}
table{width:100%;border-collapse:collapse}
thead tr{background:#166534 !important;color:#fff !important}
th{padding:9px 10px;font-size:11px;font-weight:600;text-align:left;color:#fff !important}
th.r{text-align:right}
td{padding:8px 10px;border-bottom:1px solid #e5e7eb;font-size:11.5px;vertical-align:top}
.ghdr td{background:#dcfce7 !important;color:#166534 !important;font-weight:700;font-size:11px;padding:5px 10px;border-bottom:1px solid #86efac}
.desc{max-width:280px;word-break:break-word}
.obs{color:#9ca3af;font-size:10px;font-style:italic;margin-top:2px}
.conta{color:#6b7280;font-size:11px;min-width:140px}
.banco{color:#9ca3af;font-size:10px}
.val{text-align:right;font-weight:700;color:#16a34a;font-variant-numeric:tabular-nums;white-space:nowrap;min-width:120px}
tfoot tr{background:#f0fdf4 !important}
tfoot td{font-weight:700;font-size:13px;border-top:2px solid #16a34a;padding:10px}
tfoot .val{font-size:15px;color:#15803d}
.foot{margin-top:16px;text-align:right;color:#9ca3af;font-size:9.5px;border-top:1px solid #e5e7eb;padding-top:8px}
@page{size:A4 portrait;margin:0}
@media print{
  .meta{background:#f0fdf4 !important;-webkit-print-color-adjust:exact;print-color-adjust:exact}
  thead tr{background:#166534 !important;-webkit-print-color-adjust:exact;print-color-adjust:exact}
  .layout>thead>tr{background:transparent !important}
  .ghdr td{background:#dcfce7 !important;-webkit-print-color-adjust:exact;print-color-adjust:exact}
  tfoot tr{background:#f0fdf4 !important;-webkit-print-color-adjust:exact;print-color-adjust:exact}
  .layout>tfoot>tr{background:transparent !important}
  ${tenant?.configuracoes?.timbrado ? `body::before{content:'';position:fixed;top:0;left:0;width:210mm;height:297mm;background-image:url("${tenant.configuracoes.timbrado}");background-size:210mm 297mm;background-repeat:no-repeat;background-position:top left;opacity:.75;z-index:-1;pointer-events:none;-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important}` : ''}
}
</style></head><body>
<table class="layout">
<thead><tr><td><div class="sp-top"></div></td></tr></thead>
<tfoot><tr><td><div class="sp-bottom"></div></td></tr></tfoot>
<tbody><tr><td class="content">
<div class="hdr">
  <div><h1>Extrato de Receitas</h1><div class="sub">Tesouraria Municipal</div></div>
  <div class="gen">Gerado em ${now.toLocaleDateString('pt-BR')} às ${now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</div>
</div>
<div class="meta">
  <div class="mi"><div class="lbl">Período</div><div class="v">${periodoStr}</div></div>
  <div class="mi"><div class="lbl">Conta</div><div class="v">${contaNomeFiltro}</div></div>
  ${filtros.busca ? `<div class="mi"><div class="lbl">Filtro descrição</div><div class="v">"${filtros.busca}"</div></div>` : ''}
  <div class="mi"><div class="lbl">Lançamentos</div><div class="v">${receitas.length}</div></div>
  <div class="mi"><div class="lbl">Total</div><div class="v">${fmt(total)}</div></div>
</div>
<table>
  <thead><tr>
    <th>Descrição</th><th>Conta</th><th class="r">Valor</th><th style="width:1px"></th>
  </tr></thead>
  <tbody>${rows || '<tr><td colspan="4" style="text-align:center;padding:20px;color:#9ca3af">Nenhum lançamento</td></tr>'}</tbody>
  <tfoot><tr>
    <td colspan="2"><strong>TOTAL</strong> &nbsp;·&nbsp; ${receitas.length} lançamento${receitas.length !== 1 ? 's' : ''}</td>
    <td class="val">${fmt(total)}</td><td></td>
  </tr></tfoot>
</table>
<div class="foot">jProcesso &mdash; Sistema de Gestão Municipal &mdash; JEOS Sistemas</div>
</td></tr></tbody>
</table>
</body></html>`;

    const w = window.open('', '_blank', 'width=920,height=700');
    w.document.write(html);
    w.document.close();
    w.focus();
    setTimeout(() => w.print(), 500);
  };

  return (
    <div className="space-y-3">
      {/* Filtros */}
      <FilterBar>
        <div className="w-full space-y-2">
          <PeriodoRapido de={filtros.data_de} ate={filtros.data_ate} onChange={(a, b) => aplicar({ data_de: a, data_ate: b })} />
          <div className="flex flex-wrap gap-3 items-end">
            <div className="min-w-[9rem]">
              <label htmlFor="rec-de" className="block text-xs font-medium text-ink-600 mb-1">Data de</label>
              <input id="rec-de" type="date" value={filtros.data_de} onChange={flt('data_de')} className="input-field text-sm" />
            </div>
            <div className="min-w-[9rem]">
              <label htmlFor="rec-ate" className="block text-xs font-medium text-ink-600 mb-1">Data até</label>
              <input id="rec-ate" type="date" value={filtros.data_ate} onChange={flt('data_ate')} className="input-field text-sm" />
            </div>
            <div className="min-w-[18rem] flex-1">
              <label htmlFor="rec-conta" className="block text-xs font-medium text-ink-600 mb-1">Conta</label>
              <ContaSelectInput id="rec-conta" value={filtros.conta_id} contas={contas} todasLabel="Todas as contas"
                onChange={id => aplicar({ conta_id: id })} />
            </div>
            <div className="flex-1 min-w-[12rem]">
              <label htmlFor="rec-busca" className="block text-xs font-medium text-ink-600 mb-1">Buscar na descrição</label>
              <input
                id="rec-busca"
                type="text"
                value={filtros.busca}
                onChange={flt('busca')}
                onKeyDown={e => e.key === 'Enter' && filtrar()}
                className="input-field text-sm"
                placeholder="Ex: FPM, IPTU, ISS..."
              />
            </div>
            <div className="flex gap-2 items-center">
              <button onClick={filtrar} className="btn-primary text-sm px-3 py-2 flex items-center gap-1.5">
                <Search className="h-4 w-4" aria-hidden="true" /> Filtrar
              </button>
              <BotaoLimpar onClick={limparFiltros} ativo={temFiltroReceitas} />
            </div>
          </div>
        </div>
      </FilterBar>

      {/* Extrato */}
      <div className="card overflow-hidden">
        <div className="px-4 py-3 border-b border-ink-200 flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-3">
            <SectionTitle icon={TrendingUp} title="Lançamentos de Receitas" />
            {!loading && receitas.length > 0 && (
              <span className="text-xs text-ink-500">
                {receitas.length} lançamento{receitas.length !== 1 ? 's' : ''}
                &nbsp;·&nbsp;
                <span className="font-semibold text-success-600 dark:text-success-400">{fmt(total)}</span>
              </span>
            )}
          </div>
          <div className="flex gap-2">
            <button
              onClick={printExtrato}
              disabled={receitas.length === 0}
              className="btn-secondary text-sm px-3 py-1.5 flex items-center gap-1.5 disabled:opacity-40"
            >
              <Printer className="h-4 w-4" /> Imprimir / PDF
            </button>
            <BotaoExcluidos entidade="receitas" rotulo="Receitas excluídas" onAlterado={() => load()} />
            <button onClick={openNew} className="btn-primary text-sm px-3 py-1.5 flex items-center gap-1.5">
              <Plus className="h-4 w-4" /> Novo Lançamento
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          {loading ? (
            <div className="py-12 text-center text-sm text-ink-400">Carregando...</div>
          ) : receitas.length === 0 ? (
            <div className="py-12 text-center text-sm text-ink-400">
              Nenhum lançamento encontrado.
              {temFiltroReceitas && <button onClick={limparFiltros} className="ml-2 text-brand-600 dark:text-info-400 hover:underline">Limpar filtros</button>}
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-ink-50 border-b border-ink-200">
                <tr className="text-xs font-semibold text-ink-600 uppercase tracking-wide">
                  <th className="text-left px-4 py-2.5 w-28">Data</th>
                  <th className="text-left px-4 py-2.5">Descrição</th>
                  <th className="text-left px-4 py-2.5 w-44">Conta</th>
                  <th className="text-right px-4 py-2.5 w-36">Valor</th>
                  <th className="px-4 py-2.5 w-16"></th>
                </tr>
              </thead>
              <tbody>
                {dates.map(date => {
                  const items = grouped[date];
                  const dayTotal = items.reduce((s, r) => s + parseFloat(r.valor), 0);
                  return (
                    <Fragment key={date}>
                      <tr className="bg-success-50/60 dark:bg-success-900/10 border-t border-success-200/50 dark:border-success-800/20">
                        <td colSpan={5} className="px-4 py-1.5 text-xs font-semibold text-success-700 dark:text-success-400">
                          {fmtDate(date)}
                          <span className="ml-3 font-normal text-success-600/70 dark:text-success-500/60">
                            {items.length} lançamento{items.length > 1 ? 's' : ''} · {fmt(dayTotal)}
                          </span>
                        </td>
                      </tr>
                      {items.map(r => (
                        <tr key={r.id} className="hover:bg-ink-50 transition-colors group border-b border-ink-100 last:border-0">
                          <td className="px-4 py-3 text-ink-400 text-xs tabular-nums">{fmtDate(r.data)}</td>
                          <td className="px-4 py-3">
                            <div className="text-ink-800 font-medium leading-snug">{r.descricao}</div>
                            {r.observacao && (
                              <div className="text-xs text-ink-400 mt-0.5 italic">{r.observacao}</div>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            {r.conta
                              ? <ContaLink conta={r.conta} mostrar="nome" className="text-xs" />
                              : <span className="text-xs text-ink-400">—</span>}
                            {(r.conta?.conta || r.conta?.banco_nome) && (
                              <div className="text-xs text-ink-400">
                                {[r.conta.banco_nome, r.conta.conta && `C/C ${r.conta.conta}${r.conta.conta_digito ? `-${r.conta.conta_digito}` : ''}`].filter(Boolean).join(' · ')}
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-3 text-right font-semibold text-success-600 dark:text-success-400 tabular-nums whitespace-nowrap">
                            {fmt(r.valor)}
                          </td>
                          <td className="px-4 py-3">
                            {/* Visível no hover e também ao navegar pelo teclado (focus-within) */}
                            <div className="flex gap-0.5 justify-end opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity">
                              <button
                                onClick={() => openEdit(r)}
                                aria-label={`Editar receita ${r.descricao}`} title="Editar"
                                className="p-1.5 text-ink-400 hover:text-info-500 dark:hover:text-info-400 rounded-lg hover:bg-info-50 dark:hover:bg-info-900/20 transition-colors focus:outline-hidden focus-visible:ring-2 focus-visible:ring-brand-500"
                              >
                                <Edit2 className="h-3.5 w-3.5" />
                              </button>
                              <button
                                onClick={() => setConfirmarExcluir(r)}
                                aria-label={`Excluir receita ${r.descricao}`} title="Excluir"
                                className="p-1.5 text-ink-400 hover:text-danger-500 dark:hover:text-danger-400 rounded-lg hover:bg-danger-50 dark:hover:bg-danger-900/20 transition-colors focus:outline-hidden focus-visible:ring-2 focus-visible:ring-brand-500"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </Fragment>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="bg-success-50 dark:bg-success-900/20 border-t-2 border-success-200 dark:border-success-800/50">
                  <td colSpan={3} className="px-4 py-3 text-sm font-bold text-ink-700">
                    Total · {receitas.length} lançamento{receitas.length !== 1 ? 's' : ''}
                  </td>
                  <td className="px-4 py-3 text-right text-base font-bold text-success-600 dark:text-success-400 tabular-nums">
                    {fmt(total)}
                  </td>
                  <td />
                </tr>
              </tfoot>
            </table>
          )}
        </div>
      </div>

      {/* Modal lançamento */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-surface rounded-2xl shadow-2xl w-full max-w-lg">
            <div className="px-6 py-4 border-b border-ink-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-success-50 dark:bg-success-900/30 flex items-center justify-center">
                  <TrendingUp className="w-4 h-4 text-success-600 dark:text-success-400" />
                </div>
                <h3 className="text-base font-semibold text-ink-800">
                  {editing ? 'Editar Lançamento' : 'Novo Lançamento de Receita'}
                </h3>
              </div>
              <button onClick={() => setShowModal(false)} className="text-ink-400 hover:text-ink-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-medium text-ink-600 mb-1">Conta Bancária *</label>
                <ContaSelectInput
                  value={form.conta_id}
                  contas={contas}
                  onChange={id => setForm(p => ({ ...p, conta_id: id }))}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-ink-600 mb-1">Data *</label>
                  <input type="date" value={form.data} onChange={inp('data')} className="input-field text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-ink-600 mb-1">Valor (R$) *</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={form.valor}
                    onChange={e => setForm(p => ({ ...p, valor: maskValor(e.target.value) }))}
                    className="input-field text-sm text-right tabular-nums"
                    placeholder="0,00"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-ink-600 mb-1">Descrição *</label>
                <input
                  value={form.descricao}
                  onChange={inp('descricao')}
                  className="input-field text-sm"
                  placeholder="Ex: FPM — Parcela Janeiro/2024"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-ink-600 mb-1">Observação</label>
                <textarea
                  value={form.observacao}
                  onChange={inp('observacao')}
                  rows={2}
                  className="input-field text-sm resize-none"
                  placeholder="Informações adicionais..."
                />
              </div>
            </div>
            <div className="px-6 py-4 border-t border-ink-200 flex justify-end gap-2">
              <button onClick={() => setShowModal(false)} className="btn-secondary text-sm px-4 py-2">Cancelar</button>
              <button
                onClick={salvar}
                disabled={saving}
                className="btn-primary text-sm px-4 py-2 flex items-center gap-1.5 disabled:opacity-40"
              >
                <Save className="h-4 w-4" /> {saving ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}
      {confirmarExcluir && (
        <ConfirmModal
          title={`Excluir "${confirmarExcluir.descricao}"?`}
          message="A receita sai dos totais e vai para as Receitas excluídas, de onde pode ser restaurada."
          confirmLabel="Excluir"
          onConfirm={() => excluir(confirmarExcluir)}
          onClose={() => setConfirmarExcluir(null)}
        />
      )}
    </div>
  );
}

// ─── Tab: Despesas ──────────────────────────────────────────────────────────────
// O pagamento é feito no DID (Seção Tesouraria): aqui se acompanham as ordens e
// se registra o recolhimento das retenções dos DIDs pagos.
const DESCONTOS_DID = ['desconto_inss','desconto_iss','desconto_irrf','desconto_sindicato','desconto_bb','desconto_caixa','desconto_pensao','desconto_outros'];
const liquidoDid = (did) => {
  if (!did) return 0;
  const vb = parseFloat(did.valor_bruto || 0);
  return Math.max(0, vb - DESCONTOS_DID.reduce((s, k) => s + parseFloat(did[k] || 0), 0));
};
const fmtDateT = d => d ? new Date(String(d).slice(0, 10) + 'T12:00:00').toLocaleDateString('pt-BR') : '—';
const fmtValT = v => v != null ? parseFloat(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : '—';

function TabDespesas() {
  const [visao, setVisao] = useState('ordens'); // 'ordens' | 'retencoes'
  return (
    <div className="space-y-4">
      <div className="inline-flex rounded-lg border border-ink-200 bg-surface p-0.5 text-sm">
        {[
          { id: 'ordens', label: 'Ordens e pagamentos' },
          { id: 'retencoes', label: 'Retenções a recolher' },
        ].map(v => (
          <button key={v.id} onClick={() => setVisao(v.id)}
            className={`px-3 py-1.5 rounded-md font-medium transition-colors ${visao === v.id ? 'bg-brand-600 text-white' : 'text-ink-600 hover:bg-ink-100'}`}>
            {v.label}
          </button>
        ))}
      </div>
      {visao === 'ordens' ? <OrdensDespesas /> : <RetencoesARecolher />}
    </div>
  );
}

function OrdensDespesas() {
  const [ordens, setOrdens] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filtros, setFiltros] = useState({ tipo: 'TODOS', pago: 'TODOS', data_de: '', data_ate: '', busca: '', secretaria: '', processo: '' });
  const [erro, setErro] = useState('');
  const inpF = k => e => setFiltros(p => ({ ...p, [k]: e.target.value }));

  const load = (f = filtros) => {
    setLoading(true);
    const params = new URLSearchParams();
    if (f.tipo && f.tipo !== 'TODOS') params.append('tipo', f.tipo);
    if (f.pago && f.pago !== 'TODOS') params.append('pago', f.pago);
    if (f.data_de) params.append('data_de', f.data_de);
    if (f.data_ate) params.append('data_ate', f.data_ate);
    if (f.busca) params.append('busca', f.busca);
    if (f.secretaria) params.append('secretaria', f.secretaria);
    if (f.processo) params.append('processo', f.processo);
    api.get(`/tesouraria/despesas?${params}`)
      .then(r => { setErro(''); setOrdens(r.data.ordens || []); })
      .catch(e => setErro(e.response?.data?.detalhe || e.message || 'Erro ao carregar'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const FILTROS_VAZIOS = { tipo: 'TODOS', pago: 'TODOS', data_de: '', data_ate: '', busca: '', secretaria: '', processo: '' };
  const temFiltroOrdens = Object.keys(FILTROS_VAZIOS).some(k => filtros[k] !== FILTROS_VAZIOS[k]);
  const limparOrdens = () => { setFiltros(FILTROS_VAZIOS); load(FILTROS_VAZIOS); };
  const aplicarOrdens = (parcial) => { const f = { ...filtros, ...parcial }; setFiltros(f); load(f); };

  // Pago pelo DID (fluxo atual) ou por pagamento antigo registrado na Tesouraria
  const isPago = o => o.did?.pago === 'sim' || !!o.pagamento;
  const pendentes = ordens.filter(o => !isPago(o)).length;
  const pagos = ordens.filter(o => isPago(o)).length;
  // O que saiu da conta para o credor (líquido); retenções saem quando recolhidas
  const totalPago = ordens.filter(o => isPago(o)).reduce((s, o) =>
    s + (o.did?.pago === 'sim' ? liquidoDid(o.did) : parseFloat(o.pagamento.valor_liquido || o.pagamento.valor_bruto || 0)), 0);
  const dataPagamento = o => o.did?.pago === 'sim'
    ? (o.did.data_pagamento || o.did.tesouraria_recebido_em)
    : o.pagamento?.data_pagamento;

  return (
    <div className="space-y-4">
      {/* Filtros */}
      <div className="bg-surface rounded-xl shadow-sm border border-ink-200 p-4">
        <div className="flex flex-wrap items-center gap-2 mb-3">
          <span className="text-xs text-ink-500">Emitidas em:</span>
          <PeriodoRapido de={filtros.data_de} ate={filtros.data_ate} onChange={(a, b) => aplicarOrdens({ data_de: a, data_ate: b })} />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3" onKeyDown={e => e.key === 'Enter' && e.target.tagName === 'INPUT' && load()}>
          <div>
            <label className="block text-xs font-medium text-ink-600 mb-1">Tipo</label>
            <select value={filtros.tipo} onChange={inpF('tipo')} className="input-field text-sm">
              <option value="TODOS">Todos</option>
              <option value="COMPRA">Ordem de Compra</option>
              <option value="SERVICO">Ordem de Serviço</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-ink-600 mb-1">Pagamento</label>
            <select value={filtros.pago} onChange={inpF('pago')} className="input-field text-sm">
              <option value="TODOS">Todos</option>
              <option value="pago">Pago</option>
              <option value="pendente">Pendente</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-ink-600 mb-1">De</label>
            <input type="date" value={filtros.data_de} onChange={inpF('data_de')} className="input-field text-sm" />
          </div>
          <div>
            <label className="block text-xs font-medium text-ink-600 mb-1">Até</label>
            <input type="date" value={filtros.data_ate} onChange={inpF('data_ate')} className="input-field text-sm" />
          </div>
          <div>
            <label className="block text-xs font-medium text-ink-600 mb-1">Busca</label>
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-ink-400" />
              <input value={filtros.busca} onChange={inpF('busca')} className="input-field text-sm pl-8" placeholder="Nº ou objeto..." />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-ink-600 mb-1">Secretaria</label>
            <input value={filtros.secretaria} onChange={inpF('secretaria')} className="input-field text-sm" placeholder="Nome da secretaria..." />
          </div>
          <div>
            <label className="block text-xs font-medium text-ink-600 mb-1">Processo</label>
            <input value={filtros.processo} onChange={inpF('processo')} className="input-field text-sm" placeholder="Nº do processo..." />
          </div>
        </div>
        <div className="mt-3 flex items-center justify-between gap-2 flex-wrap">
          <p className="text-xs text-ink-500">O pagamento é registrado no DID do processo (Seção Tesouraria).</p>
          <div className="flex gap-2 flex-wrap">
            <BotaoExcluidos entidade="pagamentos" rotulo="Pagamentos estornados" onAlterado={() => load()} />
            <BotaoLimpar onClick={limparOrdens} ativo={temFiltroOrdens} />
            <button onClick={() => load()} className="btn-primary text-sm px-4 py-2 flex items-center gap-1.5">
              <Search className="h-4 w-4" aria-hidden="true" /> Filtrar
            </button>
          </div>
        </div>
      </div>

      {/* Cards resumo */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4 flex items-center gap-3">
          <Clock className="h-8 w-8 text-amber-500 shrink-0" />
          <div>
            <p className="text-xs text-amber-700 dark:text-amber-400 font-medium">Pendentes</p>
            <p className="text-2xl font-bold text-amber-800 dark:text-amber-300">{pendentes}</p>
          </div>
        </div>
        <div className="bg-success-50 dark:bg-success-900/20 border border-success-200 dark:border-success-800 rounded-xl p-4 flex items-center gap-3">
          <CheckCircle2 className="h-8 w-8 text-success-500 shrink-0" />
          <div>
            <p className="text-xs text-success-700 dark:text-success-400 font-medium">Pagos</p>
            <p className="text-2xl font-bold text-success-800 dark:text-success-300">{pagos}</p>
          </div>
        </div>
        <div className="bg-info-50 dark:bg-info-900/20 border border-info-200 dark:border-info-800 rounded-xl p-4 flex items-center gap-3">
          <CreditCard className="h-8 w-8 text-info-500 shrink-0" />
          <div>
            <p className="text-xs text-brand-700 dark:text-info-400 font-medium">Total pago aos credores (líquido)</p>
            <p className="text-lg font-bold text-info-800 dark:text-info-300">{fmtValT(totalPago)}</p>
          </div>
        </div>
      </div>

      {erro && (
        <div className="bg-danger-50 dark:bg-danger-900/20 border border-danger-200 dark:border-danger-800 rounded-xl px-4 py-3 text-sm text-danger-700 dark:text-danger-400">
          Erro: {erro}
        </div>
      )}

      <div className="bg-surface rounded-xl shadow-sm border border-ink-200 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-12 text-ink-400">Carregando...</div>
        ) : ordens.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-ink-400 gap-2">
            <ShoppingCart className="h-8 w-8 opacity-40" aria-hidden="true" />
            <p className="text-sm">Nenhuma ordem encontrada</p>
            {temFiltroOrdens && <button onClick={limparOrdens} className="text-sm text-brand-600 dark:text-info-400 hover:underline">Limpar filtros</button>}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-ink-50">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-ink-600">Nº / Tipo</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-ink-600">Objeto / Contrato</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-ink-600">Secretaria</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-ink-600">Processo</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-ink-600">Pagamento / Conta</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-ink-600">Valor Total</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-ink-600">Pagamento</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-100">
                {ordens.map(o => (
                  <tr key={o.id} className="hover:bg-ink-50 group">
                    <td className="px-4 py-3">
                      <div className="font-mono text-xs text-ink-800">{o.numero}</div>
                      <span className={`inline-block mt-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded-sm ${o.tipo === 'COMPRA' ? 'bg-info-100 text-brand-700 dark:bg-info-900/40 dark:text-info-300' : 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300'}`}>
                        {o.tipo === 'COMPRA' ? 'OC' : 'OS'}
                      </span>
                    </td>
                    <td className="px-4 py-3 max-w-xs">
                      <div className="text-xs text-ink-800 line-clamp-2">{o.objeto}</div>
                      {o.contrato && (
                        <div className="text-[10px] text-ink-500 line-clamp-2">
                          {o.contrato.credor?.razao_social || ''}{o.contrato.credor?.razao_social && ' — '}Contrato {o.contrato.numero_contrato}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-ink-600 whitespace-nowrap">{o.secretaria_sigla || '—'}</td>
                    <td className="px-4 py-3 text-xs font-mono text-ink-600 whitespace-nowrap">{o.did?.processo?.numero || '—'}</td>
                    <td className="px-4 py-3 text-xs text-ink-600 whitespace-nowrap">
                      {isPago(o) ? fmtDateT(dataPagamento(o)) : '—'}
                      {o.conta_pagamento && (
                        <div className="text-[11px]">
                          <ContaLink conta={o.conta_pagamento} mostrar="numero" />
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right text-xs font-medium text-ink-800 whitespace-nowrap tabular-nums">{fmtValT(o.valor_total)}</td>
                    <td className="px-4 py-3 text-center">
                      {isPago(o) ? (
                        <div className="flex flex-col items-center gap-0.5">
                          <span className="flex items-center gap-1 text-[10px] font-semibold text-success-700 dark:text-success-400">
                            <CheckCircle2 className="h-3 w-3" /> PAGO
                          </span>
                          {o.did?.doc_caixa && <span className="text-[10px] text-ink-400">Doc: {o.did.doc_caixa}</span>}
                        </div>
                      ) : (
                        <span className="flex items-center justify-center gap-1 text-[10px] font-semibold text-amber-600 dark:text-amber-400">
                          <Clock className="h-3 w-3" /> PENDENTE
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// Retenções (INSS, ISS, IRRF, consignados…) dos DIDs pagos: saem da conta quando
// recolhidas. Até lá aparecem como "a recolher" e reduzem o disponível da conta.
function RetencoesARecolher() {
  const { user } = useAuth();
  const podeEditar = hasPerm(user, 'tesouraria', 'despesas', 'editar');
  const [situacao, setSituacao] = useState('a_recolher'); // 'a_recolher' | 'recolhidas'
  const [lista, setLista] = useState([]);
  const [loading, setLoading] = useState(false);
  const [sel, setSel] = useState(() => new Set());
  const [data, setData] = useState(new Date().toISOString().slice(0, 10));
  const [salvando, setSalvando] = useState(false);
  const [busca, setBusca] = useState('');
  const [contaFiltro, setContaFiltro] = useState('');
  const [contas, setContas] = useState([]);
  useEffect(() => {
    api.get('/organizacao/contas-bancarias').then(r => setContas(r.data.contas || [])).catch(() => {});
  }, []);

  const load = (s = situacao) => {
    setLoading(true);
    setSel(new Set());
    api.get('/tesouraria/retencoes', { params: { situacao: s } })
      .then(r => setLista(r.data.retencoes || []))
      .catch(() => setLista([]))
      .finally(() => setLoading(false));
  };
  useEffect(() => { load(situacao); }, [situacao]); // eslint-disable-line react-hooks/exhaustive-deps

  const termo = busca.trim().toLowerCase();
  const visiveis = lista.filter(r =>
    (!contaFiltro || r.conta_id === contaFiltro) &&
    (!termo || [r.numero_did, r.processo, r.credor, r.conta, r.conta_numero, r.secretaria].some(v => String(v || '').toLowerCase().includes(termo)))
  );
  const temFiltroRet = !!(termo || contaFiltro);
  const limparRet = () => { setBusca(''); setContaFiltro(''); };
  const total = (k, rs = visiveis) => rs.reduce((s, r) => s + (r[k] || 0), 0);
  const selecionados = visiveis.filter(r => sel.has(r.id));
  const todos = visiveis.length > 0 && visiveis.every(r => sel.has(r.id));
  const alternar = id => setSel(p => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const alternarTodos = () => setSel(todos ? new Set() : new Set(visiveis.map(r => r.id)));

  const executar = async () => {
    if (!selecionados.length) return;
    const recolher = situacao === 'a_recolher';
    if (recolher && !data) return alert('Informe a data do recolhimento.');
    const msg = recolher
      ? `Registrar o recolhimento de ${fmtValT(total('total', selecionados))} em retenções de ${selecionados.length} DID(s) em ${fmtDateT(data)}?\n\nO valor será debitado das contas de pagamento nessa data.`
      : `Desfazer o recolhimento de ${selecionados.length} DID(s)? O valor volta a ficar "a recolher" e sai do extrato.`;
    if (!window.confirm(msg)) return;
    setSalvando(true);
    try {
      const ids = selecionados.map(r => r.id);
      if (recolher) await api.post('/tesouraria/retencoes/recolher', { did_ids: ids, data });
      else await api.post('/tesouraria/retencoes/desfazer', { did_ids: ids });
      load();
    } catch (e) {
      alert(e.response?.data?.error || 'Não foi possível concluir.');
    } finally {
      setSalvando(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="bg-surface rounded-xl shadow-sm border border-ink-200 p-4 flex flex-wrap items-end gap-3">
        <div>
          <label htmlFor="ret-sit" className="block text-xs font-medium text-ink-600 mb-1">Situação</label>
          <select id="ret-sit" value={situacao} onChange={e => setSituacao(e.target.value)} className="input-field text-sm">
            <option value="a_recolher">A recolher</option>
            <option value="recolhidas">Recolhidas</option>
          </select>
        </div>
        <div className="min-w-[16rem]">
          <label htmlFor="ret-conta" className="block text-xs font-medium text-ink-600 mb-1">Conta</label>
          <ContaSelectInput id="ret-conta" value={contaFiltro} contas={contas} todasLabel="Todas as contas" onChange={setContaFiltro} />
        </div>
        <div className="flex-1 min-w-[200px]">
          <label htmlFor="ret-busca" className="block text-xs font-medium text-ink-600 mb-1">Busca</label>
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-ink-400" aria-hidden="true" />
            <input id="ret-busca" value={busca} onChange={e => setBusca(e.target.value)} className="input-field text-sm pl-8" placeholder="DID, processo, credor..." />
          </div>
        </div>
        <BotaoLimpar onClick={limparRet} ativo={temFiltroRet} />
        {podeEditar && situacao === 'a_recolher' && (
          <div>
            <label className="block text-xs font-medium text-ink-600 mb-1">Data do recolhimento</label>
            <input type="date" value={data} onChange={e => setData(e.target.value)} className="input-field text-sm" />
          </div>
        )}
        {podeEditar && (
          <button onClick={executar} disabled={!selecionados.length || salvando}
            className={`text-sm px-4 py-2 rounded-lg font-semibold text-white flex items-center gap-1.5 disabled:opacity-40 ${situacao === 'a_recolher' ? 'bg-success-600 hover:bg-success-700' : 'bg-amber-600 hover:bg-amber-700'}`}>
            {situacao === 'a_recolher'
              ? <><CheckCircle2 className="h-4 w-4" /> Marcar como recolhidas ({selecionados.length})</>
              : <><RotateCcw className="h-4 w-4" /> Desfazer recolhimento ({selecionados.length})</>}
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[['INSS', 'inss'], ['ISS', 'iss'], ['IRRF', 'irrf'], ['Outros', 'outros'], ['Total', 'total']].map(([rot, k]) => (
          <div key={k} className={`rounded-xl border p-3 ${k === 'total' ? 'bg-amber-50 border-amber-200 dark:bg-amber-900/20 dark:border-amber-800' : 'bg-surface border-ink-200'}`}>
            <p className="text-xs text-ink-500">{rot}{situacao === 'a_recolher' ? ' a recolher' : ' recolhido'}</p>
            <p className="text-base font-bold text-ink-900 tabular-nums">{fmtValT(total(k))}</p>
          </div>
        ))}
      </div>

      <div className="bg-surface rounded-xl shadow-sm border border-ink-200 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-12 text-ink-400">Carregando...</div>
        ) : visiveis.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-ink-400 gap-2">
            <CheckCircle2 className="h-8 w-8 opacity-40" />
            <p className="text-sm">{situacao === 'a_recolher' ? 'Nenhuma retenção a recolher' : 'Nenhum recolhimento registrado'}</p>
            {temFiltroRet && <button onClick={limparRet} className="text-sm text-brand-600 dark:text-info-400 hover:underline">Limpar filtros</button>}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-ink-50">
                <tr>
                  {podeEditar && (
                    <th className="w-10 px-3 py-3">
                      <input type="checkbox" checked={todos} onChange={alternarTodos} aria-label="Selecionar todos" className="accent-brand-600" />
                    </th>
                  )}
                  <th className="text-left px-3 py-3 text-xs font-semibold text-ink-600">DID / Processo</th>
                  <th className="text-left px-3 py-3 text-xs font-semibold text-ink-600">Credor</th>
                  <th className="text-left px-3 py-3 text-xs font-semibold text-ink-600">Conta</th>
                  <th className="text-left px-3 py-3 text-xs font-semibold text-ink-600">Pago em</th>
                  {situacao === 'recolhidas' && <th className="text-left px-3 py-3 text-xs font-semibold text-ink-600">Recolhido em</th>}
                  <th className="text-right px-3 py-3 text-xs font-semibold text-ink-600">INSS</th>
                  <th className="text-right px-3 py-3 text-xs font-semibold text-ink-600">ISS</th>
                  <th className="text-right px-3 py-3 text-xs font-semibold text-ink-600">IRRF</th>
                  <th className="text-right px-3 py-3 text-xs font-semibold text-ink-600">Outros</th>
                  <th className="text-right px-3 py-3 text-xs font-semibold text-ink-600">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-100">
                {visiveis.map(r => (
                  <tr key={r.id} onClick={() => podeEditar && alternar(r.id)}
                    className={`text-xs ${podeEditar ? 'cursor-pointer' : ''} ${sel.has(r.id) ? 'bg-info-50 dark:bg-info-900/20' : 'hover:bg-ink-50'}`}>
                    {podeEditar && (
                      <td className="px-3 py-2 text-center" onClick={e => e.stopPropagation()}>
                        <input type="checkbox" checked={sel.has(r.id)} onChange={() => alternar(r.id)} aria-label="Selecionar" className="accent-brand-600" />
                      </td>
                    )}
                    <td className="px-3 py-2 whitespace-nowrap">
                      <div className="font-mono text-ink-800">DID {r.numero_did || '—'}</div>
                      <div className="font-mono text-[10px] text-ink-500">{r.processo || ''}</div>
                    </td>
                    <td className="px-3 py-2 max-w-xs truncate" title={r.credor || ''}>{r.credor || '—'}</td>
                    <td className="px-3 py-2 whitespace-nowrap" onClick={e => e.stopPropagation()}>
                      {r.conta_id
                        ? <ContaLink conta={{ id: r.conta_id, nome: r.conta }} rotulo={r.conta_numero ? `${r.conta_numero} — ${r.conta}` : r.conta} />
                        : '—'}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap">{fmtDateT(r.data_pagamento)}</td>
                    {situacao === 'recolhidas' && <td className="px-3 py-2 whitespace-nowrap">{fmtDateT(r.recolhidas_em)}</td>}
                    <td className="px-3 py-2 text-right tabular-nums">{fmtValT(r.inss)}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{fmtValT(r.iss)}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{fmtValT(r.irrf)}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{fmtValT(r.outros)}</td>
                    <td className="px-3 py-2 text-right tabular-nums font-semibold">{fmtValT(r.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// Compara duas listas de ids ignorando a ordem
const mesmasContas = (a = [], b = []) =>
  a.length === b.length && [...a].sort().join() === [...b].sort().join();

// ─── Seleção múltipla de contas (checkboxes + busca) ────────────────────────────
function ContasMultiSelect({ contas, value, onAplicar, sinalAbrir = 0 }) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(value);
  const [q, setQ] = useState('');
  const ref = useRef(null);

  // Ressincroniza o rascunho quando a seleção muda por fora (clique num chip de grupo)
  useEffect(() => { setDraft(value); }, [value]);

  // Permite que outro ponto da tela (ex: estado vazio do gerenciador) abra o painel
  useEffect(() => { if (sinalAbrir) setOpen(true); }, [sinalAbrir]);

  useEffect(() => {
    const close = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  const termo = q.trim().toLowerCase();
  const visiveis = termo
    ? contas.filter(c =>
        c.nome.toLowerCase().includes(termo) ||
        (c.conta || '').includes(termo) ||
        (c.banco_nome || '').toLowerCase().includes(termo)
      )
    : contas;

  const toggle = (id) => setDraft(d => d.includes(id) ? d.filter(x => x !== id) : [...d, id]);
  const marcarVisiveis = () => setDraft(d => [...new Set([...d, ...visiveis.map(c => c.id)])]);

  const aplicar = () => { onAplicar(draft); setOpen(false); };

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="input-field text-sm flex items-center justify-between gap-2 min-w-[13rem]"
      >
        <span className={value.length ? 'text-ink-800' : 'text-ink-400'}>
          {value.length ? `${value.length} conta${value.length > 1 ? 's' : ''} selecionada${value.length > 1 ? 's' : ''}` : 'Selecionar contas'}
        </span>
        <ChevronDown className={`h-4 w-4 shrink-0 text-ink-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute z-50 mt-1 w-80 bg-surface border border-ink-200 rounded-xl shadow-xl overflow-hidden">
          <div className="p-2 border-b border-ink-100">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-ink-400" />
              <input
                value={q}
                onChange={e => setQ(e.target.value)}
                placeholder="Buscar conta..."
                className="input-field text-xs pl-8"
                autoFocus
              />
            </div>
          </div>

          <div className="max-h-64 overflow-y-auto">
            {visiveis.length === 0 && (
              <p className="px-3 py-6 text-center text-xs text-ink-400">Nenhuma conta encontrada</p>
            )}
            {visiveis.map(c => {
              const marcada = draft.includes(c.id);
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => toggle(c.id)}
                  className="w-full flex items-start gap-2.5 text-left px-3 py-2 hover:bg-ink-50 transition-colors border-b border-ink-100 last:border-0"
                >
                  <span className={`mt-0.5 h-4 w-4 shrink-0 rounded-sm border flex items-center justify-center transition-colors ${marcada ? 'bg-brand-600 border-brand-600' : 'border-ink-300'}`}>
                    {marcada && <Check className="h-3 w-3 text-white" strokeWidth={3} />}
                  </span>
                  <span className="min-w-0">
                    <span className="block text-xs font-medium text-ink-800 truncate">{contaLabel(c)}</span>
                    {c.banco_nome && <span className="block text-[11px] text-ink-500 truncate">{c.banco_nome}</span>}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="flex items-center justify-between gap-2 px-3 py-2 border-t border-ink-100 bg-ink-50">
            <div className="flex gap-2 text-[11px]">
              <button type="button" onClick={marcarVisiveis} className="text-brand-600 dark:text-info-400 hover:underline">
                {termo ? 'Marcar filtradas' : 'Marcar todas'}
              </button>
              <span className="text-ink-400">|</span>
              <button type="button" onClick={() => setDraft([])} className="text-ink-500 hover:underline">Limpar</button>
            </div>
            <span className="text-[11px] text-ink-500">{draft.length} marcada{draft.length !== 1 ? 's' : ''}</span>
          </div>

          <div className="px-3 py-2 border-t border-ink-100">
            <button type="button" onClick={aplicar} className="btn-primary w-full text-xs py-1.5">Aplicar</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Modal: nomear um novo grupo de contas ──────────────────────────────────────
function NomearGrupoModal({ qtdContas, onSalvar, onCancel }) {
  const [nome, setNome] = useState('');
  const [saving, setSaving] = useState(false);

  const salvar = async () => {
    if (!nome.trim() || saving) return;
    setSaving(true);
    const ok = await onSalvar(nome.trim());
    if (!ok) setSaving(false);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-surface rounded-xl shadow-2xl w-full max-w-sm">
        <div className="px-4 py-3 border-b border-ink-100 flex items-center gap-2">
          <Layers className="h-4 w-4 text-brand-600" />
          <h3 className="text-sm font-semibold text-ink-800">Salvar grupo de contas</h3>
        </div>
        <div className="p-4 space-y-3">
          <div>
            <label className="block text-xs font-medium text-ink-600 mb-1">Nome do grupo *</label>
            <input
              value={nome}
              onChange={e => setNome(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && salvar()}
              maxLength={80}
              placeholder="Ex: Contas de Recurso Saúde"
              className="input-field text-sm"
              autoFocus
            />
          </div>
          <p className="text-xs text-ink-500">
            {qtdContas} conta{qtdContas !== 1 ? 's' : ''} será{qtdContas !== 1 ? 'ão' : ''} salva{qtdContas !== 1 ? 's' : ''} neste grupo. O grupo é seu — outros usuários não o enxergam.
          </p>
        </div>
        <div className="px-4 py-3 border-t border-ink-100 flex justify-end gap-2">
          <button onClick={onCancel} className="btn-secondary text-sm px-4 py-2">Cancelar</button>
          <button onClick={salvar} disabled={!nome.trim() || saving} className="btn-primary text-sm px-4 py-2 flex items-center gap-1.5 disabled:opacity-40">
            <Save className="h-4 w-4" /> {saving ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Modal: gerenciar grupos salvos ─────────────────────────────────────────────
function GerenciarGruposModal({ grupos, contas, onRenomear, onExcluir, onReordenar, onEditarContas, onCriarGrupo, onClose }) {
  const [editando, setEditando] = useState(null);   // { id, nome }
  const [confirmando, setConfirmando] = useState(null);

  const salvarNome = async () => {
    const alvo = editando;
    setEditando(null);
    if (alvo && alvo.nome.trim()) await onRenomear(alvo.id, alvo.nome.trim());
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-surface rounded-xl shadow-2xl w-full max-w-lg max-h-[85vh] flex flex-col">
        <div className="px-4 py-3 border-b border-ink-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Settings2 className="h-4 w-4 text-brand-600" />
            <h3 className="text-sm font-semibold text-ink-800">Gerenciar grupos de contas</h3>
          </div>
          <button onClick={onClose} className="text-ink-400 hover:text-ink-600">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {grupos.length === 0 && (
            <div className="py-8 text-center space-y-3">
              <p className="text-sm text-ink-500">Nenhum grupo salvo ainda.</p>
              <p className="text-xs text-ink-400 max-w-xs mx-auto leading-relaxed">
                Um grupo é um conjunto de contas que você salva para consultar de novo com um clique.
                Marque as contas primeiro; o botão de salvar aparece logo abaixo dos chips.
              </p>
              <button onClick={onCriarGrupo} className="btn-primary text-xs px-4 py-2 inline-flex items-center gap-1.5">
                <Plus className="h-3.5 w-3.5" /> Selecionar contas
              </button>
            </div>
          )}

          {grupos.map((g, i) => {
            const validas = (g.contas_ids || []).filter(id => contas.some(c => c.id === id));
            const orfas = (g.contas_ids || []).length - validas.length;
            return (
              <div key={g.id} className="border border-ink-200 rounded-lg p-3 flex items-start gap-3">
                {grupos.length > 1 && (
                  <div className="flex flex-col gap-0.5 pt-0.5">
                    <button
                      onClick={() => onReordenar(i, i - 1)}
                      disabled={i === 0}
                      className="text-ink-400 hover:text-ink-700 disabled:opacity-20"
                      title="Mover para cima"
                    >
                      <ChevronUp className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => onReordenar(i, i + 1)}
                      disabled={i === grupos.length - 1}
                      className="text-ink-400 hover:text-ink-700 disabled:opacity-20"
                      title="Mover para baixo"
                    >
                      <ChevronDown className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )}

                <div className="flex-1 min-w-0">
                  {editando?.id === g.id ? (
                    <input
                      value={editando.nome}
                      onChange={e => setEditando({ id: g.id, nome: e.target.value })}
                      onBlur={salvarNome}
                      onKeyDown={e => { if (e.key === 'Enter') salvarNome(); if (e.key === 'Escape') setEditando(null); }}
                      maxLength={80}
                      className="input-field text-sm py-1"
                      autoFocus
                    />
                  ) : (
                    <button
                      onClick={() => setEditando({ id: g.id, nome: g.nome })}
                      className="text-sm font-medium text-ink-800 hover:text-brand-600 dark:hover:text-info-400 text-left"
                      title="Clique para renomear"
                    >
                      {g.nome}
                    </button>
                  )}
                  <p className="text-xs text-ink-500 mt-0.5">
                    {validas.length} conta{validas.length !== 1 ? 's' : ''}
                    {orfas > 0 && (
                      <span className="text-amber-600 dark:text-amber-400 ml-1.5 inline-flex items-center gap-1">
                        <AlertTriangle className="h-3 w-3" />
                        {orfas} conta{orfas > 1 ? 's' : ''} não existe{orfas > 1 ? 'm' : ''} mais
                      </span>
                    )}
                  </p>
                </div>

                <div className="flex gap-1 shrink-0">
                  <button
                    onClick={() => onEditarContas(g)}
                    className="p-1.5 rounded-lg text-ink-400 hover:text-brand-600 hover:bg-info-50"
                    title="Editar contas do grupo"
                  >
                    <Edit2 className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => setConfirmando(g)}
                    className="p-1.5 rounded-lg text-ink-400 hover:text-danger-600 hover:bg-danger-50"
                    title="Excluir grupo"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        <div className="px-4 py-3 border-t border-ink-100 flex justify-end">
          <button onClick={onClose} className="btn-secondary text-sm px-4 py-2">Fechar</button>
        </div>
      </div>

      {confirmando && (
        <ConfirmModal
          title="Excluir grupo"
          message={`Excluir o grupo "${confirmando.nome}"? As contas bancárias não são afetadas.`}
          confirmLabel="Excluir"
          onConfirm={async () => { await onExcluir(confirmando.id); setConfirmando(null); }}
          onClose={() => setConfirmando(null)}
        />
      )}
    </div>
  );
}

// ─── Tab: Relatórios ─────────────────────────────────────────────────────────────
function TabRelatorios() {
  const { tenant } = useAuth();
  const [tipo, setTipo] = useState('saldo');
  const [contas, setContas] = useState([]);
  const [filtros, setFiltros] = useState({ conta_id: '', ano: new Date().getFullYear(), data_de: '', data_ate: '' });
  const [resultado, setResultado] = useState(null);
  const [loading, setLoading] = useState(false);

  // ── Grupos de contas do "Saldo por Conta" ───────────────────────────────────
  const [grupos, setGrupos] = useState([]);
  const [grupoAtivo, setGrupoAtivo] = useState(null);   // id do grupo em uso; null = seleção livre
  const [selecao, setSelecao] = useState([]);           // ids das contas; [] = todas
  const [modalNomear, setModalNomear] = useState(false);
  const [modalGerenciar, setModalGerenciar] = useState(false);
  const [sinalAbrir, setSinalAbrir] = useState(0);   // incrementar abre o painel de contas

  // Grupo ativo cujas contas foram mexidas na mão e ainda não salvas
  const grupoObj = grupos.find(g => g.id === grupoAtivo) || null;
  const grupoModificado = !!grupoObj && !mesmasContas(grupoObj.contas_ids || [], selecao);

  const carregarGrupos = async () => {
    try {
      const r = await api.get('/tesouraria/grupos-contas');
      setGrupos(r.data.grupos || []);
      return r.data.grupos || [];
    } catch { return []; }
  };

  // `sel`/`gid` são passados explicitamente porque o estado do React ainda não
  // reflete a mudança no mesmo tick em que o chip/aplicar dispara a consulta.
  const loadSaldo = async (f = {}, sel = selecao, gid = grupoAtivo, gModificado = grupoModificado) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (f.data_de) params.append('data_de', f.data_de);
      if (f.data_ate) params.append('data_ate', f.data_ate);
      if (gid && !gModificado) params.append('grupo_id', gid);
      else if (sel.length) params.append('contas_ids', sel.join(','));
      const r = await api.get(`/tesouraria/relatorios/saldo-contas?${params}`);
      setResultado({ tipo: 'saldo', ...r.data });
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    api.get('/organizacao/contas-bancarias').then(r => setContas(r.data.contas || [])).catch(() => {});
    carregarGrupos();
    loadSaldo();
  }, []);

  // Se a listagem de contas não vier (erro/permissão), aproveita as contas que o
  // próprio relatório sem filtro já devolveu — senão o seletor fica vazio sem explicação.
  useEffect(() => {
    if (!contas.length && resultado?.tipo === 'saldo' && !resultado.filtro) {
      setContas(resultado.contas || []);
    }
  }, [contas.length, resultado]);

  // Chip "Todas as contas"
  const usarTodas = () => {
    setGrupoAtivo(null);
    setSelecao([]);
    loadSaldo(filtros, [], null, false);
  };

  // Chip de um grupo salvo
  const usarGrupo = (g) => {
    const ids = g.contas_ids || [];
    setGrupoAtivo(g.id);
    setSelecao(ids);
    loadSaldo(filtros, ids, g.id, false);
  };

  // "Aplicar" da seleção manual — mantém o grupo ativo marcado como modificado.
  // Seleção vazia equivale a "todas as contas", então também solta o grupo ativo.
  const aplicarSelecao = (ids) => {
    if (!ids.length) return usarTodas();
    setSelecao(ids);
    const aindaNoGrupo = grupoObj && mesmasContas(grupoObj.contas_ids || [], ids);
    loadSaldo(filtros, ids, grupoAtivo, !aindaNoGrupo);
  };

  const salvarNovoGrupo = async (nome) => {
    try {
      const r = await api.post('/tesouraria/grupos-contas', { nome, contas_ids: selecao });
      await carregarGrupos();
      setGrupoAtivo(r.data.grupo.id);
      setModalNomear(false);
      loadSaldo(filtros, selecao, r.data.grupo.id, false);
      return true;
    } catch (err) {
      alert(err.response?.data?.error || 'Erro ao salvar grupo');
      return false;
    }
  };

  const atualizarGrupoAtivo = async () => {
    try {
      await api.put(`/tesouraria/grupos-contas/${grupoAtivo}`, { contas_ids: selecao });
      await carregarGrupos();
      loadSaldo(filtros, selecao, grupoAtivo, false);
    } catch (err) {
      alert(err.response?.data?.error || 'Erro ao atualizar grupo');
    }
  };

  const renomearGrupo = async (id, nome) => {
    try {
      await api.put(`/tesouraria/grupos-contas/${id}`, { nome });
      await carregarGrupos();
    } catch (err) {
      alert(err.response?.data?.error || 'Erro ao renomear grupo');
    }
  };

  const excluirGrupo = async (id) => {
    try {
      await api.delete(`/tesouraria/grupos-contas/${id}`);
      await carregarGrupos();
      if (grupoAtivo === id) usarTodas();
    } catch (err) {
      alert(err.response?.data?.error || 'Erro ao excluir grupo');
    }
  };

  const reordenarGrupos = async (de, para) => {
    if (para < 0 || para >= grupos.length) return;
    const nova = [...grupos];
    const [mov] = nova.splice(de, 1);
    nova.splice(para, 0, mov);
    setGrupos(nova);   // reflete na hora; persiste em seguida
    try {
      await Promise.all(nova.map((g, i) => api.put(`/tesouraria/grupos-contas/${g.id}`, { ordem: i })));
    } catch {
      carregarGrupos();   // desfaz o otimismo se o servidor recusar
    }
  };

  const inpF = k => e => setFiltros(p => ({ ...p, [k]: e.target.value }));
  const fmtVal = v => v != null ? parseFloat(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : '—';
  const fmtDate = d => d ? new Date(d + 'T12:00:00').toLocaleDateString('pt-BR') : '—';
  const fmtMes = m => {
    if (!m) return '—';
    const [y, mo] = m.split('-');
    const meses = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
    return `${meses[parseInt(mo) - 1]}/${y}`;
  };

  // Extrato sai sozinho ao escolher a conta ou um período rápido (sem precisar de "Gerar")
  const gerarExtrato = async (f) => {
    if (!f.conta_id) { setResultado(null); return; }
    setLoading(true);
    try {
      const params = new URLSearchParams({ conta_id: f.conta_id });
      if (f.data_de) params.append('data_de', f.data_de);
      if (f.data_ate) params.append('data_ate', f.data_ate);
      const r = await api.get(`/tesouraria/relatorios/extrato?${params}`);
      setResultado({ tipo: 'extrato', ...r.data });
    } catch (err) {
      alert(err.response?.data?.error || 'Erro ao gerar extrato');
    } finally {
      setLoading(false);
    }
  };

  const aplicarRel = (parcial) => {
    const f = { ...filtros, ...parcial };
    setFiltros(f);
    if (tipo === 'extrato') gerarExtrato(f);
    else if (tipo === 'saldo') loadSaldo(f);
  };

  const temFiltroRel = tipo === 'saldo'
    ? !!(filtros.data_de || filtros.data_ate || selecao.length || grupoAtivo)
    : tipo === 'fluxo'
      ? !!(filtros.conta_id || String(filtros.ano) !== String(new Date().getFullYear()))
      : !!(filtros.conta_id || filtros.data_de || filtros.data_ate);

  const limparRel = () => {
    const f = { conta_id: '', ano: new Date().getFullYear(), data_de: '', data_ate: '' };
    setFiltros(f);
    if (tipo === 'saldo') { setGrupoAtivo(null); setSelecao([]); loadSaldo(f, [], null, false); }
    else setResultado(null);
  };

  const gerar = async () => {
    if (tipo === 'saldo') { loadSaldo(filtros); return; }
    if (tipo === 'extrato') { if (!filtros.conta_id) return alert('Selecione a conta para o extrato'); return gerarExtrato(filtros); }
    setLoading(true);
    setResultado(null);
    try {
      if (tipo === 'fluxo') {
        const params = new URLSearchParams();
        if (filtros.ano) params.append('ano', filtros.ano);
        if (filtros.conta_id) params.append('conta_id', filtros.conta_id);
        const r = await api.get(`/tesouraria/relatorios/fluxo-mensal?${params}`);
        setResultado({ tipo: 'fluxo', ...r.data });
      } else if (tipo === 'extrato') {
        if (!filtros.conta_id) { setLoading(false); return alert('Selecione a conta para o extrato'); }
        const params = new URLSearchParams({ conta_id: filtros.conta_id });
        if (filtros.data_de) params.append('data_de', filtros.data_de);
        if (filtros.data_ate) params.append('data_ate', filtros.data_ate);
        const r = await api.get(`/tesouraria/relatorios/extrato?${params}`);
        setResultado({ tipo: 'extrato', ...r.data });
      }
    } catch (err) {
      alert(err.response?.data?.error || 'Erro ao gerar relatório');
    } finally {
      setLoading(false);
    }
  };

  const _mg = tenant?.configuracoes?.margens;
  const PRINT_CSS = `
    @page{size:A4 portrait;margin:0}
    *{-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important;color-adjust:exact!important}
    body{font-family:Arial,sans-serif;color:#111;margin:0}
    .layout{width:100%;border-collapse:collapse}
    .layout>thead>tr>td,.layout>tfoot>tr>td{border:0!important;padding:0!important}
    .layout>tbody>tr>td{border:0!important}
    .sp-top{height:${_mg?.top??20}mm}.sp-bottom{height:${_mg?.bottom??20}mm}
    .content{padding:0 ${_mg?.right??14}mm 0 ${_mg?.left??14}mm!important}
    h2{margin:0 0 2px;font-size:17px}p{margin:2px 0;font-size:12px;color:#555}
    table.data{width:100%;border-collapse:collapse;font-size:13px;margin-top:12px}
    table.data th,table.data td{padding:7px 10px;border:1px solid #d1d5db}
    table.data thead{display:table-header-group}
    .th-blue{background:#1e40af!important;color:#fff!important}
    .th-green{background:#166534!important;color:#fff!important}
    .tf-blue{background:#dbeafe!important;font-weight:700}
    .tf-green{background:#dcfce7!important;font-weight:700}
    .row-r{background:#f0fdf4!important}
    .v-pos{color:#16a34a;font-weight:700}.v-neg{color:#dc2626;font-weight:700}
    .v-g{color:#16a34a}.v-r{color:#dc2626}
    ${tenant?.configuracoes?.timbrado ? `body::before{content:'';position:fixed;top:0;left:0;width:210mm;height:297mm;background-image:url("${tenant.configuracoes.timbrado}");background-size:210mm 297mm;background-repeat:no-repeat;background-position:top left;opacity:.75;z-index:-1;pointer-events:none;-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important}` : ''}
    @media print{
      .th-blue{background:#1e40af!important;color:#fff!important}
      .th-green{background:#166534!important;color:#fff!important}
      .tf-blue{background:#dbeafe!important}
      .tf-green{background:#dcfce7!important}
      .row-r{background:#f0fdf4!important}
    }`;

  const imprimir = () => {
    if (!resultado) return;
    const now = new Date().toLocaleDateString('pt-BR');
    let title = '', body = '';

    if (resultado.tipo === 'saldo') {
      // Sem o nome do grupo no cabeçalho, um relatório filtrado impresso fica
      // indistinguível de um relatório de todas as contas.
      const nomeGrupo = resultado.filtro?.grupo_nome;
      title = nomeGrupo ? `Saldo por Conta Bancária — ${nomeGrupo}` : 'Saldo por Conta Bancária';
      const escopo = resultado.filtro
        ? `${resultado.contas.length} conta${resultado.contas.length !== 1 ? 's' : ''} selecionada${resultado.contas.length !== 1 ? 's' : ''}`
        : 'Todas as contas ativas';
      body = `<h2>${title}</h2><p>${escopo} | Gerado em ${now}</p>
        <table class="data">
          <thead><tr>
            <th class="th-blue" align="left">Conta</th>
            <th class="th-blue" align="left">Banco</th>
            <th class="th-blue" align="right">Receitas</th>
            <th class="th-blue" align="right">Despesas</th>
            <th class="th-blue" align="right">Saldo</th>
          </tr></thead>
          <tbody>${resultado.contas.map(c => `<tr>
            <td>${c.nome}</td><td>${c.banco_nome || '—'}</td>
            <td align="right" class="v-g">${fmtVal(c.total_receitas)}</td>
            <td align="right" class="v-r">${fmtVal(c.total_despesas)}</td>
            <td align="right" class="${c.saldo >= 0 ? 'v-pos' : 'v-neg'}">${fmtVal(c.saldo)}</td>
          </tr>`).join('')}</tbody>
          <tfoot><tr>
            <td class="tf-blue" colspan="2">TOTAL GERAL</td>
            <td class="tf-blue v-g" align="right">${fmtVal(resultado.totais.receitas)}</td>
            <td class="tf-blue v-r" align="right">${fmtVal(resultado.totais.despesas)}</td>
            <td class="tf-blue ${resultado.totais.saldo >= 0 ? 'v-pos' : 'v-neg'}" align="right">${fmtVal(resultado.totais.saldo)}</td>
          </tr></tfoot>
        </table>`;
    } else if (resultado.tipo === 'fluxo') {
      title = `Fluxo de Caixa Mensal — ${resultado.ano}`;
      body = `<h2>${title}</h2><p>Gerado em ${now}</p>
        <table class="data">
          <thead><tr>
            <th class="th-blue" align="left">Mês</th>
            <th class="th-blue" align="right">Receitas</th>
            <th class="th-blue" align="right">Despesas</th>
            <th class="th-blue" align="right">Resultado</th>
          </tr></thead>
          <tbody>${resultado.meses.map(m => `<tr>
            <td>${fmtMes(m.mes)}</td>
            <td align="right" class="v-g">${fmtVal(m.receitas)}</td>
            <td align="right" class="v-r">${fmtVal(m.despesas)}</td>
            <td align="right" class="${m.resultado >= 0 ? 'v-pos' : 'v-neg'}">${fmtVal(m.resultado)}</td>
          </tr>`).join('')}</tbody>
          <tfoot><tr>
            <td class="tf-blue">TOTAL ${resultado.ano}</td>
            <td class="tf-blue v-g" align="right">${fmtVal(resultado.totais.receitas)}</td>
            <td class="tf-blue v-r" align="right">${fmtVal(resultado.totais.despesas)}</td>
            <td class="tf-blue ${resultado.totais.resultado >= 0 ? 'v-pos' : 'v-neg'}" align="right">${fmtVal(resultado.totais.resultado)}</td>
          </tr></tfoot>
        </table>`;
    } else if (resultado.tipo === 'extrato') {
      const c = resultado.conta;
      title = `Extrato — ${c.nome}`;
      body = `<h2>${title}</h2>
        <p>${c.banco_nome || ''}${c.conta ? ` | Conta: ${c.conta}${c.conta_digito ? '-' + c.conta_digito : ''}` : ''}</p>
        <p>Gerado em ${now}</p>
        <table class="data">
          <thead><tr>
            <th class="th-green" align="left">Data</th>
            <th class="th-green" align="left">Descrição</th>
            <th class="th-green" align="right">Crédito</th>
            <th class="th-green" align="right">Débito</th>
            <th class="th-green" align="right">Saldo</th>
          </tr></thead>
          <tbody>${resultado.totais.saldo_anterior ? `<tr>
            <td></td><td><b>Saldo anterior</b></td><td></td><td></td>
            <td align="right" class="${resultado.totais.saldo_anterior >= 0 ? 'v-pos' : 'v-neg'}">${fmtVal(resultado.totais.saldo_anterior)}</td>
          </tr>` : ''}${resultado.lancamentos.map(l => `<tr${l.tipo === 'R' ? ' class="row-r"' : ''}>
            <td style="white-space:nowrap">${fmtDate(l.data)}</td>
            <td>${l.descricao}</td>
            <td align="right" class="v-g">${l.tipo === 'R' ? fmtVal(l.valor) : ''}</td>
            <td align="right" class="v-r">${l.tipo === 'D' ? fmtVal(l.valor) : ''}</td>
            <td align="right" class="${l.saldo >= 0 ? 'v-pos' : 'v-neg'}">${fmtVal(l.saldo)}</td>
          </tr>`).join('')}</tbody>
          <tfoot><tr>
            <td class="tf-green" colspan="2">TOTAIS DO PERÍODO</td>
            <td class="tf-green v-g" align="right">${fmtVal(resultado.totais.receitas)}</td>
            <td class="tf-green v-r" align="right">${fmtVal(resultado.totais.despesas)}</td>
            <td class="tf-green ${resultado.totais.saldo >= 0 ? 'v-pos' : 'v-neg'}" align="right">${fmtVal(resultado.totais.saldo)}</td>
          </tr></tfoot>
        </table>`;
    }

    const win = window.open('', '_blank', 'width=940,height=720');
    win.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>${title}</title>
      <style>${PRINT_CSS}</style></head><body><table class="layout">
      <thead><tr><td><div class="sp-top"></div></td></tr></thead>
      <tfoot><tr><td><div class="sp-bottom"></div></td></tr></tfoot>
      <tbody><tr><td class="content">${body}</td></tr></tbody>
      </table></body></html>`);
    win.document.close();
    setTimeout(() => win.print(), 500);
  };

  return (
    <div className="space-y-4">
      {/* Seletor de tipo e filtros */}
      <div className="bg-surface rounded-xl shadow-sm border border-ink-200 p-4 space-y-4">
        <div className="flex flex-wrap gap-2">
          {[
            { key: 'saldo',   label: 'Saldo por Conta' },
            { key: 'fluxo',   label: 'Fluxo Mensal' },
            { key: 'extrato', label: 'Extrato por Conta' },
          ].map(t => (
            <button
              key={t.key}
              onClick={() => { setTipo(t.key); if (t.key !== 'saldo') setResultado(null); else loadSaldo(); }}
              className={`text-sm px-4 py-2 rounded-lg font-medium transition-colors ${tipo === t.key ? 'bg-brand-600 text-white' : 'bg-ink-100 text-ink-600 hover:bg-ink-200'}`}
            >
              {t.label}
            </button>
          ))}
        </div>
        {/* Grupos de contas — atalhos salvos + seleção manual */}
        {tipo === 'saldo' && (
          <div className="space-y-2 pb-1 border-b border-ink-100">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-xs font-medium text-ink-500 mr-1">Grupo:</span>
              <button
                onClick={usarTodas}
                className={`text-xs px-3 py-1.5 rounded-full font-medium transition-colors ${!grupoAtivo && !selecao.length ? 'bg-brand-600 text-white' : 'bg-ink-100 text-ink-600 hover:bg-ink-200'}`}
              >
                Todas as contas
              </button>
              {grupos.map(g => (
                <button
                  key={g.id}
                  onClick={() => usarGrupo(g)}
                  className={`text-xs px-3 py-1.5 rounded-full font-medium transition-colors flex items-center gap-1.5 ${grupoAtivo === g.id ? 'bg-brand-600 text-white' : 'bg-ink-100 text-ink-600 hover:bg-ink-200'}`}
                  title={`${(g.contas_ids || []).length} conta(s)`}
                >
                  <Layers className="h-3 w-3" />
                  {g.nome}
                  {grupoAtivo === g.id && grupoModificado && <span className="opacity-75">(modificado)</span>}
                </button>
              ))}
              {!grupoAtivo && selecao.length > 0 && (
                <span className="text-xs px-3 py-1.5 rounded-full font-medium bg-brand-600 text-white">
                  Seleção manual ({selecao.length})
                </span>
              )}
              <button
                onClick={() => setModalGerenciar(true)}
                className="text-xs px-3 py-1.5 rounded-full font-medium text-ink-500 border border-dashed border-ink-300 hover:text-brand-600 hover:border-info-400 dark:hover:text-info-400 transition-colors flex items-center gap-1.5"
                title="Renomear, editar contas ou excluir grupos"
              >
                <Settings2 className="h-3.5 w-3.5" />
                {grupos.length ? 'Editar grupos' : 'Criar grupo'}
              </button>
            </div>

            {/* Ações de gravação da seleção corrente */}
            {selecao.length > 0 && (grupoModificado || !grupoAtivo) && (
              <div className="flex flex-wrap items-center gap-2">
                {grupoModificado && (
                  <button onClick={atualizarGrupoAtivo} className="text-xs text-brand-600 dark:text-info-400 hover:underline flex items-center gap-1">
                    <Save className="h-3 w-3" /> Atualizar "{grupoObj.nome}" com esta seleção
                  </button>
                )}
                <button onClick={() => setModalNomear(true)} className="text-xs text-brand-600 dark:text-info-400 hover:underline flex items-center gap-1">
                  <Plus className="h-3 w-3" /> Salvar como {grupoModificado ? 'novo ' : ''}grupo
                </button>
              </div>
            )}
          </div>
        )}

        {(tipo === 'saldo' || tipo === 'extrato') && (
          <PeriodoRapido de={filtros.data_de} ate={filtros.data_ate} onChange={(a, b) => aplicarRel({ data_de: a, data_ate: b })} />
        )}

        <div className="flex flex-wrap items-end gap-3">
          {tipo === 'saldo' && (
            <>
              <div>
                <label className="block text-xs font-medium text-ink-600 mb-1">Contas</label>
                <ContasMultiSelect contas={contas} value={selecao} onAplicar={aplicarSelecao} sinalAbrir={sinalAbrir} />
              </div>
              <div>
                <label htmlFor="rel-saldo-de" className="block text-xs font-medium text-ink-600 mb-1">De</label>
                <input id="rel-saldo-de" type="date" value={filtros.data_de} onChange={inpF('data_de')} className="input-field text-sm" />
              </div>
              <div>
                <label htmlFor="rel-saldo-ate" className="block text-xs font-medium text-ink-600 mb-1">Até</label>
                <input id="rel-saldo-ate" type="date" value={filtros.data_ate} onChange={inpF('data_ate')} className="input-field text-sm" />
              </div>
            </>
          )}
          {tipo === 'fluxo' && (
            <>
              <div>
                <label htmlFor="rel-fluxo-ano" className="block text-xs font-medium text-ink-600 mb-1">Ano</label>
                <input id="rel-fluxo-ano" type="number" value={filtros.ano} onChange={inpF('ano')} min="2000" max="2099" className="input-field text-sm" style={{ width: '7rem' }} />
              </div>
              <div style={{ minWidth: '20rem' }}>
                <label htmlFor="rel-fluxo-conta" className="block text-xs font-medium text-ink-600 mb-1">Conta (opcional)</label>
                <ContaSelectInput id="rel-fluxo-conta" value={filtros.conta_id} contas={contas} todasLabel="Todas as contas"
                  onChange={id => setFiltros(p => ({ ...p, conta_id: id }))} />
              </div>
            </>
          )}
          {tipo === 'extrato' && (
            <>
              <div style={{ minWidth: '22rem' }} className="flex-1 max-w-xl">
                <label htmlFor="rel-ext-conta" className="block text-xs font-medium text-ink-600 mb-1">Conta *</label>
                <ContaSelectInput id="rel-ext-conta" value={filtros.conta_id} contas={contas}
                  onChange={id => aplicarRel({ conta_id: id })} />
              </div>
              <div>
                <label htmlFor="rel-ext-de" className="block text-xs font-medium text-ink-600 mb-1">De</label>
                <input id="rel-ext-de" type="date" value={filtros.data_de} onChange={inpF('data_de')} className="input-field text-sm" />
              </div>
              <div>
                <label htmlFor="rel-ext-ate" className="block text-xs font-medium text-ink-600 mb-1">Até</label>
                <input id="rel-ext-ate" type="date" value={filtros.data_ate} onChange={inpF('data_ate')} className="input-field text-sm" />
              </div>
            </>
          )}
          <div className="flex gap-2 ml-auto pt-5 flex-wrap">
            <BotaoLimpar onClick={limparRel} ativo={temFiltroRel} />
            {resultado && (
              <button onClick={imprimir} className="btn-secondary text-sm px-4 py-2 flex items-center gap-1.5">
                <Printer className="h-4 w-4" aria-hidden="true" /> Imprimir / PDF
              </button>
            )}
            <button onClick={gerar} disabled={loading} className="btn-primary text-sm px-4 py-2 flex items-center gap-1.5 disabled:opacity-40">
              <BarChart2 className="h-4 w-4" /> {loading ? 'Carregando...' : tipo === 'saldo' ? 'Atualizar' : 'Gerar Relatório'}
            </button>
          </div>
        </div>
      </div>

      {/* Estado de carregamento inicial */}
      {loading && !resultado && (
        <div className="bg-surface rounded-xl shadow-sm border border-ink-200 flex items-center justify-center py-16 text-ink-400 gap-2">
          <BarChart2 className="h-5 w-5 animate-pulse" />
          <span className="text-sm">Carregando...</span>
        </div>
      )}

      {/* Resultado */}
      {resultado && (
        <div className="bg-surface rounded-xl shadow-sm border border-ink-200 overflow-hidden">
          {resultado.tipo === 'saldo' && (
            <>
              <div className="px-4 py-3 border-b border-ink-100 bg-ink-50">
                <h3 className="text-sm font-semibold text-ink-800">
                  Saldo por Conta Bancária
                  {resultado.filtro?.grupo_nome && <span className="text-brand-600 dark:text-info-400"> — {resultado.filtro.grupo_nome}</span>}
                </h3>
                <p className="text-xs text-ink-500 mt-0.5">
                  {resultado.filtro
                    ? `${resultado.contas.length} conta${resultado.contas.length !== 1 ? 's' : ''} selecionada${resultado.contas.length !== 1 ? 's' : ''}`
                    : 'Todas as contas ativas'}
                  {resultado.filtro?.indisponiveis > 0 && (
                    <span className="text-amber-600 dark:text-amber-400 ml-2 inline-flex items-center gap-1">
                      <AlertTriangle className="h-3 w-3" />
                      {resultado.filtro.indisponiveis} conta{resultado.filtro.indisponiveis > 1 ? 's' : ''} do grupo não está{resultado.filtro.indisponiveis > 1 ? 'ão' : ''} mais disponível{resultado.filtro.indisponiveis > 1 ? 'eis' : ''}
                    </span>
                  )}
                </p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-info-800 text-white">
                    <tr>
                      <th className="text-left px-4 py-3 text-xs font-semibold">Conta</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold">Banco</th>
                      <th className="text-right px-4 py-3 text-xs font-semibold">Receitas</th>
                      <th className="text-right px-4 py-3 text-xs font-semibold">Despesas</th>
                      <th className="text-right px-4 py-3 text-xs font-semibold" title="Receitas − despesas do período filtrado">Resultado</th>
                      <th className="text-right px-4 py-3 text-xs font-semibold border-l border-white/20" title="Saldo da conta hoje">Saldo atual</th>
                      <th className="text-right px-4 py-3 text-xs font-semibold" title="DIDs com esta conta e ainda não pagos">DIDs a pagar</th>
                      <th className="text-right px-4 py-3 text-xs font-semibold" title="Retenções de DIDs pagos ainda não recolhidas">A recolher</th>
                      <th className="text-right px-4 py-3 text-xs font-semibold" title="Saldo atual − DIDs a pagar − a recolher">Disponível</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-ink-100">
                    {resultado.contas.map(c => (
                      <tr key={c.id} className="hover:bg-ink-50">
                        <td className="px-4 py-3 text-xs">
                          <ContaLink conta={c} mostrar="nome" />
                          {c.conta && <div className="font-mono text-[11px] text-ink-500">C/C {c.conta}{c.conta_digito ? `-${c.conta_digito}` : ''}</div>}
                        </td>
                        <td className="px-4 py-3 text-xs text-ink-600">{c.banco_nome || '—'}</td>
                        <td className="px-4 py-3 text-right text-xs font-medium text-success-700 dark:text-success-400 tabular-nums">{fmtVal(c.total_receitas)}</td>
                        <td className="px-4 py-3 text-right text-xs font-medium text-danger-600 dark:text-danger-400 tabular-nums">{fmtVal(c.total_despesas)}</td>
                        <td className={`px-4 py-3 text-right text-xs font-bold tabular-nums ${c.saldo >= 0 ? 'text-success-700 dark:text-success-400' : 'text-danger-600 dark:text-danger-400'}`}>{fmtVal(c.saldo)}</td>
                        <td className="px-4 py-3 text-right text-xs font-medium text-ink-800 tabular-nums border-l border-ink-100">{fmtVal(c.saldo_atual)}</td>
                        <td className="px-4 py-3 text-right text-xs text-amber-700 dark:text-amber-400 tabular-nums">{c.comprometido ? fmtVal(c.comprometido) : '—'}</td>
                        <td className="px-4 py-3 text-right text-xs text-amber-700 dark:text-amber-400 tabular-nums">{c.a_recolher ? fmtVal(c.a_recolher) : '—'}</td>
                        <td className={`px-4 py-3 text-right text-xs font-bold tabular-nums ${c.disponivel >= 0 ? 'text-success-700 dark:text-success-400' : 'text-danger-600 dark:text-danger-400'}`}>{fmtVal(c.disponivel)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-info-50 dark:bg-info-900/20">
                    <tr>
                      <td colSpan={2} className="px-4 py-3 text-xs font-bold text-ink-800">TOTAL GERAL</td>
                      <td className="px-4 py-3 text-right text-xs font-bold text-success-700 dark:text-success-400 tabular-nums">{fmtVal(resultado.totais.receitas)}</td>
                      <td className="px-4 py-3 text-right text-xs font-bold text-danger-600 dark:text-danger-400 tabular-nums">{fmtVal(resultado.totais.despesas)}</td>
                      <td className={`px-4 py-3 text-right text-xs font-bold tabular-nums ${resultado.totais.saldo >= 0 ? 'text-success-700 dark:text-success-400' : 'text-danger-600 dark:text-danger-400'}`}>{fmtVal(resultado.totais.saldo)}</td>
                      <td className="px-4 py-3 text-right text-xs font-bold text-ink-800 tabular-nums border-l border-ink-100">{fmtVal(resultado.totais.saldo_atual)}</td>
                      <td className="px-4 py-3 text-right text-xs font-bold text-amber-700 dark:text-amber-400 tabular-nums">{fmtVal(resultado.totais.comprometido)}</td>
                      <td className="px-4 py-3 text-right text-xs font-bold text-amber-700 dark:text-amber-400 tabular-nums">{fmtVal(resultado.totais.a_recolher)}</td>
                      <td className={`px-4 py-3 text-right text-xs font-bold tabular-nums ${resultado.totais.disponivel >= 0 ? 'text-success-700 dark:text-success-400' : 'text-danger-600 dark:text-danger-400'}`}>{fmtVal(resultado.totais.disponivel)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
              <p className="px-4 py-2 text-[11px] text-ink-500 border-t border-ink-100">
                Resultado considera o período filtrado. Saldo atual, DIDs a pagar, a recolher e disponível são sempre a situação de hoje.
              </p>
            </>
          )}

          {resultado.tipo === 'fluxo' && (
            <>
              <div className="px-4 py-3 border-b border-ink-100 bg-ink-50">
                <h3 className="text-sm font-semibold text-ink-800">Fluxo de Caixa Mensal — {resultado.ano}</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-info-800 text-white">
                    <tr>
                      <th className="text-left px-4 py-3 text-xs font-semibold">Mês</th>
                      <th className="text-right px-4 py-3 text-xs font-semibold">Receitas</th>
                      <th className="text-right px-4 py-3 text-xs font-semibold">Despesas</th>
                      <th className="text-right px-4 py-3 text-xs font-semibold">Resultado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-ink-100">
                    {resultado.meses.map(m => (
                      <tr key={m.mes} className="hover:bg-ink-50">
                        <td className="px-4 py-3 text-xs font-medium text-ink-800">{fmtMes(m.mes)}</td>
                        <td className="px-4 py-3 text-right text-xs font-medium text-success-700 dark:text-success-400 tabular-nums">{fmtVal(m.receitas)}</td>
                        <td className="px-4 py-3 text-right text-xs font-medium text-danger-600 dark:text-danger-400 tabular-nums">{fmtVal(m.despesas)}</td>
                        <td className={`px-4 py-3 text-right text-xs font-bold tabular-nums ${m.resultado >= 0 ? 'text-success-700 dark:text-success-400' : 'text-danger-600 dark:text-danger-400'}`}>{fmtVal(m.resultado)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-info-50 dark:bg-info-900/20">
                    <tr>
                      <td className="px-4 py-3 text-xs font-bold text-ink-800">TOTAL {resultado.ano}</td>
                      <td className="px-4 py-3 text-right text-xs font-bold text-success-700 dark:text-success-400 tabular-nums">{fmtVal(resultado.totais.receitas)}</td>
                      <td className="px-4 py-3 text-right text-xs font-bold text-danger-600 dark:text-danger-400 tabular-nums">{fmtVal(resultado.totais.despesas)}</td>
                      <td className={`px-4 py-3 text-right text-xs font-bold tabular-nums ${resultado.totais.resultado >= 0 ? 'text-success-700 dark:text-success-400' : 'text-danger-600 dark:text-danger-400'}`}>{fmtVal(resultado.totais.resultado)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </>
          )}

          {resultado.tipo === 'extrato' && (
            <>
              <div className="px-4 py-3 border-b border-ink-100 bg-ink-50">
                <h3 className="text-sm font-semibold text-ink-800 flex flex-wrap items-center gap-x-2">
                  Extrato — <ContaLink conta={resultado.conta} rotulo={contaLabel(resultado.conta)} />
                </h3>
                <p className="text-xs text-ink-500">{resultado.conta.banco_nome}</p>
                {resultado.situacao && (
                  <p className="text-xs text-ink-600 mt-1 flex flex-wrap gap-x-4 gap-y-0.5">
                    <span>Saldo atual: <strong className="tabular-nums">{fmtVal(resultado.situacao.saldo)}</strong></span>
                    <span>DIDs a pagar: <strong className="tabular-nums text-amber-700 dark:text-amber-400">{fmtVal(resultado.situacao.comprometido)}</strong></span>
                    <span>Retenções a recolher: <strong className="tabular-nums text-amber-700 dark:text-amber-400">{fmtVal(resultado.situacao.a_recolher)}</strong></span>
                    <span>Disponível: <strong className={`tabular-nums ${resultado.situacao.disponivel >= 0 ? 'text-success-700 dark:text-success-400' : 'text-danger-600'}`}>{fmtVal(resultado.situacao.disponivel)}</strong></span>
                  </p>
                )}
              </div>
              {resultado.lancamentos.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-ink-400 gap-2">
                  <BarChart2 className="h-8 w-8 opacity-40" />
                  <p className="text-sm">Nenhum lançamento no período</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-success-800 text-white">
                      <tr>
                        <th className="text-left px-4 py-3 text-xs font-semibold">Data</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold">Descrição</th>
                        <th className="text-right px-4 py-3 text-xs font-semibold">Crédito</th>
                        <th className="text-right px-4 py-3 text-xs font-semibold">Débito</th>
                        <th className="text-right px-4 py-3 text-xs font-semibold">Saldo</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-ink-100">
                      {resultado.totais.saldo_anterior !== 0 && resultado.totais.saldo_anterior != null && (
                        <tr className="bg-ink-50">
                          <td className="px-4 py-2.5 text-xs text-ink-500" />
                          <td className="px-4 py-2.5 text-xs font-semibold text-ink-700">Saldo anterior</td>
                          <td /><td />
                          <td className={`px-4 py-2.5 text-right text-xs font-bold tabular-nums ${resultado.totais.saldo_anterior >= 0 ? 'text-success-700 dark:text-success-400' : 'text-danger-600 dark:text-danger-400'}`}>{fmtVal(resultado.totais.saldo_anterior)}</td>
                        </tr>
                      )}
                      {resultado.lancamentos.map((l, i) => (
                        <tr key={i} className={l.tipo === 'R' ? 'bg-success-50/60 dark:bg-success-900/10' : 'hover:bg-ink-50'}>
                          <td className="px-4 py-2.5 text-xs text-ink-600 whitespace-nowrap">{fmtDate(l.data)}</td>
                          <td className="px-4 py-2.5 text-xs text-ink-800">
                            {l.descricao}
                            {l.origem === 'did' && l.retencoes > 0 && (
                              <span className="block text-[10px] text-ink-500">
                                Bruto {fmtVal(l.valor_bruto)} · retenções {fmtVal(l.retencoes)} (debitadas quando recolhidas)
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-2.5 text-right text-xs font-medium text-success-700 dark:text-success-400 tabular-nums">{l.tipo === 'R' ? fmtVal(l.valor) : ''}</td>
                          <td className="px-4 py-2.5 text-right text-xs font-medium text-danger-600 dark:text-danger-400 tabular-nums">{l.tipo === 'D' ? fmtVal(l.valor) : ''}</td>
                          <td className={`px-4 py-2.5 text-right text-xs font-bold tabular-nums ${l.saldo >= 0 ? 'text-success-700 dark:text-success-400' : 'text-danger-600 dark:text-danger-400'}`}>{fmtVal(l.saldo)}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-success-50 dark:bg-success-900/20">
                      <tr>
                        <td colSpan={2} className="px-4 py-3 text-xs font-bold text-ink-800">TOTAIS DO PERÍODO</td>
                        <td className="px-4 py-3 text-right text-xs font-bold text-success-700 dark:text-success-400 tabular-nums">{fmtVal(resultado.totais.receitas)}</td>
                        <td className="px-4 py-3 text-right text-xs font-bold text-danger-600 dark:text-danger-400 tabular-nums">{fmtVal(resultado.totais.despesas)}</td>
                        <td className={`px-4 py-3 text-right text-xs font-bold tabular-nums ${resultado.totais.saldo >= 0 ? 'text-success-700 dark:text-success-400' : 'text-danger-600 dark:text-danger-400'}`}>{fmtVal(resultado.totais.saldo)}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {modalNomear && (
        <NomearGrupoModal
          qtdContas={selecao.length}
          onSalvar={salvarNovoGrupo}
          onCancel={() => setModalNomear(false)}
        />
      )}

      {modalGerenciar && (
        <GerenciarGruposModal
          grupos={grupos}
          contas={contas}
          onRenomear={renomearGrupo}
          onExcluir={excluirGrupo}
          onReordenar={reordenarGrupos}
          onEditarContas={(g) => { setModalGerenciar(false); usarGrupo(g); setSinalAbrir(n => n + 1); }}
          onCriarGrupo={() => { setModalGerenciar(false); setSinalAbrir(n => n + 1); }}
          onClose={() => setModalGerenciar(false)}
        />
      )}
    </div>
  );
}
