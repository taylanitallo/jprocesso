# 📋 INSTRUÇÕES PARA CRIAR O BANCO DE DADOS NO PGADMIN

## 📌 PASSO 1: Abrir o pgAdmin
1. Abra o **pgAdmin 4**
2. Conecte-se ao servidor PostgreSQL (localhost)
3. Digite sua senha do PostgreSQL

## 📌 PASSO 2: Criar o Banco de Dados
1. Clique com botão direito em **Databases**
2. Selecione **Create > Database...**
3. Preencha:
   - **Database**: `jprocesso_global`
   - **Owner**: postgres (ou seu usuário)
4. Clique em **Save**

## 📌 PASSO 3: Executar o Script SQL
1. Clique com botão direito em **jprocesso_global**
2. Selecione **Query Tool**
3. Abra o arquivo `setup_database.sql` que está na pasta do projeto
4. Copie TODO o conteúdo (Ctrl+A, Ctrl+C)
5. Cole na Query Tool do pgAdmin (Ctrl+V)
6. Clique em **Execute** (ícone ▶️ ou F5)
7. Aguarde a execução (pode levar alguns segundos)

## 📌 PASSO 4: Verificar se Foi Criado
1. No painel esquerdo, expanda **jprocesso_global > Schemas**
2. Você deve ver:
   - ✅ `public` (schema padrão)
   - ✅ `tenant_teste` (schema do cliente)

3. Expanda `tenant_teste > Tables`
4. Você deve ver as tabelas:
   - ✅ secretarias
   - ✅ setores
   - ✅ usuarios
   - ✅ processos
   - ✅ tramitacoes
   - ✅ documentos

## 📌 PASSO 5: Verificar os Dados Iniciais
Execute estas queries para verificar se os dados foram inseridos:

```sql
-- Ver secretarias
SET search_path TO tenant_teste;
SELECT * FROM secretarias;

-- Ver setores
SELECT * FROM setores;

-- Ver usuário admin
SELECT id, nome, email, cpf, tipo FROM usuarios;
```

Você deve ver:
- 4 secretarias (SEMAD, SEDUC, SESAU, SEOBR)
- 5 setores
- 1 usuário (Administrador)

## 📌 PASSO 6: Configurar o Backend
Agora você precisa configurar o backend para usar o PostgreSQL real ao invés do mock.

Abra o arquivo `.env` na pasta `server/` e configure:

```env
# Banco de Dados
DB_HOST=localhost
DB_PORT=5432
DB_NAME=jprocesso_global
DB_USER=postgres
DB_PASSWORD=SUA_SENHA_AQUI
DB_SCHEMA=tenant_teste

# JWT
JWT_SECRET=seu_secret_aqui_minimo_32_caracteres

# Modo
USE_MOCK_AUTH=false

# Upload
UPLOAD_DIR=./uploads
```

## 📌 PASSO 7: Testar Conexão
Execute o script de teste de conexão:

```bash
node criar-usuario.js
```

Ou teste diretamente no pgAdmin:

```sql
SET search_path TO tenant_teste;
SELECT 
    (SELECT COUNT(*) FROM secretarias) as total_secretarias,
    (SELECT COUNT(*) FROM setores) as total_setores,
    (SELECT COUNT(*) FROM usuarios) as total_usuarios;
```

## 🎯 CREDENCIAIS DE LOGIN

Após configurar tudo, use estas credenciais para fazer login:

**Prefeitura:** Prefeitura de Teste (ou deixe em branco)  
**CPF:** 00000000000  
**Senha:** 123456

## ⚠️ TROUBLESHOOTING

### Erro: "database already exists"
- O banco já foi criado. Vá direto para o Passo 3.

### Erro: "permission denied for schema"
- Execute: `GRANT ALL ON SCHEMA tenant_teste TO postgres;`

### Erro: "function gen_random_uuid() does not exist"
- Execute: `CREATE EXTENSION IF NOT EXISTS "pgcrypto";`

### Erro ao conectar do backend
- Verifique se o PostgreSQL está rodando
- Verifique usuário e senha no .env
- Teste a conexão no pgAdmin

## 📊 ESTRUTURA FINAL

```
jprocesso_global (Database)
├── public (Schema padrão)
│   └── clientes (Tabela de tenants)
│
└── tenant_teste (Schema do cliente)
    ├── secretarias
    ├── setores
    ├── usuarios
    ├── processos
    ├── tramitacoes
    └── documentos
```

## ✅ PRÓXIMOS PASSOS

1. ✅ Criar banco de dados no pgAdmin
2. ⏭️ Configurar variáveis de ambiente (.env)
3. ⏭️ Desabilitar mock (USE_MOCK_AUTH=false)
4. ⏭️ Reiniciar servidor backend
5. ⏭️ Fazer login com credenciais reais
6. ⏭️ Testar criação de processos
