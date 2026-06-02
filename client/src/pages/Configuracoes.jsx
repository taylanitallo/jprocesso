import { useState, useRef, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { Save, Upload, X, ImageIcon, Download, FileDown, FileUp, Database, Key, RefreshCw, CheckCircle, AlertCircle, Settings, Building2, Bell, Palette, ArrowLeftRight, Sun, Moon } from 'lucide-react';
import PageHeader from '../components/ui/PageHeader';
import SectionTitle from '../components/ui/SectionTitle';

const ToggleSwitch = ({ checked, onChange }) => (
  <label className="relative inline-flex items-center cursor-pointer">
    <input type="checkbox" checked={checked} onChange={onChange} className="sr-only peer" />
    <div className="w-11 h-6 bg-gray-200 dark:bg-slate-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer
      peer-checked:after:translate-x-full peer-checked:after:border-white
      after:content-[''] after:absolute after:top-[2px] after:left-[2px]
      after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all
      peer-checked:bg-blue-600" />
  </label>
);

// Componente de upload de imagem com preview
const ImageUpload = ({ label, value, onChange, hint, disabled }) => {
  const inputRef = useRef(null);

  const handleFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!['image/png', 'image/jpeg', 'image/svg+xml', 'image/webp'].includes(file.type)) {
      alert('Use PNG, JPG, SVG ou WebP.');
      return;
    }
    if (file.size > 2 * 1024 * 1024) { alert('Imagem deve ter no máximo 2 MB.'); return; }
    const reader = new FileReader();
    reader.onload = (ev) => onChange(ev.target.result);
    reader.readAsDataURL(file);
  };

  return (
    <div className={`space-y-2 ${disabled ? 'opacity-60' : ''}`}>
      <label className="block text-sm font-medium text-gray-700 dark:text-slate-300">{label}</label>
      {hint && <p className="text-xs text-gray-400 dark:text-slate-500">{hint}</p>}
      <div className="flex items-start gap-4">
        {/* Preview */}
        <div
          className={`w-28 h-20 rounded-lg border-2 border-dashed border-gray-300 dark:border-slate-600 flex items-center justify-center bg-gray-50 dark:bg-slate-700/20 overflow-hidden flex-shrink-0 transition-colors ${disabled ? 'cursor-not-allowed' : 'cursor-pointer hover:border-blue-400'}`}
          onClick={() => !disabled && inputRef.current?.click()}
        >
          {value
            ? <img src={value} alt="preview" className="max-w-full max-h-full object-contain p-1" />
            : <div className="text-center text-gray-400"><ImageIcon className="h-6 w-6 mx-auto mb-1" /><span className="text-[10px]">Sem imagem</span></div>
          }
        </div>
        {/* Botões */}
        <div className="flex flex-col gap-2">
          <button type="button" disabled={disabled} onClick={() => inputRef.current?.click()}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs font-medium rounded-lg border border-blue-200 dark:border-blue-700 hover:bg-blue-100 transition-colors disabled:cursor-not-allowed">
            <Upload className="h-3.5 w-3.5" /> Escolher imagem
          </button>
          {value && (
            <button type="button" disabled={disabled} onClick={() => onChange(null)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-xs font-medium rounded-lg border border-red-200 dark:border-red-700 hover:bg-red-100 transition-colors disabled:cursor-not-allowed">
              <X className="h-3.5 w-3.5" /> Remover
            </button>
          )}
        </div>
      </div>
      <input ref={inputRef} type="file" accept="image/png,image/jpeg,image/svg+xml,image/webp" className="hidden" onChange={handleFile} />
    </div>
  );
};

