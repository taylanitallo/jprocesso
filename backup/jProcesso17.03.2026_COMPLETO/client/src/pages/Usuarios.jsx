import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { 
  Users, 
  UserPlus, 
  Edit2, 
  Trash2, 
  Shield, 
  Search,
  Eye,
  EyeOff,
  Lock,
  CheckCircle,
  XCircle,
  Filter,
  Building2,
  Briefcase,
  Loader2,
  AlertTriangle
} from 'lucide-react';

export default function Usuarios() {
  const { user, refreshUser } = useAuth();
  const [showModal, setShowModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterTipo, setFilterTipo] = useState('todos');
  const [showPassword, setShowPassword] = useState(false);
  const [showEditPassword, setShowEditPassword] = useState(false);
  const [editData, setEditData] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  // Buscar usuários da API
  const [usuarios, setUsuarios] = useState([]);

  useEffect(() => {
    fetchUsuarios();
  }, []);

  const fetchUsuarios = async () => {
    try {
      const response = await api.get('/auth/users');
      setUsuarios(response.data.users || []);
    } catch (error) {
      console.error('Erro ao carregar usuários:', error);
      setUsuarios([]);
    }
  };

  const [secretarias, setSecretarias] = useState([]);
  const [setores, setSetores] = useState([]);

  // Buscar secretarias e setores da API
  useEffect(() => {
    const fetchOrganizacao = async () => {
      try {
        const [secretariasRes, setoresRes] = await Promise.all([
          api.get('/organizacao/secretarias'),
          api.get('/organizacao/setores')
        ]);
        setSecretarias((secretariasRes.data?.secretarias || secretariasRes.data || []).sort((a, b) => a.nome.localeCompare(b.nome)));
        setSetores((setoresRes.data?.setores || setoresRes.data || []).sort((a, b) => a.nome.localeCompare(b.nome)));
      } catch (error) {
        console.error('Erro ao carregar organização:', error);
        setSecretarias([]);
        setSetores([]);
      }
    };
    
    fetchOrganizacao();
  }, []);

  const [formData, setFormData] = useState({
    nome: '',
    nomeReduzido: '',
    cpf: '',
    email: '',
    senha: '',
    tipo: 'operacional',
    secretariaId: '',
    setorId: '',
    permissoes: {
      criar_processo: true,
      editar_processo: true,
      excluir_processo: false,
      tramitar_processo: true,
      acessar_almoxarifado: false,
      acessar_financeiro: false,
      acessar_contratos: false,
      visualizar_relatorios: false,
      gerenciar_usuarios: false,
      gerenciar_secretarias: false,
      gerenciar_configuracoes: false,
    },
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    setLoading(true);
    try {
      await api.post('/auth/register', formData);
      
      // Recarregar lista de usuários
      await fetchUsuarios();
      
      setShowModal(false);
      
      // Reset form
      setFormData({
        nome: '',
        nomeReduzido: '',
        cpf: '',
        email: '',
        senha: '',
        tipo: 'operacional',
        secretariaId: '',
        setorId: '',
        permissoes: {
          criar_processo: true,
          editar_processo: true,
          excluir_processo: false,
          tramitar_processo: true,
          acessar_almoxarifado: false,
          acessar_financeiro: false,
          acessar_contratos: false,
          visualizar_relatorios: false,
          gerenciar_usuarios: false,
          gerenciar_secretarias: false,
          gerenciar_configuracoes: false,
        },
      });
      
      setSuccessMessage('Usuário criado com sucesso!');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (error) {
      console.error('Erro ao criar usuário:', error);
      alert(error.response?.data?.error || 'Erro ao criar usuário');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (usuario) => {
    setSelectedUser(usuario);
    setEditData({
      nome: usuario.nome || '',
      nomeReduzido: usuario.nomeReduzido || '',
      email: usuario.email || '',
      cpf: usuario.cpf || '',
      tipo: usuario.tipo || 'operacional',
      secretariaId: usuario.secretaria?.id || usuario.secretariaId || '',
      setorId: usuario.setor?.id || usuario.setorId || '',
      ativo: usuario.ativo,
      novaSenha: '',
      permissoes: {
        criar_processo: true,
        editar_processo: true,
        excluir_processo: false,
        tramitar_processo: true,
        acessar_almoxarifado: false,
        acessar_financeiro: false,
        acessar_contratos: false,
        visualizar_relatorios: false,
        gerenciar_usuarios: false,
        gerenciar_secretarias: false,
        gerenciar_configuracoes: false,
        ...(usuario.permissoes || {}),
      },
    });
    setShowEditPassword(false);
    setShowEditModal(true);
  };

  const handleSubmitEdit = async (e) => {
    e.preventDefault();
    if (!selectedUser || !editData) return;
    setLoading(true);
    try {
      const payload = {
        nome: editData.nome,
        nomeReduzido: editData.nomeReduzido || null,
        email: editData.email,
        cpf: editData.cpf,
        tipo: editData.tipo,
        secretariaId: editData.secretariaId || null,
        setorId: editData.setorId || null,
        ativo: editData.ativo,
        permissoes: editData.permissoes,
      };
      if (editData.novaSenha && editData.novaSenha.trim().length >= 6) {
        payload.novaSenha = editData.novaSenha.trim();
      }
      await api.put(`/auth/users/${selectedUser.id}`, payload);
      await fetchUsuarios();
      // Se editou o próprio usuário logado, atualiza o contexto
      if (selectedUser.id === user?.id) await refreshUser();
      setShowEditModal(false);
      setSelectedUser(null);
      setEditData(null);
      setSuccessMessage('Usuário atualizado com sucesso!');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (error) {
      console.error('Erro ao atualizar usuário:', error);
      alert(error.response?.data?.error || 'Erro ao atualizar usuário');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = (usuario) => {
    setDeleteTarget(usuario);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (deleteTarget) {
      setLoading(true);
      try {
        await api.delete(`/auth/users/${deleteTarget.id}`);
        await fetchUsuarios();
        setShowDeleteModal(false);
        setDeleteTarget(null);
        setSuccessMessage('Usuário excluído com sucesso!');
        setTimeout(() => setSuccessMessage(''), 3000);
      } catch (error) {
        console.error('Erro ao excluir usuário:', error);
        alert(error.response?.data?.error || 'Erro ao excluir usuário');
      } finally {
        setLoading(false);
      }
    }
  };

  const handleToggleStatus = async (usuario) => {
    const novoAtivo = !usuario.ativo;
    setUsuarios(prev => prev.map(u => u.id === usuario.id ? { ...u, ativo: novoAtivo } : u));
    try {
      await api.put(`/auth/users/${usuario.id}`, {
        nome: usuario.nome,
        email: usuario.email,
        cpf: usuario.cpf,
        tipo: usuario.tipo,
        secretariaId: usuario.secretaria?.id || usuario.secretariaId || null,
        setorId: usuario.setor?.id || usuario.setorId || null,
        ativo: novoAtivo,
        permissoes: usuario.permissoes,
      });
    } catch (error) {
      setUsuarios(prev => prev.map(u => u.id === usuario.id ? { ...u, ativo: usuario.ativo } : u));
      alert('Erro ao alterar status do usuário');
    }
  };

  const filteredUsuarios = usuarios.filter(usuario => {
    const matchSearch = usuario.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
                       usuario.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                       usuario.cpf.includes(searchTerm);
    const matchTipo = filterTipo === 'todos' || usuario.tipo === filterTipo;
    return matchSearch && matchTipo;
  }).sort((a, b) => a.nome.localeCompare(b.nome)); // Ordenar alfabeticamente por nome

  const tiposUsuario = [
    { value: 'admin', label: 'Administrador', color: 'red' },
    { value: 'gestor', label: 'Gestor', color: 'blue' },
    { value: 'operacional', label: 'Operacional', color: 'green' },
  ];

  const permissoesDisponiveis = [
    // Processos
    { key: 'criar_processo',       label: '📋 Criar Processos',       description: 'Abrir novos processos no sistema' },
    { key: 'editar_processo',      label: '✏️ Editar Processos',      description: 'Editar dados de processos existentes' },
    { key: 'excluir_processo',     label: '🗑️ Excluir Processos',     description: 'Excluir processos do sistema' },
    { key: 'tramitar_processo',    label: '🔄 Tramitar Processos',    description: 'Tramitar e despachar processos entre setores' },
    // Módulos
    { key: 'acessar_almoxarifado', label: '📦 Almoxarifado',          description: 'Acessar o módulo de almoxarifado' },
    { key: 'acessar_financeiro',   label: '💵 Financeiro / DID',      description: 'Acessar o módulo financeiro e empenhos' },
    { key: 'acessar_contratos',    label: '📝 Contratos',             description: 'Acessar o módulo de contratos' },
    // Administração
    { key: 'visualizar_relatorios',  label: '📊 Relatórios',            description: 'Visualizar relatórios e estatísticas' },
    { key: 'gerenciar_usuarios',     label: '👥 Gerenciar Usuários',    description: 'Criar, editar e excluir usuários' },
    { key: 'gerenciar_secretarias',  label: '🏛️ Gerenciar Organização', description: 'Gerenciar secretarias e setores' },
    { key: 'gerenciar_configuracoes',label: '⚙️ Configurações',         description: 'Acessar configurações do sistema' },
  ];

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
            <h1 className="page-title">👥 Gerenciamento de Usuários</h1>
            <p className="page-subtitle">Gerencie usuários, permissões e acessos ao sistema</p>
          </div>
          <button onClick={() => setShowModal(true)} className="btn-primary flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Novo Usuário
          </button>
        </div>

      {/* Filtros */}
      <div className="card p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input type="text" placeholder="🔍 Buscar por nome, email ou CPF..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="input-field pl-10" />
            </div>
          </div>
          <div>
            <select value={filterTipo} onChange={(e) => setFilterTipo(e.target.value)} className="input-field">
              <option value="todos">👥 Todos os tipos</option>
              <option value="admin">🛡️ Administradores</option>
              <option value="gestor">💼 Gestores</option>
              <option value="operacional">👷 Operacionais</option>
            </select>
          </div>
        </div>
      </div>

      {/* Estatísticas */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="card p-4"><p className="text-xs text-gray-500 dark:text-gray-400">👥 Total</p><p className="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-1">{usuarios.length}</p></div>
        <div className="card p-4"><p className="text-xs text-gray-500 dark:text-gray-400">🛡️ Admins</p><p className="text-2xl font-bold text-red-600 dark:text-red-400 mt-1">{usuarios.filter(u => u.tipo === 'admin').length}</p></div>
        <div className="card p-4"><p className="text-xs text-gray-500 dark:text-gray-400">💼 Gestores</p><p className="text-2xl font-bold text-blue-600 dark:text-blue-400 mt-1">{usuarios.filter(u => u.tipo === 'gestor').length}</p></div>
        <div className="card p-4"><p className="text-xs text-gray-500 dark:text-gray-400">👷 Operacionais</p><p className="text-2xl font-bold text-green-600 dark:text-green-400 mt-1">{usuarios.filter(u => u.tipo === 'operacional').length}</p></div>
      </div>

      {/* Lista de Usuários */}
      <div className="card overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-700/50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Usuário</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Tipo</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Secretaria/Setor</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Ações</th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
            {filteredUsuarios.map((usuario) => (
              <tr key={usuario.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/40 transition-colors">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div className="flex-shrink-0 h-10 w-10 bg-gradient-to-br from-blue-400 to-indigo-600 rounded-full flex items-center justify-center">
                      <span className="text-white font-bold text-sm">
                        {usuario.nome.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div className="ml-4">
                      <div className="text-sm font-medium text-gray-900 dark:text-gray-100">{usuario.nome}</div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">{usuario.email}</div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`
                    px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full
                    ${usuario.tipo === 'admin' ? 'bg-red-100 text-red-800' : ''}
                    ${usuario.tipo === 'gestor' ? 'bg-blue-100 text-blue-800' : ''}
                    ${usuario.tipo === 'operacional' ? 'bg-green-100 text-green-800' : ''}
                  `}>
                    {usuario.tipo === 'admin' ? 'Administrador' : ''}
                    {usuario.tipo === 'gestor' ? 'Gestor' : ''}
                    {usuario.tipo === 'operacional' ? 'Operacional' : ''}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <div className="text-sm font-medium text-gray-800 dark:text-gray-200">{usuario.secretaria?.sigla || '-'}</div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">{usuario.setor?.nome || '-'}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <button
                    type="button"
                    onClick={() => handleToggleStatus(usuario)}
                    className="flex items-center gap-1"
                  >
                    {usuario.ativo ? (
                      <>
                        <CheckCircle className="h-5 w-5 text-green-500" />
                        <span className="text-sm text-green-600">Ativo</span>
                      </>
                    ) : (
                      <>
                        <XCircle className="h-5 w-5 text-red-500" />
                        <span className="text-sm text-red-600">Inativo</span>
                      </>
                    )}
                  </button>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <button
                    onClick={() => handleEdit(usuario)}
                    className="text-blue-600 hover:text-blue-900 mr-3"
                  >
                    <Edit2 className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(usuario)}
                    className="text-red-600 hover:text-red-900"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {filteredUsuarios.length === 0 && (
          <div className="text-center py-14">
            <div className="text-5xl mb-3">👤‍🧐</div>
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">Nenhum usuário encontrado</h3>
            <p className="mt-1 text-sm text-gray-400 dark:text-gray-500">Tente ajustar os filtros de busca</p>
          </div>
        )}
      </div>

      {/* Modal Criar Usuário */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white dark:bg-gray-800 rounded-xl max-w-4xl w-full my-8 shadow-xl">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 sticky top-0 bg-white dark:bg-gray-800 z-10">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">👤➕ Novo Usuário</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Preencha as informações do usuário</p>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-6 max-h-[calc(90vh-120px)] overflow-y-auto">
              {/* Dados Pessoais */}
              <div>
                <h3 className="section-header">👤 Dados Pessoais</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nome Completo *</label>
                    <input type="text" value={formData.nome} onChange={(e) => setFormData({ ...formData, nome: e.target.value })} required className="input-field" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nome Reduzido <span className="text-gray-400 font-normal">(exibido na tela)</span></label>
                    <input type="text" value={formData.nomeReduzido} onChange={(e) => setFormData({ ...formData, nomeReduzido: e.target.value })} maxLength="60" className="input-field" placeholder="Ex: João Silva" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">🪪 CPF *</label>
                    <input type="text" value={formData.cpf} onChange={(e) => setFormData({ ...formData, cpf: e.target.value })} required maxLength="11" className="input-field" placeholder="Apenas números" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">📧 E-mail *</label>
                    <input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} required className="input-field" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">🔑 Senha *</label>
                    <div className="relative">
                      <input type={showPassword ? 'text' : 'password'} value={formData.senha} onChange={(e) => setFormData({ ...formData, senha: e.target.value })} required minLength="6" className="input-field pr-10" />
                      <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Vinculação */}
              <div className="border-t dark:border-gray-700 pt-6">
                <h3 className="section-header">🏛️ Vinculação Organizacional</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Tipo de Usuário *</label>
                    <select value={formData.tipo} onChange={(e) => setFormData({ ...formData, tipo: e.target.value })} className="input-field">
                      {tiposUsuario.map(tipo => (<option key={tipo.value} value={tipo.value}>{tipo.label}</option>))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">🏛️ Secretaria *</label>
                    <select value={formData.secretariaId} onChange={(e) => setFormData({ ...formData, secretariaId: e.target.value, setorId: '' })} required className="input-field">
                      <option value="">Selecione...</option>
                      {secretarias.map(sec => (<option key={sec.id} value={sec.id}>{sec.sigla} - {sec.nome}</option>))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">📍 Setor *</label>
                    <select value={formData.setorId} onChange={(e) => setFormData({ ...formData, setorId: e.target.value })} required disabled={!formData.secretariaId} className="input-field disabled:opacity-60">
                      <option value="">Selecione...</option>
                      {setores.filter(s => s.secretaria_id === formData.secretariaId || s.secretariaId === formData.secretariaId).sort((a, b) => a.nome.localeCompare(b.nome)).map(setor => (<option key={setor.id} value={setor.id}>{setor.nome}</option>))}
                    </select>
                  </div>
                </div>
              </div>

              <div className="border-t dark:border-gray-700 pt-6">
                <h3 className="section-header">🛡️ Permissões de Acesso</h3>
                <div className="bg-gray-50 dark:bg-gray-700/30 rounded-lg p-4 space-y-3">
                  {permissoesDisponiveis.map((perm) => (
                    <div key={perm.key} className="flex items-start justify-between py-2">
                      <div className="flex-1">
                        <label className="font-medium text-gray-800 dark:text-gray-200 text-sm">{perm.label}</label>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{perm.description}</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer ml-4">
                        <input type="checkbox" checked={formData.permissoes[perm.key]} onChange={(e) => setFormData({ ...formData, permissoes: { ...formData.permissoes, [perm.key]: e.target.checked } })} className="sr-only peer" />
                        <div className="w-11 h-6 bg-gray-200 dark:bg-gray-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600" />
                      </label>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t dark:border-gray-700 sticky bottom-0 bg-white dark:bg-gray-800">
                <button type="button" onClick={() => setShowModal(false)} className="btn-secondary">Cancelar</button>
                <button type="submit" disabled={loading} className="btn-primary flex items-center gap-2">
                  {loading ? '⏳ Salvando...' : <><UserPlus className="h-4 w-4" /> Cadastrar Usuário</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Editar Usuário */}
      {showEditModal && selectedUser && editData && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white dark:bg-gray-800 rounded-xl max-w-4xl w-full my-8 shadow-xl">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 sticky top-0 bg-white dark:bg-gray-800 z-10">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">✏️ Editar Usuário</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Atualize as informações e permissões</p>
            </div>

            <form onSubmit={handleSubmitEdit} className="p-6 space-y-6 max-h-[calc(90vh-120px)] overflow-y-auto">

              {/* Dados Pessoais */}
              <div>
                <h3 className="section-header">👤 Dados Pessoais</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nome Completo *</label>
                    <input type="text" value={editData.nome} onChange={(e) => setEditData({ ...editData, nome: e.target.value })} required className="input-field" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nome Reduzido <span className="text-gray-400 font-normal">(exibido na tela)</span></label>
                    <input type="text" value={editData.nomeReduzido} onChange={(e) => setEditData({ ...editData, nomeReduzido: e.target.value })} maxLength="60" className="input-field" placeholder="Ex: João Silva" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">🪪 CPF</label>
                    <input type="text" value={editData.cpf} disabled className="input-field disabled:bg-gray-50 disabled:text-gray-500 dark:disabled:bg-gray-700/30" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">📧 E-mail *</label>
                    <input type="email" value={editData.email} onChange={(e) => setEditData({ ...editData, email: e.target.value })} required className="input-field" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">🔑 Nova Senha <span className="text-gray-400 font-normal">(opcional)</span></label>
                    <div className="relative">
                      <input type={showEditPassword ? 'text' : 'password'} value={editData.novaSenha} onChange={(e) => setEditData({ ...editData, novaSenha: e.target.value })} minLength="6" className="input-field pr-10" placeholder="Deixe em branco para manter" />
                      <button type="button" onClick={() => setShowEditPassword(!showEditPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                        {showEditPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Vinculação */}
              <div className="border-t dark:border-gray-700 pt-6">
                <h3 className="section-header">🏛️ Vinculação Organizacional</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Tipo de Usuário *</label>
                    <select value={editData.tipo} onChange={(e) => setEditData({ ...editData, tipo: e.target.value })} className="input-field">
                      {tiposUsuario.map(tipo => (<option key={tipo.value} value={tipo.value}>{tipo.label}</option>))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">🏛️ Secretaria</label>
                    <select value={editData.secretariaId} onChange={(e) => setEditData({ ...editData, secretariaId: e.target.value, setorId: '' })} className="input-field">
                      <option value="">Selecione...</option>
                      {secretarias.map(sec => (<option key={sec.id} value={sec.id}>{sec.sigla} - {sec.nome}</option>))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">📍 Setor</label>
                    <select value={editData.setorId} onChange={(e) => setEditData({ ...editData, setorId: e.target.value })} disabled={!editData.secretariaId} className="input-field disabled:opacity-60">
                      <option value="">Selecione...</option>
                      {setores.filter(s => s.secretaria_id === editData.secretariaId || s.secretariaId === editData.secretariaId).sort((a, b) => a.nome.localeCompare(b.nome)).map(setor => (<option key={setor.id} value={setor.id}>{setor.nome}</option>))}
                    </select>
                  </div>
                </div>
                <div className="mt-4">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input type="checkbox" checked={editData.ativo} onChange={(e) => setEditData({ ...editData, ativo: e.target.checked })} className="sr-only peer" />
                    <div className="w-11 h-6 bg-gray-200 dark:bg-gray-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600 relative" />
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Usuário ativo (pode fazer login)</span>
                  </label>
                </div>
              </div>

              {/* Permissões */}
              <div className="border-t dark:border-gray-700 pt-6">
                <h3 className="section-header">🛡️ Permissões de Acesso</h3>
                <div className="bg-gray-50 dark:bg-gray-700/30 rounded-lg p-4 space-y-3">
                  {permissoesDisponiveis.map((perm) => (
                    <div key={perm.key} className="flex items-start justify-between py-2">
                      <div className="flex-1">
                        <label className="font-medium text-gray-800 dark:text-gray-200 text-sm">{perm.label}</label>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{perm.description}</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer ml-4">
                        <input type="checkbox" checked={!!editData.permissoes[perm.key]} onChange={(e) => setEditData({ ...editData, permissoes: { ...editData.permissoes, [perm.key]: e.target.checked } })} className="sr-only peer" />
                        <div className="w-11 h-6 bg-gray-200 dark:bg-gray-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600" />
                      </label>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t dark:border-gray-700 sticky bottom-0 bg-white dark:bg-gray-800">
                <button type="button" onClick={() => { setShowEditModal(false); setSelectedUser(null); setEditData(null); }} className="btn-secondary">Cancelar</button>
                <button type="submit" disabled={loading} className="btn-primary flex items-center gap-2">
                  {loading ? '⏳ Salvando...' : <><Edit2 className="h-4 w-4" /> Salvar Alterações</>}
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
                <h2 className="text-xl font-semibold text-gray-900">
                  Confirmar Exclusão
                </h2>
              </div>
            </div>

            <div className="p-6">
              <p className="text-gray-700 mb-4">
                Tem certeza que deseja excluir o usuário <strong>{deleteTarget.nome}</strong>?
              </p>
              <p className="text-sm text-gray-600">
                Esta ação não pode ser desfeita.
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
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
