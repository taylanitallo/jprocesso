# JEOS Processos - Sistema de Tramitação Multi-tenant

Sistema completo de tramitação de processos administrativos para prefeituras, com arquitetura multi-tenant de banco de dados isolados e interface otimizada para servidores públicos.

## 🎯 Características Principais

### Arquitetura Multi-tenant Robusta
- **Isolamento Total:** Cada prefeitura possui seu próprio schema PostgreSQL
- **Performance Otimizada:** Bancos pequenos e focados em uma única cidade
- **Segurança Máxima:** Dados de uma cidade nunca se misturam com outra
- **Conformidade LGPD:** Facilita auditoria e exclusão de dados

### Interface Pensada para Servidores Públicos
- **Informação Mastigada:** Cards visuais com dados claros e objetivos
- **Sidebar Intuitiva:** Navegação simplificada com ícones e badges
- **Dashboard Inteligente:** Alertas de processos parados há mais de 48h
- **Busca Global:** Localização rápida por número ou interessado

### Funcionalidades Completas

#### Protocolo Digital
- Abertura de processos com numeração automática (sequencial/ano)
- Upload de documentos (PDF, DOC, DOCX, JPG, PNG)
- Cadastro completo do interessado (CPF/CNPJ)
- Geração automática de QR Code para acompanhamento

#### Sistema de Tramitação
- Fluxo completo: Abertura → Tramitação → Devolução → Conclusão
- Histórico detalhado (timeline) de todas as movimentações
- Controle de localização atual do processo
- Despachos obrigatórios em cada tramitação
- Justificativa obrigatória para devolução

#### Gestão Organizacional
- Cadastro de Secretarias
- Cadastro de Setores vinculados às Secretarias
- Hierarquia de usuários: Admin, Gestor, Operacional

#### Consulta Pública
- Acompanhamento via QR Code
- Consulta por número do processo (sem necessidade de login)
- Visualização do histórico de tramitação

## Stack Tecnológica

### Backend
- Node.js + Express
- PostgreSQL (com schemas para multi-tenancy)
- Sequelize ORM
- JWT para autenticação
- Multer para upload de arquivos
- QRCode para geração de códigos

### Frontend
- React 18
- Vite (build tool)
- TailwindCSS (estilização)
- React Router (rotas)
- React Query (gerenciamento de estado)
- React Hook Form (formulários)
- Lucide React (ícones)

## Instalação

### Pré-requisitos
- Node.js 16+
- PostgreSQL 13+

### 1. Configurar Banco de Dados

```sql
CREATE DATABASE jprocesso_master;
```

### 2. Backend

```bash
# Instalar dependências
npm install

# Copiar arquivo de ambiente
cp .env.example .env

# Editar .env com suas configurações
# DB_HOST=localhost
# DB_PORT=5432
# DB_USER=postgres
# DB_PASSWORD=sua_senha
# DB_NAME=jprocesso_master
# JWT_SECRET=seu_secret_aqui

# Iniciar servidor (modo desenvolvimento)
npm run dev
```

O backend estará rodando em `http://localhost:5000`

### 3. Frontend

```bash
# Navegar para o diretório do cliente
cd client

# Instalar dependências
npm install

# Iniciar aplicação
npm run dev
```

O frontend estará rodando em `http://localhost:3000`

## Uso

### 1. Criar Primeira Prefeitura (Tenant)

Faça uma requisição POST para criar o primeiro cliente:

```bash
POST http://localhost:5000/api/tenants
Content-Type: application/json

{
  "nome": "Prefeitura de Irauçuba",
  "cnpj": "12345678000190",
  "subdominio": "iraucuba",
  "cidade": "Irauçuba",
  "estado": "CE",
  "adminNome": "Administrador",
  "adminEmail": "admin@iraucuba.ce.gov.br",
  "adminSenha": "senha123"
}
```

### 2. Fazer Login

Acesse `http://localhost:3000/login` e entre com:
- Prefeitura: `iraucuba`
- Email: `admin@iraucuba.ce.gov.br`
- Senha: `senha123`

### 3. Estrutura de Dados

#### Fluxo de Trabalho

1. **Criar Secretarias**: Cadastre as secretarias da prefeitura (SEJUV, Saúde, etc)
2. **Criar Setores**: Adicione setores dentro de cada secretaria
3. **Cadastrar Usuários**: Adicione servidores e vincule às secretarias/setores
4. **Abrir Processos**: Inicie novos processos administrativos
5. **Tramitar**: Envie processos entre secretarias com despachos

#### Status de Processo
- `aberto`: Processo recém-criado
- `em_analise`: Em tramitação entre setores
- `pendente`: Aguardando informações
- `devolvido`: Retornado à origem com justificativa
- `concluido`: Finalizado com despacho final

## Estrutura do Projeto