export default function Configuracoes() {
  const { user, tenant, updateTenantConfig } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const { subdomain, tab: tabParam } = useParams();
  const navigate = useNavigate();
  const VALID_TABS_CONF = ['gerais', 'notificacoes', 'tema', 'importexport'];
  const activeTab = VALID_TABS_CONF.includes(tabParam) ? tabParam : 'gerais';
  const setActiveTab = (key) => navigate(`/${subdomain}/configuracoes/${key}`);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [editandoGerais, setEditandoGerais] = useState(false);
  const [geraisOriginal, setGeraisOriginal] = useState(null);

  // Estado da aba Gerais — configurações GLOBAIS do tenant (sem logo_secretaria)
  const conf = tenant?.configuracoes || {};
  const [geraisData, setGeraisData] = useState({
    logo_prefeitura:   conf.logo_prefeitura   || null,
    logo_sidebar:      conf.logo_sidebar      || null,
    imagem_fundo_login: conf.imagem_fundo_login || null,
    cor_relatorio_primaria:   conf.cor_relatorio_primaria   || '#1e40af',
    cor_relatorio_secundaria: conf.cor_relatorio_secundaria || '#1e3a5f',
    cor_relatorio_texto:      conf.cor_relatorio_texto      || '#111827',
  });

  // Logo da secretaria do usuário — armazenada na tabela secretarias (por secretaria)
  const [logoSecretaria, setLogoSecretaria] = useState(null);
  const [savingSecretariaLogo, setSavingSecretariaLogo] = useState(false);
  const secretariaId = user?.secretariaId || user?.secretaria?.id;

  // Busca configurações globais diretamente do banco ao montar
  useEffect(() => {
    if (!tenant?.subdominio) return;
    fetch(`/api/tenants/info?subdomain=${tenant.subdominio}`)
      .then(r => r.json())
      .then(data => {
        const c = data?.tenant?.configuracoes;
        if (!c) return;
        setGeraisData({
          logo_prefeitura:          c.logo_prefeitura          ?? null,
          logo_sidebar:             c.logo_sidebar             ?? null,
          imagem_fundo_login:       c.imagem_fundo_login       ?? null,
          cor_relatorio_primaria:   c.cor_relatorio_primaria   || '#1e40af',
          cor_relatorio_secundaria: c.cor_relatorio_secundaria || '#1e3a5f',
          cor_relatorio_texto:      c.cor_relatorio_texto      || '#111827',
        });
      })
      .catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenant?.subdominio]);

  // Busca logo da secretaria do usuário logado
  useEffect(() => {
    if (!secretariaId || !tenant?.subdominio) return;
    import('../services/api').then(({ default: api }) => {
      api.get('/organizacao/secretarias', {
        headers: { 'x-tenant-subdomain': tenant.subdominio },
      }).then(r => {
        const sec = r.data?.secretarias?.find(s => s.id === secretariaId);
        if (sec?.logo) setLogoSecretaria(sec.logo);
      }).catch(() => {});
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [secretariaId, tenant?.subdominio]);

  const handleLogoSecretaria = async (value) => {
    setLogoSecretaria(value);
    setSavingSecretariaLogo(true);
    try {
      const api = (await import('../services/api')).default;
      await api.patch(
        `/organizacao/secretarias/${secretariaId}/logo`,
        { logo: value },
        { headers: { 'x-tenant-subdomain': tenant?.subdominio } }
      );
      feedback('✅ Logo da secretaria salva!');
    } catch (err) {
      feedback(err.response?.data?.error || 'Erro ao salvar logo da secretaria', true);
    } finally {
      setSavingSecretariaLogo(false);
    }
  };

  const [notificacoesData, setNotificacoesData] = useState({
    emailProcesso: true,
    emailTramitacao: true,
    emailMencao: false,
    pushProcesso: true,
  });

  const feedback = (msg, isError = false) => {
    if (isError) setError(msg); else setSuccess(msg);
    setTimeout(() => { setSuccess(''); setError(''); }, 3500);
  };

  const handleNotificacoesSubmit = async (e) => {
    e.preventDefault(); setLoading(true);
    try { await import('../services/api').then(m => m.default.put('/users/notificacoes', notificacoesData)); feedback('✅ Preferências salvas!'); }
    catch (err) { feedback(err.response?.data?.error || 'Erro ao atualizar notificações', true); }
    finally { setLoading(false); }
  };

  const handleLogoChange = async (field, value) => {
    const updated = { ...geraisData, [field]: value };
    setGeraisData(updated);
    try {
      await updateTenantConfig(updated);
    } catch (err) {
      feedback(err.response?.data?.error || 'Erro ao salvar imagem', true);
    }
  };


  const handleGeraisSubmit = async (e) => {
    e.preventDefault(); setLoading(true);
    try {
      await updateTenantConfig(geraisData);
      setGeraisOriginal({ ...geraisData });
      feedback('✅ Configurações salvas com sucesso!');
      setEditandoGerais(false);
    } catch (err) {
      feedback(err.response?.data?.error || 'Erro ao salvar configurações', true);
    } finally { setLoading(false); }
  };

  const tabs = [
    { id: 'gerais',       icon: Building2,      label: 'Gerais' },
    { id: 'notificacoes', icon: Bell,            label: 'Notificações' },
    { id: 'tema',         icon: Palette,         label: 'Tema' },
    { id: 'importexport', icon: ArrowLeftRight,  label: 'Import / Export' },
  ];

  // ── estados Importações/Exportações
  const [importFile, setImportFile] = useState(null);
  const [importType, setImportType] = useState('processos');
  const [importStatus, setImportStatus] = useState(null); // { ok, msg }
  const [exportLoading, setExportLoading] = useState('');
  const importInputRef = useRef(null);

  const handleExport = async (tipo, formato = 'json') => {
    setExportLoading(tipo + formato);
    try {
      const api = (await import('../services/api')).default;
      const resp = await api.get(`/export/${tipo}?formato=${formato}`, {
        responseType: 'blob',
        headers: { 'x-tenant-subdomain': tenant?.subdominio },
      });
      const ext = formato === 'csv' ? 'csv' : 'json';
      const url = URL.createObjectURL(new Blob([resp.data]));
      const a = document.createElement('a');
      a.href = url;
      a.download = `${tipo}_${new Date().toISOString().slice(0,10)}.${ext}`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      feedback(`Erro ao exportar ${tipo}: ` + (err.response?.data?.error || err.message), true);
    } finally {
      setExportLoading('');
    }
  };

  const handleImport = async () => {
    if (!importFile) return;
    setImportStatus(null);
    const formData = new FormData();
    formData.append('file', importFile);
    formData.append('tipo', importType);
    try {
      const api = (await import('../services/api')).default;
      const resp = await api.post('/import', formData, {
        headers: { 'Content-Type': 'multipart/form-data', 'x-tenant-subdomain': tenant?.subdominio },
      });
      setImportStatus({ ok: true, msg: resp.data?.message || `Importação concluída com sucesso!` });
      setImportFile(null);
      if (importInputRef.current) importInputRef.current.value = '';
    } catch (err) {
      setImportStatus({ ok: false, msg: err.response?.data?.error || 'Erro ao importar arquivo.' });
    }
  };

  const handleDownloadTemplate = async (tipo) => {
    try {
      const api = (await import('../services/api')).default;
      const resp = await api.get(`/export/modelo/${tipo}`, {
        responseType: 'blob',
        headers: { 'x-tenant-subdomain': tenant?.subdominio },
      });
      const url = URL.createObjectURL(new Blob([resp.data]));
      const a = document.createElement('a');
      a.href = url;
      a.download = `modelo_${tipo}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      feedback('Erro ao baixar modelo: ' + (err.response?.data?.error || err.message), true);
    }
  };

  const exportItems = [
    { id: 'processos',    emoji: '📄', label: 'Processos',            desc: 'Todos os processos e tramitações' },
    { id: 'usuarios',     emoji: '👥', label: 'Usuários',              desc: 'Lista de usuários e permissões' },
    { id: 'setores',      emoji: '🏢', label: 'Setores / Secretarias', desc: 'Estrutura organizacional' },
    { id: 'documentos',   emoji: '📁', label: 'Documentos',            desc: 'Metadados dos documentos anexados' },
    { id: 'itens',        emoji: '📦', label: 'Itens',                 desc: 'Catálogo de itens de contratos' },
    { id: 'contratos',    emoji: '📝', label: 'Contratos',             desc: 'Todos os contratos cadastrados' },
    { id: 'credores',     emoji: '🏦', label: 'Credores',              desc: 'Lista de credores/fornecedores' },
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-5 animate-fade-in">
      <PageHeader
        icon={Settings}
        eyebrow="Sistema"
        title="Configurações"
        subtitle="Gerencie suas preferências e informações pessoais"
      />

      {/* Card de resumo do ambiente */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Tenant', value: tenant?.subdominio || tenant?.nome || '—', icon: Building2, color: 'blue' },
          { label: 'Ambiente', value: import.meta.env.MODE === 'production' ? 'Produção' : 'Desenvolvimento', icon: Settings, color: import.meta.env.MODE === 'production' ? 'green' : 'amber' },
          { label: 'Versão', value: '1.0.0', icon: Key, color: 'purple' },
          { label: 'Última atualização', value: tenant?.updated_at ? new Date(tenant.updated_at).toLocaleDateString('pt-BR') : new Date().toLocaleDateString('pt-BR'), icon: RefreshCw, color: 'slate' },
        ].map(({ label, value, icon: Icon, color }) => {
          const colorMap = {
            blue:   'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800',
            green:  'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800',
            amber:  'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800',
            purple: 'bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-400 border-purple-200 dark:border-purple-800',
            slate:  'bg-slate-50 dark:bg-slate-800/50 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700',
          };
          return (
            <div key={label} className={`flex items-center gap-3 p-3 rounded-xl border ${colorMap[color]}`}>
              <Icon className="h-5 w-5 flex-shrink-0" />
              <div className="min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-wide opacity-70">{label}</p>
                <p className="text-sm font-semibold truncate">{value}</p>
              </div>
            </div>
          );
        })}
      </div>

      {success && (
        <div className="p-4 bg-green-50 dark:bg-green-900/30 border border-green-300 dark:border-green-700 rounded-lg text-green-800 dark:text-green-300 text-sm flex items-center gap-2">
          {success}
        </div>
      )}
      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/30 border border-red-300 dark:border-red-700 rounded-lg text-red-800 dark:text-red-300 text-sm flex items-center gap-2">
          {error}
        </div>
      )}

      <div className="card">
        {/* Tabs — overflow-x-auto no wrapper para funcionar no WebKit (border-radius + overflow-hidden bloqueia filhos) */}
        <div
          className="border-b border-gray-200 dark:border-slate-700/50 bg-gray-50 dark:bg-slate-800/50 overflow-x-auto overflow-y-hidden scrollbar-none touch-pan-x"
          style={{ WebkitOverflowScrolling: 'touch', touchAction: 'pan-x' }}
        >
          <nav className="flex min-w-max">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-shrink-0 flex items-center gap-2 py-3.5 px-5 border-b-2 font-medium text-sm transition-all whitespace-nowrap
                  ${activeTab === tab.id
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400 bg-white dark:bg-slate-900'
                    : 'border-transparent text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200 hover:border-gray-300'
                  }`}
              >
                <Icon className="h-4 w-4" /> {tab.label}
              </button>
              );
            })}
          </nav>
        </div>

        <div className="p-6">

          {/* Aba Gerais */}
          {activeTab === 'gerais' && (
            <form onSubmit={handleGeraisSubmit} className="space-y-8">

              {/* Logo da Secretaria — por secretaria, editável pelo gestor da secretaria */}
              {secretariaId && (
                <div>
                  <SectionTitle title="Logo da Secretaria" />
                  <p className="text-xs text-gray-400 dark:text-slate-500 mb-5">Cada secretaria configura sua própria logo. Aparece no cabeçalho dos relatórios desta secretaria.</p>
                  <div className="flex items-start gap-8">
                    <ImageUpload
                      label="Logo da Sua Secretaria"
                      value={logoSecretaria}
                      onChange={handleLogoSecretaria}
                      hint="PNG/SVG recomendado. Salvo automaticamente ao selecionar."
                      disabled={savingSecretariaLogo}
                    />
                    {savingSecretariaLogo && (
                      <div className="flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400 mt-8">
                        <RefreshCw className="h-4 w-4 animate-spin" /> Salvando...
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Logos Globais — visíveis para admin */}
              <div>
                <SectionTitle title="Identidade Visual do Sistema" />
                <p className="text-xs text-gray-400 dark:text-slate-500 mb-5">Configurações globais aplicadas a todo o sistema. Requer permissão de administrador.</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <ImageUpload
                    label="Logo da Prefeitura / Brasão"
                    value={geraisData.logo_prefeitura}
                    onChange={(v) => handleLogoChange('logo_prefeitura', v)}
                    hint="Aparece no cabeçalho principal dos relatórios e documentos oficiais."
                    disabled={!editandoGerais}
                  />
                  <ImageUpload
                    label="Logo do Sistema (Sidebar)"
                    value={geraisData.logo_sidebar}
                    onChange={(v) => handleLogoChange('logo_sidebar', v)}
                    hint="Substitui o ícone padrão no canto inferior esquerdo do menu lateral."
                    disabled={!editandoGerais}
                  />
                </div>
              </div>

              {/* Cores dos relatórios */}
              <div>
                <SectionTitle title="Cores dos Relatórios / Documentos" />
                <p className="text-xs text-gray-400 dark:text-slate-500 mb-5">Definam as cores institucionais usadas nos PDFs gerados pelo sistema.</p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-xl">
                  {[
                    { key: 'cor_relatorio_primaria',   label: 'Cor Primária',   hint: 'Cabeçalho, títulos' },
                    { key: 'cor_relatorio_secundaria', label: 'Cor Secundária', hint: 'Barras, separadores' },
                    { key: 'cor_relatorio_texto',      label: 'Cor do Texto',   hint: 'Texto principal' },
                  ].map(({ key, label, hint }) => (
                    <div key={key}>
                      <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">{label}</label>
                      <p className="text-xs text-gray-400 dark:text-slate-500 mb-2">{hint}</p>
                      <div className="flex items-center gap-3">
                        <input
                          type="color"
                          value={geraisData[key]}
                          onChange={e => setGeraisData(p => ({ ...p, [key]: e.target.value }))}
                          disabled={!editandoGerais}
                          className="h-9 w-14 rounded-lg border border-gray-300 dark:border-slate-600 cursor-pointer p-0.5 bg-white dark:bg-slate-700/30 disabled:opacity-60 disabled:cursor-not-allowed"
                        />
                        <span className="text-xs font-mono text-gray-600 dark:text-slate-400 uppercase">{geraisData[key]}</span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Preview das cores */}
                <div className="mt-5 rounded-lg overflow-hidden border border-gray-200 dark:border-slate-600 max-w-sm">
                  <div className="px-4 py-2.5 text-white text-xs font-bold" style={{ backgroundColor: geraisData.cor_relatorio_primaria }}>
                    Prefeitura Municipal — Preview
                  </div>
                  <div className="h-1" style={{ backgroundColor: geraisData.cor_relatorio_secundaria }} />
                  <div className="px-4 py-3 bg-white dark:bg-slate-900">
                    <p className="text-xs font-semibold" style={{ color: geraisData.cor_relatorio_texto }}>Conteúdo do relatório aqui</p>
                    <p className="text-[11px] mt-1" style={{ color: geraisData.cor_relatorio_texto, opacity: 0.7 }}>Processo nº 001/2026 · Secretaria de Administração</p>
                  </div>
                  <div className="h-1" style={{ backgroundColor: geraisData.cor_relatorio_secundaria }} />
                </div>
              </div>

              <div className="flex justify-end pt-2 gap-3">
                {editandoGerais ? (
                  <button
                    type="button"
                    onClick={() => {
                      if (geraisOriginal) setGeraisData({ ...geraisOriginal });
                      setEditandoGerais(false);
                    }}
                    className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600 text-gray-700 dark:text-slate-200 rounded-lg text-sm font-semibold transition-colors shadow-sm border border-gray-300 dark:border-slate-600"
                  >
                    <X className="h-4 w-4" /> Cancelar
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => { setGeraisOriginal({ ...geraisData }); setEditandoGerais(true); }}
                    className="flex items-center gap-2 px-4 py-2 bg-yellow-500 hover:bg-yellow-600 text-white rounded-lg text-sm font-semibold transition-colors shadow-sm"
                  >
                    Alterar
                  </button>
                )}
                <button type="submit" disabled={!editandoGerais || loading} className="btn-primary flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed">
                  <Save className="h-4 w-4" />
                  {loading ? 'Salvando...' : 'Salvar Configurações'}
                </button>
              </div>
            </form>
          )}

          {/* Aba Notificações */}
          {activeTab === 'notificacoes' && (
            <form onSubmit={handleNotificacoesSubmit} className="space-y-2">
              <SectionTitle title="Preferências de Notificação" />
              {[
                { key: 'emailProcesso',   title: 'E-mail — Novos Processos',            desc: 'Receba um e-mail quando um novo processo for criado' },
                { key: 'emailTramitacao', title: 'E-mail — Tramitações',               desc: 'Receba um e-mail quando um processo for tramitado para você' },
                { key: 'emailMencao',     title: 'E-mail — Menções',                   desc: 'Receba um e-mail quando for mencionado em um comentário' },
                { key: 'pushProcesso',    title: 'Push — Notificações do Navegador',   desc: 'Receba notificações push no navegador em tempo real' },
              ].map(({ key, title, desc }, i, arr) => (
                <div key={key} className={`flex items-center justify-between py-4 ${i < arr.length - 1 ? 'border-b border-gray-100 dark:border-slate-700/50' : ''}`}>
                  <div className="flex-1 pr-4">
                    <p className="font-medium text-gray-800 dark:text-slate-200 text-sm">{title}</p>
                    <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">{desc}</p>
                  </div>
                  <ToggleSwitch checked={notificacoesData[key]} onChange={(e) => setNotificacoesData({ ...notificacoesData, [key]: e.target.checked })} />
                </div>
              ))}

              <div className="flex justify-end pt-4">
                <button type="submit" disabled={loading} className="btn-primary flex items-center gap-2">
                  <Save className="h-4 w-4" />
                  {loading ? 'Salvando...' : 'Salvar Preferências'}
                </button>
              </div>
            </form>
          )}

          {/* Aba Tema */}
          {activeTab === 'tema' && (
            <div className="space-y-6">
              <SectionTitle title="Aparência do Sistema" />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-lg">
                <button
                  onClick={() => isDark && toggleTheme()}
                  className={`p-5 rounded-xl border-2 text-left transition-all ${!isDark ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30' : 'border-gray-200 dark:border-slate-700/50 hover:border-gray-300 dark:hover:border-slate-500'}`}
                >
                  <div className="mb-2"><Sun className="h-7 w-7 text-amber-500" /></div>
                  <p className="font-semibold text-gray-800 dark:text-slate-200">Modo Claro</p>
                  <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">Interface clara e brilhante</p>
                  {!isDark && <span className="mt-2 inline-flex items-center gap-1 badge bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300"><CheckCircle className="h-3 w-3" /> Ativo</span>}
                </button>
                <button
                  onClick={() => !isDark && toggleTheme()}
                  className={`p-5 rounded-xl border-2 text-left transition-all ${isDark ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30' : 'border-gray-200 dark:border-slate-700/50 hover:border-gray-300 dark:hover:border-slate-500'}`}
                >
                  <div className="mb-2"><Moon className="h-7 w-7 text-indigo-500" /></div>
                  <p className="font-semibold text-gray-800 dark:text-slate-200">Modo Escuro</p>
                  <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">Interface escura e confortável</p>
                  {isDark && <span className="mt-2 inline-flex items-center gap-1 badge bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300"><CheckCircle className="h-3 w-3" /> Ativo</span>}
                </button>
              </div>
              <p className="text-xs text-gray-400 dark:text-slate-500">A preferência de tema é salva automaticamente no seu navegador.</p>
            </div>
          )}

          {/* ─── Aba Importações / Exportações ─── */}
          {activeTab === 'importexport' && (
            <div className="space-y-8">

              {/* EXPORTAÇÃO */}
              <div>
                <SectionTitle icon={FileDown} title="Exportação de Dados" />
                <p className="text-xs text-gray-400 dark:text-slate-500 mb-5">
                  Faça o download dos dados do sistema nos formatos JSON ou CSV para backup ou integração com outros sistemas.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {exportItems.map(({ id, emoji, label, desc }) => (
                    <div key={id} className="flex items-center justify-between p-4 rounded-xl border border-gray-200 dark:border-slate-700/50 bg-gray-50 dark:bg-slate-800/50">
                      <div>
                        <p className="text-sm font-medium text-gray-800 dark:text-slate-200">{emoji} {label}</p>
                        <p className="text-xs text-gray-400 dark:text-slate-500 mt-0.5">{desc}</p>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0 ml-4">
                        <button
                          onClick={() => handleExport(id, 'json')}
                          disabled={exportLoading === id + 'json'}
                          className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-lg bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-700 hover:bg-blue-100 transition-colors disabled:opacity-60"
                        >
                          {exportLoading === id + 'json' ? <RefreshCw className="h-3 w-3 animate-spin" /> : <Download className="h-3 w-3" />}
                          JSON
                        </button>
                        <button
                          onClick={() => handleExport(id, 'csv')}
                          disabled={exportLoading === id + 'csv'}
                          className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-lg bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-700 hover:bg-green-100 transition-colors disabled:opacity-60"
                        >
                          {exportLoading === id + 'csv' ? <RefreshCw className="h-3 w-3 animate-spin" /> : <Download className="h-3 w-3" />}
                          CSV
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <hr className="border-gray-200 dark:border-slate-700/50" />

              {/* IMPORTAÇÃO */}
              <div>
                <SectionTitle icon={FileUp} title="Importação de Dados" />
                <p className="text-xs text-gray-400 dark:text-slate-500 mb-5">
                  Importe dados a partir de arquivos JSON ou CSV previamente exportados do sistema. Os registros existentes não serão sobrescritos.
                </p>

                <div className="space-y-4 max-w-lg">
                  {/* Tipo de dado */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">Tipo de dado a importar</label>
                    <select
                      value={importType}
                      onChange={e => setImportType(e.target.value)}
                      className="input-field"
                    >
                      {exportItems.map(({ id, emoji, label }) => (
                        <option key={id} value={id}>{emoji} {label}</option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => handleDownloadTemplate(importType)}
                      className="mt-2 flex items-center gap-1.5 text-xs font-medium text-orange-600 dark:text-orange-400 hover:text-orange-700 dark:hover:text-orange-300 transition-colors"
                    >
                      <Download className="h-3.5 w-3.5" />
                      Baixar planilha modelo (.csv)
                    </button>
                  </div>

                  {/* Upload */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">Arquivo (JSON ou CSV)</label>
                    <div
                      className="flex flex-col items-center justify-center p-6 rounded-xl border-2 border-dashed border-gray-300 dark:border-slate-600 bg-gray-50 dark:bg-slate-800/40 cursor-pointer hover:border-blue-400 transition-colors"
                      onClick={() => importInputRef.current?.click()}
                    >
                      <Database className="h-8 w-8 text-gray-300 dark:text-slate-600 mb-2" />
                      {importFile ? (
                        <p className="text-sm text-blue-600 dark:text-blue-400 font-medium">{importFile.name}</p>
                      ) : (
                        <>
                          <p className="text-sm text-gray-500 dark:text-slate-400">Clique para selecionar o arquivo</p>
                          <p className="text-xs text-gray-400 dark:text-slate-500 mt-1">Formatos aceitos: .json, .csv</p>
                        </>
                      )}
                    </div>
                    <input
                      ref={importInputRef}
                      type="file"
                      accept=".json,.csv"
                      className="hidden"
                      onChange={e => setImportFile(e.target.files[0] || null)}
                    />
                  </div>

                  {/* Feedback importação */}
                  {importStatus && (
                    <div className={`flex items-center gap-2 p-3 rounded-lg text-sm border ${
                      importStatus.ok
                        ? 'bg-green-50 dark:bg-green-900/30 border-green-200 dark:border-green-700 text-green-800 dark:text-green-300'
                        : 'bg-red-50 dark:bg-red-900/30 border-red-200 dark:border-red-700 text-red-800 dark:text-red-300'
                    }`}>
                      {importStatus.ok ? <CheckCircle className="h-4 w-4 flex-shrink-0" /> : <AlertCircle className="h-4 w-4 flex-shrink-0" />}
                      {importStatus.msg}
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={handleImport}
                    disabled={!importFile}
                    className="btn-primary flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Upload className="h-4 w-4" />
                    Importar Dados
                  </button>
                </div>
              </div>

              <hr className="border-gray-200 dark:border-slate-700/50" />

              {/* APIs / INTEGRAÇÕES */}
              <div>
                <SectionTitle icon={Key} title="APIs e Integrações" />
                <p className="text-xs text-gray-400 dark:text-slate-500 mb-5">
                  Endpoints disponíveis para integração com sistemas externos. Utilize o token JWT de autenticação no header <code className="bg-gray-100 dark:bg-slate-700/30 px-1 rounded text-xs">Authorization: Bearer &lt;token&gt;</code>.
                </p>

                <div className="space-y-3">
                  {[
                    { method: 'GET',    path: '/api/processos',            desc: 'Listagem de processos do tenant' },
                    { method: 'GET',    path: '/api/processos/:id',        desc: 'Detalhe de um processo por ID' },
                    { method: 'POST',   path: '/api/processos',            desc: 'Criar novo processo' },
                    { method: 'GET',    path: '/api/processos/publico/:n', desc: 'Consulta pública por número (sem autenticação)' },
                    { method: 'GET',    path: '/api/organizacao/setores',  desc: 'Listar setores do tenant' },
                    { method: 'GET',    path: '/api/organizacao/secretarias', desc: 'Listar secretarias do tenant' },
                    { method: 'GET',    path: '/export/processos?formato=json', desc: 'Exportar todos os processos' },
                    { method: 'POST',   path: '/import',                   desc: 'Importar dados via multipart/form-data' },
                  ].map(({ method, path, desc }) => (
                    <div key={method + path} className="flex items-start gap-3 p-3 rounded-lg bg-gray-50 dark:bg-slate-800/50 border border-gray-100 dark:border-slate-700/50">
                      <span className={`flex-shrink-0 mt-0.5 px-2 py-0.5 rounded text-[10px] font-bold ${
                        method === 'GET'  ? 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300' :
                        method === 'POST' ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300' :
                        'bg-yellow-100 dark:bg-yellow-900/40 text-yellow-700 dark:text-yellow-300'
                      }`}>{method}</span>
                      <div className="min-w-0">
                        <code className="text-xs font-mono text-gray-800 dark:text-slate-200 break-all">{path}</code>
                        <p className="text-xs text-gray-400 dark:text-slate-500 mt-0.5">{desc}</p>
                      </div>
                    </div>
                  ))}
                </div>

                <p className="text-xs text-gray-400 dark:text-slate-500 mt-4">
                  ℹ️ Todas as requisições devem incluir o header <code className="bg-gray-100 dark:bg-slate-700/30 px-1 rounded text-xs">x-tenant-subdomain: {tenant?.subdominio}</code> para identificar o tenant.
                </p>
              </div>

            </div>
          )}

        </div>
      </div>
    </div>
  );
}

