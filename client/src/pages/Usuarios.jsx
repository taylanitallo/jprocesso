import { useState, useEffect, useRef } from 'react';
import * as XLSX from 'xlsx';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import PermissoesEditor from '../components/PermissoesEditor';
import LoadingBar from '../components/LoadingBar';
import StatCard from '../components/ui/StatCard';
import SectionTitle from '../components/ui/SectionTitle';
import EmptyState from '../components/ui/EmptyState';
import FilterBar from '../components/ui/FilterBar';
import ActionBar from '../components/ui/ActionBar';
import BotaoExcluidos from '../components/lixeira/BotaoExcluidos';
import { Paginacao, usePorPagina } from '../components/ui';
import {
  Smartphone,
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
  AlertTriangle,
  Upload,
  Download,
  FileSpreadsheet,
  ChevronDown
} from 'lucide-react';

const DEFAULT_PERMISSOES = () => ({
  processos:     { ver: true, criar: true, editar: true, excluir: false, tramitar: true, devolver: true, concluir: true, arquivar: false, anexar_documento: true, excluir_documento: false },
  arquivo:       { acessar: false },
  almoxarifado:  { acessar: false, painel: { ver: true }, estoque: { ver: true, editar: true }, entradas: { ver: true, registrar: true }, saidas: { ver: true, registrar: true }, requisicoes: { ver: true, criar: true, aprovar: false, cancelar: false }, cotas: { ver: true, gerenciar: false }, inventario: { ver: true, realizar: false }, auditoria: { ver: false } },
  patrimonio:    { acessar: false, painel: { ver: true }, bens: { ver: true, criar: false, editar: false, excluir: false }, tombamento: { ver: true, realizar: false }, transferencia: { ver: true, realizar: false }, baixa: { ver: true, realizar: false }, inventario: { ver: true, realizar: false }, grupos: { ver: false, gerenciar: false } },
  financeiro:    { acessar: false, painel: { ver: true }, processos_did: { ver: true }, relatorio: { ver: false } },
  contratos:     { acessar: false, itens: { ver: true, criar: false, editar: false, excluir: false }, credores: { ver: true, criar: false, editar: false, excluir: false }, contratos: { ver: true, criar: false, editar: false, excluir: false }, ordens: { ver: true, criar: false, editar: false, excluir: false }, relatorios: { ver: true } },
  tesouraria:    { acessar: false, contas: { ver: true, criar: false, editar: false, excluir: false }, receitas: { ver: true, criar: false, editar: false, excluir: false }, despesas: { ver: true, criar: false, editar: false, excluir: false }, relatorios: { ver: true } },
  administracao: { gerenciar_usuarios: false, gerenciar_secretarias: false, gerenciar_configuracoes: false, visualizar_relatorios: false, visualizar_registros: false },
})

