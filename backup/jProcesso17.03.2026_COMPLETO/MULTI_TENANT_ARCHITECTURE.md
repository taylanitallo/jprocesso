# 🏛️ Arquitetura Multi-Tenant - jProcesso

## 📋 Visão Geral

O jProcesso implementa uma arquitetura **multi-tenant com isolamento total de dados**, onde cada município (prefeitura) possui seu próprio banco de dados isolado, garantindo segurança máxima e zero risco de vazamento de informações entre diferentes clientes.

## 🔐 Modelo de Isolamento: Schema-Based

### Características Principais

- ✅ **Isolamento Completo**: Cada município possui um schema PostgreSQL exclusivo
- ✅ **Zero Vazamento**: Dados de um município são completamente invisíveis para outros
- ✅ **Escalabilidade**: Pode suportar centenas de municípios no mesmo banco
- ✅ **Performance**: Queries isoladas por schema são extremamente eficientes
- ✅ **Manutenção Simples**: Um único banco PostgreSQL gerencia todos os tenants
- ✅ **Backup Granular**: Possibilidade de backup individual por município

### Estrutura do Banco de Dados

```
jprocesso_global (Database)
│
├── public (Schema Master)
│   └── clientes (Tabela de registro dos tenants)
│       ├── id
│       ├── nome_municipio
│       ├── cnpj
│       ├── subdominio
│       ├── schema (nome do schema isolado)
│       ├── cidade
│       ├── estado
│       ├── ativo
│       └── configuracoes (JSON)
│
├── tenant_teste (Schema do Município 1)
│   ├── secretarias
│   ├── setores
│   ├── usuarios
│   ├── processos
│   ├── tramitacoes
│   └── documentos
│
├── tenant_saobento (Schema do Município 2)
│   ├── secretarias
│   ├── setores
│   ├── usuarios
│   ├── processos
│   ├── tramitacoes
│   └── documentos
│
└── tenant_cidadex (Schema do Município N)
    └── [mesma estrutura]
```

## 🏗️ Fluxo de Criação de Novo Tenant

### 1. Cadastro pelo Administrador do Sistema

```javascript
POST /api/tenants
{
  "nome": "Prefeitura Municipal de São Bento",
  "cnpj": "12345678000199",
  "subdominio": "saobento",
  "cidade": "São Bento",
  "estado": "PB",
  "adminNome": "José Silva",
  "adminCpf": "12345678900",
  "adminEmail": "admin@saobento.pb.gov.br",
  "adminSenha": "senha_segura",
  "configuracoes": {
    "cor_primaria": "#0066CC",
    "cor_secundaria": "#004C99"
  }
}
```

### 2. Processo Automático de Criação

O sistema executa automaticamente:

1. **Validação**
   - Verifica se subdomínio já existe
   - Verifica se CNPJ já cadastrado
   - Valida dados obrigatórios

2. **Registro no Master**
   ```sql
   INSERT INTO clientes (nome_municipio, cnpj, subdominio, schema, ...)
   VALUES ('Prefeitura Municipal de São Bento', '12345678000199', 'saobento', 'tenant_saobento', ...);
   ```

3. **Criação do Schema Isolado**
   ```sql
   CREATE SCHEMA tenant_saobento;
   ```

4. **Criação das Tabelas**
   ```sql
   -- Todas as 6 tabelas são criadas no schema isolado
   CREATE TABLE tenant_saobento.secretarias (...);
   CREATE TABLE tenant_saobento.setores (...);
   CREATE TABLE tenant_saobento.usuarios (...);
   CREATE TABLE tenant_saobento.processos (...);
   CREATE TABLE tenant_saobento.tramitacoes (...);
   CREATE TABLE tenant_saobento.documentos (...);
   ```

