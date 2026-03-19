# 🔐 Estrutura Multi-Tenant Reorganizada

## Visão Geral

Sistema completamente reorganizado com **área restrita para administração** e **áreas isoladas por município**.

---

## 🌐 Estrutura de URLs

### 1. Área Restrita (Administração)
- **URL**: `http://localhost:3000/`
- **Função**: Login de administradores do sistema
- **Acesso**: Apenas para gestores que criam e gerenciam municípios

### 2. Gestão de Municípios
- **URL**: `http://localhost:3000/admin`
- **Função**: Interface de gestão multi-tenant
- **Acesso**: Após login admin, permite:
  - ✅ Criar novos municípios
  - ✅ Editar dados e configurações visuais
  - ✅ Ativar/desativar municípios
  - ✅ Visualizar estatísticas do sistema
  - ✅ Acessar links diretos para cada município

### 3. Área de Cada Município
- **URL**: `http://localhost:3000/{municipio}`
- **Exemplos**:
  - `http://localhost:3000/iraucuba`
  - `http://localhost:3000/exemplo`
  - `http://localhost:3000/teste`
- **Função**: Sistema completo isolado por município
- **Páginas**:
  - `/iraucuba/login` - Login do município
  - `/iraucuba` - Dashboard
  - `/iraucuba/processos` - Listagem de processos
  - `/iraucuba/processos/novo` - Criar processo
  - `/iraucuba/processos/:id` - Detalhes do processo
  - `/iraucuba/secretarias` - Gestão de secretarias

---

## 🔒 Isolamento de Dados

### Cada município possui:
- ✅ **Schema próprio no PostgreSQL**: `tenant_iraucuba`, `tenant_exemplo`, etc.
- ✅ **Tabelas isoladas**: 6 tabelas por município
  - secretarias
  - setores
  - usuarios
  - processos
  - tramitacoes
  - documentos
- ✅ **Dados completamente separados**: Usuários de um município **NUNCA** veem dados de outro

### Administração possui:
- ✅ **Tabela global `admins`** na schema `public`
- ✅ **Tabela `tenants`** com cadastro de todos os municípios
- ✅ **Acesso a estatísticas gerais** do sistema

---

## 👤 Credenciais de Acesso

### Administrador do Sistema
```
URL: http://localhost:3000/
CPF: 00000000191
Senha: admin123
```

### Município de Teste (exemplo)
```
URL: http://localhost:3000/teste/login
CPF: 00000000000
Senha: 123456
```

---

## 🔧 Configuração Inicial

### 1. Criar Tabela e Admin
Execute o script para criar o administrador:

```bash
cd server
node scripts/createAdmin.js
```

### 2. Acessar Área Restrita
1. Abra: `http://localhost:3000/`
2. Faça login com CPF: `00000000191` e Senha: `admin123`
3. Você será redirecionado para `/admin`

### 3. Criar Primeiro Município
1. Clique em **"Novo Município"**
2. Preencha os dados:
   - **Município**: Irauçuba
   - **UF**: CE
   - **Subdomínio**: iraucuba
   - **CNPJ**: 07659636000170
   - **Cores**: Configure as cores da interface
3. Crie o primeiro usuário admin do município
4. Clique em **"Criar Município"**

### 4. Acessar o Município
1. Na tabela, clique no link do subdomínio (ex: `/iraucuba`)
2. Faça login com as credenciais do usuário admin criado
3. Navegue pelo sistema isolado do município

---

## 📊 Fluxo de Trabalho

```
┌─────────────────────────────────────┐
│  http://localhost:3000/             │
│  Login Área Restrita (Admin)        │
└──────────────┬──────────────────────┘
               │ Login com CPF admin
               ↓
┌─────────────────────────────────────┐
│  http://localhost:3000/admin        │
│  Gestão Multi-Tenant                │
│  - Criar municípios                 │
│  - Editar configurações             │
│  - Ver estatísticas                 │
│  - Acessar links dos municípios     │
└──────────────┬──────────────────────┘
               │ Criar município "iraucuba"
               ↓
┌─────────────────────────────────────┐
│  Schema: tenant_iraucuba            │
│  Banco de dados isolado criado      │
│  - 6 tabelas criadas                │
│  - 1 secretaria padrão              │
│  - 1 setor padrão                   │
│  - 1 usuário admin                  │
└──────────────┬──────────────────────┘
               │ Acessar /iraucuba
               ↓
┌─────────────────────────────────────┐
│  http://localhost:3000/iraucuba/login│
│  Login do Município                 │
└──────────────┬──────────────────────┘
               │ Login com usuário do município
               ↓
┌─────────────────────────────────────┐
│  http://localhost:3000/iraucuba     │
│  Sistema Completo do Município      │
│  - Dashboard                        │
│  - Processos (isolados)             │
│  - Secretarias                      │
│  - Tramitações                      │
│  - Documentos                       │
└─────────────────────────────────────┘
```

---

## 🔐 Segurança

### Isolamento de Autenticação
- **Admin**: Token com flag `isAdmin: true` + `papel: 'admin'`
- **Usuário Município**: Token com `tenantId` e dados do schema

### Proteção de Rotas
- Rota `/admin` requer `requireAdmin: true`
- Rotas `/:subdomain/*` verificam token do município
- Logout limpa todos os tokens e flags

### Isolamento de Dados
- Cada requisição de município usa o schema correto
- Middleware valida tenant antes de executar queries
- Schemas são criados automaticamente e isolados

---

## 📁 Arquivos Criados/Modificados

### Novos Arquivos
- ✅ `client/src/pages/LoginAdmin.jsx` - Login da área restrita
- ✅ `server/scripts/createAdmin.js` - Script para criar admin
- ✅ `create_admin.sql` - SQL para tabela de admins

### Arquivos Modificados
- ✅ `client/src/App.jsx` - Rotas reorganizadas
- ✅ `client/src/pages/AdminTenants.jsx` - Header com logout
- ✅ `client/src/pages/Login.jsx` - Link para área restrita
- ✅ `server/controllers/authController.js` - Login de admin

---

## 🎨 Interface Visual

### Área Restrita (Login Admin)
- Fundo degradê escuro (cinza-900 → azul-900)
- Card branco centralizado
- Ícone de Shield (escudo)
- Título "Área Restrita"
- Campos: CPF e Senha
- Botão "Acessar Área Restrita"
- Informação sobre acesso de municípios

### Gestão Multi-Tenant
- Header com logo, título e botão de logout
- Estatísticas em cards (total, ativos, inativos, BDs isolados)
- Tabela com dados dos municípios
- Links clicáveis para cada subdomínio
- Botão "Novo Município"
- Modais de criação e edição

### Login do Município
- Design específico do município (cores configuráveis)
- Badge mostrando qual município está acessando
- Link no rodapé para área restrita
- Informações de contato e consulta pública

---

## 🚀 Próximos Passos

1. **Executar o script de criação do admin**
2. **Acessar área restrita e criar primeiro município**
3. **Testar isolamento de dados** entre municípios
4. **Configurar cores personalizadas** para cada município
5. **Implementar temas dinâmicos** baseados nas configurações

---

## 📞 Suporte

Para dúvidas sobre a estrutura multi-tenant:
- Verifique a tabela `admins` na schema `public`
- Verifique os schemas `tenant_*` para cada município
- Consulte os logs do backend para debug de autenticação