```
jProcesso/
├── server/                 # Backend
│   ├── config/            # Configurações (database)
│   ├── controllers/       # Lógica de negócio
│   ├── middleware/        # Autenticação, upload
│   ├── models/           # Modelos Sequelize
│   ├── routes/           # Rotas da API
│   └── index.js          # Entry point
├── client/               # Frontend
│   ├── src/
│   │   ├── components/  # Componentes React
│   │   ├── context/     # Context API (Auth)
│   │   ├── pages/       # Páginas
│   │   ├── services/    # API client
│   │   └── main.jsx     # Entry point
│   └── index.html
├── uploads/             # Arquivos enviados
├── package.json
└── README.md
```

## API Endpoints

### Autenticação
- `POST /api/auth/login` - Login
- `POST /api/auth/register` - Cadastro de usuário
- `GET /api/auth/profile` - Perfil do usuário

### Tenants (Admin)
- `POST /api/tenants` - Criar prefeitura
- `GET /api/tenants` - Listar prefeituras
- `GET /api/tenants/:id` - Detalhes da prefeitura
- `PUT /api/tenants/:id` - Atualizar prefeitura

### Organização
- `POST /api/organizacao/secretarias` - Criar secretaria
- `GET /api/organizacao/secretarias` - Listar secretarias
- `POST /api/organizacao/setores` - Criar setor
- `GET /api/organizacao/setores` - Listar setores

### Processos
- `POST /api/processos` - Criar processo
- `GET /api/processos` - Listar processos
- `GET /api/processos/:id` - Detalhes do processo
- `POST /api/processos/:id/tramitar` - Tramitar processo
- `POST /api/processos/:id/devolver` - Devolver processo
- `POST /api/processos/:id/concluir` - Concluir processo
- `GET /api/processos/publico/:numero` - Consulta pública

### Documentos
- `POST /api/documentos/upload` - Upload de documento
- `GET /api/documentos/download/:id` - Download de documento
- `GET /api/documentos` - Listar documentos

## Segurança

- Autenticação via JWT (access token 15m + refresh token 30d em produção)
- Rate limiting nas APIs
- Helmet para headers de segurança
- Validação de tipos de arquivo no upload
- Hash SHA256 e MD5 dos arquivos para integridade
- Isolamento de dados por tenant (schema PostgreSQL por prefeitura)
- Supabase Storage privado com signed URLs de curta duração (60s)
- service_role key exclusiva do backend — nunca exposta ao frontend

## Deploy

### Railway (Backend)

Configure as variáveis no painel **Railway > seu projeto > Variables**:

| Variável | Valor |
|---|---|
| `NODE_ENV` | `production` |
| `PORT` | _(Railway define automaticamente)_ |
| `DB_HOST` | `aws-1-sa-east-1.pooler.supabase.com` |
| `DB_PORT` | `5432` |
| `DB_NAME` | `postgres` |
| `DB_USER` | `postgres.<project-ref>` |
| `DB_PASSWORD` | _(senha do Supabase)_ |
| `JWT_SECRET` | _(64 bytes hex aleatório)_ |
| `JWT_EXPIRE` | `15m` |
| `REFRESH_TOKEN_SECRET` | _(64 bytes hex diferente do JWT\_SECRET)_ |
| `REFRESH_TOKEN_EXPIRE` | `30d` |
| `SUPABASE_URL` | `https://<project-ref>.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | _(service\_role do Supabase — nunca expor)_ |
| `SUPABASE_STORAGE_BUCKET` | `jprocesso-documentos` |
| `CLIENT_URL` | URL do frontend no Vercel |
| `ALLOWED_ORIGINS` | URL do frontend no Vercel |
| `MAX_FILE_SIZE` | `10485760` |

### Vercel (Frontend)

Configure em **Vercel > projeto > Settings > Environment Variables**:

| Variável | Valor |
|---|---|
| `VITE_API_URL` | `https://<seu-projeto>.up.railway.app/api` |

> Não adicionar `VITE_SUPABASE_*` — o Storage é acessado exclusivamente pelo backend.

### Supabase Storage

Antes do primeiro deploy, crie o bucket no painel **Supabase > Storage**:
- **Name**: `jprocesso-documentos`
- **Public**: desativado (bucket privado obrigatório)
- **File size limit**: 10 MB
- **Allowed MIME types**: `application/pdf, image/jpeg, image/png, application/msword, application/vnd.openxmlformats-officedocument.wordprocessingml.document`

## Próximas Melhorias

- Notificações por email
- Dashboard com gráficos e estatísticas
- Relatórios em PDF
- Assinatura digital de documentos
- Workflow customizável por tipo de processo

## Licença

MIT

## Autor

Sistema desenvolvido para a Prefeitura de Irauçuba - JEOS Ecossistema