5. **Dados Iniciais**
   ```sql
   -- Secretaria padrão
   INSERT INTO tenant_saobento.secretarias (nome, sigla) 
   VALUES ('Secretaria de Administração', 'SEMAD');

   -- Setor padrão
   INSERT INTO tenant_saobento.setores (secretaria_id, nome, sigla)
   VALUES (..., 'Protocolo Geral', 'PROTO');

   -- Usuário administrador
   INSERT INTO tenant_saobento.usuarios (nome, email, cpf, senha, tipo)
   VALUES ('José Silva', 'admin@saobento.pb.gov.br', '12345678900', hash, 'admin');
   ```

6. **Confirmação**
   ```json
   {
     "success": true,
     "message": "Município cadastrado com sucesso! Banco de dados isolado criado.",
     "tenant": {
       "id": "uuid",
       "nome_municipio": "Prefeitura Municipal de São Bento",
       "subdominio": "saobento",
       "schema": "tenant_saobento",
       "url_acesso": "saobento.jprocesso.gov.br"
     }
   }
   ```

## 🔄 Fluxo de Acesso (Login)

### 1. Usuário Acessa o Sistema

```
URL: saobento.jprocesso.gov.br
     └── Subdomínio identifica o tenant
```

### 2. Identificação do Tenant

```javascript
// Frontend envia subdomínio no login
POST /api/auth/login
{
  "cpf": "12345678900",
  "senha": "senha_segura",
  "subdomain": "saobento"
}
```

### 3. Backend Localiza o Tenant

```javascript
// 1. Busca tenant no banco master
const tenant = await Tenant.findOne({ 
  where: { subdominio: 'saobento', ativo: true } 
});

// 2. Define schema para queries
await masterDb.query(`SET search_path TO ${tenant.schema}, public`);

// 3. Busca usuário no schema isolado
const usuario = await Usuario.findOne({ 
  where: { cpf: '12345678900' } 
});
// SELECT * FROM tenant_saobento.usuarios WHERE cpf = '12345678900';
```

### 4. Todas as Queries Isoladas

```javascript
// Todas as queries subsequentes usam o schema correto
await Processo.findAll(); 
// SELECT * FROM tenant_saobento.processos;

await Secretaria.findAll();
// SELECT * FROM tenant_saobento.secretarias;
```

## 🛡️ Segurança e Isolamento

### Garantias de Isolamento

1. **Nível de Schema PostgreSQL**
   - Isolamento nativo do banco de dados
   - Impossível acessar dados de outro schema sem permissão explícita

2. **Validação no Middleware**
   ```javascript
   // middleware/tenantResolver.js
   const subdomain = req.headers['x-tenant-subdomain'];
   const tenant = await Tenant.findOne({ where: { subdominio: subdomain } });
   
   if (!tenant || !tenant.ativo) {
     return res.status(403).json({ error: 'Tenant inválido ou inativo' });
   }
   
   req.tenant = tenant;
   req.schema = tenant.schema;
   ```

3. **Configuração de Search Path**
   ```sql
   -- Cada requisição define o contexto correto
   SET search_path TO tenant_saobento, public;
   ```

4. **Logs e Auditoria**
   - Todas as queries incluem o schema no log
   - Rastreabilidade completa de acessos
   - Impossível misturar dados entre tenants

### Vantagens de Segurança

✅ **Impossível** acessar dados de outro município por erro de código
✅ **Impossível** misturar dados entre tenants em queries
✅ **Fácil** auditar acessos por município
✅ **Simples** fazer backup de um município específico
✅ **Rápido** desativar/reativar um município sem afetar outros

## 📊 Gerenciamento via Interface

### Dashboard Admin

A tela de **Gestão Multi-Tenant** (`/admin/tenants`) permite:

#### Estatísticas Gerais
- Total de municípios cadastrados
- Municípios ativos/inativos
- Distribuição por estado
- Total de bancos de dados isolados

#### CRUD de Municípios
- ✅ **Criar**: Cadastra novo município com schema isolado
- ✅ **Listar**: Exibe todos os municípios com informações de schema
- ✅ **Editar**: Atualiza dados e configurações visuais
- ✅ **Desativar**: Desabilita acesso sem deletar dados
- ⚠️ **Deletar**: Remove schema e todos os dados (requer confirmação)

