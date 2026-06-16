import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';
import PageHeader from '../components/ui/PageHeader';
import SectionTitle from '../components/ui/SectionTitle';
import FilterBar from '../components/ui/FilterBar';
import {
  Landmark, Plus, Edit2, Trash2, Save, X,
} from 'lucide-react';

// ─── Constantes ────────────────────────────────────────────────────────────────
const TABS = [
  { key: 'contas', label: 'Contas Bancárias', Icon: Landmark },
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
  const { tab } = useParams();
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
    navigate(`../tesouraria/${key}`, { relative: 'path' });
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
        {activeTab === 'contas' && <TabContas secretarias={secretarias} />}
      </div>
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

  const load = () => {
    setLoading(true);
    api.get('/organizacao/contas-bancarias')
      .then(({ data }) => setContas(data.contas || []))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

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
                    <input value={form.banco_nome} onChange={inp('banco_nome')} className="input-field text-sm" placeholder="Ex: Banco do Brasil" />
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
