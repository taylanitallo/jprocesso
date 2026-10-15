import { useState, useEffect, lazy, Suspense } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { hasPerm, usePode } from '../utils/permissions';
import { conferirAbasDoModulo } from '../utils/permissoesSchema';
import PageHeader from '../components/ui/PageHeader';
import SectionTitle from '../components/ui/SectionTitle';
import EmptyState from '../components/ui/EmptyState';
import FilterBar from '../components/ui/FilterBar';
import ConfirmModal from '../components/ui/ConfirmModal';
import LoadingBar from '../components/LoadingBar';
import BotaoExcluidos from '../components/lixeira/BotaoExcluidos';
import { Paginacao, usePorPagina } from '../components/ui';

const Usuarios = lazy(() => import('./Usuarios'));
import {
  Plus,
  Building2,
  Network,
  Users,
  Edit2,
  Trash2,
  Briefcase,
  AlertTriangle,
  CheckCircle,
  UserCheck,
  X,
  UserCog,
  Wallet,
  Database,
  Tag,
  Calendar,
  Mail,
  Phone,
  MapPin,
  Shield,
  User,
  Save,
  ChevronRight,
} from 'lucide-react';



// ── SectionCard — card de seção para modais ───────────────────────────────────
function SectionCard({ icon: Icon, title, subtitle, children }) {
  return (
    <div className="rounded-2xl border border-ink-100 bg-surface shadow-sm overflow-hidden">
      <div className="px-5 py-3.5 border-b border-ink-100 bg-gradient-to-r from-ink-50 to-white">
        <div className="flex items-center gap-3">
          {Icon && (
            <div className="w-7 h-7 rounded-xl bg-info-50 dark:bg-info-900/30 flex items-center justify-center">
              <Icon className="w-4 h-4 text-brand-600 dark:text-info-400" />
            </div>
          )}
          <div>
            <p className="text-sm font-semibold text-ink-800">{title}</p>
            {subtitle && <p className="text-xs text-ink-500 mt-0.5">{subtitle}</p>}
          </div>
        </div>
      </div>
      <div className="px-5 py-4">{children}</div>
    </div>
  )
}

// ── ModalShell — shell padrão de modal ────────────────────────────────────────
// cheia: ocupa toda a área disponível da tela (em vez da largura fixa)
function ModalShell({ open, onClose, icon: Icon, iconBg = 'from-info-500 to-info-600', title, subtitle, badge, width = 640, cheia = false, children, footer }) {
  if (!open) return null
  return (
    <div className={`fixed inset-0 z-[9990] flex items-center justify-center bg-black/60 backdrop-blur-sm ${cheia ? 'p-2 sm:p-3' : 'p-4'}`}>
      <div
        className={`bg-ink-50 shadow-2xl w-full flex flex-col overflow-hidden ${cheia ? 'h-full rounded-xl' : 'rounded-3xl'}`}
        style={cheia ? undefined : { maxWidth: '90vw', maxHeight: '90vh', width }}
      >
        {/* Header */}
        <div className="bg-surface border-b border-ink-100 px-4 py-3 shrink-0">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div className={`w-11 h-11 rounded-2xl bg-gradient-to-br ${iconBg} flex items-center justify-center shadow-md`}>
                {Icon && <Icon className="w-5 h-5 text-white" />}
              </div>
              <div>
                <h2 className="text-base font-bold text-ink-900 dark:text-white">{title}</h2>
                {subtitle && <p className="text-xs text-ink-500 mt-0.5">{subtitle}</p>}
              </div>
            </div>
            <div className="flex items-center gap-3">
              {badge}
              <button onClick={onClose}
                className="w-8 h-8 flex items-center justify-center rounded-xl border border-ink-200 text-ink-400 hover:text-ink-600 hover:bg-ink-100 transition-all">
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-6 space-y-4">{children}</div>
        </div>

        {/* Footer */}
        {footer && (
          <div className="bg-surface border-t border-ink-100 px-4 py-3 shrink-0 flex items-center justify-end gap-3">
            {footer}
          </div>
        )}
      </div>
    </div>
  )
}

function PaginationBar({ total, page, setPage, porPagina, setPorPagina }) {
  return (
    <Paginacao total={total} pagina={page} setPagina={setPage} porPagina={porPagina}
      setPorPagina={(n) => { setPorPagina(n); setPage(1); }}
      className="border-t border-ink-100 bg-surface" />
  );
}

// ── Helpers de status de vigência ────────────────────────────────────────────
function getStatusVigencia(dataInicio, dataFim) {
  const hoje = new Date();
  const ini = dataInicio ? new Date(dataInicio + 'T00:00:00') : null;
  const fim = dataFim    ? new Date(dataFim    + 'T23:59:59') : null;
  if (ini && ini > hoje) return 'futuro';
  if (fim && fim < hoje) return 'encerrado';
  return 'ativo';
}