#### Configurações por Município
- Nome e identificação (CNPJ)
- Localização (cidade/estado)
- Subdomínio (URL de acesso)
- Cores personalizadas (primária/secundária)
- Status (ativo/inativo)

## 🔧 Configurações Técnicas

### Variáveis de Ambiente

```env
# Banco de dados master
DB_HOST=localhost
DB_PORT=5432
DB_NAME=jprocesso_global
DB_USER=postgres
DB_PASSWORD=sua_senha

# Schema padrão para desenvolvimento
DB_SCHEMA=tenant_teste
```

### Configuração do Sequelize

```javascript
// config/database.js
const masterDb = new Sequelize(process.env.DB_NAME, ...);

// Para queries tenant-specific
async function getTenantConnection(schema) {
  await masterDb.query(`SET search_path TO ${schema}, public`);
  return masterDb;
}
```

### Models com Schema Dinâmico

```javascript
// models/Processo.js
class Processo extends Model {
  static init(sequelize) {
    return super.init({
      numero: DataTypes.STRING,
      assunto: DataTypes.STRING,
      // ...
    }, {
      sequelize,
      tableName: 'processos',
      underscored: true,
      // Schema será definido dinamicamente por tenant
    });
  }
}
```

## 📈 Escalabilidade

### Capacidade

- **Por Schema**: Até 2 bilhões de processos
- **Por Database**: Centenas de schemas (municípios)
- **Performance**: Não degrada com número de tenants
- **Backup**: Individual por município

### Otimizações

1. **Connection Pool** por tenant
2. **Cache** de tenant lookups
3. **Indexes** automáticos em todos os schemas
4. **Particionamento** (se necessário no futuro)

## 🚀 Deploy e Manutenção

### Novos Municípios

1. Admin acessa `/admin/tenants`
2. Clica em "Novo Município"
3. Preenche formulário
4. Sistema cria automaticamente:
   - Registro no master
   - Schema isolado
   - Todas as tabelas
   - Dados iniciais
   - Usuário admin

### Backup

```bash
# Backup de um município específico
pg_dump -h localhost -U postgres \
  -n tenant_saobento \
  jprocesso_global > saobento_backup.sql

# Backup de todos os tenants
pg_dump -h localhost -U postgres \
  jprocesso_global > jprocesso_full_backup.sql
```

### Restore

```bash
# Restore de um município
psql -h localhost -U postgres \
  jprocesso_global < saobento_backup.sql
```

## 📝 Benefícios da Arquitetura

### Para Municípios (Clientes)

✅ **Privacidade Total**: Dados completamente isolados
✅ **Personalização**: Cores e configurações próprias
✅ **Independência**: Podem ser desativados/reativados sem afetar outros
✅ **Backup Individual**: Dados podem ser extraídos separadamente

### Para Desenvolvedores

✅ **Manutenção Simples**: Uma codebase para todos
✅ **Deploy Único**: Atualização afeta todos os tenants
✅ **Debug Facilitado**: Schema explícito em todos os logs
✅ **Segurança por Design**: Impossível misturar dados

### Para Administradores do Sistema

✅ **Gestão Centralizada**: Todos os municípios em um lugar
✅ **Monitoramento**: Estatísticas globais e por tenant
✅ **Escalabilidade**: Adicionar novos municípios em segundos
✅ **Controle Total**: Ativar/desativar tenants conforme necessário

## 🎯 Próximos Passos

- [ ] Migração de dados entre schemas
- [ ] API para estatísticas por tenant
- [ ] Dashboard de uso por município
- [ ] Sistema de cotas (processos/usuários)
- [ ] Replicação automática de schemas
- [ ] Multi-região (schemas em databases diferentes)

---

**Desenvolvido para garantir máxima segurança e isolamento de dados entre municípios** 🔐
