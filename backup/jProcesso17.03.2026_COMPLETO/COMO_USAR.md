# 🎯 Instruções de Configuração - Sistema Multi-Tenant

## ✅ Sistema Reorganizado!

A estrutura foi completamente reorganizada conforme solicitado:

### 📍 URLs

1. **`http://localhost:3000/`** → Área Restrita (Login Admin)
2. **`http://localhost:3000/admin`** → Gestão de Municípios
3. **`http://localhost:3000/exemplo`** → Login do Município "Exemplo"

---

## 🚀 Passo a Passo para Iniciar

### 1️⃣ Criar Administrador do Sistema

Abra um terminal e execute:

```bash
npm run create-admin
```

Isso vai criar:
- ✅ Tabela `admins` no banco de dados (schema public)
- ✅ Usuário administrador padrão

**Credenciais criadas:**
- CPF: `00000000191`
- Senha: `admin123`

---

### 2️⃣ Acessar Área Restrita

1. Abra o navegador em: **`http://localhost:3000/`**
2. Você verá a tela de **"Área Restrita"**
3. Faça login com:
   - CPF: `00000000191`
   - Senha: `admin123`
4. Após o login, você será redirecionado para **`/admin`**

---

### 3️⃣ Criar Seu Primeiro Município

Na tela de **Gestão Multi-Tenant** (`/admin`):

1. Clique no botão **"Novo Município"**
2. Preencha os dados:

   **Dados do Município:**
   - Município: `Irauçuba` (ou o nome que desejar)
   - UF: `CE` (ou seu estado)
   - Cidade: `Irauçuba`
   - CNPJ: `07659636000170` (ou seu CNPJ)

   **Configuração do Subdomínio:**
   - Subdomínio: `iraucuba`
   - ➡️ Isso criará o acesso: `http://localhost:3000/iraucuba`

   **Configurações Visuais:**
   - Cor Primária: `#0066CC` (azul) ou escolha outra
   - Cor Secundária: `#004C99` (azul escuro) ou escolha outra

   **Primeiro Usuário Admin do Município:**
   - Nome: `Administrador Irauçuba`
   - CPF: `00000000000` (ou outro CPF)
   - Email: `admin@iraucuba.ce.gov.br`
   - Senha: `123456` (ou outra senha)

3. Clique em **"Criar Município"**

---

### 4️⃣ Acessar o Município Criado

Após a criação:

1. Na tabela de municípios, você verá o novo município
2. Clique no link do **Subdomínio** (ex: `/iraucuba`)
3. Você será redirecionado para: **`http://localhost:3000/iraucuba/login`**
4. Faça login com as credenciais do usuário admin que você criou:
   - CPF: `00000000000`
   - Senha: `123456`
5. Pronto! Você está no sistema isolado do município

---

## 🔒 Isolamento de Dados

### Como funciona:

Cada município possui um **banco de dados completamente isolado**:

```
┌──────────────────────────────────┐
│  PostgreSQL - jprocesso_global   │
├──────────────────────────────────┤
│  Schema: public                  │
│  ├─ Tabela: tenants             │
│  ├─ Tabela: admins              │
│                                  │
│  Schema: tenant_iraucuba         │
│  ├─ Tabela: secretarias         │
│  ├─ Tabela: setores             │
│  ├─ Tabela: usuarios            │
│  ├─ Tabela: processos           │
│  ├─ Tabela: tramitacoes         │
│  └─ Tabela: documentos          │
│                                  │
│  Schema: tenant_exemplo          │
│  ├─ Tabela: secretarias         │
│  ├─ Tabela: setores             │
│  ├─ Tabela: usuarios            │
│  ├─ Tabela: processos           │
│  ├─ Tabela: tramitacoes         │
│  └─ Tabela: documentos          │
└──────────────────────────────────┘
```

**Garantia:**
- ✅ Usuários de `iraucuba` **NUNCA** veem dados de `exemplo`
- ✅ Cada schema é criado automaticamente ao criar o município
- ✅ 6 tabelas são criadas para cada município
- ✅ Dados iniciais são inseridos (1 secretaria, 1 setor, 1 admin)

---

## 🧪 Testando o Sistema

### Teste 1: Criar 2 Municípios

1. Na área admin, crie **Município A** (ex: `iraucuba`)
2. Crie **Município B** (ex: `fortaleza`)
3. Cada um terá seu próprio link: `/iraucuba` e `/fortaleza`

### Teste 2: Verificar Isolamento

1. Acesse `/iraucuba/login` e faça login
2. Crie um processo
3. Faça logout
4. Acesse `/fortaleza/login` e faça login
5. **Você NÃO verá** o processo criado em Irauçuba ✅

### Teste 3: Voltar para Área Admin

1. Em qualquer página de município, clique em **"Sair"**
2. No rodapé da tela de login, clique em **"Acessar Área Restrita (Administração)"**
3. Faça login com CPF: `00000000191` e Senha: `admin123`
4. Você volta para a gestão de municípios

---

## 📊 Estatísticas no Admin

Na tela `/admin`, você verá:

- **Total de Municípios** - Quantos municípios estão cadastrados
- **Ativos** - Municípios com status ativo
- **Inativos** - Municípios desativados
- **BDs Isolados** - Total de schemas criados

---

## 🎨 Personalização

Cada município pode ter:
- ✅ **Cores personalizadas** (primária e secundária)
- ✅ **Logo próprio** (futuro)
- ✅ **Nome exibido** no cabeçalho
- ✅ **Dados de contato** específicos

---

## 🔧 Comandos Úteis

```bash
# Criar administrador do sistema
npm run create-admin

# Iniciar servidor backend
npm run dev

# Iniciar servidor frontend
cd client && npm run dev

# Ver todos os schemas no PostgreSQL
psql -U seu_usuario -d jprocesso_global -c "\dn"

# Ver tabelas de um município específico
psql -U seu_usuario -d jprocesso_global -c "\dt tenant_iraucuba.*"
```

---

## 🆘 Problemas Comuns

### Problema: "Tenant não encontrado"
**Solução:** Verifique se o município está ativo e o subdomínio está correto

### Problema: "Credenciais inválidas" no admin
**Solução:** Execute novamente `npm run create-admin`

### Problema: Schema não criado
**Solução:** Verifique os logs do backend ao criar o município

### Problema: Não consigo acessar `/admin` após login
**Solução:** Limpe o localStorage e faça login novamente

---

## 📁 Documentação Adicional

- [`ESTRUTURA_REORGANIZADA.md`](ESTRUTURA_REORGANIZADA.md) - Visão geral da arquitetura
- [`MULTI_TENANT_ARCHITECTURE.md`](MULTI_TENANT_ARCHITECTURE.md) - Arquitetura técnica
- [`TESTE_MULTI_TENANT.md`](TESTE_MULTI_TENANT.md) - Guia de testes

---

## 🎉 Tudo Pronto!

Seu sistema multi-tenant está completamente funcional:

✅ Área restrita para administração  
✅ Gestão de municípios  
✅ Isolamento total de dados  
✅ Criação automática de schemas  
✅ Autenticação separada (admin vs município)  
✅ URLs organizadas por subdomínio  

**Próximo passo:** Execute `npm run create-admin` e comece a usar!