export default function Usuarios() {
  const { user, refreshUser } = useAuth();
  const [showModal, setShowModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterTipo, setFilterTipo] = useState('todos');
  const [pageUsuarios, setPageUsuarios] = useState(1);
  const [PER_PAGE_USUARIOS, setPorPaginaUsuarios] = usePorPagina('usuarios', 20);
  const [showPassword, setShowPassword] = useState(false);
  const [showEditPassword, setShowEditPassword] = useState(false);
  const [editData, setEditData] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  // Import / Export
  const importInputRef = useRef(null);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importLoading, setImportLoading] = useState(false);
  const [importResults, setImportResults] = useState([]);
  const [showIoMenu, setShowIoMenu] = useState(false);

  const handleDownloadModelo = () => {
    const headers = ['nome', 'nome_reduzido', 'cpf', 'email', 'senha', 'tipo', 'secretaria_sigla', 'setor_nome'];
    const exemplos = [
      ['João da Silva', 'João Silva', '000.000.000-00', 'joao@prefeitura.gov.br', 'senha123', 'operacional', 'SEMAD', 'Protocolo Geral'],
      ['Maria Souza', 'Maria Souza', '111.111.111-11', 'maria@prefeitura.gov.br', 'senha456', 'gestor', 'SEMED', 'Direção'],
    ];
    const ws = XLSX.utils.aoa_to_sheet([headers, ...exemplos]);
    ws['!cols'] = headers.map(() => ({ wch: 22 }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Usuarios');
    XLSX.writeFile(wb, 'modelo_importacao_usuarios.xlsx');
  };

  const handleExportUsuarios = () => {
    const dados = usuarios.map(u => ({
      nome: u.nome || '',
      nome_reduzido: u.nomeReduzido || '',
      cpf: u.cpf || '',
      email: u.email || '',
      tipo: u.tipo || '',
      secretaria_sigla: u.secretaria?.sigla || '',
      setor_nome: u.setor?.nome || '',
      ativo: u.ativo ? 'Sim' : 'Não',
    }));
    const ws = XLSX.utils.json_to_sheet(dados);
    ws['!cols'] = Object.keys(dados[0] || {}).map(() => ({ wch: 22 }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Usuarios');
    XLSX.writeFile(wb, `usuarios_${new Date().toLocaleDateString('pt-BR').replace(/\//g, '-')}.xlsx`);
  };

  const handleImportFile = async (e) => {
    const file = e.target.files?.[0];
    if (!importInputRef.current) return;
    importInputRef.current.value = '';
    if (!file) return;

    setImportLoading(true);
    setImportResults([]);
    setShowImportModal(true);

    try {
      const buffer = await file.arrayBuffer();
      const wb = XLSX.read(buffer, { type: 'array' });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(ws, { defval: '' });

      const results = [];
      for (const row of rows) {
        const nome = String(row['nome'] || '').trim();
        if (!nome) continue;
        const cpf = String(row['cpf'] || '').trim();
        const email = String(row['email'] || '').trim();
        const senha = String(row['senha'] || '').trim() || 'Mudar@123';
        const tipo = ['admin','gestor','operacional'].includes(String(row['tipo']).trim())
          ? String(row['tipo']).trim() : 'operacional';
        const secretariaSigla = String(row['secretaria_sigla'] || '').trim();
        const setorNome = String(row['setor_nome'] || '').trim();

        const secretaria = secretariaSigla
          ? secretarias.find(s => s.sigla?.toLowerCase() === secretariaSigla.toLowerCase())
          : null;
        const setor = setorNome
          ? setores.find(s => s.nome?.toLowerCase() === setorNome.toLowerCase())
          : null;

        try {
          await api.post('/auth/register', {
            nome,
            nomeReduzido: String(row['nome_reduzido'] || '').trim() || null,
            cpf,
            email,
            senha,
            tipo,
            secretariaId: secretaria?.id || null,
            setorId: setor?.id || null,
            permissoes: DEFAULT_PERMISSOES(),
          });
          results.push({ nome, status: 'ok', msg: 'Importado com sucesso' });
        } catch (err) {
          results.push({ nome, status: 'erro', msg: err.response?.data?.error || 'Erro ao importar' });
        }
      }

      setImportResults(results);
      await fetchUsuarios();
    } catch (err) {
      setImportResults([{ nome: '—', status: 'erro', msg: 'Falha ao ler o arquivo .xlsx' }]);
    } finally {
      setImportLoading(false);
    }
  };

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
    permissoes: DEFAULT_PERMISSOES(),
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
        permissoes: DEFAULT_PERMISSOES(),
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
      permissoes: { ...DEFAULT_PERMISSOES(), ...(usuario.permissoes || {}) },
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

  // Revoga o app autenticador da assinatura eletrônica (celular perdido/trocado).
  // O usuário cadastra um novo app na próxima vez que for assinar.
  const handleRevogarAutenticador = async (usuario) => {
    if (!confirm(`Revogar o aplicativo autenticador de ${usuario.nome}?\n\nUse quando o celular for perdido ou trocado. O usuário precisará cadastrar o app de novo para assinar.`)) return;
    try {
      await api.post(`/assinaturas/totp/resetar/${usuario.id}`);
      alert('Autenticador revogado. O usuário fará um novo cadastro na próxima assinatura.');
    } catch (err) {
      alert(err.response?.data?.error || 'Erro ao revogar o autenticador.');
    }
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

  // e-mail e CPF podem vir vazios (null): sem o || '' a busca derrubava a tela
  const termoBusca = searchTerm.trim().toLowerCase();
  const termoDigitos = termoBusca.replace(/\D/g, '');
  const filteredUsuarios = usuarios.filter(usuario => {
    const matchSearch = !termoBusca ||
                       (usuario.nome || '').toLowerCase().includes(termoBusca) ||
                       (usuario.email || '').toLowerCase().includes(termoBusca) ||
                       (!!termoDigitos && String(usuario.cpf || '').replace(/\D/g, '').includes(termoDigitos));
    const matchTipo = filterTipo === 'todos' || usuario.tipo === filterTipo;
    return matchSearch && matchTipo;
  }).sort((a, b) => (a.nome || '').localeCompare(b.nome || ''));

  const totalPagesUsuarios = Math.max(1, Math.ceil(filteredUsuarios.length / PER_PAGE_USUARIOS));
  const usuariosPaginados = filteredUsuarios.slice((pageUsuarios - 1) * PER_PAGE_USUARIOS, pageUsuarios * PER_PAGE_USUARIOS);

  const tiposUsuario = [
    { value: 'admin', label: 'Administrador', color: 'red' },
    { value: 'gestor', label: 'Gestor', color: 'blue' },
    { value: 'operacional', label: 'Operacional', color: 'green' },
  ];


  return (
    <div className="space-y-4">
      {/* Mensagem de Sucesso */}
      {successMessage && (
        <div className="p-4 bg-success-50 dark:bg-success-900/30 border border-success-200 dark:border-success-700 rounded-lg flex items-center gap-3">
          <CheckCircle className="h-5 w-5 text-success-600 dark:text-success-400" />
          <p className="text-success-800 dark:text-success-300 font-medium">{successMessage}</p>
        </div>
      )}

      {/* Header */}
      <SectionTitle
        icon={Users}
        title="Gerenciamento de Usuários"
        subtitle="Gerencie usuários, permissões e acessos ao sistema"
        action={<div className="flex items-center gap-2 flex-wrap">
            {/* Menu Importar / Exportar */}
            <div className="relative">
              <button
                onClick={() => setShowIoMenu(v => !v)}
                className="btn-secondary flex items-center gap-1.5 text-xs px-3 h-7"
              >
                <FileSpreadsheet className="h-3.5 w-3.5" />
                Planilha
                <ChevronDown className="h-3.5 w-3.5" />
              </button>
              {showIoMenu && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setShowIoMenu(false)} />
                  <div className="absolute right-0 mt-1 w-56 bg-surface border border-ink-200 rounded-lg shadow-lg z-20 overflow-hidden">
                    <button
                      onClick={() => { setShowIoMenu(false); handleExportUsuarios(); }}
                      className="w-full flex items-center gap-3 px-4 py-3 text-sm text-ink-700 hover:bg-ink-50 text-left"
                    >
                      <Download className="h-4 w-4 text-success-600" />
                      <div>
                        <div className="font-medium">Exportar usuários</div>
                        <div className="text-xs text-ink-400">Baixar lista em .xlsx</div>
                      </div>
                    </button>
                    <button
                      onClick={() => { setShowIoMenu(false); importInputRef.current?.click(); }}
                      className="w-full flex items-center gap-3 px-4 py-3 text-sm text-ink-700 hover:bg-ink-50 text-left border-t border-ink-100"
                    >
                      <Upload className="h-4 w-4 text-brand-600" />
                      <div>
                        <div className="font-medium">Importar usuários</div>
                        <div className="text-xs text-ink-400">Carregar planilha .xlsx</div>
                      </div>
                    </button>
                    <button
                      onClick={() => { setShowIoMenu(false); handleDownloadModelo(); }}
                      className="w-full flex items-center gap-3 px-4 py-3 text-sm text-ink-700 hover:bg-ink-50 text-left border-t border-ink-100"
                    >
                      <FileSpreadsheet className="h-4 w-4 text-orange-500" />
                      <div>
                        <div className="font-medium">Baixar modelo</div>
                        <div className="text-xs text-ink-400">Planilha de importação</div>
                      </div>
                    </button>
                  </div>
                </>
              )}
            </div>
            {/* Input oculto para importar arquivo */}
            <input
              ref={importInputRef}
              type="file"
              accept=".xlsx,.xls"
              className="hidden"
              onChange={handleImportFile}
            />
            <BotaoExcluidos entidade="usuarios" rotulo="Usuários excluídos" onAlterado={fetchUsuarios} />
            <button onClick={() => setShowModal(true)} className="btn-primary flex items-center gap-1.5 text-xs px-3 py-1 h-7">
              <UserPlus className="h-3.5 w-3.5" />
              Novo Usuário
            </button>
        </div>}
      />

      {/* Filtros */}
      <FilterBar>
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-ink-400" />
          <input type="text" placeholder="Buscar por nome, email ou CPF..." value={searchTerm} onChange={(e) => { setSearchTerm(e.target.value); setPageUsuarios(1); }} className="input-field pl-10" />
        </div>
        <select value={filterTipo} onChange={(e) => { setFilterTipo(e.target.value); setPageUsuarios(1); }} className="input-field w-48">
          <option value="todos">Todos os tipos</option>
          <option value="admin">Administradores</option>
          <option value="gestor">Gestores</option>
          <option value="operacional">Operacionais</option>
        </select>
      </FilterBar>

      {/* Estatísticas */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard icon={Users} label="Total" value={usuarios.length} tone="blue" />
        <StatCard icon={Shield} label="Admins" value={usuarios.filter(u => u.tipo === 'admin').length} tone="red" />
        <StatCard icon={Briefcase} label="Gestores" value={usuarios.filter(u => u.tipo === 'gestor').length} tone="violet" />
        <StatCard icon={Users} label="Operacionais" value={usuarios.filter(u => u.tipo === 'operacional').length} tone="green" />
      </div>

      {/* Lista de Usuários */}
      <div className="card overflow-hidden">
        <div className="px-4 pt-3 pb-1">
          <SectionTitle icon={Users} title="Lista de Usuários" subtitle={`${filteredUsuarios.length} usuário(s)`} />
        </div>
        <table className="min-w-full divide-y divide-ink-200">
          <thead className="bg-ink-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-ink-500 uppercase tracking-wider">Usuário</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-ink-500 uppercase tracking-wider">Tipo</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-ink-500 uppercase tracking-wider">Secretaria/Setor</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-ink-500 uppercase tracking-wider">Status</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-ink-500 uppercase tracking-wider">Ações</th>
            </tr>
          </thead>
          <tbody className="bg-surface divide-y divide-ink-200">
            {usuariosPaginados.map((usuario) => (
              <tr key={usuario.id} className="hover:bg-ink-50 transition-colors">
                <td className="px-4 py-3 whitespace-nowrap">
                  <div className="flex items-center">
                    <div className="shrink-0 h-10 w-10 bg-gradient-to-br from-info-400 to-indigo-600 rounded-full flex items-center justify-center">
                      <span className="text-white font-bold text-sm">
                        {usuario.nome.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div className="ml-4">
                      <div className="text-sm font-medium text-ink-900">{usuario.nome}</div>
                      <div className="text-sm text-ink-500">{usuario.email}</div>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <span className={`
                    px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full
                    ${usuario.tipo === 'admin' ? 'bg-danger-100 text-danger-800 dark:bg-danger-900/30 dark:text-danger-400' : ''}
                    ${usuario.tipo === 'gestor' ? 'bg-info-100 text-info-800 dark:bg-info-900/30 dark:text-info-400' : ''}
                    ${usuario.tipo === 'operacional' ? 'bg-success-100 text-success-800 dark:bg-success-900/30 dark:text-success-400' : ''}
                  `}>
                    {usuario.tipo === 'admin' ? 'Administrador' : ''}
                    {usuario.tipo === 'gestor' ? 'Gestor' : ''}
                    {usuario.tipo === 'operacional' ? 'Operacional' : ''}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="text-sm font-medium text-ink-800">{usuario.secretaria?.sigla || '-'}</div>
                  <div className="text-sm text-ink-500">{usuario.setor?.nome || '-'}</div>
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <button
                    type="button"
                    onClick={() => handleToggleStatus(usuario)}
                    className="flex items-center gap-1"
                  >
                    {usuario.ativo ? (
                      <>
                        <CheckCircle className="h-5 w-5 text-success-500" />
                        <span className="text-sm text-success-600">Ativo</span>
                      </>
                    ) : (
                      <>
                        <XCircle className="h-5 w-5 text-danger-500" />
                        <span className="text-sm text-danger-600">Inativo</span>
                      </>
                    )}
                  </button>
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-right text-sm font-medium">
                  <button
                    onClick={() => handleEdit(usuario)}
                    className="text-brand-600 hover:text-info-900 mr-3"
                  >
                    <Edit2 className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleRevogarAutenticador(usuario)}
                    title="Revogar aplicativo autenticador (celular perdido ou trocado)"
                    className="text-amber-600 hover:text-amber-800 mr-3"
                  >
                    <Smartphone className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(usuario)}
                    className="text-danger-600 hover:text-danger-900"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {filteredUsuarios.length === 0 && (
          <EmptyState icon={Users} title="Nenhum usuário encontrado" description="Tente ajustar os filtros de busca" />
        )}
        <Paginacao total={filteredUsuarios.length} pagina={pageUsuarios} setPagina={setPageUsuarios}
          porPagina={PER_PAGE_USUARIOS} setPorPagina={(n) => { setPorPaginaUsuarios(n); setPageUsuarios(1); }}
          rotulo="usuário" className="border-t border-ink-200 bg-ink-50 px-6" />
      </div>

      {/* Modal Criar Usuário */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-surface rounded-xl max-w-4xl w-full my-8 shadow-xl">
            <div className="px-4 py-3 border-b border-ink-200 sticky top-0 bg-surface z-10">
              <h2 className="text-xl font-semibold text-ink-900">Novo Usuário</h2>
              <p className="text-sm text-ink-500 mt-1">Preencha as informações do usuário</p>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[calc(90vh-120px)] overflow-y-auto">
              {/* Dados Pessoais */}
              <div>
                <SectionTitle icon={Users} title="Dados Pessoais" />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-ink-700 mb-1">Nome Completo *</label>
                    <input type="text" value={formData.nome} onChange={(e) => setFormData({ ...formData, nome: e.target.value })} required className="input-field" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-ink-700 mb-1">Nome Reduzido <span className="text-ink-400 font-normal">(exibido na tela)</span></label>
                    <input type="text" value={formData.nomeReduzido} onChange={(e) => setFormData({ ...formData, nomeReduzido: e.target.value })} maxLength="60" className="input-field" placeholder="Ex: João Silva" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-ink-700 mb-1">CPF *</label>
                    <input type="text" value={formData.cpf} onChange={(e) => setFormData({ ...formData, cpf: e.target.value })} required maxLength="11" className="input-field" placeholder="Apenas números" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-ink-700 mb-1">E-mail *</label>
                    <input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} required className="input-field" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-ink-700 mb-1">Senha *</label>
                    <div className="relative">
                      <input type={showPassword ? 'text' : 'password'} value={formData.senha} onChange={(e) => setFormData({ ...formData, senha: e.target.value })} required minLength="6" className="input-field pr-10" />
                      <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-400">
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Vinculação */}
              <div className="border-t pt-6">
                <SectionTitle icon={Building2} title="Vinculação Organizacional" />
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-ink-700 mb-1">Tipo de Usuário *</label>
                    <select value={formData.tipo} onChange={(e) => setFormData({ ...formData, tipo: e.target.value })} className="input-field">
                      {tiposUsuario.map(tipo => (<option key={tipo.value} value={tipo.value}>{tipo.label}</option>))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-ink-700 mb-1">Secretaria *</label>
                    <select value={formData.secretariaId} onChange={(e) => setFormData({ ...formData, secretariaId: e.target.value, setorId: '' })} required className="input-field">
                      <option value="">Selecione...</option>
                      {secretarias.map(sec => (<option key={sec.id} value={sec.id}>{sec.sigla} - {sec.nome}</option>))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-ink-700 mb-1">Setor *</label>
                    <select value={formData.setorId} onChange={(e) => setFormData({ ...formData, setorId: e.target.value })} required disabled={!formData.secretariaId} className="input-field disabled:opacity-60">
                      <option value="">Selecione...</option>
                      {setores.filter(s => s.secretaria_id === formData.secretariaId || s.secretariaId === formData.secretariaId).sort((a, b) => a.nome.localeCompare(b.nome)).map(setor => (<option key={setor.id} value={setor.id}>{setor.nome}</option>))}
                    </select>
                  </div>
                </div>
              </div>

              <div className="border-t pt-6">
                <SectionTitle icon={Shield} title="Permissões de Acesso" />
                <div className="mt-3">
                  <PermissoesEditor
                    permissoes={formData.permissoes}
                    onChange={(p) => setFormData({ ...formData, permissoes: p })}
                    secretariasList={secretarias}
                  />
                </div>
              </div>

              <div className="pt-4 border-t sticky bottom-0 bg-surface">
                <ActionBar>
                  <button type="button" onClick={() => setShowModal(false)} className="btn-secondary">Cancelar</button>
                  <button type="submit" disabled={loading} className="btn-primary flex items-center gap-2">
                    {loading ? 'Salvando...' : <><UserPlus className="h-4 w-4" /> Cadastrar Usuário</>}
                  </button>
                </ActionBar>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Editar Usuário */}
      {showEditModal && selectedUser && editData && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-surface rounded-xl w-[95%] my-8 shadow-xl">
            <div className="px-4 py-3 border-b border-ink-200 sticky top-0 bg-surface z-10">
              <h2 className="text-xl font-semibold text-ink-900">Editar Usuário</h2>
              <p className="text-sm text-ink-500 mt-1">Atualize as informações e permissões</p>
            </div>

            <form onSubmit={handleSubmitEdit} className="p-6 space-y-4 max-h-[calc(90vh-120px)] overflow-y-auto">

              {/* Dados Pessoais */}
              <div>
                <SectionTitle icon={Users} title="Dados Pessoais" />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-ink-700 mb-1">Nome Completo *</label>
                    <input type="text" value={editData.nome} onChange={(e) => setEditData({ ...editData, nome: e.target.value })} required className="input-field" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-ink-700 mb-1">Nome Reduzido <span className="text-ink-400 font-normal">(exibido na tela)</span></label>
                    <input type="text" value={editData.nomeReduzido} onChange={(e) => setEditData({ ...editData, nomeReduzido: e.target.value })} maxLength="60" className="input-field" placeholder="Ex: João Silva" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-ink-700 mb-1">CPF</label>
                    <input type="text" value={editData.cpf} disabled className="input-field disabled:bg-ink-50 disabled:text-ink-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-ink-700 mb-1">E-mail *</label>
                    <input type="email" value={editData.email} onChange={(e) => setEditData({ ...editData, email: e.target.value })} required className="input-field" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-ink-700 mb-1">Nova Senha <span className="text-ink-400 font-normal">(opcional)</span></label>
                    <div className="relative">
                      <input type={showEditPassword ? 'text' : 'password'} value={editData.novaSenha} onChange={(e) => setEditData({ ...editData, novaSenha: e.target.value })} minLength="6" className="input-field pr-10" placeholder="Deixe em branco para manter" />
                      <button type="button" onClick={() => setShowEditPassword(!showEditPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-400">
                        {showEditPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Vinculação */}
              <div className="border-t pt-6">
                <SectionTitle icon={Building2} title="Vinculação Organizacional" />
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-ink-700 mb-1">Tipo de Usuário *</label>
                    <select value={editData.tipo} onChange={(e) => setEditData({ ...editData, tipo: e.target.value })} className="input-field">
                      {tiposUsuario.map(tipo => (<option key={tipo.value} value={tipo.value}>{tipo.label}</option>))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-ink-700 mb-1">Secretaria</label>
                    <select value={editData.secretariaId} onChange={(e) => setEditData({ ...editData, secretariaId: e.target.value, setorId: '' })} className="input-field">
                      <option value="">Selecione...</option>
                      {secretarias.map(sec => (<option key={sec.id} value={sec.id}>{sec.sigla} - {sec.nome}</option>))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-ink-700 mb-1">Setor</label>
                    <select value={editData.setorId} onChange={(e) => setEditData({ ...editData, setorId: e.target.value })} disabled={!editData.secretariaId} className="input-field disabled:opacity-60">
                      <option value="">Selecione...</option>
                      {setores.filter(s => s.secretaria_id === editData.secretariaId || s.secretariaId === editData.secretariaId).sort((a, b) => a.nome.localeCompare(b.nome)).map(setor => (<option key={setor.id} value={setor.id}>{setor.nome}</option>))}
                    </select>
                  </div>
                </div>
                <div className="mt-4">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input type="checkbox" checked={editData.ativo} onChange={(e) => setEditData({ ...editData, ativo: e.target.checked })} className="sr-only peer" />
                    <div className="w-11 h-6 bg-ink-200 peer-focus:outline-hidden peer-focus:ring-4 peer-focus:ring-info-300 dark:peer-focus:ring-info-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-surface after:border-ink-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand-600 relative" />
                    <span className="text-sm font-medium text-ink-700">Usuário ativo (pode fazer login)</span>
                  </label>
                </div>
              </div>

              {/* Permissões */}
              <div className="border-t pt-6">
                <SectionTitle icon={Shield} title="Permissões de Acesso" />
                <div className="mt-3">
                  <PermissoesEditor
                    permissoes={editData.permissoes}
                    onChange={(p) => setEditData({ ...editData, permissoes: p })}
                    secretariasList={secretarias}
                  />
                </div>
              </div>

              <div className="pt-4 border-t sticky bottom-0 bg-surface">
                <ActionBar>
                  <button type="button" onClick={() => { setShowEditModal(false); setSelectedUser(null); setEditData(null); }} className="btn-secondary">Cancelar</button>
                  <button type="submit" disabled={loading} className="btn-primary flex items-center gap-2">
                    {loading ? 'Salvando...' : <><Edit2 className="h-4 w-4" /> Salvar Alterações</>}
                  </button>
                </ActionBar>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Confirmação de Exclusão */}
      {showDeleteModal && deleteTarget && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-surface rounded-xl max-w-md w-full shadow-xl">
            <div className="px-4 py-3 border-b border-ink-200">
              <div className="flex items-center gap-3">
                <div className="shrink-0 w-10 h-10 bg-danger-100 dark:bg-danger-900/30 rounded-full flex items-center justify-center">
                  <AlertTriangle className="h-6 w-6 text-danger-600 dark:text-danger-400" />
                </div>
                <h2 className="text-xl font-semibold text-ink-900 dark:text-white">
                  Confirmar Exclusão
                </h2>
              </div>
            </div>

            <div className="p-6">
              <p className="text-ink-700 mb-4">
                Tem certeza que deseja excluir o usuário <strong>{deleteTarget.nome}</strong>?
              </p>
              <p className="text-sm text-ink-600">
                O usuário perde o acesso e vai para os Usuários excluídos, de onde pode ser restaurado.
                O nome dele continua no histórico dos processos.
              </p>
            </div>

            <div className="px-4 py-3 bg-ink-50 border-t border-ink-200">
              <ActionBar>
                <button
                  onClick={() => {
                    setShowDeleteModal(false);
                    setDeleteTarget(null);
                  }}
                  className="px-4 py-2 border border-ink-300 rounded-md text-ink-700 hover:bg-ink-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={confirmDelete}
                  className="px-4 py-2 bg-danger-600 text-white rounded-md hover:bg-danger-700"
                >
                  Excluir
                </button>
              </ActionBar>
            </div>
          </div>
        </div>
      )}
      {/* Modal Resultado da Importação */}
      {showImportModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-surface rounded-xl max-w-lg w-full shadow-xl">
            <div className="px-4 py-3 border-b border-ink-200 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-ink-900 flex items-center gap-2">
                <Upload className="h-5 w-5 text-brand-600" />
                Resultado da Importação
              </h2>
              {!importLoading && (
                <button onClick={() => setShowImportModal(false)} className="p-1.5 text-ink-400 hover:text-ink-600 rounded-lg">
                  <XCircle className="h-5 w-5" />
                </button>
              )}
            </div>
            <div className="p-6">
              {importLoading ? (
                <LoadingBar label="Importando usuários..." />
              ) : (
                <>
                  <div className="flex gap-4 mb-4 text-sm">
                    <span className="flex items-center gap-1.5 text-success-600 font-medium">
                      <CheckCircle className="h-4 w-4" />
                      {importResults.filter(r => r.status === 'ok').length} importados
                    </span>
                    <span className="flex items-center gap-1.5 text-danger-600 font-medium">
                      <XCircle className="h-4 w-4" />
                      {importResults.filter(r => r.status === 'erro').length} com erro
                    </span>
                  </div>
                  <div className="max-h-64 overflow-y-auto space-y-1.5">
                    {importResults.map((r, i) => (
                      <div key={i} className={`flex items-start gap-2 text-sm px-3 py-2 rounded-lg ${
                        r.status === 'ok'
                          ? 'bg-success-50 dark:bg-success-900/20 text-success-800 dark:text-success-300'
                          : 'bg-danger-50 dark:bg-danger-900/20 text-danger-800 dark:text-danger-300'
                      }`}>
                        {r.status === 'ok'
                          ? <CheckCircle className="h-4 w-4 shrink-0 mt-0.5" />
                          : <XCircle className="h-4 w-4 shrink-0 mt-0.5" />}
                        <div>
                          <span className="font-medium">{r.nome}</span>
                          <span className="ml-2 opacity-80">— {r.msg}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="flex justify-end mt-4">
                    <button onClick={() => setShowImportModal(false)} className="btn-primary">
                      Fechar
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
