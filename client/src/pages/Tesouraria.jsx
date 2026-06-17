import { useState, useEffect, useRef, Fragment } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';
import PageHeader from '../components/ui/PageHeader';
import SectionTitle from '../components/ui/SectionTitle';
import FilterBar from '../components/ui/FilterBar';
import {
  Landmark, Plus, Edit2, Trash2, Save, X, TrendingUp, Printer, Search,
} from 'lucide-react';

// ─── Constantes ────────────────────────────────────────────────────────────────
const TABS = [
  { key: 'contas',   label: 'Contas Bancárias', Icon: Landmark },
  { key: 'receitas', label: 'Receitas',          Icon: TrendingUp },
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
  const [activeTab, setActiveTab] = useState(tab || 'contas');
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
    <div className="min-h-screen bg-[#f8fafc] dark:bg-[#020617]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-5">

        <PageHeader
          icon={Landmark}
          iconBg="from-green-500 to-emerald-600"
          title="Tesouraria"
          subtitle="Gestão financeira e controle de pagamentos do município"
        />

        {/* Tabs */}
        <div className="flex gap-1 border-b border-gray-200 dark:border-slate-700/50">
          {TABS.map(({ key, label, Icon }) => (
            <button
              key={key}
              onClick={() => handleTab(key)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px
                ${activeTab === key
                  ? 'border-green-500 text-green-600 dark:text-green-400'
                  : 'border-transparent text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200'
                }`}
            >
              <Icon className="h-4 w-4" />
              {label}
            </button>
          ))}
        </div>

        {/* Conteúdo das abas */}
        {activeTab === 'contas'   && <TabContas secretarias={secretarias} />}
        {activeTab === 'receitas' && <TabReceitas />}
      </div>
    </div>
  );
}

// ─── Combobox de busca de conta bancária ────────────────────────────────────────
function ContaSelectInput({ value, contas, onChange }) {
  const [inputText, setInputText] = useState('');
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  const getLabel = (c) => {
    const num = c.conta ? `${c.conta}${c.conta_digito ? `-${c.conta_digito}` : ''}` : null;
    return num ? `${num} — ${c.nome}` : c.nome;
  };

  useEffect(() => {
    if (!value) { setInputText(''); return; }
    const c = contas.find(c => c.id === value);
    if (c) setInputText(getLabel(c));
  }, [value, contas]);

  useEffect(() => {
    const close = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  const filtered = (() => {
    const q = inputText.toLowerCase();
    const list = q
      ? contas.filter(c =>
          c.nome.toLowerCase().includes(q) ||
          (c.conta || '').includes(q) ||
          (c.banco_nome || '').toLowerCase().includes(q)
        )
      : contas;
    return list.slice(0, 8);
  })();

  const handleChange = (e) => {
    setInputText(e.target.value);
    onChange('');
    setOpen(true);
  };

  const handleSelect = (c) => {
    setInputText(getLabel(c));
    onChange(c.id);
    setOpen(false);
  };

  return (
    <div ref={ref} className="relative">
      <input
        value={inputText}
        onChange={handleChange}
        onFocus={() => setOpen(true)}
        className="input-field text-sm"
        placeholder="Digite para buscar conta..."
        autoComplete="off"
      />
      {open && filtered.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-600 rounded-xl shadow-xl max-h-52 overflow-y-auto">
          {filtered.map(c => (
            <button
              key={c.id}
              type="button"
              onMouseDown={(e) => { e.preventDefault(); handleSelect(c); }}
              className="w-full text-left px-3 py-2.5 hover:bg-gray-50 dark:hover:bg-slate-700/60 transition-colors border-b border-gray-100 dark:border-slate-700/40 last:border-0"
            >
              <div className="text-sm text-gray-800 dark:text-slate-200 font-medium">{getLabel(c)}</div>
              {c.banco_nome && (
                <div className="text-xs text-gray-400 dark:text-slate-500 mt-0.5">{c.banco_nome}</div>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

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
        <div className="absolute z-50 w-full mt-1 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-600 rounded-xl shadow-xl max-h-56 overflow-y-auto">
          {filtered.map(b => (
            <button
              key={b.code}
              type="button"
              onMouseDown={(e) => { e.preventDefault(); onSelect(b); setOpen(false); }}
              className="w-full text-left px-3 py-2 hover:bg-gray-50 dark:hover:bg-slate-700/60 flex items-center gap-2.5 transition-colors"
            >
              <span className="shrink-0 text-xs font-mono bg-gray-100 dark:bg-slate-700 text-gray-500 dark:text-slate-400 px-1.5 py-0.5 rounded min-w-[2.5rem] text-center">{b.code}</span>
              <span className="text-sm text-gray-800 dark:text-slate-200 truncate">{b.name}</span>
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
  const [bancos, setBancos] = useState([]);

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
    if (!window.confirm(`Excluir a conta "${c.nome}"?`)) return;
    await api.delete(`/organizacao/contas-bancarias/${c.id}`);
    load();
  };

  const inp = k => e => setForm(p => ({ ...p, [k]: e.target.value }));
  const chk = k => e => setForm(p => ({ ...p, [k]: e.target.checked }));

  const filtradas = contas.filter(c =>
    !filtroSec || (c.secretaria?.nome || '').toLowerCase().includes(filtroSec.toLowerCase()) ||
    (c.secretaria?.sigla || '').toLowerCase().includes(filtroSec.toLowerCase())
  );

  return (
    <div className="space-y-3">
      <FilterBar>
        <div className="flex-1 min-w-48">
          <label className="block text-xs font-medium text-gray-600 dark:text-slate-400 mb-1">Secretaria</label>
          <input value={filtroSec} onChange={e => setFiltroSec(e.target.value)}
            className="input-field text-sm" placeholder="Filtrar por secretaria..." />
        </div>
      </FilterBar>

      <div className="card overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-200 dark:border-slate-700/50 flex items-center justify-between">
          <SectionTitle icon={Landmark} title="Contas Bancárias Cadastradas" />
          <button onClick={openNew} className="btn-primary flex items-center gap-1.5 text-sm px-3 py-1.5">
            <Plus className="h-4 w-4" /> Nova Conta
          </button>
        </div>
        <div className="overflow-x-auto">
          {loading ? (
            <div className="px-4 py-8 text-center text-sm text-gray-400">Carregando...</div>
          ) : filtradas.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-gray-400">Nenhuma conta cadastrada.</div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-100 dark:bg-slate-700/30 border-b border-gray-200 dark:border-slate-700/50">
                <tr>
                  <th className="text-left px-4 py-2.5 font-semibold text-gray-600 dark:text-slate-300">Nome</th>
                  <th className="text-left px-4 py-2.5 font-semibold text-gray-600 dark:text-slate-300">Secretaria</th>
                  <th className="text-left px-4 py-2.5 font-semibold text-gray-600 dark:text-slate-300">Banco</th>
                  <th className="text-left px-4 py-2.5 font-semibold text-gray-600 dark:text-slate-300">Agência</th>
                  <th className="text-left px-4 py-2.5 font-semibold text-gray-600 dark:text-slate-300">Conta</th>
                  <th className="text-left px-4 py-2.5 font-semibold text-gray-600 dark:text-slate-300 w-28">Tipo</th>
                  <th className="text-left px-4 py-2.5 font-semibold text-gray-600 dark:text-slate-300 w-20">Status</th>
                  <th className="px-4 py-2.5 w-20"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-slate-700/50">
                {filtradas.map(c => (
                  <tr key={c.id} className="hover:bg-gray-50 dark:hover:bg-slate-700/20">
                    <td className="px-4 py-2.5 font-medium text-gray-800 dark:text-slate-200">{c.nome}</td>
                    <td className="px-4 py-2.5">
                      {c.secretaria
                        ? <span className="text-xs bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 px-1.5 py-0.5 rounded font-medium">{c.secretaria.sigla}</span>
                        : <span className="text-gray-400">—</span>}
                    </td>
                    <td className="px-4 py-2.5 text-gray-600 dark:text-slate-300">
                      {c.banco_codigo ? `${c.banco_nome} (${c.banco_codigo})` : c.banco_nome || '—'}
                    </td>
                    <td className="px-4 py-2.5 text-gray-600 dark:text-slate-300">
                      {c.agencia}{c.agencia_digito ? `-${c.agencia_digito}` : ''}
                    </td>
                    <td className="px-4 py-2.5 font-mono text-gray-700 dark:text-slate-300">
                      {c.conta}{c.conta_digito ? `-${c.conta_digito}` : ''}
                    </td>
                    <td className="px-4 py-2.5 text-xs text-gray-500 dark:text-slate-400 capitalize">
                      {TIPOS_CONTA.find(t => t.value === c.tipo)?.label || c.tipo || '—'}
                    </td>
                    <td className="px-4 py-2.5">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${c.ativo
                        ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                        : 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400'}`}>
                        {c.ativo ? 'Ativa' : 'Inativa'}
                      </span>
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-1">
                        <button onClick={() => openEdit(c)} className="p-1 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 rounded transition-colors">
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>
                        <button onClick={() => excluir(c)} className="p-1 text-gray-400 hover:text-red-600 dark:hover:text-red-400 rounded transition-colors">
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
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-slate-700 flex items-center justify-between sticky top-0 bg-white dark:bg-slate-800 z-10">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-green-50 dark:bg-green-900/30 flex items-center justify-center">
                  <Landmark className="w-4 h-4 text-green-600 dark:text-green-400" />
                </div>
                <h3 className="text-base font-semibold text-gray-800 dark:text-slate-200">
                  {editing ? 'Alterar Conta Bancária' : 'Nova Conta Bancária'}
                </h3>
              </div>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-slate-200">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 space-y-5">
              {/* Identificação */}
              <div>
                <p className="text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wide mb-3">Identificação</p>
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="block text-xs font-medium text-gray-600 dark:text-slate-400 mb-1">Nome da Conta *</label>
                    <input value={form.nome} onChange={inp('nome')} className="input-field text-sm" placeholder="Ex: Conta Principal Tesouraria" />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs font-medium text-gray-600 dark:text-slate-400 mb-1">Secretaria Vinculada</label>
                    <select value={form.secretaria_id} onChange={inp('secretaria_id')} className="input-field text-sm">
                      <option value="">— Selecione —</option>
                      {secretarias.map(s => (
                        <option key={s.id} value={s.id}>{s.nome} ({s.sigla})</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 dark:text-slate-400 mb-1">Tipo de Conta</label>
                    <select value={form.tipo} onChange={inp('tipo')} className="input-field text-sm">
                      {TIPOS_CONTA.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 dark:text-slate-400 mb-1">Natureza</label>
                    <select value={form.natureza} onChange={inp('natureza')} className="input-field text-sm">
                      {NATUREZAS_CONTA.map(n => <option key={n.value} value={n.value}>{n.label}</option>)}
                    </select>
                  </div>
                </div>
              </div>

              {/* Dados Bancários */}
              <div>
                <p className="text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wide mb-3">Dados Bancários</p>
                <div className="grid grid-cols-4 gap-3">
                  <div className="col-span-3">
                    <label className="block text-xs font-medium text-gray-600 dark:text-slate-400 mb-1">Nome do Banco</label>
                    <BankSearchInput
                      value={form.banco_nome}
                      onChange={v => setForm(f => ({ ...f, banco_nome: v }))}
                      onSelect={b => setForm(f => ({ ...f, banco_nome: b.name, banco_codigo: b.code }))}
                      bancos={bancos}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 dark:text-slate-400 mb-1">Código COMPE</label>
                    <input value={form.banco_codigo} onChange={inp('banco_codigo')} className="input-field text-sm" placeholder="001" maxLength={10} />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs font-medium text-gray-600 dark:text-slate-400 mb-1">Agência</label>
                    <input value={form.agencia} onChange={inp('agencia')} className="input-field text-sm" placeholder="0000" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 dark:text-slate-400 mb-1">Dígito Ag.</label>
                    <input value={form.agencia_digito} onChange={inp('agencia_digito')} className="input-field text-sm" placeholder="X" maxLength={2} />
                  </div>
                  <div></div>
                  <div className="col-span-2">
                    <label className="block text-xs font-medium text-gray-600 dark:text-slate-400 mb-1">Conta Corrente</label>
                    <input value={form.conta} onChange={inp('conta')} className="input-field text-sm" placeholder="00000-0" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 dark:text-slate-400 mb-1">Dígito C/C</label>
                    <input value={form.conta_digito} onChange={inp('conta_digito')} className="input-field text-sm" placeholder="X" maxLength={2} />
                  </div>
                </div>
              </div>

              {/* Titular */}
              <div>
                <p className="text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wide mb-3">Titular</p>
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="block text-xs font-medium text-gray-600 dark:text-slate-400 mb-1">Nome do Titular / Órgão</label>
                    <input value={form.titular} onChange={inp('titular')} className="input-field text-sm" placeholder="Prefeitura Municipal de..." />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 dark:text-slate-400 mb-1">CNPJ do Titular</label>
                    <input value={form.cnpj_titular} onChange={inp('cnpj_titular')} className="input-field text-sm" placeholder="00.000.000/0000-00" maxLength={18} />
                  </div>
                  <div className="flex items-center gap-2 pt-5">
                    <input type="checkbox" id="ativo_conta" checked={form.ativo} onChange={chk('ativo')} className="w-4 h-4 rounded border-gray-300 text-green-600" />
                    <label htmlFor="ativo_conta" className="text-sm text-gray-700 dark:text-slate-300 cursor-pointer">Conta ativa</label>
                  </div>
                </div>
              </div>

              {/* Observação */}
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-slate-400 mb-1">Observação</label>
                <textarea value={form.observacao} onChange={inp('observacao')} rows={2}
                  className="input-field text-sm resize-none" placeholder="Informações adicionais..." />
              </div>
            </div>

            <div className="px-6 py-4 border-t border-gray-200 dark:border-slate-700 flex justify-end gap-2 sticky bottom-0 bg-white dark:bg-slate-800">
              <button onClick={() => setShowModal(false)} className="btn-secondary text-sm px-4 py-2">Cancelar</button>
              <button onClick={salvar} disabled={saving} className="btn-primary text-sm px-4 py-2 flex items-center gap-1.5 disabled:opacity-40">
                <Save className="h-4 w-4" /> {saving ? 'Salvando...' : 'Salvar Conta'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Tab: Receitas ──────────────────────────────────────────────────────────────
function TabReceitas() {
  const [contas, setContas] = useState([]);
  const [receitas, setReceitas] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ conta_id: '', data: '', descricao: '', valor: '', observacao: '' });
  const [saving, setSaving] = useState(false);
  const [filtros, setFiltros] = useState({ conta_id: '', data_de: '', data_ate: '', busca: '', banco: '', num_conta: '' });

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
    if (!window.confirm(`Excluir "${r.descricao}"?`)) return;
    try {
      await api.delete(`/tesouraria/receitas/${r.id}`);
      load();
    } catch { alert('Erro ao excluir'); }
  };

  const filtrar = () => load(filtros);
  const limparFiltros = () => {
    const f = { conta_id: '', data_de: '', data_ate: '', busca: '', banco: '', num_conta: '' };
    setFiltros(f);
    load(f);
  };

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
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:'Segoe UI',Arial,sans-serif;font-size:12px;color:#1a1a1a;padding:24px}
.hdr{border-bottom:3px solid #16a34a;padding-bottom:12px;margin-bottom:14px;display:flex;justify-content:space-between;align-items:flex-end}
.hdr h1{font-size:20px;font-weight:700;color:#166534;letter-spacing:-.3px}
.hdr .sub{font-size:11px;color:#6b7280;margin-top:3px}
.meta{display:flex;flex-wrap:wrap;gap:16px;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:6px;padding:10px 14px;margin-bottom:16px}
.mi .lbl{font-size:10px;color:#6b7280;text-transform:uppercase;letter-spacing:.4px}
.mi .v{font-size:12px;font-weight:600;color:#15803d;margin-top:2px}
table{width:100%;border-collapse:collapse}
thead tr{background:#166534;color:#fff}
th{padding:8px 10px;font-size:11px;font-weight:600;text-align:left}
th.r{text-align:right}
td{padding:7px 10px;border-bottom:1px solid #e5e7eb;font-size:11.5px;vertical-align:top}
.ghdr td{background:#dcfce7;color:#166534;font-weight:700;font-size:11px;padding:5px 10px;border-bottom:1px solid #86efac}
.desc{max-width:280px;word-break:break-word}
.obs{color:#9ca3af;font-size:10px;font-style:italic;margin-top:2px}
.conta{color:#6b7280;font-size:11px;min-width:140px}
.banco{color:#9ca3af;font-size:10px}
.val{text-align:right;font-weight:700;color:#16a34a;font-variant-numeric:tabular-nums;white-space:nowrap;min-width:120px}
tfoot td{background:#f0fdf4;font-weight:700;font-size:13px;border-top:2px solid #16a34a;padding:10px}
tfoot .val{font-size:15px;color:#15803d}
.foot{margin-top:16px;text-align:right;color:#9ca3af;font-size:9.5px;border-top:1px solid #e5e7eb;padding-top:8px}
@media print{@page{margin:15mm}body{padding:0}}
</style></head><body>
<div class="hdr">
  <div><h1>Extrato de Receitas</h1><div class="sub">Tesouraria Municipal</div></div>
  <div style="font-size:10px;color:#6b7280;text-align:right">
    Gerado em ${now.toLocaleDateString('pt-BR')} às ${now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
  </div>
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
        <div className="flex flex-wrap gap-3 items-end w-full">
          <div className="min-w-[9rem]">
            <label className="block text-xs font-medium text-gray-600 dark:text-slate-400 mb-1">Data de</label>
            <input type="date" value={filtros.data_de} onChange={flt('data_de')} className="input-field text-sm" />
          </div>
          <div className="min-w-[9rem]">
            <label className="block text-xs font-medium text-gray-600 dark:text-slate-400 mb-1">Data até</label>
            <input type="date" value={filtros.data_ate} onChange={flt('data_ate')} className="input-field text-sm" />
          </div>
          <div className="min-w-[12rem]">
            <label className="block text-xs font-medium text-gray-600 dark:text-slate-400 mb-1">Conta</label>
            <select value={filtros.conta_id} onChange={flt('conta_id')} className="input-field text-sm">
              <option value="">Todas as contas</option>
              {contas.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
            </select>
          </div>
          <div className="min-w-[10rem]">
            <label className="block text-xs font-medium text-gray-600 dark:text-slate-400 mb-1">Banco</label>
            <input
              type="text"
              value={filtros.banco}
              onChange={flt('banco')}
              onKeyDown={e => e.key === 'Enter' && filtrar()}
              className="input-field text-sm"
              placeholder="Ex: Banco do Brasil..."
            />
          </div>
          <div className="min-w-[8rem]">
            <label className="block text-xs font-medium text-gray-600 dark:text-slate-400 mb-1">Nº da Conta</label>
            <input
              type="text"
              value={filtros.num_conta}
              onChange={flt('num_conta')}
              onKeyDown={e => e.key === 'Enter' && filtrar()}
              className="input-field text-sm"
              placeholder="Ex: 10537-7"
            />
          </div>
          <div className="flex-1 min-w-[12rem]">
            <label className="block text-xs font-medium text-gray-600 dark:text-slate-400 mb-1">Buscar na descrição</label>
            <input
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
              <Search className="h-4 w-4" /> Filtrar
            </button>
            <button onClick={limparFiltros} className="btn-secondary text-sm px-3 py-2">Limpar</button>
          </div>
        </div>
      </FilterBar>

      {/* Extrato */}
      <div className="card overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-200 dark:border-slate-700/50 flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-3">
            <SectionTitle icon={TrendingUp} title="Lançamentos de Receitas" />
            {!loading && receitas.length > 0 && (
              <span className="text-xs text-gray-500 dark:text-slate-400">
                {receitas.length} lançamento{receitas.length !== 1 ? 's' : ''}
                &nbsp;·&nbsp;
                <span className="font-semibold text-green-600 dark:text-green-400">{fmt(total)}</span>
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
            <button onClick={openNew} className="btn-primary text-sm px-3 py-1.5 flex items-center gap-1.5">
              <Plus className="h-4 w-4" /> Novo Lançamento
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          {loading ? (
            <div className="py-12 text-center text-sm text-gray-400">Carregando...</div>
          ) : receitas.length === 0 ? (
            <div className="py-12 text-center text-sm text-gray-400">Nenhum lançamento encontrado.</div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-slate-700/30 border-b border-gray-200 dark:border-slate-700/50">
                <tr className="text-xs font-semibold text-gray-600 dark:text-slate-300 uppercase tracking-wide">
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
                      <tr className="bg-green-50/60 dark:bg-green-900/10 border-t border-green-200/50 dark:border-green-800/20">
                        <td colSpan={5} className="px-4 py-1.5 text-xs font-semibold text-green-700 dark:text-green-400">
                          {fmtDate(date)}
                          <span className="ml-3 font-normal text-green-600/70 dark:text-green-500/60">
                            {items.length} lançamento{items.length > 1 ? 's' : ''} · {fmt(dayTotal)}
                          </span>
                        </td>
                      </tr>
                      {items.map(r => (
                        <tr key={r.id} className="hover:bg-gray-50 dark:hover:bg-slate-700/30 transition-colors group border-b border-gray-100 dark:border-slate-700/30 last:border-0">
                          <td className="px-4 py-3 text-gray-400 dark:text-slate-500 text-xs tabular-nums">{fmtDate(r.data)}</td>
                          <td className="px-4 py-3">
                            <div className="text-gray-800 dark:text-slate-200 font-medium leading-snug">{r.descricao}</div>
                            {r.observacao && (
                              <div className="text-xs text-gray-400 dark:text-slate-500 mt-0.5 italic">{r.observacao}</div>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <div className="text-xs text-gray-600 dark:text-slate-400">{r.conta?.nome || '—'}</div>
                            {r.conta?.banco_nome && (
                              <div className="text-xs text-gray-400 dark:text-slate-500">{r.conta.banco_nome}</div>
                            )}
                          </td>
                          <td className="px-4 py-3 text-right font-semibold text-green-600 dark:text-green-400 tabular-nums whitespace-nowrap">
                            {fmt(r.valor)}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex gap-0.5 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                              <button
                                onClick={() => openEdit(r)}
                                className="p-1.5 text-gray-400 hover:text-blue-500 dark:hover:text-blue-400 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                              >
                                <Edit2 className="h-3.5 w-3.5" />
                              </button>
                              <button
                                onClick={() => excluir(r)}
                                className="p-1.5 text-gray-400 hover:text-red-500 dark:hover:text-red-400 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
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
                <tr className="bg-green-50 dark:bg-green-900/20 border-t-2 border-green-200 dark:border-green-800/50">
                  <td colSpan={3} className="px-4 py-3 text-sm font-bold text-gray-700 dark:text-slate-200">
                    Total · {receitas.length} lançamento{receitas.length !== 1 ? 's' : ''}
                  </td>
                  <td className="px-4 py-3 text-right text-base font-bold text-green-600 dark:text-green-400 tabular-nums">
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
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-lg">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-slate-700 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-green-50 dark:bg-green-900/30 flex items-center justify-center">
                  <TrendingUp className="w-4 h-4 text-green-600 dark:text-green-400" />
                </div>
                <h3 className="text-base font-semibold text-gray-800 dark:text-slate-200">
                  {editing ? 'Editar Lançamento' : 'Novo Lançamento de Receita'}
                </h3>
              </div>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-slate-200">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-slate-400 mb-1">Conta Bancária *</label>
                <ContaSelectInput
                  value={form.conta_id}
                  contas={contas}
                  onChange={id => setForm(p => ({ ...p, conta_id: id }))}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-slate-400 mb-1">Data *</label>
                  <input type="date" value={form.data} onChange={inp('data')} className="input-field text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-slate-400 mb-1">Valor (R$) *</label>
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
                <label className="block text-xs font-medium text-gray-600 dark:text-slate-400 mb-1">Descrição *</label>
                <input
                  value={form.descricao}
                  onChange={inp('descricao')}
                  className="input-field text-sm"
                  placeholder="Ex: FPM — Parcela Janeiro/2024"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-slate-400 mb-1">Observação</label>
                <textarea
                  value={form.observacao}
                  onChange={inp('observacao')}
                  rows={2}
                  className="input-field text-sm resize-none"
                  placeholder="Informações adicionais..."
                />
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-200 dark:border-slate-700 flex justify-end gap-2">
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
    </div>
  );
}