function StatusBadge({ status }) {
  const cfg = {
    ativo:     { label: 'Ativo',     cls: 'bg-success-100 text-success-700 dark:bg-success-900/30 dark:text-success-400' },
    encerrado: { label: 'Encerrado', cls: 'bg-ink-100 text-ink-600' },
    futuro:    { label: 'Futuro',    cls: 'bg-info-100 text-brand-700 dark:bg-info-900/30 dark:text-info-400' },
    ativa:     { label: 'Ativa',     cls: 'bg-success-100 text-success-700 dark:bg-success-900/30 dark:text-success-400' },
    inativa:   { label: 'Inativa',   cls: 'bg-ink-100 text-ink-600' },
  };
  const cf = cfg[status] || { label: status || '—', cls: 'bg-ink-100 text-ink-600' };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${cf.cls}`}>
      {cf.label}
    </span>
  );
}

export default function Secretarias() {
  const { subdomain, tab: tabParam } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  // Ações por aba (editor de permissões › Organização). Só "Ver" = sem botões.
  const pSec  = usePode('organizacao', 'secretarias')
  const pAg   = usePode('organizacao', 'agentes')
  const pResp = usePode('organizacao', 'responsaveis')
  const pEnt  = usePode('organizacao', 'entidade')

  const podeSecretarias = hasPerm(user, 'administracao', 'gerenciar_secretarias')
  const podeUsuarios     = hasPerm(user, 'administracao', 'gerenciar_usuarios')

  // Abas — visíveis conforme Administração (acesso) + Organização (aba a aba)
  const abasOrganizacao = [
    { key: 'entidade',     label: 'Entidade',              Icon: Building2, acesso: podeSecretarias },
    { key: 'secretarias',  label: 'Secretarias e Setores', Icon: Network,   acesso: podeSecretarias },
    { key: 'agentes',      label: 'Cadastro de Agentes',   Icon: Users,     acesso: podeSecretarias },
    { key: 'responsaveis', label: 'Responsáveis',          Icon: UserCheck, acesso: podeSecretarias },
    { key: 'usuarios',     label: 'Usuários',              Icon: UserCog,   acesso: podeUsuarios    },
  ]
  conferirAbasDoModulo('organizacao', abasOrganizacao.map(t => t.key))
  const abasVisiveis = abasOrganizacao.filter(t => t.acesso && hasPerm(user, 'organizacao', t.key, 'ver'))
  const abaPermitida = (key) => abasVisiveis.some(t => t.key === key)

  const [activeTab, setActiveTab] = useState(abaPermitida(tabParam) ? tabParam : (abasVisiveis[0]?.key || 'entidade'))

  useEffect(() => {
    if (!tabParam || tabParam === activeTab) return
    if (abaPermitida(tabParam)) setActiveTab(tabParam)
  }, [tabParam])

  // Secretarias
  const [secretarias, setSecretarias]               = useState([])
  const [loading, setLoading]                       = useState(false)
  const [successMessage, setSuccessMessage]         = useState('')
  const [selectedSecretaria, setSelectedSecretaria] = useState(null)
  const [expandedSecretarias, setExpandedSecretarias] = useState([])
  const [showModalSecretaria, setShowModalSecretaria] = useState(false)
  const [editingSecretaria, setEditingSecretaria]   = useState(null)
  const [formSecretaria, setFormSecretaria]         = useState({
    nome: '', sigla: '', descricao: '',
    data_inicio: '', data_fim: '', email: '', whatsapp: '',
    outros_sistemas: false, cnpj: '', razao_social: '', codigo_unidade: '',
    responsaveis: [], setores: []
  })
  const [showModalSetor, setShowModalSetor]   = useState(false)
  const [editingSetor, setEditingSetor]       = useState(null)
  const [formSetor, setFormSetor]             = useState({ nome: '', descricao: '', secretariaId: null })
  const [deleteTarget, setDeleteTarget]       = useState(null)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [secFiltroDescricao, setSecFiltroDescricao] = useState('')
  const [secFiltroSigla, setSecFiltroSigla]         = useState('')
  const [secFiltroVigor, setSecFiltroVigor]         = useState('')

  // Paginação
  const [secPage, setSecPage]   = useState(1)
  const [secPorPagina, setSecPorPagina]   = usePorPagina('org-secretarias')
  const [agPorPagina, setAgPorPagina]     = usePorPagina('org-agentes')
  const [respPorPagina, setRespPorPagina] = usePorPagina('org-responsaveis')
  const [agPage, setAgPage]     = useState(1)
  const [respPage, setRespPage] = useState(1)

  // Reset páginas quando filtros mudarem
  useEffect(() => { setSecPage(1) }, [secFiltroDescricao, secFiltroSigla, secFiltroVigor])
  useEffect(() => { setAgPage(1) }, [])

  // Setores panel
  const [showSetoresPanel, setShowSetoresPanel]         = useState(false)
  const [selectedSetorInPanel, setSelectedSetorInPanel] = useState(null)

  // Orcamento panel
  const [showOrcamentoPanel, setShowOrcamentoPanel] = useState(false)
  const [orcamentoEditing, setOrcamentoEditing]     = useState(false)
  const [orcamentoOriginal, setOrcamentoOriginal]   = useState(null)
  const [formOrcamento, setFormOrcamento]           = useState({ exercicio: '', valor_loa: '', valor_suplementado: '', valor_reduzido: '' })

  const openOrcamentoPanel = () => {
    const orc = selectedSecretaria?.orcamento || {}
    const form = {
      exercicio:          String(orc.exercicio          || new Date().getFullYear()),
      valor_loa:          String(orc.valor_loa          || ''),
      valor_suplementado: String(orc.valor_suplementado || ''),
      valor_reduzido:     String(orc.valor_reduzido     || ''),
    }
    setFormOrcamento(form)
    setOrcamentoOriginal(form)
    setOrcamentoEditing(false)
    setShowOrcamentoPanel(true)
  }

  const saveOrcamento = async () => {
    try {
      setLoading(true)
      await api.put(`/organizacao/secretarias/${selectedSecretaria.id}`, {
        nome: selectedSecretaria.nome,
        sigla: selectedSecretaria.sigla,
        descricao: selectedSecretaria.descricao,
        ativo: selectedSecretaria.ativo,
        orcamento: formOrcamento
      })
      await fetchSecretarias()
      setOrcamentoEditing(false)
      setOrcamentoOriginal({...formOrcamento})
      setSuccessMessage('Orçamento salvo com sucesso!')
      setTimeout(() => setSuccessMessage(''), 3000)
    } catch { alert('Erro ao salvar orçamento.') }
    finally { setLoading(false) }
  }

  // Agentes
  const [agentes, setAgentes]                   = useState([])
  const [agenteSearch, setAgenteSearch]         = useState('')
  const [agFiltroEmail, setAgFiltroEmail]       = useState('')
  const [agFiltroTelefone, setAgFiltroTelefone] = useState('')
  const [agFiltroNasc, setAgFiltroNasc]         = useState('')
  // Reset paginação dos agentes quando filtro mudar
  useEffect(() => { setAgPage(1) }, [agenteSearch, agFiltroEmail, agFiltroTelefone, agFiltroNasc])
  const [selectedAgente, setSelectedAgente]     = useState(null)
  const [showModalAgente, setShowModalAgente]   = useState(false)
  const [editingAgente, setEditingAgente]       = useState(null)
  const [formAgente, setFormAgente]             = useState({ nome: '', nome_reduzido: '', cpf: '', nascimento: '', telefone: '', email: '', matricula: '' })
  const [deleteAgenteTarget, setDeleteAgenteTarget]       = useState(null)
  const [showDeleteAgenteModal, setShowDeleteAgenteModal] = useState(false)

  // Responsaveis
  const [showModalResp, setShowModalResp] = useState(false)
  const [editingResp, setEditingResp]     = useState(null)
  const [formResp, setFormResp]           = useState({ secretaria_id: '', agente_id: '', nome: '', cargo: '', data_inicio: '', data_fim: '', amparo: '' })
  const [selectedResp, setSelectedResp]   = useState(null)
  const [respFiltroVigor, setRespFiltroVigor]   = useState('')
  const [respFiltroNome, setRespFiltroNome]     = useState('')
  const [respFiltroSec, setRespFiltroSec]       = useState('')
  const [respFiltroCargo, setRespFiltroCargo]   = useState('')
  const [respFiltroEmail, setRespFiltroEmail]   = useState('')
  const [respFiltroTel, setRespFiltroTel]       = useState('')
  const [respFiltroNasc, setRespFiltroNasc]     = useState('')
  // Reset paginação dos responsáveis quando filtros mudarem
  useEffect(() => { setRespPage(1) }, [respFiltroVigor, respFiltroNome, respFiltroSec, respFiltroCargo, respFiltroEmail, respFiltroTel, respFiltroNasc])

  const fetchSecretarias = async () => {
    try {
      const [secRes, agRes] = await Promise.all([
        api.get('/organizacao/secretarias'),
        api.get('/organizacao/agentes').catch(() => ({ data: [] }))
      ])
      const rawSec = secRes.data
      setSecretarias(
        Array.isArray(rawSec)              ? rawSec :
        Array.isArray(rawSec?.secretarias) ? rawSec.secretarias :
        Array.isArray(rawSec?.data)        ? rawSec.data :
        []
      )
      const rawAg = agRes.data
      setAgentes(
        Array.isArray(rawAg)           ? rawAg :
        Array.isArray(rawAg?.agentes)  ? rawAg.agentes :
        Array.isArray(rawAg?.data)     ? rawAg.data :
        []
      )
    } catch (err) {
      console.error('Erro ao carregar organizacao:', err)
    }
  }

  useEffect(() => { fetchSecretarias() }, [])

  // ── Dotações ────────────────────────────────────────────────────────────────
  const [showDotacoesPanel, setShowDotacoesPanel] = useState(false);
  const [dotacoesList, setDotacoesList] = useState([]);
  const [selectedDotacao, setSelectedDotacao] = useState(null);
  const [confirmarExcluirDotacao, setConfirmarExcluirDotacao] = useState(false);
  const [confirmarExcluirResp, setConfirmarExcluirResp] = useState(null);
  const [showFormDotacao, setShowFormDotacao] = useState(false);
  const [editingDotacao, setEditingDotacao] = useState(null);
  const [formDotacao, setFormDotacao] = useState({ codigo: '', descricao: '', elemento_despesa: '', fonte_recurso: '', valor_previsto: '' });

  const openDotacoesPanel = () => {
    setDotacoesList(selectedSecretaria?.dotacoes || []);
    setSelectedDotacao(null);
    setShowFormDotacao(false);
    setEditingDotacao(null);
    setShowDotacoesPanel(true);
  };

  const saveDotacoes = async (lista) => {
    try {
      setLoading(true);
      await api.put(`/organizacao/secretarias/${selectedSecretaria.id}`, {
        nome: selectedSecretaria.nome, sigla: selectedSecretaria.sigla,
        descricao: selectedSecretaria.descricao, ativo: selectedSecretaria.ativo, dotacoes: lista
      });
      await fetchSecretarias();
      setDotacoesList(lista);
      setSuccessMessage('Dotações salvas com sucesso!');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch { alert('Erro ao salvar dotações.'); }
    finally { setLoading(false); }
  };

  const handleSubmitDotacao = (e) => {
    e.preventDefault();
    let nova;
    if (editingDotacao) {
      nova = dotacoesList.map(d => d.id === editingDotacao.id ? { ...d, ...formDotacao } : d);
    } else {
      nova = [...dotacoesList, { ...formDotacao, id: Date.now().toString() }];
    }
    saveDotacoes(nova);
    setShowFormDotacao(false);
    setEditingDotacao(null);
    setSelectedDotacao(null);
  };

  const deleteDotacao = () => {
    if (!selectedDotacao) return;
    const nova = dotacoesList.filter(d => d.id !== selectedDotacao.id);
    saveDotacoes(nova);
    setSelectedDotacao(null);
    setConfirmarExcluirDotacao(false);
  };

  const formatBRL = (v) => {
    const n = parseFloat(String(v).replace(',', '.')) || 0;
    return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  // ── Entidade ──────────────────────────────────────────────────────────────
  const [entidadeLoading, setEntidadeLoading] = useState(false);
  const [entidadeSaved,   setEntidadeSaved]   = useState(false);
  const [entidadeEditing, setEntidadeEditing] = useState(false);
  const [entidadeOriginal, setEntidadeOriginal] = useState(null);
  const [formEntidade, setFormEntidade] = useState({
    nome: '', nome_abreviado: '', cnpj: '', razao_social: '', codigo_unidade: '',
    esfera: '', poder: '', email: '', telefone: '', whatsapp: '',
    cep: '', logradouro: '', numero: '', complemento: '', bairro: '', cidade: '', uf: ''
  });

  useEffect(() => {
    if (activeTab === 'entidade') { setEntidadeEditing(false); fetchEntidade(); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  const fetchEntidade = async () => {
    try {
      const res = await api.get('/organizacao/entidade');
      const e = res.data?.entidade || {};
      const data = {
        nome:           e.nome           || '',
        nome_abreviado: e.nome_abreviado || '',
        cnpj:           e.cnpj           || '',
        razao_social:   e.razao_social   || '',
        codigo_unidade: e.codigo_unidade || '',
        esfera:         e.esfera         || '',
        poder:          e.poder          || '',
        email:          e.email          || '',
        telefone:       e.telefone       || '',
        whatsapp:       e.whatsapp       || '',
        cep:            e.cep            || '',
        logradouro:     e.logradouro     || '',
        numero:         e.numero         || '',
        complemento:    e.complemento    || '',
        bairro:         e.bairro         || '',
        cidade:         e.cidade         || '',
        uf:             e.uf             || '',
      };
      setFormEntidade(data);
      setEntidadeOriginal(data);
    } catch (err) {
      console.error('Erro ao carregar entidade:', err);
    }
  };

  const handleSubmitEntidade = async (e) => {
    e.preventDefault();
    setEntidadeLoading(true);
    try {
      await api.put('/organizacao/entidade', formEntidade);
      setEntidadeOriginal({...formEntidade});
      setEntidadeEditing(false);
      setEntidadeSaved(true);
      setTimeout(() => setEntidadeSaved(false), 3000);
      window.dispatchEvent(new CustomEvent('entidade-updated', { detail: { nome: formEntidade.nome } }));
    } catch (err) {
      console.error('Erro ao salvar entidade:', err);
      alert('Erro ao salvar. Tente novamente.');
    } finally {
      setEntidadeLoading(false);
    }
  };

  const handleCancelEntidade = () => {
    if (entidadeOriginal) setFormEntidade({...entidadeOriginal});
    setEntidadeEditing(false);
  };

  const toggleExpand = (id) => {
    setExpandedSecretarias(prev => 
      prev.includes(id) ? prev.filter(sid => sid !== id) : [...prev, id]
    );
  };

  // Manter selectedSecretaria sincronizada com dados atualizados
  useEffect(() => {
    if (selectedSecretaria) {
      const atualizada = secretarias.find(s => s.id === selectedSecretaria.id);
      if (atualizada) setSelectedSecretaria(atualizada);
    }
  }, [secretarias]);

  const handleCreateSecretaria = () => {
    setEditingSecretaria(null);
    setFormSecretaria({
      nome: '', sigla: '', descricao: '',
      data_inicio: '', data_fim: '', email: '', whatsapp: '',
      outros_sistemas: false, cnpj: '', razao_social: '', codigo_unidade: '',
      responsaveis: [], setores: []
    });
    setShowModalSecretaria(true);
  };

  const handleEditSecretaria = (secretaria) => {
    setEditingSecretaria(secretaria);
    setFormSecretaria({
      nome:             secretaria.nome            || '',
      sigla:            secretaria.sigla           || '',
      descricao:        secretaria.descricao       || '',
      data_inicio:      secretaria.data_inicio     || '',
      data_fim:         secretaria.data_fim        || '',
      email:            secretaria.email           || '',
      whatsapp:         secretaria.whatsapp        || '',
      outros_sistemas:  secretaria.outros_sistemas || false,
      cnpj:             secretaria.cnpj            || '',
      razao_social:     secretaria.razao_social    || '',
      codigo_unidade:   secretaria.codigo_unidade  || '',
      responsaveis:     secretaria.responsaveis    || [],
      setores:          []
    });
    setShowModalSecretaria(true);
  };

  // ── Gestão de responsáveis ────────────────────────────────────────────────
  const addResponsavel = () => {
    setFormSecretaria(p => ({
      ...p,
      responsaveis: [...p.responsaveis, { nome: '', cargo: '', data_inicio: '', data_fim: '' }]
    }));
  };

  const removeResponsavel = (index) => {
    setFormSecretaria(p => ({
      ...p,
      responsaveis: p.responsaveis.filter((_, i) => i !== index)
    }));
  };

  const updateResponsavel = (index, field, value) => {
    setFormSecretaria(p => {
      const arr = [...p.responsaveis];
      arr[index] = { ...arr[index], [field]: value };
      return { ...p, responsaveis: arr };
    });
  };

  const handleDeleteSecretaria = (secretaria) => {
    setDeleteTarget({ type: 'secretaria', data: secretaria });
    setShowDeleteModal(true);
  };

  const handleCreateSetor = (secretariaId) => {

    setEditingSetor(null);
    setFormSetor({
      nome: '',
      descricao: '',
      secretariaId
    });
    setShowModalSetor(true);
  };

  const handleEditSetor = (setor, secretariaId) => {
    setEditingSetor(setor);
    setFormSetor({
      nome: setor.nome,
      descricao: setor.descricao,
      secretariaId
    });
    setShowModalSetor(true);
  };

  const handleDeleteSetor = (setor, secretaria) => {
    setDeleteTarget({ type: 'setor', data: setor, secretaria });
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    try {
      if (deleteTarget.type === 'secretaria') {
        await api.delete(`/organizacao/secretarias/${deleteTarget.data.id}`);
      } else if (deleteTarget.type === 'setor') {
        await api.delete(`/organizacao/setores/${deleteTarget.data.id}`);
      }
      
      await fetchSecretarias(); // Recarregar lista
      setShowDeleteModal(false);
      setDeleteTarget(null);
    } catch (error) {
      console.error('Erro ao excluir:', error);
      alert('Erro ao excluir. Tente novamente.');
    }
  };

  const handleSubmitSecretaria = async (e) => {
    e.preventDefault();
    
    setLoading(true);
    try {
      if (editingSecretaria) {
        // Editar
        await api.put(`/organizacao/secretarias/${editingSecretaria.id}`, formSecretaria);
        setSuccessMessage('Secretaria atualizada com sucesso!');
      } else {
        // Criar secretaria
        const secretariaRes = await api.post('/organizacao/secretarias', {
          nome:            formSecretaria.nome,
          sigla:           formSecretaria.sigla,
          descricao:       formSecretaria.descricao,
          responsaveis:    formSecretaria.responsaveis,
          data_inicio:     formSecretaria.data_inicio    || null,
          data_fim:        formSecretaria.data_fim       || null,
          email:           formSecretaria.email,
          whatsapp:        formSecretaria.whatsapp,
          outros_sistemas: formSecretaria.outros_sistemas,
          cnpj:            formSecretaria.cnpj,
          razao_social:    formSecretaria.razao_social,
          codigo_unidade:  formSecretaria.codigo_unidade,
        });
        
        // Criar setores se houver
        const setoresValidos = formSecretaria.setores.filter(st => st.nome.trim());
        if (setoresValidos.length > 0) {
          await Promise.all(
            setoresValidos.map(setor =>
              api.post('/organizacao/setores', {
                nome: setor.nome,
                descricao: setor.descricao,
                secretaria_id: secretariaRes.data.id
              })
            )
          );
        }
        setSuccessMessage('Secretaria criada com sucesso!');
      }
      
      await fetchSecretarias(); // Recarregar lista
      setShowModalSecretaria(false);
      setEditingSecretaria(null);
      
      // Limpar mensagem após 3 segundos
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (error) {
      console.error('Erro ao salvar secretaria:', error);
      alert('Erro ao salvar. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitSetor = async (e) => {
    e.preventDefault();
    
    setLoading(true);
    try {
      if (editingSetor) {
        // Editar setor
        await api.put(`/organizacao/setores/${editingSetor.id}`, {
          nome: formSetor.nome,
          descricao: formSetor.descricao
        });
        setSuccessMessage('Setor atualizado com sucesso!');
      } else {
        // Criar setor
        await api.post('/organizacao/setores', {
          nome: formSetor.nome,
          descricao: formSetor.descricao,
          secretaria_id: formSetor.secretariaId
        });
        setSuccessMessage('Setor criado com sucesso!');
      }
      
      await fetchSecretarias(); // Recarregar lista
      setShowModalSetor(false);
      setEditingSetor(null);
      
      // Limpar mensagem após 3 segundos
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (error) {
      console.error('Erro ao salvar setor:', error);
      alert('Erro ao salvar. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const addSetorField = () => {
    setFormSecretaria({
      ...formSecretaria,
      setores: [...formSecretaria.setores, { nome: '', descricao: '' }]
    });
  };

  const removeSetorField = (index) => {
    setFormSecretaria({
      ...formSecretaria,
      setores: formSecretaria.setores.filter((_, i) => i !== index)
    });
  };

  const updateSetorField = (index, field, value) => {
    const newSetores = [...formSecretaria.setores];
    newSetores[index][field] = value;
    setFormSecretaria({ ...formSecretaria, setores: newSetores });
  };

  // ── Agentes functions ──────────────────────────────────────────────────────
  const openModalAgente = (agente = null) => {
    setEditingAgente(agente);
    setFormAgente(agente ? { ...agente } : {
      nome: '', nome_reduzido: '', cpf: '', nascimento: '', telefone: '', email: '', matricula: ''
    });
    setShowModalAgente(true);
  };

  const saveAgente = async (e) => {
    e.preventDefault();
    try {
      let atualizado;
      if (editingAgente) {
        const { data } = await api.put(`/organizacao/agentes/${editingAgente.id}`, formAgente);
        atualizado = agentes.map(a => a.id === editingAgente.id ? (data.agente || data) : a);
      } else {
        const { data } = await api.post('/organizacao/agentes', formAgente);
        atualizado = [...agentes, data.agente || data];
      }
      setAgentes(atualizado);
      setShowModalAgente(false);
      setEditingAgente(null);
      setSuccessMessage(editingAgente ? 'Agente atualizado com sucesso!' : 'Agente cadastrado com sucesso!');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch { alert('Erro ao salvar agente.'); }
  };

  const confirmDeleteAgente = async () => {
    try {
      await api.delete(`/organizacao/agentes/${deleteAgenteTarget.id}`);
      setAgentes(prev => prev.filter(a => a.id !== deleteAgenteTarget.id));
      setShowDeleteAgenteModal(false);
      setDeleteAgenteTarget(null);
      setSuccessMessage('Agente removido com sucesso.');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch { alert('Erro ao remover agente.'); }
  };

  // ── Responsáveis functions ─────────────────────────────────────────────────
  // E-mail, telefone e nascimento vêm do cadastro do agente; o nome também, quando o
  // responsável foi salvo sem ele (apareciam linhas com o nome em branco)
  const agentePorId = new Map((agentes || []).map(a => [String(a.id), a]));
  // responsáveis antigos têm só o nome digitado: casa com o agente de mesmo nome
  const chaveNome = (n) => String(n || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase();
  const agentePorNome = new Map((agentes || []).map(a => [chaveNome(a.nome), a]));
  const todosResponsaveis = (Array.isArray(secretarias) ? secretarias : []).flatMap(sec =>
    (sec.responsaveis || []).map((r, i) => {
      const ag = (r.agente_id && agentePorId.get(String(r.agente_id))) || (r.nome ? agentePorNome.get(chaveNome(r.nome)) : null) || null;
      return {
        ...r, nome: r.nome || ag?.nome || '', _secId: sec.id, _secNome: sec.nome, _secSigla: sec.sigla, _idx: i,
        _email: ag?.email || '', _telefone: ag?.telefone || '', _nascimento: ag?.nascimento ? String(ag.nascimento).slice(0, 10) : '',
      };
    })
  );
  const soDigitosResp = (v) => String(v || '').replace(/\D/g, '');
  const filtrarResp = (r) => {
    const vigor = respFiltroVigor ? new Date(respFiltroVigor + 'T12:00:00') : null;
    if (vigor) {
      const ini = r.data_inicio ? new Date(r.data_inicio + 'T00:00:00') : null;
      const fim = r.data_fim    ? new Date(r.data_fim    + 'T23:59:59') : null;
      if (ini && ini > vigor) return false;
      if (fim && fim < vigor)  return false;
    }
    if (respFiltroNome  && !(r.nome || '').toLowerCase().includes(respFiltroNome.toLowerCase())) return false;
    if (respFiltroSec   && !(r._secNome || '').toLowerCase().includes(respFiltroSec.toLowerCase()) && !(r._secSigla || '').toLowerCase().includes(respFiltroSec.toLowerCase())) return false;
    if (respFiltroCargo && !(r.cargo || '').toLowerCase().includes(respFiltroCargo.toLowerCase())) return false;
    if (respFiltroEmail && !r._email.toLowerCase().includes(respFiltroEmail.trim().toLowerCase())) return false;
    if (respFiltroTel   && !soDigitosResp(r._telefone).includes(soDigitosResp(respFiltroTel))) return false;
    if (respFiltroNasc  && r._nascimento !== respFiltroNasc) return false;
    return true;
  };
  const fmtDataResp = (d) => (d ? String(d).slice(0, 10).split('-').reverse().join('/') : '—');

  const openModalResp = (resp = null) => {
    setEditingResp(resp ? { secId: resp._secId, index: resp._idx } : null);
    setFormResp(resp ? {
      secretaria_id: resp._secId,
      agente_id:     resp.agente_id    || '',
      nome:          resp.nome         || '',
      cargo:         resp.cargo        || '',
      data_inicio:   resp.data_inicio  || '',
      data_fim:      resp.data_fim     || '',
      amparo:        resp.amparo       || ''
    } : { secretaria_id: '', agente_id: '', nome: '', cargo: '', data_inicio: '', data_fim: '', amparo: '' });
    setShowModalResp(true);
  };

  const saveResponsavel = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      const sec = secretarias.find(s => s.id === formResp.secretaria_id);
      if (!sec) return;
      const responsaveis = [...(sec.responsaveis || [])];
      const novoResp = { agente_id: formResp.agente_id, nome: formResp.nome, cargo: formResp.cargo, data_inicio: formResp.data_inicio, data_fim: formResp.data_fim, amparo: formResp.amparo };
      if (editingResp) {
        responsaveis[editingResp.index] = novoResp;
      } else {
        responsaveis.push(novoResp);
      }
      await api.put(`/organizacao/secretarias/${sec.id}`, {
        nome: sec.nome, sigla: sec.sigla, descricao: sec.descricao, ativo: sec.ativo, responsaveis
      });
      await fetchSecretarias();
      setShowModalResp(false);
      setEditingResp(null);
      setSuccessMessage('Responsável salvo com sucesso!');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch {
      alert('Erro ao salvar responsável. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const deleteResponsavel = async (resp) => {
    try {
      const sec = secretarias.find(s => s.id === resp._secId);
      if (!sec) return;
      const responsaveis = (sec.responsaveis || []).filter((_, i) => i !== resp._idx);
      await api.put(`/organizacao/secretarias/${sec.id}`, {
        nome: sec.nome, sigla: sec.sigla, descricao: sec.descricao, ativo: sec.ativo, responsaveis
      });
      await fetchSecretarias();
      setConfirmarExcluirResp(null);
      setSuccessMessage('Responsável removido com sucesso.');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch {
      alert('Erro ao remover responsável.');
    }
  };

  // ── Helpers de formatação ─────────────────────────────────────────────────
  const formatCNPJ = (v) => {
    const d = v.replace(/\D/g, '').slice(0, 14);
    if (d.length <= 2) return d;
    if (d.length <= 5) return `${d.slice(0,2)}.${d.slice(2)}`;
    if (d.length <= 8) return `${d.slice(0,2)}.${d.slice(2,5)}.${d.slice(5)}`;
    if (d.length <= 12) return `${d.slice(0,2)}.${d.slice(2,5)}.${d.slice(5,8)}/${d.slice(8)}`;
    return `${d.slice(0,2)}.${d.slice(2,5)}.${d.slice(5,8)}/${d.slice(8,12)}-${d.slice(12)}`;
  };

  const formatCPF = (v) => {
    const d = v.replace(/\D/g, '').slice(0, 11);
    if (d.length <= 3) return d;
    if (d.length <= 6) return `${d.slice(0,3)}.${d.slice(3)}`;
    if (d.length <= 9) return `${d.slice(0,3)}.${d.slice(3,6)}.${d.slice(6)}`;
    return `${d.slice(0,3)}.${d.slice(3,6)}.${d.slice(6,9)}-${d.slice(9)}`;
  };

  const formatTelefone = (v) => {
    const d = v.replace(/\D/g, '').slice(0, 11);
    if (d.length <= 2) return d;
    if (d.length <= 7) return `(${d.slice(0,2)}) ${d.slice(2)}`;
    if (d.length > 10) return `(${d.slice(0,2)}) ${d.slice(2,7)}-${d.slice(7)}`;
    return `(${d.slice(0,2)}) ${d.slice(2,6)}-${d.slice(6)}`;
  };

  const maskCPF = (cpf) => {
    if (!cpf) return '—';
    const d = cpf.replace(/\D/g, '');
    if (d.length < 11) return cpf || '—';
    return `***.${d.slice(3,6)}.${d.slice(6,9)}-**`;
  };

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Mensagem de Sucesso */}
      {successMessage && (
        <div className="p-4 bg-success-50 dark:bg-success-900/30 border border-success-200 dark:border-success-700 rounded-lg flex items-center gap-3">
          <CheckCircle className="h-5 w-5 text-success-600 dark:text-success-400" />
          <p className="text-success-800 dark:text-success-300 font-medium">{successMessage}</p>
        </div>
      )}

      {/* Header */}
      <PageHeader
        icon={Building2}
        title="Gestão de Organização"
        subtitle="Gerencie secretarias, agentes, responsáveis e usuários do município"
      />

      {/* Abas do módulo */}
      <div
        className="border-b border-ink-200 -mt-1 overflow-x-auto overflow-y-hidden scrollbar-none touch-pan-x"
        style={{ WebkitOverflowScrolling: 'touch', touchAction: 'pan-x' }}
      >
        <nav className="flex min-w-max">
          {abasVisiveis.map(tab => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)}
              className={`flex-shrink-0 flex items-center gap-1.5 px-3 sm:px-5 py-2.5 text-xs sm:text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                activeTab === tab.key
                  ? 'border-brand-600 text-brand-600 dark:text-info-400'
                  : 'border-transparent text-ink-500 hover:text-ink-700'
              }`}>
              <tab.Icon className="h-4 w-4" /> {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* ── Tab: Secretarias e Setores ── */}
      {activeTab === 'secretarias' && (
        <div className="space-y-3">
          {/* Campos para pesquisa */}
          <FilterBar>
            <div className="flex-1 min-w-48">
              <label className="block text-xs font-medium text-ink-600 mb-1">Descrição</label>
              <input
                value={secFiltroDescricao}
                onChange={e => setSecFiltroDescricao(e.target.value)}
                className="input-field text-sm"
                placeholder="Buscar por descrição..."
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-ink-600 mb-1">Sigla</label>
              <input
                value={secFiltroSigla}
                onChange={e => setSecFiltroSigla(e.target.value)}
                className="input-field text-sm w-28"
                placeholder="Ex: SMAD"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-ink-600 mb-1">Vigência</label>
              <input
                type="date"
                value={secFiltroVigor}
                onChange={e => setSecFiltroVigor(e.target.value)}
                className="input-field text-sm w-40"
              />
            </div>
          </FilterBar>

          {/* Barra de ações (fora do card, acima da tabela) */}
          <div className="flex items-center justify-end flex-wrap gap-2">
            <div className="mr-auto flex items-center gap-2 flex-wrap">
              <BotaoExcluidos entidade="secretarias" rotulo="Secretarias excluídas" onAlterado={fetchSecretarias} />
              <BotaoExcluidos entidade="setores" rotulo="Setores excluídos" onAlterado={fetchSecretarias} />
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {pSec('criar') && (
                <button
                  onClick={() => { setSelectedSecretaria(null); handleCreateSecretaria(); }}
                  className="btn-primary flex items-center gap-1.5 text-xs px-3 py-1 h-7"
                >
                  <Plus className="h-3.5 w-3.5" /> Incluir
                </button>
              )}
              {pSec('editar') && (
                <button
                  onClick={() => selectedSecretaria && handleEditSecretaria(selectedSecretaria)}
                  disabled={!selectedSecretaria}
                  className="btn-secondary flex items-center gap-1.5 text-xs px-3 py-1 disabled:opacity-40 disabled:cursor-not-allowed h-7"
                >
                  <Edit2 className="h-3.5 w-3.5" /> Alterar
                </button>
              )}
              {pSec('excluir') && (
                <button
                  onClick={() => selectedSecretaria && handleDeleteSecretaria(selectedSecretaria)}
                  disabled={!selectedSecretaria}
                  className="btn-danger flex items-center gap-1.5 text-xs px-3 py-1 disabled:opacity-40 disabled:cursor-not-allowed h-7"
                >
                  <Trash2 className="h-3.5 w-3.5" /> Excluir
                </button>
              )}
              <button
                onClick={() => { if (selectedSecretaria) { setSelectedSetorInPanel(null); setShowSetoresPanel(true); } }}
                disabled={!selectedSecretaria}
                className="btn-secondary flex items-center gap-1.5 text-xs px-3 py-1 disabled:opacity-40 disabled:cursor-not-allowed h-7"
              >
                <Briefcase className="h-3.5 w-3.5" /> Setores
              </button>
              <button
                onClick={() => selectedSecretaria && openOrcamentoPanel()}
                disabled={!selectedSecretaria}
                className="btn-secondary flex items-center gap-1.5 text-xs px-3 py-1 disabled:opacity-40 disabled:cursor-not-allowed h-7"
              >
                <Wallet className="h-3.5 w-3.5" /> Orçamento
              </button>
              <button
                onClick={() => selectedSecretaria && openDotacoesPanel()}
                disabled={!selectedSecretaria}
                className="btn-secondary flex items-center gap-1.5 text-xs px-3 py-1 disabled:opacity-40 disabled:cursor-not-allowed h-7"
              >
                <Database className="h-3.5 w-3.5" /> Dotações
              </button>
            </div>
          </div>

          {/* Tabela de secretarias */}
          <div className="card overflow-hidden">
            <div className="px-4 py-2 border-b border-ink-200">
              <SectionTitle icon={Building2} title="Tabela de secretarias" />
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-ink-100 border-b border-ink-200">
                  <tr>
                    <th className="text-left px-4 py-2.5 font-semibold text-ink-600 w-8"></th>
                    <th className="text-left px-4 py-2.5 font-semibold text-ink-600">Descrição</th>
                    <th className="text-left px-4 py-2.5 font-semibold text-ink-600 w-24">Sigla</th>
                    <th className="text-left px-4 py-2.5 font-semibold text-ink-600 w-28">Status</th>
                    <th className="text-left px-4 py-2.5 font-semibold text-ink-600 w-28">Início</th>
                    <th className="text-left px-4 py-2.5 font-semibold text-ink-600 w-28">Fim</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ink-100">
                  {(() => {
                    const filtradas = secretarias.filter(sec => {
                      if (secFiltroDescricao && !(sec.nome || "").toLowerCase().includes(secFiltroDescricao.toLowerCase())) return false;
                      if (secFiltroSigla && !(sec.sigla||'').toLowerCase().includes(secFiltroSigla.toLowerCase())) return false;
                      if (secFiltroVigor) {
                        const vigor = new Date(secFiltroVigor + 'T12:00:00');
                        const ini = sec.data_inicio ? new Date(sec.data_inicio + 'T00:00:00') : null;
                        const fim = sec.data_fim    ? new Date(sec.data_fim    + 'T23:59:59') : null;
                        if (ini && ini > vigor) return false;
                        if (fim && fim < vigor)  return false;
                      }
                      return true;
                    });
                    const pageItems = filtradas.slice((secPage - 1) * secPorPagina, secPage * secPorPagina);

                    if (filtradas.length === 0) {
                      return (
                        <tr>
                          <td colSpan={6}>
                            <EmptyState
                              icon={Building2}
                              title={secretarias.length === 0 ? 'Nenhuma secretaria cadastrada' : 'Nenhum resultado para o filtro'}
                            />
                          </td>
                        </tr>
                      );
                    }

                    return pageItems.map(sec => {
                      const isSelected = selectedSecretaria?.id === sec.id;
                      return (
                        <tr
                          key={sec.id}
                          onClick={() => { setSelectedSecretaria(isSelected ? null : sec); setSelectedSetorInPanel(null); }}
                          onDoubleClick={() => { if (pSec('editar')) { handleEditSecretaria(sec) } }}
                          className={`cursor-pointer transition-colors select-none ${
                            isSelected
                              ? 'bg-brand-600 text-white'
                              : 'hover:bg-info-50 dark:hover:bg-info-900/10'
                          }`}
                        >
                          <td className="px-4 py-2.5 text-center">
                            {isSelected && <span className="text-white text-xs">▶</span>}
                          </td>
                          <td className={`px-4 py-2.5 font-medium ${isSelected ? 'text-white' : 'text-ink-900'}`}>
                            {sec.nome}
                          </td>
                          <td className="px-4 py-2.5">
                            {sec.sigla
                              ? <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-mono font-semibold ${isSelected ? 'bg-info-500/40 text-info-100' : 'bg-info-100 text-brand-700 dark:bg-info-900/30 dark:text-info-300'}`}>{sec.sigla}</span>
                              : <span className={isSelected ? 'text-info-200 text-xs' : 'text-ink-400 text-xs'}>—</span>}
                          </td>
                          <td className="px-4 py-2.5">
                            {isSelected
                              ? <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-info-500/30 text-info-100">{sec.ativo !== false ? 'Ativa' : 'Inativa'}</span>
                              : <StatusBadge status={sec.ativo !== false ? 'ativa' : 'inativa'} />}
                          </td>
                          <td className={`px-4 py-2.5 text-xs ${isSelected ? 'text-info-100' : 'text-ink-500'}`}>
                            {sec.data_inicio ? new Date(sec.data_inicio + 'T00:00:00').toLocaleDateString('pt-BR') : '—'}
                          </td>
                          <td className={`px-4 py-2.5 text-xs ${isSelected ? 'text-info-100' : 'text-ink-500'}`}>
                            {sec.data_fim ? new Date(sec.data_fim + 'T00:00:00').toLocaleDateString('pt-BR') : '—'}
                          </td>
                        </tr>
                      );
                    });
                  })()}
                </tbody>
              </table>
            </div>

            {/* Paginação */}
            <PaginationBar
              total={secretarias.filter(sec => {
                if (secFiltroDescricao && !(sec.nome || "").toLowerCase().includes(secFiltroDescricao.toLowerCase())) return false;
                if (secFiltroSigla && !(sec.sigla||'').toLowerCase().includes(secFiltroSigla.toLowerCase())) return false;
                if (secFiltroVigor) {
                  const vigor = new Date(secFiltroVigor + 'T12:00:00');
                  const ini = sec.data_inicio ? new Date(sec.data_inicio + 'T00:00:00') : null;
                  const fim = sec.data_fim    ? new Date(sec.data_fim    + 'T23:59:59') : null;
                  if (ini && ini > vigor) return false;
                  if (fim && fim < vigor)  return false;
                }
                return true;
              }).length}
              page={secPage}
              setPage={setSecPage}
              porPagina={secPorPagina}
              setPorPagina={setSecPorPagina}
            />
          </div>
        </div>
      )}

      {/* ── Tab: Cadastro de Agentes ── */}
      {activeTab === 'agentes' && (() => {
        const soDigitos = (v) => String(v || '').replace(/\D/g, '');
        const agentesFiltrados = agentes.filter(a => {
          const busca = agenteSearch.trim().toLowerCase();
          if (busca && !(a.nome || '').toLowerCase().includes(busca)
            && !(soDigitos(busca) && soDigitos(a.cpf).includes(soDigitos(busca)))) return false;
          if (agFiltroEmail && !(a.email || '').toLowerCase().includes(agFiltroEmail.trim().toLowerCase())) return false;
          if (agFiltroTelefone && !soDigitos(a.telefone).includes(soDigitos(agFiltroTelefone))) return false;
          if (agFiltroNasc && a.nascimento !== agFiltroNasc) return false;
          return true;
        });
        const pageAg = agentesFiltrados.slice((agPage - 1) * agPorPagina, agPage * agPorPagina);
        const fmtNasc = (d) => (d ? String(d).slice(0, 10).split('-').reverse().join('/') : '—');
        const filtrosAtivos = [agenteSearch, agFiltroEmail, agFiltroTelefone, agFiltroNasc].filter(Boolean).length;
        return (
        <div className="space-y-3">
          {/* Opções de filtro */}
          <FilterBar>
            <div className="flex-1 min-w-48">
              <label className="block text-xs font-medium text-ink-600 mb-1">Nome / CPF</label>
              <input value={agenteSearch} onChange={e => setAgenteSearch(e.target.value)}
                className="input-field text-sm" placeholder="Buscar por nome ou CPF..." />
            </div>
            <div className="w-56">
              <label className="block text-xs font-medium text-ink-600 mb-1">E-mail</label>
              <input value={agFiltroEmail} onChange={e => setAgFiltroEmail(e.target.value)}
                className="input-field text-sm" placeholder="email@..." />
            </div>
            <div className="w-44">
              <label className="block text-xs font-medium text-ink-600 mb-1">Telefone</label>
              <input value={agFiltroTelefone} onChange={e => setAgFiltroTelefone(e.target.value)}
                className="input-field text-sm" placeholder="(00) 00000-0000" />
            </div>
            <div className="w-44">
              <label className="block text-xs font-medium text-ink-600 mb-1">Nascimento</label>
              <input type="date" value={agFiltroNasc} onChange={e => setAgFiltroNasc(e.target.value)}
                className="input-field text-sm" />
            </div>
            {filtrosAtivos > 0 && (
              <button type="button"
                onClick={() => { setAgenteSearch(''); setAgFiltroEmail(''); setAgFiltroTelefone(''); setAgFiltroNasc(''); }}
                className="self-end btn-secondary text-xs px-3 py-1.5">
                Limpar filtros ({filtrosAtivos})
              </button>
            )}
          </FilterBar>

          {/* Barra de ações (fora do card, acima da tabela) */}
          <div className="flex items-center justify-end flex-wrap gap-2">
            <div className="mr-auto">
              <BotaoExcluidos entidade="agentes" rotulo="Agentes excluídos" onAlterado={fetchSecretarias} />
            </div>
            {pAg('criar') && (
              <button
                onClick={() => { setSelectedAgente(null); openModalAgente(); }}
                className="btn-primary flex items-center gap-1.5 text-xs px-3 py-1 h-7"
              >
                <Plus className="h-3.5 w-3.5" /> Incluir
              </button>
            )}
            {pAg('editar') && (
              <button
                onClick={() => selectedAgente && openModalAgente(selectedAgente)}
                disabled={!selectedAgente}
                className="btn-secondary flex items-center gap-1.5 text-xs px-3 py-1 disabled:opacity-40 disabled:cursor-not-allowed h-7"
              >
                <Edit2 className="h-3.5 w-3.5" /> Alterar
              </button>
            )}
            {pAg('excluir') && (
              <button
                onClick={() => {
                  if (selectedAgente) {
                    setDeleteAgenteTarget(selectedAgente);
                    setShowDeleteAgenteModal(true);
                  }
                }}
                disabled={!selectedAgente}
                className="btn-danger flex items-center gap-1.5 text-xs px-3 py-1 disabled:opacity-40 disabled:cursor-not-allowed h-7"
              >
                <Trash2 className="h-3.5 w-3.5" /> Excluir
              </button>
            )}
          </div>

          {/* Tabela de agentes */}
          <div className="card overflow-hidden">
            <div className="px-4 py-2 border-b border-ink-200">
              <SectionTitle icon={UserCog} title="Tabela de agentes" />
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-ink-100 border-b border-ink-200">
                  <tr>
                    <th className="text-left px-4 py-2.5 font-semibold text-ink-600 w-8"></th>
                    <th className="text-left px-4 py-2.5 font-semibold text-ink-600">Nome</th>
                    <th className="text-left px-4 py-2.5 font-semibold text-ink-600 w-40">CPF</th>
                    <th className="text-left px-4 py-2.5 font-semibold text-ink-600">E-mail</th>
                    <th className="text-left px-4 py-2.5 font-semibold text-ink-600 w-40">Telefone</th>
                    <th className="text-left px-4 py-2.5 font-semibold text-ink-600 w-32">Nascimento</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ink-100">
                  {agentesFiltrados.length === 0 ? (
                    <tr>
                      <td colSpan={6}>
                        <EmptyState
                          icon={UserCog}
                          title={agentes.length === 0 ? 'Nenhum agente cadastrado' : 'Nenhum resultado para o filtro'}
                        />
                      </td>
                    </tr>
                  ) : pageAg.map(agente => {
                    const isSelected = selectedAgente?.id === agente.id;
                    const sub = isSelected ? 'text-info-100' : 'text-ink-600';
                    return (
                      <tr
                        key={agente.id}
                        onClick={() => setSelectedAgente(isSelected ? null : agente)}
                        onDoubleClick={() => { if (pAg('editar')) { openModalAgente(agente) } }}
                        className={`cursor-pointer transition-colors select-none ${
                          isSelected
                            ? 'bg-brand-600 text-white'
                            : 'hover:bg-info-50 dark:hover:bg-info-900/10'
                        }`}
                      >
                        <td className="px-4 py-2.5 text-center">
                          {isSelected && <span className="text-white text-xs">▶</span>}
                        </td>
                        <td className={`px-4 py-2.5 font-medium ${isSelected ? 'text-white' : 'text-ink-900'}`}>
                          {agente.nome}
                        </td>
                        <td className={`px-4 py-2.5 font-mono text-xs ${isSelected ? 'text-info-100' : 'text-ink-500'}`}>
                          {maskCPF(agente.cpf)}
                        </td>
                        <td className={`px-4 py-2.5 text-xs ${sub}`}>{agente.email || '—'}</td>
                        <td className={`px-4 py-2.5 text-xs ${sub}`}>{agente.telefone || '—'}</td>
                        <td className={`px-4 py-2.5 text-xs ${sub}`}>{fmtNasc(agente.nascimento)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Paginação */}
            <PaginationBar
              total={agentesFiltrados.length}
              page={agPage}
              setPage={setAgPage}
              porPagina={agPorPagina}
              setPorPagina={setAgPorPagina}
            />
          </div>
        </div>
        );
      })()}

      {/* ── Tab: Responsáveis ── */}
      {activeTab === 'responsaveis' && (
        <div className="space-y-3">
          {/* Campos para pesquisa */}
          <FilterBar>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3 items-end flex-1">
              <div>
                <label className="block text-xs font-medium text-ink-600 mb-1">Nome</label>
                <input
                  value={respFiltroNome}
                  onChange={e => setRespFiltroNome(e.target.value)}
                  className="input-field text-sm"
                  placeholder="Buscar por nome..."
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-ink-600 mb-1">Secretaria</label>
                <input
                  value={respFiltroSec}
                  onChange={e => setRespFiltroSec(e.target.value)}
                  className="input-field text-sm"
                  placeholder="Secretaria..."
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-ink-600 mb-1">Cargo / Função</label>
                <input
                  value={respFiltroCargo}
                  onChange={e => setRespFiltroCargo(e.target.value)}
                  className="input-field text-sm"
                  placeholder="Filtrar cargo..."
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-ink-600 mb-1">E-mail</label>
                <input value={respFiltroEmail} onChange={e => setRespFiltroEmail(e.target.value)}
                  className="input-field text-sm" placeholder="email@..." />
              </div>
              <div>
                <label className="block text-xs font-medium text-ink-600 mb-1">Telefone</label>
                <input value={respFiltroTel} onChange={e => setRespFiltroTel(e.target.value)}
                  className="input-field text-sm" placeholder="(00) 00000-0000" />
              </div>
              <div>
                <label className="block text-xs font-medium text-ink-600 mb-1">Nascimento</label>
                <input type="date" value={respFiltroNasc} onChange={e => setRespFiltroNasc(e.target.value)}
                  className="input-field text-sm" />
              </div>
              <div>
                <label className="block text-xs font-medium text-ink-600 mb-1">Vigência</label>
                <input
                  type="date"
                  value={respFiltroVigor}
                  onChange={e => setRespFiltroVigor(e.target.value)}
                  className="input-field text-sm"
                />
              </div>
            </div>
          </FilterBar>

          {/* Barra de ações (fora do card, acima da tabela) */}
          <div className="flex items-center justify-end flex-wrap gap-2">
            <div className="flex items-center gap-2">
              {pResp('criar') && (
                <button
                  onClick={() => { setSelectedResp(null); openModalResp(); }}
                  className="btn-primary flex items-center gap-1.5 text-xs px-3 py-1 h-7"
                >
                  <Plus className="h-3.5 w-3.5" /> Incluir
                </button>
              )}
              {pResp('editar') && (
                <button
                  onClick={() => selectedResp && openModalResp(selectedResp)}
                  disabled={!selectedResp}
                  className="btn-secondary flex items-center gap-1.5 text-xs px-3 py-1 disabled:opacity-40 disabled:cursor-not-allowed h-7"
                >
                  <Edit2 className="h-3.5 w-3.5" /> Alterar
                </button>
              )}
              {pResp('excluir') && (
                <button
                  onClick={() => selectedResp && setConfirmarExcluirResp(selectedResp)}
                  disabled={!selectedResp}
                  className="btn-danger flex items-center gap-1.5 text-xs px-3 py-1 disabled:opacity-40 disabled:cursor-not-allowed h-7"
                >
                  <Trash2 className="h-3.5 w-3.5" /> Excluir
                </button>
              )}
            </div>
          </div>

          {/* Tabela de Responsável */}
          <div className="card overflow-hidden">
            <div className="px-4 py-2 border-b border-ink-200">
              <SectionTitle icon={UserCheck} title="Tabela de Responsável" />
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-ink-100 border-b border-ink-200">
                  <tr>
                    <th className="text-left px-4 py-2.5 font-semibold text-ink-600 w-8"></th>
                    <th className="text-left px-4 py-2.5 font-semibold text-ink-600">Nome</th>
                    <th className="text-left px-4 py-2.5 font-semibold text-ink-600">Cargo / Função</th>
                    <th className="text-left px-4 py-2.5 font-semibold text-ink-600">Secretaria</th>
                    <th className="text-left px-4 py-2.5 font-semibold text-ink-600">E-mail</th>
                    <th className="text-left px-4 py-2.5 font-semibold text-ink-600 w-36">Telefone</th>
                    <th className="text-left px-4 py-2.5 font-semibold text-ink-600 w-28">Nascimento</th>
                    <th className="text-left px-4 py-2.5 font-semibold text-ink-600 w-24">Início</th>
                    <th className="text-left px-4 py-2.5 font-semibold text-ink-600 w-24">Fim</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ink-100">
                  {(() => {
                    const filtrados = todosResponsaveis.filter(filtrarResp);

                    const pageResp = filtrados.slice((respPage - 1) * respPorPagina, respPage * respPorPagina);

                    if (filtrados.length === 0) {
                      return (
                        <tr>
                          <td colSpan={9}>
                            <EmptyState
                              icon={UserCheck}
                              title={todosResponsaveis.length === 0 ? 'Nenhum responsável cadastrado' : 'Nenhum resultado para o filtro'}
                            />
                          </td>
                        </tr>
                      );
                    }

                    return pageResp.map(resp => {
                      const isSelected = selectedResp && selectedResp._secId === resp._secId && selectedResp._idx === resp._idx;
                      return (
                        <tr
                          key={`${resp._secId}-${resp._idx}`}
                          onClick={() => setSelectedResp(isSelected ? null : resp)}
                          onDoubleClick={() => { if (pResp('editar')) { openModalResp(resp) } }}
                          className={`cursor-pointer transition-colors select-none ${
                            isSelected
                              ? 'bg-brand-600 text-white'
                              : 'hover:bg-info-50 dark:hover:bg-info-900/10'
                          }`}
                        >
                          <td className="px-4 py-2.5 text-center">
                            {isSelected && <span className="text-white text-xs">▶</span>}
                          </td>
                          <td className={`px-4 py-2.5 font-medium ${isSelected ? 'text-white' : 'text-ink-900'}`}>
                            {resp.nome}
                          </td>
                          <td className={`px-4 py-2.5 ${isSelected ? 'text-info-100' : 'text-ink-600'}`}>
                            {resp.cargo || '—'}
                          </td>
                          <td className={`px-4 py-2.5 ${isSelected ? 'text-info-100' : 'text-ink-600'}`}>
                            {resp._secNome}
                          </td>
                          <td className={`px-4 py-2.5 text-xs ${isSelected ? 'text-info-100' : 'text-ink-600'}`}>{resp._email || '—'}</td>
                          <td className={`px-4 py-2.5 text-xs ${isSelected ? 'text-info-100' : 'text-ink-600'}`}>{resp._telefone || '—'}</td>
                          <td className={`px-4 py-2.5 text-xs ${isSelected ? 'text-info-100' : 'text-ink-600'}`}>{fmtDataResp(resp._nascimento)}</td>
                          <td className={`px-4 py-2.5 text-xs ${isSelected ? 'text-info-100' : 'text-ink-500'}`}>
                            {resp.data_inicio
                              ? new Date(resp.data_inicio + 'T00:00:00').toLocaleDateString('pt-BR')
                              : '—'}
                          </td>
                          <td className={`px-4 py-2.5 text-xs ${isSelected ? 'text-info-100' : 'text-ink-500'}`}>
                            {resp.data_fim
                              ? new Date(resp.data_fim + 'T00:00:00').toLocaleDateString('pt-BR')
                              : '—'}
                          </td>
                        </tr>
                      );
                    });
                  })()}
                </tbody>
              </table>
            </div>

            {/* Paginação */}
            <PaginationBar
              total={todosResponsaveis.filter(filtrarResp).length}
              page={respPage}
              setPage={setRespPage}
              porPagina={respPorPagina}
              setPorPagina={setRespPorPagina}
            />
          </div>
        </div>
      )}

      {/* ── Tab: Entidade ── */}
      {activeTab === 'entidade' && (
        <div className="space-y-3">
          <form onSubmit={handleSubmitEntidade} className="space-y-3">

            {/* ── Informações da entidade ── */}
            <div className="card overflow-hidden">
              <div className="px-6 py-3 bg-ink-50 border-b border-ink-200">
                <SectionTitle icon={Building2} title="Informações da entidade" />
              </div>
              <div className="p-6 space-y-4">

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-4 items-start sm:items-center">
                  <label className="text-sm font-medium text-ink-700 sm:text-right">Nome completo</label>
                  <div className="col-span-2">
                    <input type="text" value={formEntidade.nome}
                      onChange={e => setFormEntidade(p => ({...p, nome: e.target.value}))}
                      disabled={!entidadeEditing}
                      className="input-field disabled:bg-ink-50 disabled:text-ink-600" placeholder="Nome completo da entidade" />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-4 items-start sm:items-center">
                  <label className="text-sm font-medium text-ink-700 sm:text-right">Nome abreviado</label>
                  <div className="col-span-2">
                    <input type="text" value={formEntidade.nome_abreviado}
                      onChange={e => setFormEntidade(p => ({...p, nome_abreviado: e.target.value}))}
                      disabled={!entidadeEditing}
                      className="input-field w-72 disabled:bg-ink-50 disabled:text-ink-600" placeholder="Ex: PMMUNICIPIO" />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-4 items-start sm:items-center">
                  <label className="text-sm font-medium text-ink-700 sm:text-right">CNPJ</label>
                  <div className="col-span-2">
                    <input type="text" value={formEntidade.cnpj}
                      onChange={e => setFormEntidade(p => ({...p, cnpj: formatCNPJ(e.target.value)}))}
                      disabled={!entidadeEditing}
                      maxLength={18} className="input-field w-52 font-mono disabled:bg-ink-50 disabled:text-ink-600" placeholder="00.000.000/0000-00" />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-4 items-start sm:items-center">
                  <label className="text-sm font-medium text-ink-700 sm:text-right">Razão social</label>
                  <div className="col-span-2">
                    <input type="text" value={formEntidade.razao_social}
                      onChange={e => setFormEntidade(p => ({...p, razao_social: e.target.value}))}
                      disabled={!entidadeEditing}
                      className="input-field disabled:bg-ink-50 disabled:text-ink-600" />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-4 items-start sm:items-center">
                  <label className="text-sm font-medium text-ink-700 sm:text-right">Código unidade</label>
                  <div className="col-span-2">
                    <input type="text" value={formEntidade.codigo_unidade}
                      onChange={e => setFormEntidade(p => ({...p, codigo_unidade: e.target.value}))}
                      disabled={!entidadeEditing}
                      className="input-field w-44 disabled:bg-ink-50 disabled:text-ink-600" />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-4 items-start sm:items-center">
                  <label className="text-sm font-medium text-ink-700 sm:text-right">Esfera</label>
                  <div className="col-span-2">
                    <select value={formEntidade.esfera}
                      onChange={e => setFormEntidade(p => ({...p, esfera: e.target.value}))}
                      disabled={!entidadeEditing}
                      className="input-field w-56 disabled:bg-ink-50 disabled:text-ink-600">
                      <option value="">Selecione...</option>
                      <option value="Municipal">Municipal</option>
                      <option value="Estadual">Estadual</option>
                      <option value="Federal">Federal</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-4 items-start sm:items-center">
                  <label className="text-sm font-medium text-ink-700 sm:text-right">Poder</label>
                  <div className="col-span-2">
                    <select value={formEntidade.poder}
                      onChange={e => setFormEntidade(p => ({...p, poder: e.target.value}))}
                      disabled={!entidadeEditing}
                      className="input-field w-56 disabled:bg-ink-50 disabled:text-ink-600">
                      <option value="">Selecione...</option>
                      <option value="Executivo">Executivo</option>
                      <option value="Legislativo">Legislativo</option>
                      <option value="Judiciário">Judiciário</option>
                      <option value="Ministério Público">Ministério Público</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-4 items-start sm:items-center">
                  <label className="text-sm font-medium text-ink-700 sm:text-right">E-mail</label>
                  <div className="col-span-2">
                    <input type="email" value={formEntidade.email}
                      onChange={e => setFormEntidade(p => ({...p, email: e.target.value}))}
                      disabled={!entidadeEditing}
                      className="input-field disabled:bg-ink-50 disabled:text-ink-600" placeholder="email@municipio.gov.br" />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-4 items-start sm:items-center">
                  <label className="text-sm font-medium text-ink-700 sm:text-right">Telefone</label>
                  <div className="col-span-2">
                    <input type="text" value={formEntidade.telefone}
                      onChange={e => setFormEntidade(p => ({...p, telefone: formatTelefone(e.target.value)}))}
                      disabled={!entidadeEditing}
                      maxLength={15} className="input-field w-44 disabled:bg-ink-50 disabled:text-ink-600" placeholder="(00) 00000-0000" />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-4 items-start sm:items-center">
                  <label className="text-sm font-medium text-ink-700 sm:text-right">Whatsapp notificação</label>
                  <div className="col-span-2">
                    <input type="text" value={formEntidade.whatsapp}
                      onChange={e => setFormEntidade(p => ({...p, whatsapp: formatTelefone(e.target.value)}))}
                      disabled={!entidadeEditing}
                      maxLength={15} className="input-field w-44 disabled:bg-ink-50 disabled:text-ink-600" placeholder="(00) 00000-0000" />
                  </div>
                </div>

              </div>
            </div>

            {/* ── Endereço ── */}
            <div className="card overflow-hidden">
              <div className="px-6 py-3 bg-ink-50 border-b border-ink-200">
                <SectionTitle icon={Building2} title="Endereço" />
              </div>
              <div className="p-6 space-y-4">

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-4 items-start sm:items-center">
                  <label className="text-sm font-medium text-ink-700 sm:text-right">CEP</label>
                  <div className="col-span-2">
                    <input type="text" value={formEntidade.cep}
                      onChange={e => {
                        const v = e.target.value.replace(/\D/g,'').slice(0,8);
                        const f = v.length > 5 ? v.slice(0,5)+'-'+v.slice(5) : v;
                        setFormEntidade(p => ({...p, cep: f}));
                      }}
                      disabled={!entidadeEditing}
                      maxLength={9} className="input-field w-32 font-mono disabled:bg-ink-50 disabled:text-ink-600" placeholder="00000-000" />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-4 items-start sm:items-center">
                  <label className="text-sm font-medium text-ink-700 sm:text-right">Logradouro</label>
                  <div className="col-span-2">
                    <input type="text" value={formEntidade.logradouro}
                      onChange={e => setFormEntidade(p => ({...p, logradouro: e.target.value}))}
                      disabled={!entidadeEditing}
                      className="input-field disabled:bg-ink-50 disabled:text-ink-600" placeholder="Rua, Avenida, Praça..." />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-4 items-start sm:items-center">
                  <label className="text-sm font-medium text-ink-700 sm:text-right">Número</label>
                  <div className="col-span-2">
                    <input type="text" value={formEntidade.numero}
                      onChange={e => setFormEntidade(p => ({...p, numero: e.target.value}))}
                      disabled={!entidadeEditing}
                      className="input-field w-32 disabled:bg-ink-50 disabled:text-ink-600" />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-4 items-start sm:items-center">
                  <label className="text-sm font-medium text-ink-700 sm:text-right">Complemento</label>
                  <div className="col-span-2">
                    <input type="text" value={formEntidade.complemento}
                      onChange={e => setFormEntidade(p => ({...p, complemento: e.target.value}))}
                      disabled={!entidadeEditing}
                      className="input-field disabled:bg-ink-50 disabled:text-ink-600" placeholder="Sala, Bloco, Andar..." />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-4 items-start sm:items-center">
                  <label className="text-sm font-medium text-ink-700 sm:text-right">Bairro</label>
                  <div className="col-span-2">
                    <input type="text" value={formEntidade.bairro}
                      onChange={e => setFormEntidade(p => ({...p, bairro: e.target.value}))}
                      disabled={!entidadeEditing}
                      className="input-field disabled:bg-ink-50 disabled:text-ink-600" />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-4 items-start sm:items-center">
                  <label className="text-sm font-medium text-ink-700 sm:text-right">Cidade</label>
                  <div className="col-span-2">
                    <input type="text" value={formEntidade.cidade}
                      onChange={e => setFormEntidade(p => ({...p, cidade: e.target.value}))}
                      disabled={!entidadeEditing}
                      className="input-field disabled:bg-ink-50 disabled:text-ink-600" />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-4 items-start sm:items-center">
                  <label className="text-sm font-medium text-ink-700 sm:text-right">UF</label>
                  <div className="col-span-2">
                    <select value={formEntidade.uf}
                      onChange={e => setFormEntidade(p => ({...p, uf: e.target.value}))}
                      disabled={!entidadeEditing}
                      className="input-field w-24 disabled:bg-ink-50 disabled:text-ink-600">
                      <option value="">--</option>
                      {['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'].map(u => (
                        <option key={u} value={u}>{u}</option>
                      ))}
                    </select>
                  </div>
                </div>

              </div>
            </div>

            {/* Botões */}
            <div className="flex items-center justify-end gap-3">
              {entidadeSaved && (
                <span className="text-sm text-success-600 dark:text-success-400 font-medium flex items-center gap-1">
                  <CheckCircle className="h-4 w-4" /> Salvo com sucesso!
                </span>
              )}
              {!entidadeEditing ? (
                pEnt('editar') && (
                  <button
                    type="button"
                    onClick={() => setEntidadeEditing(true)}
                    className="btn-primary flex items-center gap-1.5 text-sm px-4 py-2"
                  >
                    <Edit2 className="h-4 w-4" /> Alterar
                  </button>
                )
              ) : (
                <>
                  <button
                    type="button"
                    onClick={handleCancelEntidade}
                    className="btn-secondary flex items-center gap-1.5 text-sm px-4 py-2"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={entidadeLoading}
                    className="btn-primary flex items-center gap-1.5 text-sm px-4 py-2"
                  >
                    {entidadeLoading ? 'Salvando...' : 'Salvar'}
                  </button>
                </>
              )}
            </div>

          </form>
        </div>
      )}

      {/* ── Tab: Usuários ── */}
      {activeTab === 'usuarios' && podeUsuarios && (
        <Suspense fallback={<LoadingBar label="Carregando usuários..." />}>
          <Usuarios />
        </Suspense>
      )}

      {/* Modal Importar do Portal de Irauçuba */}

      {/* ── Modal Criar/Editar Secretaria ── */}
      <ModalShell
        open={showModalSecretaria}
        onClose={() => { setShowModalSecretaria(false); setEditingSecretaria(null); }}
        icon={Building2}
        iconBg="from-info-500 to-info-600"
        title={`Secretaria — ${editingSecretaria ? 'Alteração' : 'Inclusão'}`}
        subtitle="Cadastre e gerencie os dados da secretaria municipal."
        width={700}
        badge={
          editingSecretaria ? (
            <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${
              editingSecretaria.ativo !== false
                ? 'bg-success-100 text-success-700 dark:bg-success-900/30 dark:text-success-400'
                : 'bg-ink-100 text-ink-600'
            }`}>
              {editingSecretaria.ativo !== false ? 'ATIVA' : 'INATIVA'}
            </span>
          ) : null
        }
        footer={
          <>
            <button
              type="button"
              onClick={() => { setShowModalSecretaria(false); setEditingSecretaria(null); }}
              className="btn-secondary px-5 py-2 text-sm"
            >
              Cancelar
            </button>
            <button
              type="button"
              disabled={loading}
              onClick={() => document.getElementById('form-secretaria').requestSubmit()}
              className="btn-primary flex items-center gap-2 px-5 py-2 text-sm"
            >
              <Save className="w-4 h-4" />
              {loading ? 'Salvando...' : 'Salvar Secretaria'}
            </button>
          </>
        }
      >
        <form id="form-secretaria" onSubmit={handleSubmitSecretaria}>
          {/* Card: Informações principais */}
          <SectionCard icon={Tag} title="Informações principais" subtitle="Descrição, sigla e código da secretaria">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-ink-500 uppercase mb-1.5">Descrição *</label>
                <input
                  type="text"
                  value={formSecretaria.nome}
                  onChange={e => setFormSecretaria(p => ({...p, nome: e.target.value}))}
                  required
                  autoFocus
                  className="input-field"
                  placeholder="Nome completo da secretaria"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-ink-500 uppercase mb-1.5">Sigla / Abreviação</label>
                <input
                  type="text"
                  value={formSecretaria.sigla}
                  onChange={e => setFormSecretaria(p => ({...p, sigla: e.target.value.toUpperCase()}))}
                  maxLength={10}
                  className="input-field"
                  placeholder="Ex: SEMAD"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-ink-500 uppercase mb-1.5">Código de unidade</label>
                <input
                  type="text"
                  value={formSecretaria.codigo_unidade}
                  onChange={e => setFormSecretaria(p => ({...p, codigo_unidade: e.target.value}))}
                  className="input-field"
                  placeholder="Ex: 02.001"
                />
              </div>
            </div>
            <div className="mt-3 flex items-start gap-2">
              <input
                type="checkbox"
                id="outros_sistemas"
                checked={formSecretaria.outros_sistemas}
                onChange={e => setFormSecretaria(p => ({...p, outros_sistemas: e.target.checked}))}
                className="w-4 h-4 mt-0.5 rounded-sm border-ink-300 text-brand-600 cursor-pointer"
              />
              <label htmlFor="outros_sistemas" className="text-sm text-ink-600 cursor-pointer select-none">
                Secretaria de outros sistemas — não mostrar na lista de secretarias
              </label>
            </div>
          </SectionCard>

          {/* Card: Vigência */}
          <SectionCard icon={Calendar} title="Vigência" subtitle="Período de atuação da secretaria">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-ink-500 uppercase mb-1.5">Data início</label>
                <input
                  type="date"
                  value={formSecretaria.data_inicio}
                  onChange={e => setFormSecretaria(p => ({...p, data_inicio: e.target.value}))}
                  className="input-field"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-ink-500 uppercase mb-1.5">Data fim <span className="normal-case font-normal text-ink-400">(vazio = vigente)</span></label>
                <input
                  type="date"
                  value={formSecretaria.data_fim}
                  onChange={e => setFormSecretaria(p => ({...p, data_fim: e.target.value}))}
                  className="input-field"
                />
              </div>
            </div>
          </SectionCard>

          {/* Card: Contato */}
          <SectionCard icon={Mail} title="Contato" subtitle="E-mail e WhatsApp para notificações">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-ink-500 uppercase mb-1.5">E-mail</label>
                <input
                  type="email"
                  value={formSecretaria.email}
                  onChange={e => setFormSecretaria(p => ({...p, email: e.target.value}))}
                  className="input-field"
                  placeholder="email@municipio.gov.br"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-ink-500 uppercase mb-1.5">WhatsApp notificação</label>
                <input
                  type="text"
                  value={formSecretaria.whatsapp}
                  onChange={e => setFormSecretaria(p => ({...p, whatsapp: formatTelefone(e.target.value)}))}
                  maxLength={15}
                  className="input-field"
                  placeholder="(00) 00000-0000"
                />
              </div>
            </div>
          </SectionCard>

          {/* Card: Integrações PNCP */}
          <SectionCard icon={Shield} title="Integrações PNCP" subtitle="Dados para integração com o Portal Nacional de Compras Públicas">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-ink-500 uppercase mb-1.5">CNPJ</label>
                <input
                  type="text"
                  value={formSecretaria.cnpj}
                  onChange={e => setFormSecretaria(p => ({...p, cnpj: formatCNPJ(e.target.value)}))}
                  maxLength={18}
                  className="input-field font-mono"
                  placeholder="00.000.000/0000-00"
                />
              </div>
              <div className="md:col-span-2 md:max-w-none">
                <label className="block text-xs font-semibold text-ink-500 uppercase mb-1.5">Razão social</label>
                <input
                  type="text"
                  value={formSecretaria.razao_social}
                  onChange={e => setFormSecretaria(p => ({...p, razao_social: e.target.value}))}
                  className="input-field"
                />
              </div>
            </div>
          </SectionCard>
        </form>
      </ModalShell>
      {/* ── Modal Criar/Editar Setor ── */}
      <ModalShell
        open={showModalSetor}
        onClose={() => { setShowModalSetor(false); setEditingSetor(null); }}
        icon={Network}
        iconBg="from-violet-500 to-violet-600"
        title={`Setor — ${editingSetor ? 'Alteração' : 'Inclusão'}`}
        subtitle="Defina os setores internos da secretaria selecionada."
        width={520}
        footer={
          <>
            <button type="button" onClick={() => { setShowModalSetor(false); setEditingSetor(null); }} className="btn-secondary px-5 py-2 text-sm">Cancelar</button>
            <button type="button" disabled={loading} onClick={() => document.getElementById('form-setor').requestSubmit()} className="btn-primary flex items-center gap-2 px-5 py-2 text-sm">
              <Save className="w-4 h-4" />
              {loading ? 'Salvando...' : (editingSetor ? 'Salvar Setor' : 'Criar Setor')}
            </button>
          </>
        }
      >
        <form id="form-setor" onSubmit={handleSubmitSetor}>
          <SectionCard icon={Network} title="Dados do setor">
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-ink-500 uppercase mb-1.5">Nome do Setor *</label>
                <input type="text" value={formSetor.nome} onChange={(e) => setFormSetor({ ...formSetor, nome: e.target.value })} required autoFocus className="input-field" placeholder="Ex: Protocolo Geral" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-ink-500 uppercase mb-1.5">Descrição</label>
                <textarea
                  value={formSetor.descricao}
                  onChange={(e) => setFormSetor({ ...formSetor, descricao: e.target.value })}
                  rows="3"
                  className="input-field resize-none"
                  placeholder="Breve descrição do setor"
                />
              </div>
            </div>
          </SectionCard>
        </form>
      </ModalShell>

      {/* Modal de Confirmação de Exclusão */}
      {showDeleteModal && deleteTarget && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-surface rounded-xl max-w-md w-full shadow-xl">
            <div className="px-4 py-3 border-b border-ink-200">
              <div className="flex items-center gap-3">
                <div className="shrink-0 w-10 h-10 bg-danger-100 dark:bg-danger-900/30 rounded-full flex items-center justify-center">
                  <AlertTriangle className="h-6 w-6 text-danger-600 dark:text-danger-400" />
                </div>
                <h2 className="text-xl font-semibold text-ink-900">
                  Confirmar Exclusão
                </h2>
              </div>
            </div>

            <div className="p-6">
              <p className="text-ink-700 mb-4">
                {deleteTarget.type === 'secretaria' ? (
                  <>
                    Tem certeza que deseja excluir a secretaria <strong>{deleteTarget.data.nome}</strong>?
                    {deleteTarget.data.setores?.length > 0 && (
                      <span className="block mt-2 text-danger-600 text-sm">
                        Os {deleteTarget.data.setores.length} setores vinculados deixam de aparecer junto com ela.
                      </span>
                    )}
                  </>
                ) : (
                  <>
                    Tem certeza que deseja excluir o setor <strong>{deleteTarget.data.nome}</strong>?
                  </>
                )}
              </p>
              <p className="text-sm text-ink-600">
                Vai para os Excluídos, de onde pode ser restaurado.
              </p>
            </div>

            <div className="px-4 py-3 bg-ink-50 border-t border-ink-200 flex justify-end space-x-3">
              <button onClick={() => { setShowDeleteModal(false); setDeleteTarget(null); }} className="btn-secondary">Cancelar</button>
              <button onClick={confirmDelete} className="btn-danger flex items-center gap-2">
                <Trash2 className="h-4 w-4" />
                Confirmar Exclusão
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Painel de Setores ── */}
      {showSetoresPanel && selectedSecretaria && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-surface rounded-xl max-w-2xl w-full shadow-xl flex flex-col max-h-[80vh]">
            {/* Header */}
            <div className="px-4 py-3 border-b border-ink-200 flex items-center justify-between shrink-0">
              <div>
                <h2 className="text-lg font-semibold text-ink-900">
                  Setores — {selectedSecretaria.nome}
                  {selectedSecretaria.sigla && <span className="text-ink-400 font-normal text-base ml-1">({selectedSecretaria.sigla})</span>}
                </h2>
              </div>
              <button onClick={() => { setShowSetoresPanel(false); setSelectedSetorInPanel(null); }}
                className="p-1.5 text-ink-400 hover:text-ink-600 rounded-lg">
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Tabela */}
            {/* Barra de ações (acima da tabela) */}
            <div className="px-4 py-2 border-b border-ink-200 bg-ink-50 flex items-center justify-between shrink-0">
              <span className="text-xs text-ink-500">
                {(selectedSecretaria.setores || []).length} setor(es)
              </span>
              <div className="flex items-center gap-2">
                {pSec('criar') && (
                  <button
                    onClick={() => handleCreateSetor(selectedSecretaria.id)}
                    className="btn-primary flex items-center gap-1.5 text-xs px-3 py-1 h-7"
                  >
                    <Plus className="h-3.5 w-3.5" /> Incluir
                  </button>
                )}
                {pSec('editar') && (
                  <button
                    onClick={() => selectedSetorInPanel && handleEditSetor(selectedSetorInPanel, selectedSecretaria.id)}
                    disabled={!selectedSetorInPanel}
                    className="btn-secondary flex items-center gap-1.5 text-xs px-3 py-1 disabled:opacity-40 disabled:cursor-not-allowed h-7"
                  >
                    <Edit2 className="h-3.5 w-3.5" /> Alterar
                  </button>
                )}
                {pSec('excluir') && (
                  <button
                    onClick={() => selectedSetorInPanel && handleDeleteSetor(selectedSetorInPanel, selectedSecretaria)}
                    disabled={!selectedSetorInPanel}
                    className="btn-danger flex items-center gap-1.5 text-xs px-3 py-1 disabled:opacity-40 disabled:cursor-not-allowed h-7"
                  >
                    <Trash2 className="h-3.5 w-3.5" /> Excluir
                  </button>
                )}
              </div>
            </div>

            <div className="overflow-y-auto flex-1">
              <table className="w-full text-sm">
                <thead className="bg-ink-100 border-b border-ink-200">
                  <tr>
                    <th className="w-8 px-4 py-2.5"></th>
                    <th className="text-left px-4 py-2.5 font-semibold text-ink-600">Descrição</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ink-100">
                  {(selectedSecretaria.setores || []).length === 0 ? (
                    <tr>
                      <td colSpan={2} className="text-center py-10 text-ink-400">
                        <Briefcase className="h-8 w-8 mx-auto mb-2 opacity-40" />
                        <p className="text-sm">Nenhum setor cadastrado para esta secretaria</p>
                        <p className="text-xs mt-1 text-ink-400">Clique em "Incluir" para adicionar</p>
                      </td>
                    </tr>
                  ) : (
                    (selectedSecretaria.setores || []).map(setor => {
                      const isSel = selectedSetorInPanel?.id === setor.id;
                      return (
                        <tr
                          key={setor.id}
                          onClick={() => setSelectedSetorInPanel(isSel ? null : setor)}
                          onDoubleClick={() => { if (pSec('editar')) { handleEditSetor(setor, selectedSecretaria.id) } }}
                          className={`cursor-pointer transition-colors select-none ${
                            isSel ? 'bg-brand-600 text-white' : 'hover:bg-info-50 dark:hover:bg-info-900/10'
                          }`}
                        >
                          <td className="px-4 py-2.5 text-center">
                            {isSel && <span className="text-white text-xs">▶</span>}
                          </td>
                          <td className={`px-4 py-2.5 font-medium ${isSel ? 'text-white' : 'text-ink-900'}`}>
                            {setor.nome}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal Novo/Editar Agente ── */}
      <ModalShell
        open={showModalAgente}
        onClose={() => { setShowModalAgente(false); setEditingAgente(null); }}
        icon={UserCog}
        iconBg="from-emerald-500 to-emerald-600"
        title={`Agente — ${editingAgente ? 'Alteração' : 'Inclusão'}`}
        subtitle="Cadastre os servidores que atuam como agentes públicos."
        width={580}
        footer={
          <>
            <button type="button" onClick={() => { setShowModalAgente(false); setEditingAgente(null); }} className="btn-secondary px-5 py-2 text-sm">Cancelar</button>
            <button type="button" disabled={loading} onClick={() => document.getElementById('form-agente').requestSubmit()} className="btn-primary flex items-center gap-2 px-5 py-2 text-sm">
              <Save className="w-4 h-4" />
              {loading ? 'Salvando...' : 'Salvar Agente'}
            </button>
          </>
        }
      >
        <form id="form-agente" onSubmit={saveAgente}>
          <SectionCard icon={User} title="Dados pessoais" subtitle="Nome, CPF e data de nascimento">
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-ink-500 uppercase mb-1.5">Nome *</label>
                <input type="text" value={formAgente.nome} onChange={e => setFormAgente(p => ({...p, nome: e.target.value}))} required autoFocus className="input-field" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-ink-500 uppercase mb-1.5">Nome reduzido</label>
                <input type="text" value={formAgente.nome_reduzido || ''} onChange={e => setFormAgente(p => ({...p, nome_reduzido: e.target.value}))} className="input-field" placeholder="Como é chamado usualmente" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-ink-500 uppercase mb-1.5">CPF</label>
                  <input type="text" value={formAgente.cpf || ''} onChange={e => setFormAgente(p => ({...p, cpf: formatCPF(e.target.value)}))} maxLength={14} className="input-field font-mono" placeholder="000.000.000-00" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-ink-500 uppercase mb-1.5">Nascimento</label>
                  <input type="date" value={formAgente.nascimento || ''} onChange={e => setFormAgente(p => ({...p, nascimento: e.target.value}))} className="input-field" />
                </div>
              </div>
            </div>
          </SectionCard>
          <SectionCard icon={Phone} title="Contato e identificação" subtitle="Telefone, e-mail e matrícula">
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-ink-500 uppercase mb-1.5">Telefone</label>
                  <input type="text" value={formAgente.telefone || ''} onChange={e => setFormAgente(p => ({...p, telefone: formatTelefone(e.target.value)}))} maxLength={15} className="input-field" placeholder="(00) 00000-0000" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-ink-500 uppercase mb-1.5">Matrícula</label>
                  <input type="text" value={formAgente.matricula || ''} onChange={e => setFormAgente(p => ({...p, matricula: e.target.value}))} className="input-field font-mono" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-ink-500 uppercase mb-1.5">E-mail</label>
                <input type="email" value={formAgente.email || ''} onChange={e => setFormAgente(p => ({...p, email: e.target.value}))} className="input-field" placeholder="email@exemplo.com.br" />
              </div>
            </div>
          </SectionCard>
        </form>
      </ModalShell>

      {/* ── Confirmação exclusão Agente ── */}
      {showDeleteAgenteModal && deleteAgenteTarget && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-surface rounded-xl max-w-md w-full shadow-xl">
            <div className="px-4 py-3 border-b border-ink-200 flex items-center gap-3">
              <div className="w-10 h-10 bg-danger-100 dark:bg-danger-900/30 rounded-full flex items-center justify-center shrink-0">
                <AlertTriangle className="h-5 w-5 text-danger-600" />
              </div>
              <h2 className="text-lg font-semibold text-ink-900">Confirmar Exclusão</h2>
            </div>
            <div className="p-6">
              <p className="text-ink-700">
                Excluir o agente <strong>{deleteAgenteTarget.nome}</strong>? Ele vai para os Agentes excluídos, de onde pode ser restaurado.
              </p>
            </div>
            <div className="px-4 py-3 bg-ink-50 border-t border-ink-200 flex justify-end gap-3">
              <button onClick={() => { setShowDeleteAgenteModal(false); setDeleteAgenteTarget(null); }}
                className="btn-secondary">Cancelar</button>
              <button onClick={confirmDeleteAgente} className="btn-danger flex items-center gap-2">
                <Trash2 className="h-4 w-4" /> Excluir
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal Novo/Editar Responsável ── */}
      <ModalShell
        open={showModalResp}
        onClose={() => { setShowModalResp(false); setEditingResp(null); }}
        icon={UserCheck}
        iconBg="from-amber-500 to-amber-600"
        title={`Responsável — ${editingResp ? 'Alteração' : 'Inclusão'}`}
        subtitle="Defina os responsáveis de cada secretaria e suas funções."
        cheia
        footer={
          <>
            <button type="button" onClick={() => { setShowModalResp(false); setEditingResp(null); }} className="btn-secondary px-5 py-2 text-sm">Cancelar</button>
            <button type="button" disabled={loading} onClick={() => document.getElementById('form-resp').requestSubmit()} className="btn-primary flex items-center gap-2 px-5 py-2 text-sm">
              <Save className="w-4 h-4" />
              {loading ? 'Salvando...' : 'Salvar Responsável'}
            </button>
          </>
        }
      >
        <form id="form-resp" onSubmit={saveResponsavel}>
          <SectionCard icon={Users} title="Vínculo" subtitle="Agente e secretaria vinculados">
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-ink-500 uppercase mb-1.5">Agente</label>
                <select
                  value={formResp.agente_id}
                  onChange={e => {
                    const ag = agentes.find(a => a.id === e.target.value);
                    setFormResp(p => ({ ...p, agente_id: e.target.value, nome: ag ? ag.nome : p.nome }));
                  }}
                  className="input-field"
                >
                  <option value="">— selecionar do cadastro de agentes —</option>
                  {agentes.map(a => <option key={a.id} value={a.id}>{a.nome}</option>)}
                </select>
                {!formResp.agente_id && (
                  <input type="text" value={formResp.nome} onChange={e => setFormResp(p => ({...p, nome: e.target.value}))} required={!formResp.agente_id} className="input-field mt-2" placeholder="Ou digite o nome manualmente *" />
                )}
                {formResp.agente_id && <p className="text-xs text-ink-500 mt-1">Nome: <strong>{formResp.nome}</strong></p>}
              </div>
              <div>
                <label className="block text-xs font-semibold text-ink-500 uppercase mb-1.5">Secretaria / Órgão *</label>
                <select value={formResp.secretaria_id} onChange={e => setFormResp(p => ({...p, secretaria_id: e.target.value}))} required className="input-field" disabled={!!editingResp}>
                  <option value="">Selecione...</option>
                  {secretarias.map(s => <option key={s.id} value={s.id}>{s.nome}</option>)}
                </select>
                {editingResp && <p className="text-xs text-ink-400 mt-1">Para trocar a secretaria, remova e re-cadastre.</p>}
              </div>
            </div>
          </SectionCard>
          <SectionCard icon={Shield} title="Função e amparo" subtitle="Cargo e instrumento legal">
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-ink-500 uppercase mb-1.5">Cargo</label>
                <select value={formResp.cargo} onChange={e => setFormResp(p => ({...p, cargo: e.target.value}))} className="input-field">
                  <option value="">Selecione...</option>
                  <option value="Gestores">Gestores</option>
                  <option value="Ordenadores">Ordenadores</option>
                  <option value="Setor de compra">Setor de compra</option>
                  <option value="Comissão de licitação">Comissão de licitação</option>
                  <option value="Fiscais de contratos">Fiscais de contratos</option>
                  <option value="Equipe de planejamento das contratações">Equipe de planejamento das contratações</option>
                  <option value="Agentes de contratações">Agentes de contratações</option>
                  <option value="Gestor de contratos">Gestor de contratos</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-ink-500 uppercase mb-1.5">Amparo legal</label>
                <input type="text" value={formResp.amparo} onChange={e => setFormResp(p => ({...p, amparo: e.target.value}))} className="input-field" placeholder="Ex: Portaria: 001/2024" />
              </div>
            </div>
          </SectionCard>
          <SectionCard icon={Calendar} title="Vigência" subtitle="Período de atuação do responsável">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-ink-500 uppercase mb-1.5">Data início *</label>
                <input type="date" value={formResp.data_inicio} onChange={e => setFormResp(p => ({...p, data_inicio: e.target.value}))} required autoFocus className="input-field" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-ink-500 uppercase mb-1.5">Data fim <span className="normal-case font-normal text-ink-400">(vazio = atual)</span></label>
                <input type="date" value={formResp.data_fim} onChange={e => setFormResp(p => ({...p, data_fim: e.target.value}))} className="input-field" />
              </div>
            </div>
          </SectionCard>
        </form>
      </ModalShell>

      {/* ── Painel de Orçamento ── */}
      {showOrcamentoPanel && selectedSecretaria && (
        <div className="fixed inset-0 z-[9990] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-ink-50 rounded-3xl shadow-2xl w-full flex flex-col overflow-hidden" style={{ maxWidth: '90vw', maxHeight: '90vh', width: 520 }}>
            <div className="bg-surface border-b border-ink-100 px-4 py-3 shrink-0">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-success-500 to-emerald-600 flex items-center justify-center shadow-md">
                    <Wallet className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-ink-900 dark:text-white">
                      Orçamento — {selectedSecretaria.sigla || selectedSecretaria.nome}
                    </h2>
                    <p className="text-xs text-ink-500 mt-0.5">{selectedSecretaria.nome}</p>
                  </div>
                </div>
                <button onClick={() => setShowOrcamentoPanel(false)}
                  className="w-8 h-8 flex items-center justify-center rounded-xl border border-ink-200 text-ink-400 hover:text-ink-600 hover:bg-ink-100 transition-all">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto">
              <div className="p-6 space-y-4">
                <SectionCard icon={Wallet} title="Dados orçamentários" subtitle="Exercício e valores da LOA">
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-semibold text-ink-500 uppercase mb-1.5">Exercício *</label>
                      <input
                        type="number"
                        value={formOrcamento.exercicio}
                        onChange={e => setFormOrcamento(p => ({...p, exercicio: e.target.value}))}
                        disabled={!orcamentoEditing}
                        min="2000" max="2099"
                        className="input-field w-28"
                        placeholder={new Date().getFullYear()}
                      />
                    </div>
                    <div className="grid grid-cols-1 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-ink-500 uppercase mb-1.5">Valor LOA (R$)</label>
                        <input type="number" value={formOrcamento.valor_loa} onChange={e => setFormOrcamento(p => ({...p, valor_loa: e.target.value}))} disabled={!orcamentoEditing} step="0.01" min="0" className="input-field" />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-ink-500 uppercase mb-1.5">Valor suplementado (R$)</label>
                        <input type="number" value={formOrcamento.valor_suplementado} onChange={e => setFormOrcamento(p => ({...p, valor_suplementado: e.target.value}))} disabled={!orcamentoEditing} step="0.01" min="0" className="input-field" />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-ink-500 uppercase mb-1.5">Valor reduzido (R$)</label>
                        <input type="number" value={formOrcamento.valor_reduzido} onChange={e => setFormOrcamento(p => ({...p, valor_reduzido: e.target.value}))} disabled={!orcamentoEditing} step="0.01" min="0" className="input-field" />
                      </div>
                    </div>
                    <div className="rounded-xl bg-success-50 dark:bg-success-900/20 border border-success-200 dark:border-success-800/40 p-4">
                      <p className="text-xs font-semibold text-success-700 dark:text-success-400 uppercase tracking-wider mb-1">
                        Valor Vigente (LOA + Suplementado − Reduzido)
                      </p>
                      <p className="text-2xl font-bold text-success-700 dark:text-success-300">
                        {formatBRL(
                          (parseFloat(formOrcamento.valor_loa) || 0) +
                          (parseFloat(formOrcamento.valor_suplementado) || 0) -
                          (parseFloat(formOrcamento.valor_reduzido) || 0)
                        )}
                      </p>
                    </div>
                  </div>
                </SectionCard>
              </div>
            </div>
            <div className="bg-surface border-t border-ink-100 px-4 py-3 shrink-0 flex items-center justify-end gap-3">
              {!orcamentoEditing ? (
                <>
                  <button onClick={() => setShowOrcamentoPanel(false)} className="btn-secondary px-5 py-2 text-sm">Fechar</button>
                  {pSec('editar') && (
                    <button onClick={() => setOrcamentoEditing(true)} className="btn-primary flex items-center gap-2 px-5 py-2 text-sm">
                      <Edit2 className="w-4 h-4" /> Alterar
                    </button>
                  )}
                </>
              ) : (
                <>
                  <button onClick={() => { setOrcamentoEditing(false); setFormOrcamento(orcamentoOriginal || { exercicio: new Date().getFullYear(), valor_loa: '0', valor_suplementado: '0', valor_reduzido: '0' }); }} className="btn-secondary px-5 py-2 text-sm">Cancelar</button>
                  <button onClick={saveOrcamento} disabled={loading} className="btn-primary flex items-center gap-2 px-5 py-2 text-sm">
                    <Save className="w-4 h-4" />
                    {loading ? 'Salvando...' : 'Salvar Orçamento'}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Painel de Dotações ── */}
      {showDotacoesPanel && selectedSecretaria && (
        <div className="fixed inset-0 z-[9990] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-ink-50 rounded-3xl shadow-2xl w-full flex flex-col overflow-hidden" style={{ maxWidth: '90vw', maxHeight: '90vh', width: 820 }}>
            <div className="bg-surface border-b border-ink-100 px-4 py-3 shrink-0">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center shadow-md">
                    <Database className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-ink-900 dark:text-white">
                      Dotações Orçamentárias — {selectedSecretaria.sigla || selectedSecretaria.nome}
                    </h2>
                    <p className="text-xs text-ink-500 mt-0.5">{selectedSecretaria.nome}</p>
                  </div>
                </div>
                <button onClick={() => { setShowDotacoesPanel(false); setShowFormDotacao(false); setSelectedDotacao(null); }}
                  className="w-8 h-8 flex items-center justify-center rounded-xl border border-ink-200 text-ink-400 hover:text-ink-600 hover:bg-ink-100 transition-all">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto">
              <div className="p-6 space-y-4">
                <div className="rounded-2xl border border-ink-100 bg-surface shadow-sm overflow-hidden">
                  <div className="px-5 py-3.5 border-b border-ink-100 bg-gradient-to-r from-ink-50 to-white flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-7 h-7 rounded-xl bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center">
                        <Database className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                      </div>
                      <p className="text-sm font-semibold text-ink-800">Dotações cadastradas</p>
                    </div>
                    <span className="text-xs text-ink-500">{dotacoesList.length} dotação(ões)</span>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-ink-50">
                        <tr>
                          <th className="w-8 px-3 py-2.5"></th>
                          <th className="text-left px-3 py-2.5 font-semibold text-ink-600 text-xs uppercase">Código</th>
                          <th className="text-left px-3 py-2.5 font-semibold text-ink-600 text-xs uppercase">Descrição / Ação</th>
                          <th className="text-left px-3 py-2.5 font-semibold text-ink-600 text-xs uppercase">El. Despesa</th>
                          <th className="text-left px-3 py-2.5 font-semibold text-ink-600 text-xs uppercase">Fonte</th>
                          <th className="text-right px-3 py-2.5 font-semibold text-ink-600 text-xs uppercase">Valor Previsto</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-ink-100">
                        {dotacoesList.length === 0 ? (
                          <tr>
                            <td colSpan={6} className="text-center py-10 text-ink-400">
                              <Database className="h-8 w-8 mx-auto mb-2 opacity-40" />
                              <p className="text-sm">Nenhuma dotação cadastrada</p>
                            </td>
                          </tr>
                        ) : (
                          dotacoesList.map(dot => {
                            const isSel = selectedDotacao?.id === dot.id;
                            return (
                              <tr
                                key={dot.id}
                                onClick={() => setSelectedDotacao(isSel ? null : dot)}
                                onDoubleClick={() => { if (pSec('editar')) { setEditingDotacao(dot); setFormDotacao({ codigo: dot.codigo||'', descricao: dot.descricao||'', elemento_despesa: dot.elemento_despesa||'', fonte_recurso: dot.fonte_recurso||'', valor_previsto: dot.valor_previsto||'' }); setShowFormDotacao(true) } }}
                                className={`cursor-pointer select-none transition-colors ${isSel ? 'bg-indigo-600 text-white' : 'hover:bg-indigo-50 dark:hover:bg-indigo-900/10'}`}
                              >
                                <td className="px-3 py-2.5 text-center">
                                  {isSel && <ChevronRight className="w-4 h-4 text-white mx-auto" />}
                                </td>
                                <td className={`px-3 py-2.5 font-mono text-xs ${isSel ? 'text-white' : 'text-ink-800'}`}>{dot.codigo}</td>
                                <td className={`px-3 py-2.5 max-w-xs truncate ${isSel ? 'text-white' : 'text-ink-700'}`}>{dot.descricao}</td>
                                <td className={`px-3 py-2.5 text-xs ${isSel ? 'text-indigo-100' : 'text-ink-500'}`}>{dot.elemento_despesa}</td>
                                <td className={`px-3 py-2.5 text-xs ${isSel ? 'text-indigo-100' : 'text-ink-500'}`}>{dot.fonte_recurso}</td>
                                <td className={`px-3 py-2.5 text-right font-mono text-xs ${isSel ? 'text-white' : 'text-ink-700'}`}>
                                  {dot.valor_previsto ? formatBRL(parseFloat(dot.valor_previsto)) : '—'}
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {showFormDotacao && (
                  <SectionCard icon={Database} title={editingDotacao ? 'Editar Dotação' : 'Nova Dotação'} subtitle="Preencha os campos e confirme">
                    <form onSubmit={handleSubmitDotacao} className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-semibold text-ink-500 uppercase mb-1.5">Código da Dotação *</label>
                          <input type="text" value={formDotacao.codigo} onChange={e => setFormDotacao(p => ({...p, codigo: e.target.value}))} required autoFocus className="input-field font-mono" placeholder="Ex: 02.001.0412200082.049" />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-ink-500 uppercase mb-1.5">Elemento de Despesa</label>
                          <input type="text" value={formDotacao.elemento_despesa} onChange={e => setFormDotacao(p => ({...p, elemento_despesa: e.target.value}))} className="input-field font-mono" placeholder="Ex: 33.90.39" />
                        </div>
                        <div className="col-span-2">
                          <label className="block text-xs font-semibold text-ink-500 uppercase mb-1.5">Descrição / Ação *</label>
                          <input type="text" value={formDotacao.descricao} onChange={e => setFormDotacao(p => ({...p, descricao: e.target.value}))} required className="input-field" placeholder="Ex: Manutenção das atividades da secretaria" />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-ink-500 uppercase mb-1.5">Fonte de Recurso</label>
                          <input type="text" value={formDotacao.fonte_recurso} onChange={e => setFormDotacao(p => ({...p, fonte_recurso: e.target.value}))} className="input-field" placeholder="Ex: 15000000" />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-ink-500 uppercase mb-1.5">Valor Previsto (R$)</label>
                          <input type="number" value={formDotacao.valor_previsto} onChange={e => setFormDotacao(p => ({...p, valor_previsto: e.target.value}))} step="0.01" min="0" className="input-field" />
                        </div>
                      </div>
                      <div className="flex justify-end gap-2 pt-1">
                        <button type="button" onClick={() => { setShowFormDotacao(false); setEditingDotacao(null); }} className="btn-secondary text-sm px-4 py-2">Cancelar</button>
                        <button type="submit" disabled={loading} className="btn-primary flex items-center gap-2 text-sm px-4 py-2">
                          <Save className="w-4 h-4" />
                          {loading ? 'Salvando...' : (editingDotacao ? 'Salvar Dotação' : 'Adicionar Dotação')}
                        </button>
                      </div>
                    </form>
                  </SectionCard>
                )}
              </div>
            </div>
            <div className="bg-surface border-t border-ink-100 px-4 py-3 shrink-0 flex items-center justify-between">
              <span className="text-xs text-ink-500">{dotacoesList.length} dotação(ões)</span>
              <div className="flex items-center gap-2">
                {pSec('criar') && (
                  <button onClick={() => { setEditingDotacao(null); setFormDotacao({ codigo:'', descricao:'', elemento_despesa:'', fonte_recurso:'', valor_previsto:'' }); setShowFormDotacao(true); setSelectedDotacao(null); }} className="btn-primary flex items-center gap-1.5 text-sm px-3 py-1.5">
                    <Plus className="h-4 w-4" /> Incluir
                  </button>
                )}
                {pSec('editar') && (
                  <button onClick={() => { if(!selectedDotacao) return; setEditingDotacao(selectedDotacao); setFormDotacao({ codigo: selectedDotacao.codigo||'', descricao: selectedDotacao.descricao||'', elemento_despesa: selectedDotacao.elemento_despesa||'', fonte_recurso: selectedDotacao.fonte_recurso||'', valor_previsto: selectedDotacao.valor_previsto||'' }); setShowFormDotacao(true); }} disabled={!selectedDotacao} className="btn-secondary flex items-center gap-1.5 text-sm px-3 py-1.5 disabled:opacity-40 disabled:cursor-not-allowed">
                    <Edit2 className="h-4 w-4" /> Alterar
                  </button>
                )}
                {pSec('excluir') && (
                  <button onClick={() => selectedDotacao && setConfirmarExcluirDotacao(true)} disabled={!selectedDotacao} className="btn-danger flex items-center gap-1.5 text-sm px-3 py-1.5 disabled:opacity-40 disabled:cursor-not-allowed">
                    <Trash2 className="h-4 w-4" /> Excluir
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {confirmarExcluirDotacao && selectedDotacao && (
        <ConfirmModal
          title={`Excluir a dotação "${selectedDotacao.codigo || selectedDotacao.descricao}"?`}
          message="Esta dotação será removida permanentemente."
          confirmLabel="Excluir"
          onConfirm={deleteDotacao}
          onClose={() => setConfirmarExcluirDotacao(false)}
        />
      )}

      {confirmarExcluirResp && (
        <ConfirmModal
          title={`Remover "${confirmarExcluirResp.nome}" como responsável?`}
          message={`Esta pessoa será removida como responsável de ${confirmarExcluirResp._secSigla}.`}
          confirmLabel="Remover"
          onConfirm={() => deleteResponsavel(confirmarExcluirResp)}
          onClose={() => setConfirmarExcluirResp(null)}
        />
      )}

        </div>
  );
}
