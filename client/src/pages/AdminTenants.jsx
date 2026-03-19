import { useQuery, useMutation } from 'react-query';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { 
  Plus, 
  Building, 
  Edit2, 
  Trash2, 
  Globe, 
  MapPin, 
  CheckCircle, 
  XCircle,
  Database,
  Shield,
  BarChart3,
  Settings,
  LogOut,
  Upload,
  UserPlus,
  Image,
  AlertTriangle,
  Lock,
  Unlock,
  Package,
  Inbox,
  DollarSign,
  ScrollText
} from 'lucide-react';

const SYSTEM_MODULES = [
  { id: 'processos',    label: 'Processos',    emoji: '📋', descricao: 'Gestão de protocolos e processos administrativos', Icon: Inbox },
  { id: 'almoxarifado', label: 'Almoxarifado', emoji: '📦', descricao: 'Controle de estoque e materiais', Icon: Package },
  { id: 'financeiro',   label: 'Financeiro',   emoji: '💵', descricao: 'Gestão financeira e DIDs', Icon: DollarSign },
  { id: 'contratos',    label: 'Contratos',    emoji: '📝', descricao: 'Gestão de contratos', Icon: ScrollText },
];

export default function AdminTenants() {
  const navigate = useNavigate();
  const [showModal, setShowModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedTenant, setSelectedTenant] = useState(null);
  const [showStats, setShowStats] = useState(true);
  const [brasaoPreview, setBrasaoPreview] = useState(null);
  const [showAdminForm, setShowAdminForm] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [modulosHabilitados, setModulosHabilitados] = useState([]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('subdomain');
    localStorage.removeItem('isAdmin');
    navigate('/');
  };

  // Buscar todos os tenants
  const { data: tenantsData, refetch, isLoading } = useQuery('tenants', async () => {
    const { data } = await api.get('/tenants');
    return data;
  });

  // Buscar estatísticas
  const { data: statsData } = useQuery('tenant-statistics', async () => {
    const { data } = await api.get('/tenants/statistics');
    return data;
  });

  // Mutation para criar tenant
  const createMutation = useMutation(
    async (data) => {
      const response = await api.post('/tenants', data);
      return response.data;
    },
    {
      onSuccess: () => {
        setShowModal(false);
        refetch();
        alert('Município cadastrado com sucesso! Banco de dados isolado criado.');
      },
      onError: (error) => {
        alert(error.response?.data?.error || 'Erro ao criar município');
      }
    }
  );

  // Mutation para atualizar tenant
  const updateMutation = useMutation(
    async ({ id, data }) => {
      const response = await api.put(`/tenants/${id}`, data);
      return response.data;
    },
    {
      onSuccess: (data) => {
        setShowEditModal(false);
        setSelectedTenant(null);
        setBrasaoPreview(null);
        refetch();
        if (data.aviso) {
          alert(`Município atualizado com sucesso!\n\nAviso: ${data.aviso}`);
        } else {
          alert(data.message || 'Município atualizado com sucesso!');
        }
      },
      onError: (error) => {
        alert(error.response?.data?.error || 'Erro ao atualizar município');
      }
    }
  );

  // Mutation para deletar/desativar tenant
  const deleteMutation = useMutation(
    async (id) => {
      const response = await api.delete(`/tenants/${id}`);
      return response.data;
    },
    {
      onSuccess: () => {
        refetch();
        alert('Município desativado com sucesso!');
      },
      onError: (error) => {
        alert(error.response?.data?.error || 'Erro ao desativar município');
      }
    }
  );

  const handleSubmit = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    
    const data = {
      nome: formData.get('nome'),
      cnpj: formData.get('cnpj'),
      subdominio: formData.get('subdominio'),
      cidade: formData.get('cidade'),
      estado: formData.get('estado'),
      adminNome: formData.get('adminNome'),
      adminEmail: formData.get('adminEmail'),
      adminCpf: formData.get('adminCpf'),
      adminSenha: formData.get('adminSenha'),
      configuracoes: {
        cor_primaria: formData.get('cor_primaria') || '#0066CC',
        cor_secundaria: formData.get('cor_secundaria') || '#004C99',
        modulos_habilitados: modulosHabilitados,
      }
    };

    createMutation.mutate(data);
  };

  const toggleModulo = (id) => {
    setModulosHabilitados(prev =>
      prev.includes(id) ? prev.filter(m => m !== id) : [...prev, id]
    );
  };

  const handleEdit = (tenant) => {
    setSelectedTenant(tenant);
    setModulosHabilitados(tenant.configuracoes?.modulos_habilitados || []);
    setBrasaoPreview(null);
    setShowEditModal(true);
  };

  const handleUpdateSubmit = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);

    // Validar dados do administrador (todos ou nenhum)
    const adminNome = formData.get('adminNome')?.trim();
    const adminCpf = formData.get('adminCpf')?.trim();
    const adminEmail = formData.get('adminEmail')?.trim();
    const adminSenha = formData.get('adminSenha');
    if ((adminNome || adminCpf || adminEmail || adminSenha) && (!adminNome || !adminCpf || !adminSenha)) {
      alert('Para cadastrar um administrador, preencha: Nome, CPF e Senha.');
      return;
    }

    // Converter brasão para base64 se um novo arquivo foi selecionado
    let brasaoUrl = selectedTenant.configuracoes?.brasao_url || null;
    const brasaoFile = formData.get('brasao');
    if (brasaoFile && brasaoFile.size > 0) {
      brasaoUrl = await new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.readAsDataURL(brasaoFile);
      });
    }

    const data = {
      nome: formData.get('nome'),
      cnpj: formData.get('cnpj'),
      cidade: formData.get('cidade'),
      estado: formData.get('estado'),
      ativo: formData.get('ativo') === 'true',
      configuracoes: {
        ...(selectedTenant.configuracoes || {}),
        cor_primaria: formData.get('cor_primaria'),
        cor_secundaria: formData.get('cor_secundaria'),
        modulos_habilitados: modulosHabilitados,
        brasao_url: brasaoUrl,
      },
      ...(adminNome && adminCpf && adminSenha
        ? { adminNome, adminCpf, adminEmail: adminEmail || null, adminSenha }
        : {})
    };

    updateMutation.mutate({ id: selectedTenant.id, data });
  };

  const handleDelete = (tenant) => {
    setDeleteTarget(tenant);
    setShowDeleteModal(true);
  };

  const confirmDelete = () => {
    if (deleteTarget) {
      deleteMutation.mutate(deleteTarget.id);
      setShowDeleteModal(false);
      setDeleteTarget(null);
    }
  };

  const tenants = tenantsData?.tenants || [];
  const stats = statsData?.estatisticas || {};

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-gradient-to-br from-blue-600 to-blue-700 p-3 rounded-xl shadow-lg">
                <Globe className="h-8 w-8 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Área Restrita - Gestão Multi-Tenant</h1>
                <p className="text-gray-600 mt-1">Gerencie municípios e configurações do sistema</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-4 py-2 text-gray-700 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            >
              <LogOut className="h-5 w-5" />
              <span className="font-medium">Sair</span>
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Actions */}
        <div className="flex justify-between items-center">
          <button
            onClick={() => setShowStats(!showStats)}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <BarChart3 className="h-5 w-5" />
            <span>{showStats ? 'Ocultar' : 'Mostrar'} Estatísticas</span>
          </button>
          <button
            onClick={() => { setModulosHabilitados([]); setShowModal(true); }}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 flex items-center gap-2 shadow-lg"
          >
            <Plus className="h-5 w-5" />
            <span>Novo Município</span>
          </button>
        </div>

      {/* Estatísticas */}
      {showStats && statsData && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total de Municípios</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">{stats.total || 0}</p>
              </div>
              <Building className="h-10 w-10 text-blue-500" />
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Ativos</p>
                <p className="text-3xl font-bold text-green-600 mt-1">{stats.ativos || 0}</p>
              </div>
              <CheckCircle className="h-10 w-10 text-green-500" />
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Inativos</p>
                <p className="text-3xl font-bold text-red-600 mt-1">{stats.inativos || 0}</p>
              </div>
              <XCircle className="h-10 w-10 text-red-500" />
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Bancos Isolados</p>
                <p className="text-3xl font-bold text-purple-600 mt-1">{stats.total || 0}</p>
              </div>
              <Database className="h-10 w-10 text-purple-500" />
            </div>
          </div>
        </div>
      )}

      {/* Info de Isolamento */}
      {statsData?.isolamento && (
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-6">
          <div className="flex items-start space-x-4">
            <Shield className="h-8 w-8 text-blue-600 mt-1" />
            <div>
              <h3 className="font-semibold text-lg text-gray-900">{statsData.isolamento.tipo}</h3>
              <p className="text-gray-700 mt-1">{statsData.isolamento.descricao}</p>
              <p className="text-green-700 font-medium mt-2">✓ {statsData.isolamento.seguranca}</p>
              <p className="text-sm text-gray-600 mt-2">Banco de dados: <code className="bg-white px-2 py-1 rounded">{statsData.isolamento.banco}</code></p>
            </div>
          </div>
        </div>
      )}

      {/* Lista de Tenants */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Municípios Cadastrados</h2>
        </div>

        {isLoading ? (
          <div className="p-8 text-center text-gray-500">Carregando...</div>
        ) : tenants.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <Building className="h-16 w-16 mx-auto text-gray-300 mb-4" />
            <p>Nenhum município cadastrado</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Município</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Localização</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Subdomínio</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Schema DB</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ações</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {tenants.map((tenant) => (
                  <tr key={tenant.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div>
                        <div className="font-medium text-gray-900">{tenant.nome_municipio}</div>
                        <div className="text-sm text-gray-500">{tenant.cnpj}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center text-sm text-gray-700">
                        <MapPin className="h-4 w-4 mr-1 text-gray-400" />
                        {tenant.cidade}/{tenant.estado}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center text-sm space-x-2">
                        <Globe className="h-4 w-4 text-blue-500" />
                        <a 
                          href={`/${tenant.subdominio}/login`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="bg-blue-50 text-blue-700 px-2 py-1 rounded hover:bg-blue-100 transition-colors"
                        >
                          /{tenant.subdominio}
                        </a>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center text-sm">
                        <Database className="h-4 w-4 mr-1 text-purple-500" />
                        <code className="bg-purple-50 text-purple-700 px-2 py-1 rounded text-xs">
                          {tenant.schema}
                        </code>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {tenant.ativo ? (
                        <span className="px-3 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800 flex items-center w-fit">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Ativo
                        </span>
                      ) : (
                        <span className="px-3 py-1 text-xs font-medium rounded-full bg-red-100 text-red-800 flex items-center w-fit">
                          <XCircle className="h-3 w-3 mr-1" />
                          Inativo
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleEdit(tenant)}
                          className="text-blue-600 hover:text-blue-800"
                          title="Editar"
                        >
                          <Edit2 className="h-5 w-5" />
                        </button>
                        <button
                          onClick={() => handleDelete(tenant)}
                          className="text-red-600 hover:text-red-800"
                          title="Desativar"
                        >
                          <Trash2 className="h-5 w-5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Criar Tenant */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">Cadastrar Novo Município</h2>
              <p className="text-sm text-gray-600 mt-1">Será criado um banco de dados isolado para este município</p>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              {/* Dados do Município */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Dados do Município</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Nome do Município *
                    </label>
                    <input
                      type="text"
                      name="nome"
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                      placeholder="Ex: Prefeitura Municipal de..."
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      CNPJ *
                    </label>
                    <input
                      type="text"
                      name="cnpj"
                      required
                      maxLength="14"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                      placeholder="Apenas números"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Cidade *
                    </label>
                    <input
                      type="text"
                      name="cidade"
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Estado (UF) *
                    </label>
                    <select
                      name="estado"
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                    >
                      <option value="">Selecione...</option>
                      {['AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'].map(uf => (
                        <option key={uf} value={uf}>{uf}</option>
                      ))}
                    </select>
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Subdomínio * <span className="text-gray-500">(usado para acesso)</span>
                    </label>
                    <div className="flex items-center">
                      <input
                        type="text"
                        name="subdominio"
                        required
                        pattern="[a-z0-9-]+"
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-l-md focus:ring-primary-500 focus:border-primary-500"
                        placeholder="exemplo"
                      />
                      <span className="px-4 py-2 bg-gray-100 border border-l-0 border-gray-300 rounded-r-md text-gray-600">
                        .jprocesso.gov.br
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">Apenas letras minúsculas, números e hífen</p>
                  </div>
                </div>
              </div>

              {/* Configurações Visuais */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Configurações Visuais</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Cor Primária
                    </label>
                    <input
                      type="color"
                      name="cor_primaria"
                      defaultValue="#0066CC"
                      className="w-full h-10 border border-gray-300 rounded-md"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Cor Secundária
                    </label>
                    <input
                      type="color"
                      name="cor_secundaria"
                      defaultValue="#004C99"
                      className="w-full h-10 border border-gray-300 rounded-md"
                    />
                  </div>
                </div>
              </div>

              {/* Dados do Administrador */}
              <div className="border-t pt-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Usuário Administrador</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Nome Completo *
                    </label>
                    <input
                      type="text"
                      name="adminNome"
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      CPF *
                    </label>
                    <input
                      type="text"
                      name="adminCpf"
                      required
                      maxLength="11"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                      placeholder="Apenas números"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      E-mail *
                    </label>
                    <input
                      type="email"
                      name="adminEmail"
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Senha *
                    </label>
                    <input
                      type="password"
                      name="adminSenha"
                      required
                      minLength="6"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                    />
                  </div>
                </div>
              </div>

              {/* Módulos do Sistema */}
              <div className="border-t pt-6">
                <h3 className="text-lg font-medium text-gray-900 mb-1 flex items-center gap-2">
                  <Lock className="h-5 w-5 text-gray-700" />
                  Módulos Habilitados
                </h3>
                <p className="text-sm text-gray-500 mb-4">Selecione quais módulos serão liberados para este município. Módulos não selecionados exibirão uma tela de bloqueio ao serem acessados.</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {SYSTEM_MODULES.map(({ id, label, emoji, descricao, Icon }) => {
                    const ativo = modulosHabilitados.includes(id);
                    return (
                      <button
                        key={id}
                        type="button"
                        onClick={() => toggleModulo(id)}
                        className={`flex items-center gap-3 p-3 rounded-lg border-2 text-left transition-all ${
                          ativo
                            ? 'border-green-500 bg-green-50 text-green-800'
                            : 'border-gray-200 bg-gray-50 text-gray-500'
                        }`}
                      >
                        <div className={`flex-shrink-0 p-1.5 rounded-lg ${ativo ? 'bg-green-100' : 'bg-gray-200'}`}>
                          <Icon className={`h-5 w-5 ${ativo ? 'text-green-600' : 'text-gray-400'}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm">{emoji} {label}</p>
                          <p className="text-xs text-gray-400 truncate">{descricao}</p>
                        </div>
                        {ativo
                          ? <Unlock className="h-4 w-4 text-green-500 flex-shrink-0" />
                          : <Lock className="h-4 w-4 text-gray-400 flex-shrink-0" />
                        }
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Informação de Isolamento */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <Database className="h-6 w-6 text-blue-600 mt-0.5" />
                  <div>
                    <p className="font-medium text-blue-900">Banco de Dados Isolado</p>
                    <p className="text-sm text-blue-700 mt-1">
                      Será criado um schema PostgreSQL exclusivo para este município, garantindo isolamento total dos dados.
                      Nenhuma informação será compartilhada com outras prefeituras.
                    </p>
                  </div>
                </div>
              </div>

              {/* Botões */}
              <div className="flex justify-end space-x-3 pt-4 border-t">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isLoading}
                  className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50 flex items-center space-x-2"
                >
                  {createMutation.isLoading ? (
                    <>
                      <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                      <span>Criando...</span>
                    </>
                  ) : (
                    <>
                      <Plus className="h-4 w-4" />
                      <span>Cadastrar Município</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Editar Tenant */}
      {showEditModal && selectedTenant && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">Editar Município</h2>
              <p className="text-sm text-gray-600 mt-1">Subdomínio e Schema não podem ser alterados</p>
            </div>

            <form onSubmit={handleUpdateSubmit} className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nome</label>
                  <input
                    type="text"
                    name="nome"
                    defaultValue={selectedTenant.nome_municipio}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">CNPJ</label>
                  <input
                    type="text"
                    name="cnpj"
                    defaultValue={selectedTenant.cnpj}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Cidade</label>
                  <input
                    type="text"
                    name="cidade"
                    defaultValue={selectedTenant.cidade}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Estado</label>
                  <input
                    type="text"
                    name="estado"
                    defaultValue={selectedTenant.estado}
                    required
                    maxLength="2"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <select
                    name="ativo"
                    defaultValue={selectedTenant.ativo}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  >
                    <option value="true">Ativo</option>
                    <option value="false">Inativo</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Subdomínio (não editável)</label>
                  <input
                    type="text"
                    value={selectedTenant.subdominio}
                    disabled
                    className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100"
                  />
                </div>
              </div>

              {/* Brasão do Município */}
              <div className="border-t pt-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center gap-2">
                  <Image className="h-5 w-5 text-gray-700" />
                  Brasão do Município
                </h3>
                <div className="flex items-start gap-6">
                  {/* Preview */}
                  <div className="flex-shrink-0">
                    <div className="w-32 h-32 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center bg-gray-50">
                      {brasaoPreview || selectedTenant.configuracoes?.brasao_url ? (
                        <img 
                          src={brasaoPreview || selectedTenant.configuracoes?.brasao_url} 
                          alt="Brasão" 
                          className="max-w-full max-h-full object-contain"
                        />
                      ) : (
                        <Image className="h-12 w-12 text-gray-400" />
                      )}
                    </div>
                  </div>
                  
                  {/* Upload */}
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Upload do Brasão
                    </label>
                    <input
                      type="file"
                      name="brasao"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files[0];
                        if (file) {
                          if (file.size > 2 * 1024 * 1024) {
                            alert('O brasão deve ter no máximo 2MB.');
                            e.target.value = '';
                            return;
                          }
                          const reader = new FileReader();
                          reader.onloadend = () => setBrasaoPreview(reader.result);
                          reader.readAsDataURL(file);
                        }
                      }}
                      className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                    />
                    <p className="text-xs text-gray-500 mt-2">
                      Formatos aceitos: PNG, JPG, SVG. Tamanho máximo: 2MB
                    </p>
                  </div>
                </div>
              </div>

              {/* Configurações Visuais */}
              <div className="border-t pt-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Configurações Visuais</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Cor Primária</label>
                    <input
                      type="color"
                      name="cor_primaria"
                      defaultValue={selectedTenant.configuracoes?.cor_primaria || '#0066CC'}
                      className="w-full h-10 border border-gray-300 rounded-md"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Cor Secundária</label>
                    <input
                      type="color"
                      name="cor_secundaria"
                      defaultValue={selectedTenant.configuracoes?.cor_secundaria || '#004C99'}
                      className="w-full h-10 border border-gray-300 rounded-md"
                    />
                  </div>
                </div>
              </div>

              {/* Módulos do Sistema */}
              <div className="border-t pt-6">
                <h3 className="text-lg font-medium text-gray-900 mb-1 flex items-center gap-2">
                  <Lock className="h-5 w-5 text-gray-700" />
                  Módulos Habilitados
                </h3>
                <p className="text-sm text-gray-500 mb-4">Módulos não selecionados exibirão uma tela de bloqueio ao serem acessados pelo cliente.</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {SYSTEM_MODULES.map(({ id, label, emoji, descricao, Icon }) => {
                    const ativo = modulosHabilitados.includes(id);
                    return (
                      <button
                        key={id}
                        type="button"
                        onClick={() => toggleModulo(id)}
                        className={`flex items-center gap-3 p-3 rounded-lg border-2 text-left transition-all ${
                          ativo
                            ? 'border-green-500 bg-green-50 text-green-800'
                            : 'border-gray-200 bg-gray-50 text-gray-500'
                        }`}
                      >
                        <div className={`flex-shrink-0 p-1.5 rounded-lg ${ativo ? 'bg-green-100' : 'bg-gray-200'}`}>
                          <Icon className={`h-5 w-5 ${ativo ? 'text-green-600' : 'text-gray-400'}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm">{emoji} {label}</p>
                          <p className="text-xs text-gray-400 truncate">{descricao}</p>
                        </div>
                        {ativo
                          ? <Unlock className="h-4 w-4 text-green-500 flex-shrink-0" />
                          : <Lock className="h-4 w-4 text-gray-400 flex-shrink-0" />
                        }
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Cadastrar Novo Admin */}
              <div className="border-t pt-6">
                <button
                  type="button"
                  onClick={() => setShowAdminForm(!showAdminForm)}
                  className="flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium mb-4"
                >
                  <UserPlus className="h-5 w-5" />
                  {showAdminForm ? 'Ocultar' : 'Cadastrar Novo Administrador'}
                </button>

                {showAdminForm && (
                  <div className="bg-gray-50 rounded-lg p-4 space-y-4">
                    <h3 className="text-lg font-medium text-gray-900">Novo Usuário Administrador</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Nome Completo
                        </label>
                        <input
                          type="text"
                          name="adminNome"
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                          placeholder="Nome do administrador"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          CPF
                        </label>
                        <input
                          type="text"
                          name="adminCpf"
                          maxLength="11"
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                          placeholder="Apenas números"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          E-mail
                        </label>
                        <input
                          type="email"
                          name="adminEmail"
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                          placeholder="email@exemplo.com"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Senha
                        </label>
                        <input
                          type="password"
                          name="adminSenha"
                          minLength="6"
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                          placeholder="Mínimo 6 caracteres"
                        />
                      </div>
                    </div>
                    <p className="text-sm text-gray-600">
                      <Shield className="h-4 w-4 inline mr-1" />
                      Deixe em branco se não desejar cadastrar um novo administrador
                    </p>
                  </div>
                )}
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditModal(false);
                    setSelectedTenant(null);
                    setBrasaoPreview(null);
                    setShowAdminForm(false);
                    setModulosHabilitados([]);
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={updateMutation.isLoading}
                  className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50"
                >
                  {updateMutation.isLoading ? 'Salvando...' : 'Salvar Alterações'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Confirmação de Exclusão */}
      {showDeleteModal && deleteTarget && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full">
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex items-center gap-3">
                <div className="flex-shrink-0 w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                  <AlertTriangle className="h-6 w-6 text-red-600" />
                </div>
                <h2 className="text-xl font-semibold text-gray-900">
                  Confirmar Desativação
                </h2>
              </div>
            </div>

            <div className="p-6">
              <p className="text-gray-700 mb-4">
                Tem certeza que deseja desativar o município <strong>{deleteTarget.nome_municipio}</strong>?
              </p>
              <p className="text-sm text-gray-600">
                Os dados serão preservados, mas o município ficará inativo.
              </p>
            </div>

            <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setDeleteTarget(null);
                }}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={confirmDelete}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
              >
                Desativar
              </button>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}
