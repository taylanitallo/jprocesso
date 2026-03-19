import { useState, useEffect } from 'react';
import api from '../services/api';
import { 
  Plus, 
  Building2, 
  Edit2, 
  Trash2, 
  Briefcase,
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  Loader2,
  CheckCircle,
  UserCheck,
  X,
  UserCog,
  Users,
  Search
} from 'lucide-react';

export default function Secretarias() {
  const [showModalSecretaria, setShowModalSecretaria] = useState(false);
  const [showModalSetor, setShowModalSetor] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [editingSecretaria, setEditingSecretaria] = useState(null);
  const [editingSetor, setEditingSetor] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [expandedSecretarias, setExpandedSecretarias] = useState([]);
  const [selectedSecretaria, setSelectedSecretaria] = useState(null);
  const [secFiltroDescricao, setSecFiltroDescricao] = useState('');
  const [secFiltroVigor, setSecFiltroVigor] = useState('');
  const [showSetoresPanel, setShowSetoresPanel] = useState(false);
  const [selectedSetorInPanel, setSelectedSetorInPanel] = useState(null);
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  const [secretarias, setSecretarias] = useState([]);

  // Buscar secretarias e setores da API
  useEffect(() => {
    fetchSecretarias();
  }, []);

  const fetchSecretarias = async () => {
    try {
      const res = await api.get('/organizacao/secretarias');
      const secretariasData = res.data?.secretarias || res.data || [];

      // O backend já retorna cada secretaria com secretaria.setores embutidos (via Sequelize include)
      const ordenadas = [...secretariasData].sort((a, b) =>
        (a.nome || '').localeCompare(b.nome || '')
      );

      setSecretarias(ordenadas);
    } catch (error) {
      console.error('Erro ao carregar secretarias:', error);
      setSecretarias([]);
    }
  };

  const [formSecretaria, setFormSecretaria] = useState({
    nome: '', sigla: '', descricao: '',
    data_inicio: '', data_fim: '', email: '', whatsapp: '',
    outros_sistemas: false, cnpj: '', razao_social: '', codigo_unidade: '',
    responsaveis: [], setores: []
  });

  const [formSetor, setFormSetor] = useState({
    nome: '',
    descricao: '',
    secretariaId: null
  });

  // ── Tabs ──────────────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState('secretarias');

  // ── Agentes (localStorage) ────────────────────────────────────────────────
  const [agentes, setAgentes] = useState([]);
  useEffect(() => {
    api.get('/organizacao/agentes').then(r => setAgentes(r.data)).catch(() => {});
  }, []);
  const [showModalAgente,       setShowModalAgente]       = useState(false);
  const [editingAgente,         setEditingAgente]         = useState(null);
  const [showDeleteAgenteModal, setShowDeleteAgenteModal] = useState(false);
  const [deleteAgenteTarget,    setDeleteAgenteTarget]    = useState(null);
  const [agenteSearch,          setAgenteSearch]          = useState('');
  const [selectedAgente,        setSelectedAgente]        = useState(null);
  const [formAgente, setFormAgente] = useState({
    nome: '', nome_reduzido: '', cpf: '', nascimento: '', telefone: '', email: '', matricula: ''
  });

  // ── Responsáveis ──────────────────────────────────────────────────────────
  const [showModalResp,  setShowModalResp]  = useState(false);
  const [editingResp,    setEditingResp]    = useState(null); // { secId, index }
  const [selectedResp,   setSelectedResp]   = useState(null);
  const [respFiltroVigor,   setRespFiltroVigor]   = useState(new Date().toISOString().slice(0,10));
  const [respFiltroNome,    setRespFiltroNome]    = useState('');
  const [respFiltroSec,     setRespFiltroSec]     = useState('');
  const [respFiltroCargo,   setRespFiltroCargo]   = useState('');
  const [respSearch,        setRespSearch]        = useState(''); // kept for compat
  const [formResp, setFormResp] = useState({
    secretaria_id: '', agente_id: '', nome: '', cargo: '', data_inicio: '', data_fim: '', amparo: ''
  });

  // ── Orçamento ────────────────────────────────────────────────────────────────
  const [showOrcamentoPanel, setShowOrcamentoPanel] = useState(false);
  const [orcamentoEditing, setOrcamentoEditing] = useState(false);
  const [orcamentoOriginal, setOrcamentoOriginal] = useState(null);
  const [formOrcamento, setFormOrcamento] = useState({ exercicio: '', valor_loa: '', valor_suplementado: '', valor_reduzido: '' });

  const openOrcamentoPanel = () => {
    const orc = selectedSecretaria?.orcamento || {};
    const vals = {
      exercicio:          orc.exercicio          || new Date().getFullYear().toString(),
      valor_loa:          orc.valor_loa          != null ? String(orc.valor_loa)          : '',
      valor_suplementado: orc.valor_suplementado != null ? String(orc.valor_suplementado) : '',
      valor_reduzido:     orc.valor_reduzido     != null ? String(orc.valor_reduzido)     : '',
    };
    setFormOrcamento(vals);
    setOrcamentoOriginal(vals);
    setOrcamentoEditing(false);
    setShowOrcamentoPanel(true);
  };

  const saveOrcamento = async () => {
    try {
      setLoading(true);
      const orcamento = {
        exercicio:          formOrcamento.exercicio,
        valor_loa:          parseFloat(formOrcamento.valor_loa          || '0') || 0,
        valor_suplementado: parseFloat(formOrcamento.valor_suplementado || '0') || 0,
        valor_reduzido:     parseFloat(formOrcamento.valor_reduzido     || '0') || 0,
      };
      await api.put(`/organizacao/secretarias/${selectedSecretaria.id}`, {
        nome: selectedSecretaria.nome, sigla: selectedSecretaria.sigla,
        descricao: selectedSecretaria.descricao, ativo: selectedSecretaria.ativo, orcamento
      });
      await fetchSecretarias();
      setOrcamentoEditing(false);
      setSuccessMessage('Orçamento salvo com sucesso!');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch { alert('Erro ao salvar orçamento.'); }
    finally { setLoading(false); }
  };

  // ── Dotações ────────────────────────────────────────────────────────────────
  const [showDotacoesPanel, setShowDotacoesPanel] = useState(false);
  const [dotacoesList, setDotacoesList] = useState([]);
  const [selectedDotacao, setSelectedDotacao] = useState(null);
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
    if (!window.confirm(`Excluir a dotação "${selectedDotacao.codigo || selectedDotacao.descricao}"?`)) return;
    const nova = dotacoesList.filter(d => d.id !== selectedDotacao.id);
    saveDotacoes(nova);
    setSelectedDotacao(null);
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
    console.log('🔍 Criando setor para secretaria ID:', secretariaId);
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
        atualizado = agentes.map(a => a.id === editingAgente.id ? data : a);
      } else {
        const { data } = await api.post('/organizacao/agentes', formAgente);
        atualizado = [...agentes, data];
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
  const todosResponsaveis = secretarias.flatMap(sec =>
    (sec.responsaveis || []).map((r, i) => ({
      ...r, _secId: sec.id, _secNome: sec.nome, _secSigla: sec.sigla, _idx: i
    }))
  );

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
    if (!window.confirm(`Remover "${resp.nome}" como responsável de ${resp._secSigla}?`)) return;
    try {
      const sec = secretarias.find(s => s.id === resp._secId);
      if (!sec) return;
      const responsaveis = (sec.responsaveis || []).filter((_, i) => i !== resp._idx);
      await api.put(`/organizacao/secretarias/${sec.id}`, {
        nome: sec.nome, sigla: sec.sigla, descricao: sec.descricao, ativo: sec.ativo, responsaveis
      });
      await fetchSecretarias();
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
    <div className="max-w-7xl mx-auto space-y-5 animate-fade-in">
      {/* Mensagem de Sucesso */}
      {successMessage && (
        <div className="p-4 bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-700 rounded-lg flex items-center gap-3">
          <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
          <p className="text-green-800 dark:text-green-300 font-medium">{successMessage}</p>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">🏛️ Gestão de Organização</h1>
          <p className="page-subtitle">Gerencie secretarias, agentes e responsáveis do município</p>
        </div>
        <div className="flex items-center gap-2">
          {activeTab === 'secretarias' && (
            <span />
          )}

        </div>
      </div>

      {/* Abas do módulo */}
      <div className="border-b border-gray-200 dark:border-gray-700 -mt-1">
        <nav className="flex">
          {[
            { key: 'entidade',     label: 'Entidade',              icon: '🏢'  },
            { key: 'secretarias',  label: 'Secretarias e Setores', icon: '🏛️' },
            { key: 'agentes',      label: 'Cadastro de Agentes',   icon: '🪪'  },
            { key: 'responsaveis', label: 'Responsáveis',          icon: '👤'  },
          ].map(tab => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)}
              className={`px-5 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                activeTab === tab.key
                  ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
              }`}>
              {tab.icon} {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* ── Tab: Secretarias e Setores ── */}
      {activeTab === 'secretarias' && (
        <div className="space-y-3">
          {/* Campos para pesquisa */}
          <div className="card p-4">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Campos para pesquisa</h3>
            <div className="flex flex-wrap items-end gap-4">
              <div className="flex-1 min-w-48">
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Descrição</label>
                <input
                  value={secFiltroDescricao}
                  onChange={e => setSecFiltroDescricao(e.target.value)}
                  className="input-field text-sm"
                  placeholder="PESQUISAR POR DESCRIÇÃO"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Vigência</label>
                <input
                  type="date"
                  value={secFiltroVigor}
                  onChange={e => setSecFiltroVigor(e.target.value)}
                  className="input-field text-sm w-40"
                />
              </div>
            </div>
          </div>

          {/* Tabela de secretarias */}
          <div className="card overflow-hidden">
            <div className="px-4 py-2 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Tabela de secretarias</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-100 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700">
                  <tr>
                    <th className="text-left px-4 py-2.5 font-semibold text-gray-600 dark:text-gray-300 w-8"></th>
                    <th className="text-left px-4 py-2.5 font-semibold text-gray-600 dark:text-gray-300">Descrição</th>
                    <th className="text-left px-4 py-2.5 font-semibold text-gray-600 dark:text-gray-300 w-32">Data início</th>
                    <th className="text-left px-4 py-2.5 font-semibold text-gray-600 dark:text-gray-300 w-32">Data fim</th>
                    <th className="text-left px-4 py-2.5 font-semibold text-gray-600 dark:text-gray-300 w-28">Código</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {(() => {
                    const filtradas = secretarias.filter(sec => {
                      if (secFiltroDescricao && !sec.nome.toLowerCase().includes(secFiltroDescricao.toLowerCase())) return false;
                      if (secFiltroVigor) {
                        const vigor = new Date(secFiltroVigor + 'T12:00:00');
                        const ini = sec.data_inicio ? new Date(sec.data_inicio + 'T00:00:00') : null;
                        const fim = sec.data_fim    ? new Date(sec.data_fim    + 'T23:59:59') : null;
                        if (ini && ini > vigor) return false;
                        if (fim && fim < vigor)  return false;
                      }
                      return true;
                    });

                    if (filtradas.length === 0) {
                      return (
                        <tr>
                          <td colSpan={5} className="text-center py-12 text-gray-400 dark:text-gray-500">
                            <Building2 className="h-10 w-10 mx-auto mb-2 opacity-40" />
                            <p className="text-sm">{secretarias.length === 0 ? 'Nenhuma secretaria cadastrada' : 'Nenhum resultado para o filtro'}</p>
                          </td>
                        </tr>
                      );
                    }

                    return filtradas.map(sec => {
                      const isSelected = selectedSecretaria?.id === sec.id;
                      return (
                        <tr
                          key={sec.id}
                          onClick={() => { setSelectedSecretaria(isSelected ? null : sec); setSelectedSetorInPanel(null); }}
                          onDoubleClick={() => handleEditSecretaria(sec)}
                          className={`cursor-pointer transition-colors select-none ${
                            isSelected
                              ? 'bg-blue-600 text-white'
                              : 'hover:bg-blue-50 dark:hover:bg-blue-900/10'
                          }`}
                        >
                          <td className="px-4 py-2.5 text-center">
                            {isSelected && <span className="text-white text-xs">▶</span>}
                          </td>
                          <td className={`px-4 py-2.5 font-medium ${isSelected ? 'text-white' : 'text-gray-900 dark:text-gray-100'}`}>
                            {sec.nome}
                          </td>
                          <td className={`px-4 py-2.5 ${isSelected ? 'text-blue-100' : 'text-gray-500 dark:text-gray-400'}`}>
                            {sec.data_inicio ? new Date(sec.data_inicio + 'T00:00:00').toLocaleDateString('pt-BR') : '—'}
                          </td>
                          <td className={`px-4 py-2.5 ${isSelected ? 'text-blue-100' : 'text-gray-500 dark:text-gray-400'}`}>
                            {sec.data_fim ? new Date(sec.data_fim + 'T00:00:00').toLocaleDateString('pt-BR') : '—'}
                          </td>
                          <td className={`px-4 py-2.5 font-mono text-xs ${isSelected ? 'text-blue-100' : 'text-gray-500 dark:text-gray-400'}`}>
                            {sec.codigo_unidade || '—'}
                          </td>
                        </tr>
                      );
                    });
                  })()}
                </tbody>
              </table>
            </div>

            {/* Toolbar inferior */}
            <div className="px-4 py-2.5 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/30 flex items-center justify-between flex-wrap gap-2">
              <span className="text-xs text-gray-500 dark:text-gray-400">
                Foram encontrados {secretarias.filter(sec => {
                  if (secFiltroDescricao && !sec.nome.toLowerCase().includes(secFiltroDescricao.toLowerCase())) return false;
                  if (secFiltroVigor) {
                    const vigor = new Date(secFiltroVigor + 'T12:00:00');
                    const ini = sec.data_inicio ? new Date(sec.data_inicio + 'T00:00:00') : null;
                    const fim = sec.data_fim    ? new Date(sec.data_fim    + 'T23:59:59') : null;
                    if (ini && ini > vigor) return false;
                    if (fim && fim < vigor)  return false;
                  }
                  return true;
                }).length} registro(s)
              </span>
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  onClick={() => { setSelectedSecretaria(null); handleCreateSecretaria(); }}
                  className="btn-primary flex items-center gap-1.5 text-sm px-3 py-1.5"
                >
                  <Plus className="h-4 w-4" /> Incluir
                </button>
                <button
                  onClick={() => selectedSecretaria && handleEditSecretaria(selectedSecretaria)}
                  disabled={!selectedSecretaria}
                  className="btn-secondary flex items-center gap-1.5 text-sm px-3 py-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <Edit2 className="h-4 w-4" /> Alterar
                </button>
                <button
                  onClick={() => selectedSecretaria && handleDeleteSecretaria(selectedSecretaria)}
                  disabled={!selectedSecretaria}
                  className="btn-danger flex items-center gap-1.5 text-sm px-3 py-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <Trash2 className="h-4 w-4" /> Excluir
                </button>
                <button
                  onClick={() => { if (selectedSecretaria) { setSelectedSetorInPanel(null); setShowSetoresPanel(true); } }}
                  disabled={!selectedSecretaria}
                  className="btn-secondary flex items-center gap-1.5 text-sm px-3 py-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <Briefcase className="h-4 w-4" /> Setores
                </button>
                <button
                  onClick={() => selectedSecretaria && openOrcamentoPanel()}
                  disabled={!selectedSecretaria}
                  className="btn-secondary flex items-center gap-1.5 text-sm px-3 py-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  💰 Orçamento
                </button>
                <button
                  onClick={() => selectedSecretaria && openDotacoesPanel()}
                  disabled={!selectedSecretaria}
                  className="btn-secondary flex items-center gap-1.5 text-sm px-3 py-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  📊 Dotações
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Tab: Cadastro de Agentes ── */}
      {activeTab === 'agentes' && (
        <div className="space-y-3">
          {/* Opções de filtro */}
          <div className="card p-4">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Opções para filtro</h3>
            <div className="flex items-center gap-3">
              <label className="text-sm font-medium text-gray-600 dark:text-gray-400 whitespace-nowrap">Nome/CPF</label>
              <input
                value={agenteSearch}
                onChange={e => setAgenteSearch(e.target.value)}
                className="input-field w-80"
                placeholder="PESQUISAR POR NOME OU CPF"
              />
            </div>
          </div>

          {/* Tabela de agentes */}
          <div className="card overflow-hidden">
            <div className="px-4 py-2 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Tabela de agentes</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-100 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700">
                  <tr>
                    <th className="text-left px-4 py-2.5 font-semibold text-gray-600 dark:text-gray-300 w-8"></th>
                    <th className="text-left px-4 py-2.5 font-semibold text-gray-600 dark:text-gray-300">Nome</th>
                    <th className="text-left px-4 py-2.5 font-semibold text-gray-600 dark:text-gray-300">CPF</th>
                    <th className="text-left px-4 py-2.5 font-semibold text-gray-600 dark:text-gray-300">Nascimento</th>
                    <th className="text-left px-4 py-2.5 font-semibold text-gray-600 dark:text-gray-300">Telefone</th>
                    <th className="text-left px-4 py-2.5 font-semibold text-gray-600 dark:text-gray-300">e-mail</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {agentes.filter(a =>
                    !agenteSearch
                    || a.nome.toLowerCase().includes(agenteSearch.toLowerCase())
                    || (a.cpf||'').replace(/\D/g,'').includes(agenteSearch.replace(/\D/g,''))
                  ).length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center py-12 text-gray-400 dark:text-gray-500">
                        <UserCog className="h-10 w-10 mx-auto mb-2 opacity-40" />
                        <p className="text-sm">{agentes.length === 0 ? 'Nenhum agente cadastrado' : 'Nenhum resultado para o filtro'}</p>
                      </td>
                    </tr>
                  ) : (
                    agentes
                      .filter(a =>
                        !agenteSearch
                        || a.nome.toLowerCase().includes(agenteSearch.toLowerCase())
                        || (a.cpf||'').replace(/\D/g,'').includes(agenteSearch.replace(/\D/g,''))
                      )
                      .map(agente => {
                        const isSelected = selectedAgente?.id === agente.id;
                        return (
                          <tr
                            key={agente.id}
                            onClick={() => setSelectedAgente(isSelected ? null : agente)}
                            onDoubleClick={() => openModalAgente(agente)}
                            className={`cursor-pointer transition-colors select-none ${
                              isSelected
                                ? 'bg-blue-600 text-white'
                                : 'hover:bg-blue-50 dark:hover:bg-blue-900/10'
                            }`}
                          >
                            <td className="px-4 py-2.5 text-center">
                              {isSelected && <span className="text-white text-xs">▶</span>}
                            </td>
                            <td className={`px-4 py-2.5 font-medium ${isSelected ? 'text-white' : 'text-gray-900 dark:text-gray-100'}`}>
                              {agente.nome}
                            </td>
                            <td className={`px-4 py-2.5 font-mono text-xs ${isSelected ? 'text-blue-100' : 'text-gray-500 dark:text-gray-400'}`}>
                              {maskCPF(agente.cpf)}
                            </td>
                            <td className={`px-4 py-2.5 ${isSelected ? 'text-blue-100' : 'text-gray-500 dark:text-gray-400'}`}>
                              {agente.nascimento
                                ? new Date(agente.nascimento + 'T00:00:00').toLocaleDateString('pt-BR')
                                : '—'}
                            </td>
                            <td className={`px-4 py-2.5 ${isSelected ? 'text-blue-100' : 'text-gray-600 dark:text-gray-400'}`}>
                              {agente.telefone || '—'}
                            </td>
                            <td className={`px-4 py-2.5 ${isSelected ? 'text-blue-100' : 'text-gray-600 dark:text-gray-400'}`}>
                              {agente.email || '—'}
                            </td>
                          </tr>
                        );
                      })
                  )}
                </tbody>
              </table>
            </div>

            {/* Toolbar inferior */}
            <div className="px-4 py-2.5 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/30 flex items-center justify-between">
              <span className="text-xs text-gray-500 dark:text-gray-400">
                Foram encontrados {agentes.filter(a =>
                  !agenteSearch
                  || a.nome.toLowerCase().includes(agenteSearch.toLowerCase())
                  || (a.cpf||'').replace(/\D/g,'').includes(agenteSearch.replace(/\D/g,''))
                ).length} registro(s)
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => { setSelectedAgente(null); openModalAgente(); }}
                  className="btn-primary flex items-center gap-1.5 text-sm px-3 py-1.5"
                >
                  <Plus className="h-4 w-4" /> Incluir
                </button>
                <button
                  onClick={() => selectedAgente && openModalAgente(selectedAgente)}
                  disabled={!selectedAgente}
                  className="btn-secondary flex items-center gap-1.5 text-sm px-3 py-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <Edit2 className="h-4 w-4" /> Alterar
                </button>
                <button
                  onClick={() => {
                    if (selectedAgente) {
                      setDeleteAgenteTarget(selectedAgente);
                      setShowDeleteAgenteModal(true);
                    }
                  }}
                  disabled={!selectedAgente}
                  className="btn-danger flex items-center gap-1.5 text-sm px-3 py-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <Trash2 className="h-4 w-4" /> Excluir
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Tab: Responsáveis ── */}
      {activeTab === 'responsaveis' && (
        <div className="space-y-3">
          {/* Campos para pesquisa */}
          <div className="card p-4">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Campos para pesquisa</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 items-end">
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Vigência</label>
                <input
                  type="date"
                  value={respFiltroVigor}
                  onChange={e => setRespFiltroVigor(e.target.value)}
                  className="input-field text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Nome</label>
                <input
                  value={respFiltroNome}
                  onChange={e => setRespFiltroNome(e.target.value)}
                  className="input-field text-sm"
                  placeholder="PESQUISAR POR NOME"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Secretaria</label>
                <input
                  value={respFiltroSec}
                  onChange={e => setRespFiltroSec(e.target.value)}
                  className="input-field text-sm"
                  placeholder="PESQUISAR POR SECRETARIA"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Cargo</label>
                <input
                  value={respFiltroCargo}
                  onChange={e => setRespFiltroCargo(e.target.value)}
                  className="input-field text-sm"
                  placeholder="PESQUISAR POR CARGO"
                />
              </div>
            </div>
          </div>

          {/* Tabela de Responsável */}
          <div className="card overflow-hidden">
            <div className="px-4 py-2 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Tabela de Responsável</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-100 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700">
                  <tr>
                    <th className="text-left px-4 py-2.5 font-semibold text-gray-600 dark:text-gray-300 w-8"></th>
                    <th className="text-left px-4 py-2.5 font-semibold text-gray-600 dark:text-gray-300">Nome</th>
                    <th className="text-left px-4 py-2.5 font-semibold text-gray-600 dark:text-gray-300">Cargo</th>
                    <th className="text-left px-4 py-2.5 font-semibold text-gray-600 dark:text-gray-300">Secretaria</th>
                    <th className="text-left px-4 py-2.5 font-semibold text-gray-600 dark:text-gray-300">Data início</th>
                    <th className="text-left px-4 py-2.5 font-semibold text-gray-600 dark:text-gray-300">Data final</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {(() => {
                    const filtrados = todosResponsaveis.filter(r => {
                      const vigor = respFiltroVigor ? new Date(respFiltroVigor + 'T12:00:00') : null;
                      if (vigor) {
                        const ini = r.data_inicio ? new Date(r.data_inicio + 'T00:00:00') : null;
                        const fim = r.data_fim    ? new Date(r.data_fim    + 'T23:59:59') : null;
                        if (ini && ini > vigor) return false;
                        if (fim && fim < vigor)  return false;
                      }
                      if (respFiltroNome  && !r.nome.toLowerCase().includes(respFiltroNome.toLowerCase())) return false;
                      if (respFiltroSec   && !r._secNome.toLowerCase().includes(respFiltroSec.toLowerCase()) && !(r._secSigla||'').toLowerCase().includes(respFiltroSec.toLowerCase())) return false;
                      if (respFiltroCargo && !(r.cargo||'').toLowerCase().includes(respFiltroCargo.toLowerCase())) return false;
                      return true;
                    });

                    if (filtrados.length === 0) {
                      return (
                        <tr>
                          <td colSpan={6} className="text-center py-12 text-gray-400 dark:text-gray-500">
                            <UserCheck className="h-10 w-10 mx-auto mb-2 opacity-40" />
                            <p className="text-sm">{todosResponsaveis.length === 0 ? 'Nenhum responsável cadastrado' : 'Nenhum resultado para o filtro'}</p>
                          </td>
                        </tr>
                      );
                    }

                    return filtrados.map(resp => {
                      const isSelected = selectedResp && selectedResp._secId === resp._secId && selectedResp._idx === resp._idx;
                      return (
                        <tr
                          key={`${resp._secId}-${resp._idx}`}
                          onClick={() => setSelectedResp(isSelected ? null : resp)}
                          onDoubleClick={() => openModalResp(resp)}
                          className={`cursor-pointer transition-colors select-none ${
                            isSelected
                              ? 'bg-blue-600 text-white'
                              : 'hover:bg-blue-50 dark:hover:bg-blue-900/10'
                          }`}
                        >
                          <td className="px-4 py-2.5 text-center">
                            {isSelected && <span className="text-white text-xs">▶</span>}
                          </td>
                          <td className={`px-4 py-2.5 font-medium ${isSelected ? 'text-white' : 'text-gray-900 dark:text-gray-100'}`}>
                            {resp.nome}
                          </td>
                          <td className={`px-4 py-2.5 ${isSelected ? 'text-blue-100' : 'text-gray-600 dark:text-gray-400'}`}>
                            {resp.cargo || '—'}
                          </td>
                          <td className={`px-4 py-2.5 ${isSelected ? 'text-blue-100' : 'text-gray-600 dark:text-gray-400'}`}>
                            {resp._secNome}
                          </td>
                          <td className={`px-4 py-2.5 ${isSelected ? 'text-blue-100' : 'text-gray-500 dark:text-gray-400'}`}>
                            {resp.data_inicio
                              ? new Date(resp.data_inicio + 'T00:00:00').toLocaleDateString('pt-BR')
                              : '—'}
                          </td>
                          <td className={`px-4 py-2.5 ${isSelected ? 'text-blue-100' : 'text-gray-500 dark:text-gray-400'}`}>
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

            {/* Toolbar inferior */}
            <div className="px-4 py-2.5 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/30 flex items-center justify-between">
              <span className="text-xs text-gray-500 dark:text-gray-400">
                Foram encontrados {todosResponsaveis.filter(r => {
                  const vigor = respFiltroVigor ? new Date(respFiltroVigor + 'T12:00:00') : null;
                  if (vigor) {
                    const ini = r.data_inicio ? new Date(r.data_inicio + 'T00:00:00') : null;
                    const fim = r.data_fim    ? new Date(r.data_fim    + 'T23:59:59') : null;
                    if (ini && ini > vigor) return false;
                    if (fim && fim < vigor)  return false;
                  }
                  if (respFiltroNome  && !r.nome.toLowerCase().includes(respFiltroNome.toLowerCase())) return false;
                  if (respFiltroSec   && !r._secNome.toLowerCase().includes(respFiltroSec.toLowerCase()) && !(r._secSigla||'').toLowerCase().includes(respFiltroSec.toLowerCase())) return false;
                  if (respFiltroCargo && !(r.cargo||'').toLowerCase().includes(respFiltroCargo.toLowerCase())) return false;
                  return true;
                }).length} registro(s)
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => { setSelectedResp(null); openModalResp(); }}
                  className="btn-primary flex items-center gap-1.5 text-sm px-3 py-1.5"
                >
                  <Plus className="h-4 w-4" /> Incluir
                </button>
                <button
                  onClick={() => selectedResp && openModalResp(selectedResp)}
                  disabled={!selectedResp}
                  className="btn-secondary flex items-center gap-1.5 text-sm px-3 py-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <Edit2 className="h-4 w-4" /> Alterar
                </button>
                <button
                  onClick={() => selectedResp && deleteResponsavel(selectedResp)}
                  disabled={!selectedResp}
                  className="btn-danger flex items-center gap-1.5 text-sm px-3 py-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <Trash2 className="h-4 w-4" /> Excluir
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Tab: Entidade ── */}
      {activeTab === 'entidade' && (
        <div className="space-y-3">
          <form onSubmit={handleSubmitEntidade} className="space-y-3">

            {/* ── Informações da entidade ── */}
            <div className="card overflow-hidden">
              <div className="px-6 py-3 bg-gray-50 dark:bg-gray-700/30 border-b border-gray-200 dark:border-gray-700">
                <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">🏢 Informações da entidade</p>
              </div>
              <div className="p-6 space-y-4">

                <div className="grid grid-cols-3 gap-4 items-center">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 text-right">Nome completo</label>
                  <div className="col-span-2">
                    <input type="text" value={formEntidade.nome}
                      onChange={e => setFormEntidade(p => ({...p, nome: e.target.value}))}
                      disabled={!entidadeEditing}
                      className="input-field disabled:bg-gray-50 disabled:text-gray-600 dark:disabled:bg-gray-700/30" placeholder="Nome completo da entidade" />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4 items-center">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 text-right">Nome abreviado</label>
                  <div className="col-span-2">
                    <input type="text" value={formEntidade.nome_abreviado}
                      onChange={e => setFormEntidade(p => ({...p, nome_abreviado: e.target.value}))}
                      disabled={!entidadeEditing}
                      className="input-field w-72 disabled:bg-gray-50 disabled:text-gray-600 dark:disabled:bg-gray-700/30" placeholder="Ex: PMIRAUCUBA" />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4 items-center">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 text-right">CNPJ</label>
                  <div className="col-span-2">
                    <input type="text" value={formEntidade.cnpj}
                      onChange={e => setFormEntidade(p => ({...p, cnpj: formatCNPJ(e.target.value)}))}
                      disabled={!entidadeEditing}
                      maxLength={18} className="input-field w-52 font-mono disabled:bg-gray-50 disabled:text-gray-600 dark:disabled:bg-gray-700/30" placeholder="00.000.000/0000-00" />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4 items-center">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 text-right">Razão social</label>
                  <div className="col-span-2">
                    <input type="text" value={formEntidade.razao_social}
                      onChange={e => setFormEntidade(p => ({...p, razao_social: e.target.value}))}
                      disabled={!entidadeEditing}
                      className="input-field disabled:bg-gray-50 disabled:text-gray-600 dark:disabled:bg-gray-700/30" />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4 items-center">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 text-right">Código unidade</label>
                  <div className="col-span-2">
                    <input type="text" value={formEntidade.codigo_unidade}
                      onChange={e => setFormEntidade(p => ({...p, codigo_unidade: e.target.value}))}
                      disabled={!entidadeEditing}
                      className="input-field w-44 disabled:bg-gray-50 disabled:text-gray-600 dark:disabled:bg-gray-700/30" />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4 items-center">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 text-right">Esfera</label>
                  <div className="col-span-2">
                    <select value={formEntidade.esfera}
                      onChange={e => setFormEntidade(p => ({...p, esfera: e.target.value}))}
                      disabled={!entidadeEditing}
                      className="input-field w-56 disabled:bg-gray-50 disabled:text-gray-600 dark:disabled:bg-gray-700/30">
                      <option value="">Selecione...</option>
                      <option value="Municipal">Municipal</option>
                      <option value="Estadual">Estadual</option>
                      <option value="Federal">Federal</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4 items-center">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 text-right">Poder</label>
                  <div className="col-span-2">
                    <select value={formEntidade.poder}
                      onChange={e => setFormEntidade(p => ({...p, poder: e.target.value}))}
                      disabled={!entidadeEditing}
                      className="input-field w-56 disabled:bg-gray-50 disabled:text-gray-600 dark:disabled:bg-gray-700/30">
                      <option value="">Selecione...</option>
                      <option value="Executivo">Executivo</option>
                      <option value="Legislativo">Legislativo</option>
                      <option value="Judiciário">Judiciário</option>
                      <option value="Ministério Público">Ministério Público</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4 items-center">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 text-right">E-mail</label>
                  <div className="col-span-2">
                    <input type="email" value={formEntidade.email}
                      onChange={e => setFormEntidade(p => ({...p, email: e.target.value}))}
                      disabled={!entidadeEditing}
                      className="input-field disabled:bg-gray-50 disabled:text-gray-600 dark:disabled:bg-gray-700/30" placeholder="email@municipio.gov.br" />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4 items-center">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 text-right">Telefone</label>
                  <div className="col-span-2">
                    <input type="text" value={formEntidade.telefone}
                      onChange={e => setFormEntidade(p => ({...p, telefone: formatTelefone(e.target.value)}))}
                      disabled={!entidadeEditing}
                      maxLength={15} className="input-field w-44 disabled:bg-gray-50 disabled:text-gray-600 dark:disabled:bg-gray-700/30" placeholder="(00) 00000-0000" />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4 items-center">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 text-right">Whatsapp notificação</label>
                  <div className="col-span-2">
                    <input type="text" value={formEntidade.whatsapp}
                      onChange={e => setFormEntidade(p => ({...p, whatsapp: formatTelefone(e.target.value)}))}
                      disabled={!entidadeEditing}
                      maxLength={15} className="input-field w-44 disabled:bg-gray-50 disabled:text-gray-600 dark:disabled:bg-gray-700/30" placeholder="(00) 00000-0000" />
                  </div>
                </div>

              </div>
            </div>

            {/* ── Endereço ── */}
            <div className="card overflow-hidden">
              <div className="px-6 py-3 bg-gray-50 dark:bg-gray-700/30 border-b border-gray-200 dark:border-gray-700">
                <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">📍 Endereço</p>
              </div>
              <div className="p-6 space-y-4">

                <div className="grid grid-cols-3 gap-4 items-center">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 text-right">CEP</label>
                  <div className="col-span-2">
                    <input type="text" value={formEntidade.cep}
                      onChange={e => {
                        const v = e.target.value.replace(/\D/g,'').slice(0,8);
                        const f = v.length > 5 ? v.slice(0,5)+'-'+v.slice(5) : v;
                        setFormEntidade(p => ({...p, cep: f}));
                      }}
                      disabled={!entidadeEditing}
                      maxLength={9} className="input-field w-32 font-mono disabled:bg-gray-50 disabled:text-gray-600 dark:disabled:bg-gray-700/30" placeholder="00000-000" />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4 items-center">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 text-right">Logradouro</label>
                  <div className="col-span-2">
                    <input type="text" value={formEntidade.logradouro}
                      onChange={e => setFormEntidade(p => ({...p, logradouro: e.target.value}))}
                      disabled={!entidadeEditing}
                      className="input-field disabled:bg-gray-50 disabled:text-gray-600 dark:disabled:bg-gray-700/30" placeholder="Rua, Avenida, Praça..." />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4 items-center">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 text-right">Número</label>
                  <div className="col-span-2">
                    <input type="text" value={formEntidade.numero}
                      onChange={e => setFormEntidade(p => ({...p, numero: e.target.value}))}
                      disabled={!entidadeEditing}
                      className="input-field w-32 disabled:bg-gray-50 disabled:text-gray-600 dark:disabled:bg-gray-700/30" />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4 items-center">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 text-right">Complemento</label>
                  <div className="col-span-2">
                    <input type="text" value={formEntidade.complemento}
                      onChange={e => setFormEntidade(p => ({...p, complemento: e.target.value}))}
                      disabled={!entidadeEditing}
                      className="input-field disabled:bg-gray-50 disabled:text-gray-600 dark:disabled:bg-gray-700/30" placeholder="Sala, Bloco, Andar..." />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4 items-center">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 text-right">Bairro</label>
                  <div className="col-span-2">
                    <input type="text" value={formEntidade.bairro}
                      onChange={e => setFormEntidade(p => ({...p, bairro: e.target.value}))}
                      disabled={!entidadeEditing}
                      className="input-field disabled:bg-gray-50 disabled:text-gray-600 dark:disabled:bg-gray-700/30" />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4 items-center">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 text-right">Cidade</label>
                  <div className="col-span-2">
                    <input type="text" value={formEntidade.cidade}
                      onChange={e => setFormEntidade(p => ({...p, cidade: e.target.value}))}
                      disabled={!entidadeEditing}
                      className="input-field disabled:bg-gray-50 disabled:text-gray-600 dark:disabled:bg-gray-700/30" />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4 items-center">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 text-right">UF</label>
                  <div className="col-span-2">
                    <select value={formEntidade.uf}
                      onChange={e => setFormEntidade(p => ({...p, uf: e.target.value}))}
                      disabled={!entidadeEditing}
                      className="input-field w-24 disabled:bg-gray-50 disabled:text-gray-600 dark:disabled:bg-gray-700/30">
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
                <span className="text-sm text-green-600 dark:text-green-400 font-medium flex items-center gap-1">
                  <CheckCircle className="h-4 w-4" /> Salvo com sucesso!
                </span>
              )}
              {!entidadeEditing ? (
                <button
                  type="button"
                  onClick={() => setEntidadeEditing(true)}
                  className="btn-primary flex items-center gap-1.5 text-sm px-4 py-2"
                >
                  <Edit2 className="h-4 w-4" /> Alterar
                </button>
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
                    {entidadeLoading ? '⏳ Salvando...' : '✅ Salvar'}
                  </button>
                </>
              )}
            </div>

          </form>
        </div>
      )}

      {/* Modal Criar/Editar Secretaria */}
      {showModalSecretaria && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white dark:bg-gray-800 rounded-xl max-w-2xl w-full my-8 shadow-xl">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                🏛️ Cadastro de secretarias — {editingSecretaria ? 'Edição' : 'Inclusão'}
              </h2>
              <button onClick={() => { setShowModalSecretaria(false); setEditingSecretaria(null); }}
                className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitSecretaria} className="max-h-[calc(90vh-120px)] overflow-y-auto">
              {/* ── Informações da secretaria ── */}
              <div className="px-6 py-3 bg-gray-50 dark:bg-gray-700/30 border-b border-gray-200 dark:border-gray-700">
                <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Informações da secretaria</p>
              </div>
              <div className="p-6 space-y-4">
                <div className="grid grid-cols-3 gap-4 items-start">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 pt-2 text-right col-span-1">Descrição *</label>
                  <div className="col-span-2">
                    <input
                      type="text"
                      value={formSecretaria.nome}
                      onChange={e => setFormSecretaria(p => ({...p, nome: e.target.value}))}
                      required
                      autoFocus
                      className="input-field"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4 items-start">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 pt-2 text-right col-span-1">Abreviação</label>
                  <div className="col-span-2">
                    <input
                      type="text"
                      value={formSecretaria.sigla}
                      onChange={e => setFormSecretaria(p => ({...p, sigla: e.target.value.toUpperCase()}))}
                      maxLength={10}
                      className="input-field"
                      placeholder="Ex: SEMAD"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4 items-start">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 pt-2 text-right col-span-1">Data início</label>
                  <div className="col-span-2">
                    <input
                      type="date"
                      value={formSecretaria.data_inicio}
                      onChange={e => setFormSecretaria(p => ({...p, data_inicio: e.target.value}))}
                      className="input-field w-44"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4 items-start">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 pt-2 text-right col-span-1">Data fim</label>
                  <div className="col-span-2">
                    <input
                      type="date"
                      value={formSecretaria.data_fim}
                      onChange={e => setFormSecretaria(p => ({...p, data_fim: e.target.value}))}
                      className="input-field w-44"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4 items-start">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 pt-2 text-right col-span-1">E-mail</label>
                  <div className="col-span-2">
                    <input
                      type="email"
                      value={formSecretaria.email}
                      onChange={e => setFormSecretaria(p => ({...p, email: e.target.value}))}
                      className="input-field"
                      placeholder="email@municipio.gov.br"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4 items-start">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 pt-2 text-right col-span-1">Whatsapp notificação</label>
                  <div className="col-span-2">
                    <input
                      type="text"
                      value={formSecretaria.whatsapp}
                      onChange={e => setFormSecretaria(p => ({...p, whatsapp: formatTelefone(e.target.value)}))}
                      maxLength={15}
                      className="input-field w-44"
                      placeholder="(00) 00000-0000"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4 items-start">
                  <label className="col-span-1" />
                  <div className="col-span-2 flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="outros_sistemas"
                      checked={formSecretaria.outros_sistemas}
                      onChange={e => setFormSecretaria(p => ({...p, outros_sistemas: e.target.checked}))}
                      className="w-4 h-4 rounded border-gray-300 text-blue-600 cursor-pointer"
                    />
                    <label htmlFor="outros_sistemas" className="text-sm text-gray-600 dark:text-gray-400 cursor-pointer select-none">
                      Secretaria de outros sistemas - Não mostra na lista de secretarias
                    </label>
                  </div>
                </div>
              </div>

              {/* ── Informações para o PNCP ── */}
              <div className="px-6 py-3 bg-gray-50 dark:bg-gray-700/30 border-t border-b border-gray-200 dark:border-gray-700">
                <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Informações para o PNCP</p>
              </div>
              <div className="p-6 space-y-4">
                <div className="grid grid-cols-3 gap-4 items-start">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 pt-2 text-right col-span-1">CNPJ</label>
                  <div className="col-span-2">
                    <input
                      type="text"
                      value={formSecretaria.cnpj}
                      onChange={e => setFormSecretaria(p => ({...p, cnpj: formatCNPJ(e.target.value)}))}
                      maxLength={18}
                      className="input-field w-52 font-mono"
                      placeholder="00.000.000/0000-00"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4 items-start">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 pt-2 text-right col-span-1">Razão social</label>
                  <div className="col-span-2">
                    <input
                      type="text"
                      value={formSecretaria.razao_social}
                      onChange={e => setFormSecretaria(p => ({...p, razao_social: e.target.value}))}
                      className="input-field"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4 items-start">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 pt-2 text-right col-span-1">Código unidade</label>
                  <div className="col-span-2">
                    <input
                      type="text"
                      value={formSecretaria.codigo_unidade}
                      onChange={e => setFormSecretaria(p => ({...p, codigo_unidade: e.target.value}))}
                      className="input-field w-44"
                    />
                  </div>
                </div>
              </div>

              {/* Botões */}
              <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    if (editingSecretaria) {
                      handleEditSecretaria(editingSecretaria);
                    } else {
                      setFormSecretaria({ nome:'', sigla:'', descricao:'', data_inicio:'', data_fim:'', email:'', whatsapp:'', outros_sistemas:false, cnpj:'', razao_social:'', codigo_unidade:'', responsaveis:[], setores:[] });
                    }
                  }}
                  className="btn-secondary"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={() => { setShowModalSecretaria(false); setEditingSecretaria(null); }}
                  className="btn-secondary"
                >
                  Sair
                </button>
                <button type="submit" disabled={loading} className="btn-primary">
                  {loading ? '⏳ Salvando...' : '✅ Salvar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Criar/Editar Setor */}
      {showModalSetor && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white dark:bg-gray-800 rounded-xl max-w-lg w-full my-8 shadow-xl">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 sticky top-0 bg-white dark:bg-gray-800 z-10">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                {editingSetor ? '✏️ Editar Setor' : '📍 Novo Setor'}
              </h2>
            </div>

            <form onSubmit={handleSubmitSetor} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nome do Setor *</label>
                <input type="text" value={formSetor.nome} onChange={(e) => setFormSetor({ ...formSetor, nome: e.target.value })} required className="input-field" placeholder="Ex: Protocolo Geral" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Descrição</label>
                <textarea
                  value={formSetor.descricao}
                  onChange={(e) => setFormSetor({ ...formSetor, descricao: e.target.value })}
                  rows="3"
                  className="input-field resize-none"
                  placeholder="Breve descrição do setor"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t border-gray-100 dark:border-gray-700">
                <button type="button" onClick={() => { setShowModalSetor(false); setEditingSetor(null); }} className="btn-secondary">Cancelar</button>
                <button type="submit" disabled={loading} className="btn-primary">
                  {loading ? '⏳ Salvando...' : (editingSetor ? '💾 Salvar' : '✅ Criar Setor')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Confirmação de Exclusão */}
      {showDeleteModal && deleteTarget && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl max-w-md w-full shadow-xl">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-3">
                <div className="flex-shrink-0 w-10 h-10 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center">
                  <AlertTriangle className="h-6 w-6 text-red-600 dark:text-red-400" />
                </div>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                  ⚠️ Confirmar Exclusão
                </h2>
              </div>
            </div>

            <div className="p-6">
              <p className="text-gray-700 dark:text-gray-300 mb-4">
                {deleteTarget.type === 'secretaria' ? (
                  <>
                    Tem certeza que deseja excluir a secretaria <strong>{deleteTarget.data.nome}</strong>?
                    {deleteTarget.data.setores?.length > 0 && (
                      <span className="block mt-2 text-red-600 text-sm">
                        ⚠️ Todos os {deleteTarget.data.setores.length} setores vinculados também serão excluídos.
                      </span>
                    )}
                  </>
                ) : (
                  <>
                    Tem certeza que deseja excluir o setor <strong>{deleteTarget.data.nome}</strong>?
                  </>
                )}
              </p>
              <p className="text-sm text-gray-600">
                Esta ação não pode ser desfeita.
              </p>
            </div>

            <div className="px-6 py-4 bg-gray-50 dark:bg-gray-700/50 border-t border-gray-200 dark:border-gray-700 flex justify-end space-x-3">
              <button onClick={() => { setShowDeleteModal(false); setDeleteTarget(null); }} className="btn-secondary">Cancelar</button>
              <button onClick={confirmDelete} className="btn-danger flex items-center gap-2">
                <Trash2 className="h-4 w-4" />
                🗑️ Confirmar Exclusão
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Painel de Setores ── */}
      {showSetoresPanel && selectedSecretaria && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl max-w-2xl w-full shadow-xl flex flex-col max-h-[80vh]">
            {/* Header */}
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between shrink-0">
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  📍 Setores — {selectedSecretaria.nome}
                  {selectedSecretaria.sigla && <span className="text-gray-400 font-normal text-base ml-1">({selectedSecretaria.sigla})</span>}
                </h2>
              </div>
              <button onClick={() => { setShowSetoresPanel(false); setSelectedSetorInPanel(null); }}
                className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg">
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Tabela */}
            <div className="overflow-y-auto flex-1">
              <table className="w-full text-sm">
                <thead className="bg-gray-100 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700">
                  <tr>
                    <th className="w-8 px-4 py-2.5"></th>
                    <th className="text-left px-4 py-2.5 font-semibold text-gray-600 dark:text-gray-300">Descrição</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {(selectedSecretaria.setores || []).length === 0 ? (
                    <tr>
                      <td colSpan={2} className="text-center py-10 text-gray-400 dark:text-gray-500">
                        <Briefcase className="h-8 w-8 mx-auto mb-2 opacity-40" />
                        <p className="text-sm">Nenhum setor cadastrado para esta secretaria</p>
                        <p className="text-xs mt-1 text-gray-300">Clique em "Incluir" para adicionar</p>
                      </td>
                    </tr>
                  ) : (
                    (selectedSecretaria.setores || []).map(setor => {
                      const isSel = selectedSetorInPanel?.id === setor.id;
                      return (
                        <tr
                          key={setor.id}
                          onClick={() => setSelectedSetorInPanel(isSel ? null : setor)}
                          onDoubleClick={() => { handleEditSetor(setor, selectedSecretaria.id); }}
                          className={`cursor-pointer transition-colors select-none ${
                            isSel ? 'bg-blue-600 text-white' : 'hover:bg-blue-50 dark:hover:bg-blue-900/10'
                          }`}
                        >
                          <td className="px-4 py-2.5 text-center">
                            {isSel && <span className="text-white text-xs">▶</span>}
                          </td>
                          <td className={`px-4 py-2.5 font-medium ${isSel ? 'text-white' : 'text-gray-900 dark:text-gray-100'}`}>
                            {setor.nome}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Toolbar inferior */}
            <div className="px-4 py-2.5 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/30 flex items-center justify-between shrink-0">
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {(selectedSecretaria.setores || []).length} setor(es)
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleCreateSetor(selectedSecretaria.id)}
                  className="btn-primary flex items-center gap-1.5 text-sm px-3 py-1.5"
                >
                  <Plus className="h-4 w-4" /> Incluir
                </button>
                <button
                  onClick={() => selectedSetorInPanel && handleEditSetor(selectedSetorInPanel, selectedSecretaria.id)}
                  disabled={!selectedSetorInPanel}
                  className="btn-secondary flex items-center gap-1.5 text-sm px-3 py-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <Edit2 className="h-4 w-4" /> Alterar
                </button>
                <button
                  onClick={() => selectedSetorInPanel && handleDeleteSetor(selectedSetorInPanel, selectedSecretaria)}
                  disabled={!selectedSetorInPanel}
                  className="btn-danger flex items-center gap-1.5 text-sm px-3 py-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <Trash2 className="h-4 w-4" /> Excluir
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal Novo/Editar Agente ── */}
      {showModalAgente && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white dark:bg-gray-800 rounded-xl max-w-lg w-full my-8 shadow-xl">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                🪪 Cadastro de agentes — {editingAgente ? 'Edição' : 'Inclusão'}
              </h2>
              <button onClick={() => { setShowModalAgente(false); setEditingAgente(null); }}
                className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="px-6 py-3 bg-gray-50 dark:bg-gray-700/30 border-b border-gray-200 dark:border-gray-700">
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Informações informações</p>
            </div>
            <form onSubmit={saveAgente} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nome *</label>
                <input
                  type="text"
                  value={formAgente.nome}
                  onChange={e => setFormAgente(p => ({...p, nome: e.target.value}))}
                  required
                  autoFocus
                  className="input-field"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nome reduzido</label>
                <input
                  type="text"
                  value={formAgente.nome_reduzido || ''}
                  onChange={e => setFormAgente(p => ({...p, nome_reduzido: e.target.value}))}
                  className="input-field"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">CPF</label>
                  <input
                    type="text"
                    value={formAgente.cpf || ''}
                    onChange={e => setFormAgente(p => ({...p, cpf: formatCPF(e.target.value)}))}
                    maxLength={14}
                    className="input-field font-mono"
                    placeholder="000.000.000-00"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nascimento</label>
                  <input
                    type="date"
                    value={formAgente.nascimento || ''}
                    onChange={e => setFormAgente(p => ({...p, nascimento: e.target.value}))}
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Telefone</label>
                  <input
                    type="text"
                    value={formAgente.telefone || ''}
                    onChange={e => setFormAgente(p => ({...p, telefone: formatTelefone(e.target.value)}))}
                    maxLength={15}
                    className="input-field"
                    placeholder="(00) 00000-0000"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Matrícula</label>
                  <input
                    type="text"
                    value={formAgente.matricula || ''}
                    onChange={e => setFormAgente(p => ({...p, matricula: e.target.value}))}
                    className="input-field font-mono"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">E-mail</label>
                <input
                  type="email"
                  value={formAgente.email || ''}
                  onChange={e => setFormAgente(p => ({...p, email: e.target.value}))}
                  className="input-field"
                  placeholder="email@exemplo.com.br"
                />
              </div>
              <div className="flex justify-end gap-2 pt-3 border-t border-gray-100 dark:border-gray-700">
                <button
                  type="button"
                  onClick={() => setFormAgente(editingAgente ? { ...editingAgente } : {
                    nome: '', nome_reduzido: '', cpf: '', nascimento: '', telefone: '', email: '', matricula: ''
                  })}
                  className="btn-secondary"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={() => { setShowModalAgente(false); setEditingAgente(null); }}
                  className="btn-secondary"
                >
                  Sair
                </button>
                <button type="submit" className="btn-primary">
                  {editingAgente ? '💾 Salvar' : '✅ Salvar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Confirmação exclusão Agente ── */}
      {showDeleteAgenteModal && deleteAgenteTarget && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl max-w-md w-full shadow-xl">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center gap-3">
              <div className="w-10 h-10 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center shrink-0">
                <AlertTriangle className="h-5 w-5 text-red-600" />
              </div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Confirmar Exclusão</h2>
            </div>
            <div className="p-6">
              <p className="text-gray-700 dark:text-gray-300">
                Excluir o agente <strong>{deleteAgenteTarget.nome}</strong>? Esta ação não pode ser desfeita.
              </p>
            </div>
            <div className="px-6 py-4 bg-gray-50 dark:bg-gray-700/50 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3">
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
      {showModalResp && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white dark:bg-gray-800 rounded-xl max-w-lg w-full my-8 shadow-xl">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                👤 Cadastro de responsável — {editingResp ? 'Edição' : 'Inclusão'}
              </h2>
              <button onClick={() => { setShowModalResp(false); setEditingResp(null); }}
                className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="px-6 py-2.5 bg-gray-50 dark:bg-gray-700/30 border-b border-gray-200 dark:border-gray-700">
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Informações do responsável</p>
            </div>
            <form onSubmit={saveResponsavel} className="p-6 space-y-4">
              {/* Datas */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Data início *</label>
                  <input
                    type="date"
                    value={formResp.data_inicio}
                    onChange={e => setFormResp(p => ({...p, data_inicio: e.target.value}))}
                    required
                    autoFocus
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Data fim <span className="font-normal text-gray-400">(vazio = atual)</span>
                  </label>
                  <input
                    type="date"
                    value={formResp.data_fim}
                    onChange={e => setFormResp(p => ({...p, data_fim: e.target.value}))}
                    className="input-field"
                  />
                </div>
              </div>

              {/* Agente: seleciona do cadastro de agentes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Agente</label>
                <select
                  value={formResp.agente_id}
                  onChange={e => {
                    const ag = agentes.find(a => a.id === e.target.value);
                    setFormResp(p => ({
                      ...p,
                      agente_id: e.target.value,
                      nome: ag ? ag.nome : p.nome
                    }));
                  }}
                  className="input-field"
                >
                  <option value="">— selecionar do cadastro de agentes —</option>
                  {agentes.map(a => (
                    <option key={a.id} value={a.id}>{a.nome}</option>
                  ))}
                </select>
                {!formResp.agente_id && (
                  <div className="mt-2">
                    <input
                      type="text"
                      value={formResp.nome}
                      onChange={e => setFormResp(p => ({...p, nome: e.target.value}))}
                      required={!formResp.agente_id}
                      className="input-field"
                      placeholder="Ou digite o nome manualmente *"
                    />
                  </div>
                )}
                {formResp.agente_id && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Nome: <strong>{formResp.nome}</strong>
                  </p>
                )}
              </div>

              {/* Cargo */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Cargo</label>
                <select
                  value={formResp.cargo}
                  onChange={e => setFormResp(p => ({...p, cargo: e.target.value}))}
                  className="input-field"
                >
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

              {/* Secretaria\órgão */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Secretaria\órgão *</label>
                <select
                  value={formResp.secretaria_id}
                  onChange={e => setFormResp(p => ({...p, secretaria_id: e.target.value}))}
                  required
                  className="input-field"
                  disabled={!!editingResp}
                >
                  <option value="">Selecione...</option>
                  {secretarias.map(s => (
                    <option key={s.id} value={s.id}>{s.nome}</option>
                  ))}
                </select>
                {editingResp && (
                  <p className="text-xs text-gray-400 mt-1">Para trocar a secretaria, remova e re-cadastre.</p>
                )}
              </div>

              {/* Amparo legal */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Amparo</label>
                <div className="flex gap-2 items-center">
                  <input
                    type="text"
                    value={formResp.amparo}
                    onChange={e => setFormResp(p => ({...p, amparo: e.target.value}))}
                    className="input-field flex-1"
                    placeholder="Ex: Portaria: 001/2024"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-gray-100 dark:border-gray-700">
                <button
                  type="button"
                  onClick={() => setFormResp(editingResp
                    ? { secretaria_id: formResp.secretaria_id, agente_id: formResp.agente_id, nome: formResp.nome, cargo: formResp.cargo, data_inicio: formResp.data_inicio, data_fim: formResp.data_fim, amparo: formResp.amparo }
                    : { secretaria_id: '', agente_id: '', nome: '', cargo: '', data_inicio: '', data_fim: '', amparo: '' }
                  )}
                  className="btn-secondary"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={() => { setShowModalResp(false); setEditingResp(null); }}
                  className="btn-secondary"
                >
                  Sair
                </button>
                <button type="submit" disabled={loading} className="btn-primary">
                  {loading ? '⏳ Salvando...' : '✅ Salvar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Painel de Orçamento ── */}
      {showOrcamentoPanel && selectedSecretaria && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl max-w-lg w-full shadow-xl">
            {/* Header */}
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  💰 Orçamento — {selectedSecretaria.sigla || selectedSecretaria.nome}
                </h2>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{selectedSecretaria.nome}</p>
              </div>
              <button onClick={() => setShowOrcamentoPanel(false)}
                className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg">
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Corpo */}
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-1">Exercício</label>
                  <input
                    type="number"
                    min="2000" max="2099"
                    value={formOrcamento.exercicio}
                    onChange={e => setFormOrcamento(p => ({...p, exercicio: e.target.value}))}
                    disabled={!orcamentoEditing}
                    className="input-field w-28 disabled:bg-gray-50 disabled:text-gray-600 dark:disabled:bg-gray-700/30"
                    placeholder={new Date().getFullYear()}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-1">Valor LOA (Lei Orçamentária Anual)</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">R$</span>
                  <input
                    type="number"
                    min="0" step="0.01"
                    value={formOrcamento.valor_loa}
                    onChange={e => setFormOrcamento(p => ({...p, valor_loa: e.target.value}))}
                    disabled={!orcamentoEditing}
                    className="input-field pl-9 disabled:bg-gray-50 disabled:text-gray-600 dark:disabled:bg-gray-700/30"
                    placeholder="0,00"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-1">Valor Suplementado</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">R$</span>
                  <input
                    type="number"
                    min="0" step="0.01"
                    value={formOrcamento.valor_suplementado}
                    onChange={e => setFormOrcamento(p => ({...p, valor_suplementado: e.target.value}))}
                    disabled={!orcamentoEditing}
                    className="input-field pl-9 disabled:bg-gray-50 disabled:text-gray-600 dark:disabled:bg-gray-700/30"
                    placeholder="0,00"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-1">Valor Reduzido</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">R$</span>
                  <input
                    type="number"
                    min="0" step="0.01"
                    value={formOrcamento.valor_reduzido}
                    onChange={e => setFormOrcamento(p => ({...p, valor_reduzido: e.target.value}))}
                    disabled={!orcamentoEditing}
                    className="input-field pl-9 disabled:bg-gray-50 disabled:text-gray-600 dark:disabled:bg-gray-700/30"
                    placeholder="0,00"
                  />
                </div>
              </div>

              {/* Valor vigente calculado */}
              <div className="bg-indigo-50 dark:bg-indigo-900/20 rounded-lg p-4 flex items-center justify-between">
                <span className="text-sm font-semibold text-indigo-700 dark:text-indigo-300">Valor Vigente (LOA + Suplementado − Reduzido)</span>
                <span className="text-lg font-bold text-indigo-700 dark:text-indigo-300">
                  {formatBRL(
                    (parseFloat(formOrcamento.valor_loa          || '0') || 0) +
                    (parseFloat(formOrcamento.valor_suplementado || '0') || 0) -
                    (parseFloat(formOrcamento.valor_reduzido     || '0') || 0)
                  )}
                </span>
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-2">
              {!orcamentoEditing ? (
                <>
                  <button onClick={() => setShowOrcamentoPanel(false)} className="btn-secondary">Fechar</button>
                  <button onClick={() => setOrcamentoEditing(true)} className="btn-primary flex items-center gap-1.5">
                    <Edit2 className="h-4 w-4" /> Alterar
                  </button>
                </>
              ) : (
                <>
                  <button onClick={() => { setFormOrcamento(orcamentoOriginal); setOrcamentoEditing(false); }} className="btn-secondary">Cancelar</button>
                  <button onClick={saveOrcamento} disabled={loading} className="btn-primary">
                    {loading ? '⏳ Salvando...' : '✅ Salvar'}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Painel de Dotações ── */}
      {showDotacoesPanel && selectedSecretaria && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl max-w-3xl w-full shadow-xl flex flex-col max-h-[85vh]">
            {/* Header */}
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between shrink-0">
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  📊 Dotações Orçamentárias — {selectedSecretaria.sigla || selectedSecretaria.nome}
                </h2>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{selectedSecretaria.nome}</p>
              </div>
              <button onClick={() => setShowDotacoesPanel(false)}
                className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg">
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Tabela */}
            <div className="overflow-y-auto flex-1">
              <table className="w-full text-sm">
                <thead className="bg-gray-100 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700 sticky top-0">
                  <tr>
                    <th className="w-8 px-3 py-2.5"></th>
                    <th className="text-left px-3 py-2.5 font-semibold text-gray-600 dark:text-gray-300">Código</th>
                    <th className="text-left px-3 py-2.5 font-semibold text-gray-600 dark:text-gray-300">Descrição</th>
                    <th className="text-left px-3 py-2.5 font-semibold text-gray-600 dark:text-gray-300">El. Despesa</th>
                    <th className="text-left px-3 py-2.5 font-semibold text-gray-600 dark:text-gray-300">Fonte</th>
                    <th className="text-right px-3 py-2.5 font-semibold text-gray-600 dark:text-gray-300">Valor Previsto</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {dotacoesList.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center py-10 text-gray-400 dark:text-gray-500 text-sm">
                        Nenhuma dotação cadastrada. Use "Incluir" para adicionar.
                      </td>
                    </tr>
                  ) : dotacoesList.map(dot => {
                    const isSel = selectedDotacao?.id === dot.id;
                    return (
                      <tr
                        key={dot.id}
                        onClick={() => { setSelectedDotacao(isSel ? null : dot); setShowFormDotacao(false); }}
                        onDoubleClick={() => { setSelectedDotacao(dot); setEditingDotacao(dot); setFormDotacao({ codigo: dot.codigo||'', descricao: dot.descricao||'', elemento_despesa: dot.elemento_despesa||'', fonte_recurso: dot.fonte_recurso||'', valor_previsto: dot.valor_previsto != null ? String(dot.valor_previsto) : '' }); setShowFormDotacao(true); }}
                        className={`cursor-pointer transition-colors select-none ${isSel ? 'bg-blue-600 text-white' : 'hover:bg-blue-50 dark:hover:bg-blue-900/10'}`}
                      >
                        <td className="px-3 py-2.5 text-center">{isSel && <span className="text-white text-xs">▶</span>}</td>
                        <td className={`px-3 py-2.5 font-mono text-xs ${isSel ? 'text-blue-100' : 'text-gray-700 dark:text-gray-300'}`}>{dot.codigo || '—'}</td>
                        <td className={`px-3 py-2.5 ${isSel ? 'text-white' : 'text-gray-900 dark:text-gray-100'}`}>{dot.descricao || '—'}</td>
                        <td className={`px-3 py-2.5 font-mono text-xs ${isSel ? 'text-blue-100' : 'text-gray-500'}`}>{dot.elemento_despesa || '—'}</td>
                        <td className={`px-3 py-2.5 text-xs ${isSel ? 'text-blue-100' : 'text-gray-500'}`}>{dot.fonte_recurso || '—'}</td>
                        <td className={`px-3 py-2.5 text-right font-mono text-xs ${isSel ? 'text-blue-100' : 'text-gray-700 dark:text-gray-300'}`}>
                          {dot.valor_previsto != null ? formatBRL(dot.valor_previsto) : '—'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                {dotacoesList.length > 0 && (
                  <tfoot>
                    <tr className="bg-indigo-50 dark:bg-indigo-900/20 border-t-2 border-indigo-200 dark:border-indigo-700">
                      <td colSpan={5} className="px-3 py-2.5 text-right text-xs font-bold text-indigo-700 dark:text-indigo-300">Total Geral:</td>
                      <td className="px-3 py-2.5 text-right font-bold text-indigo-700 dark:text-indigo-300">
                        {formatBRL(dotacoesList.reduce((acc, d) => acc + (parseFloat(d.valor_previsto) || 0), 0))}
                      </td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>

            {/* Formulário inline de inclusão/edição */}
            {showFormDotacao && (
              <div className="border-t border-gray-200 dark:border-gray-700 p-4 bg-gray-50 dark:bg-gray-700/30 shrink-0">
                <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-3">
                  {editingDotacao ? 'Editar Dotação' : 'Nova Dotação'}
                </h3>
                <form onSubmit={handleSubmitDotacao} className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Código da Dotação *</label>
                      <input
                        required
                        value={formDotacao.codigo}
                        onChange={e => setFormDotacao(p => ({...p, codigo: e.target.value}))}
                        className="input-field text-sm font-mono"
                        placeholder="Ex: 10.301.0007.2.001"
                        autoFocus
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Elemento de Despesa</label>
                      <input
                        value={formDotacao.elemento_despesa}
                        onChange={e => setFormDotacao(p => ({...p, elemento_despesa: e.target.value}))}
                        className="input-field text-sm font-mono"
                        placeholder="Ex: 3.3.90.39"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Descrição / Ação *</label>
                    <input
                      required
                      value={formDotacao.descricao}
                      onChange={e => setFormDotacao(p => ({...p, descricao: e.target.value}))}
                      className="input-field text-sm"
                      placeholder="Descrição da ação orçamentária"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Fonte de Recurso</label>
                      <input
                        value={formDotacao.fonte_recurso}
                        onChange={e => setFormDotacao(p => ({...p, fonte_recurso: e.target.value}))}
                        className="input-field text-sm"
                        placeholder="Ex: 15"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Valor Previsto (R$)</label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">R$</span>
                        <input
                          type="number" min="0" step="0.01"
                          value={formDotacao.valor_previsto}
                          onChange={e => setFormDotacao(p => ({...p, valor_previsto: e.target.value}))}
                          className="input-field pl-9 text-sm"
                          placeholder="0,00"
                        />
                      </div>
                    </div>
                  </div>
                  <div className="flex justify-end gap-2 pt-1">
                    <button type="button" onClick={() => { setShowFormDotacao(false); setEditingDotacao(null); setSelectedDotacao(null); }} className="btn-secondary text-sm px-3 py-1.5">Cancelar</button>
                    <button type="submit" disabled={loading} className="btn-primary text-sm px-3 py-1.5">
                      {loading ? '⏳' : (editingDotacao ? '💾 Salvar' : '✅ Adicionar')}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Toolbar */}
            <div className="px-4 py-2.5 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/30 flex items-center justify-between shrink-0">
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {dotacoesList.length} dotação(ões) cadastrada(s)
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => { setEditingDotacao(null); setFormDotacao({ codigo: '', descricao: '', elemento_despesa: '', fonte_recurso: '', valor_previsto: '' }); setShowFormDotacao(true); setSelectedDotacao(null); }}
                  className="btn-primary flex items-center gap-1.5 text-sm px-3 py-1.5"
                >
                  <Plus className="h-4 w-4" /> Incluir
                </button>
                <button
                  onClick={() => { if (selectedDotacao) { setEditingDotacao(selectedDotacao); setFormDotacao({ codigo: selectedDotacao.codigo||'', descricao: selectedDotacao.descricao||'', elemento_despesa: selectedDotacao.elemento_despesa||'', fonte_recurso: selectedDotacao.fonte_recurso||'', valor_previsto: selectedDotacao.valor_previsto != null ? String(selectedDotacao.valor_previsto) : '' }); setShowFormDotacao(true); } }}
                  disabled={!selectedDotacao}
                  className="btn-secondary flex items-center gap-1.5 text-sm px-3 py-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <Edit2 className="h-4 w-4" /> Alterar
                </button>
                <button
                  onClick={deleteDotacao}
                  disabled={!selectedDotacao}
                  className="btn-danger flex items-center gap-1.5 text-sm px-3 py-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <Trash2 className="h-4 w-4" /> Excluir
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
