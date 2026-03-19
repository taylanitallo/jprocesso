# 🎯 RESUMO - CRIAÇÃO DO BANCO DE DADOS

## 📁 Arquivos Criados

✅ **setup_database.sql** - Script SQL completo para executar no pgAdmin
✅ **INSTRUCOES_PGADMIN.md** - Guia passo a passo detalhado
✅ **server/.env** - Arquivo de configuração do backend
✅ **server/.env.example** - Modelo de configuração
✅ **gerar-hash-senha.js** - Script para gerar senhas bcrypt

## 🚀 COMO PROCEDER - 3 PASSOS SIMPLES

### 1️⃣ CRIAR BANCO NO PGADMIN (5 minutos)

1. Abra o **pgAdmin 4**
2. Crie um novo banco: `jprocesso_global`
3. Abra a Query Tool
4. Execute o arquivo **setup_database.sql**

### 2️⃣ CONFIGURAR BACKEND (2 minutos)

Edite o arquivo **server/.env** e mude:

```env
# Coloque a senha do seu PostgreSQL
DB_PASSWORD=SUA_SENHA_POSTGRES

# Mude de true para false para usar banco real
USE_MOCK_AUTH=false
```

### 3️⃣ REINICIAR SERVIDOR (1 minuto)

```bash
# Pare o servidor atual (Ctrl+C)
# Reinicie
cd server
npm start
```

## 📊 O QUE SERÁ CRIADO

```
📦 jprocesso_global (Banco de Dados)
│
├── 📁 Schema: public
│   └── 📋 clientes (1 registro - Prefeitura de Teste)
│
└── 📁 Schema: tenant_teste
    ├── 📋 secretarias (4 registros)
    ├── 📋 setores (5 registros)
    ├── 📋 usuarios (1 admin)
    ├── 📋 processos (vazio - pronto para usar)
    ├── 📋 tramitacoes (vazio)
    └── 📋 documentos (vazio)
```

## 🔐 DADOS INICIAIS

### Secretarias Criadas:
- ✅ SEMAD - Secretaria de Administração
- ✅ SEDUC - Secretaria de Educação
- ✅ SESAU - Secretaria de Saúde
- ✅ SEOBR - Secretaria de Obras

### Setores Criados:
- ✅ PROTO - Protocolo Geral (SEMAD)
- ✅ RH - Recursos Humanos (SEMAD)
- ✅ GE - Gestão Escolar (SEDUC)
- ✅ AB - Atenção Básica (SESAU)
- ✅ PROJ - Projetos (SEOBR)

### Usuário Admin:
- 👤 **Nome:** Administrador
- 📧 **Email:** admin@teste.com
- 🆔 **CPF:** 00000000000
- 🔑 **Senha:** 123456
- 👔 **Tipo:** admin
- 🏢 **Secretaria:** SEMAD
- 📍 **Setor:** Protocolo Geral

## 🎮 LOGIN APÓS CONFIGURAR

**No sistema jProcesso:**

```
Prefeitura: Prefeitura de Teste (ou vazio)
CPF: 00000000000
Senha: 123456
```

## ⚡ COMANDOS ÚTEIS NO PGADMIN

### Verificar Tabelas Criadas:
```sql
SET search_path TO tenant_teste;

SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'tenant_teste';
```

### Ver Dados Iniciais:
```sql
SET search_path TO tenant_teste;

SELECT 'Secretarias' as tabela, COUNT(*)::text as total FROM secretarias
UNION ALL
SELECT 'Setores', COUNT(*)::text FROM setores
UNION ALL
SELECT 'Usuários', COUNT(*)::text FROM usuarios;
```

### Ver Usuário Admin:
```sql
SET search_path TO tenant_teste;

SELECT id, nome, email, cpf, tipo, 
       (SELECT nome FROM secretarias WHERE id = usuarios.secretaria_id) as secretaria,
       (SELECT nome FROM setores WHERE id = usuarios.setor_id) as setor
FROM usuarios;
```

## ✅ CHECKLIST

Marque conforme for concluindo:

- [ ] pgAdmin 4 instalado e funcionando
- [ ] Banco `jprocesso_global` criado
- [ ] Script `setup_database.sql` executado sem erros
- [ ] Tabelas criadas em `tenant_teste`
- [ ] Dados iniciais verificados (4 secretarias, 5 setores, 1 usuário)
- [ ] Arquivo `server/.env` configurado com senha do PostgreSQL
- [ ] `USE_MOCK_AUTH` alterado para `false`
- [ ] Servidor backend reiniciado
- [ ] Login testado com CPF 00000000000 e senha 123456
- [ ] Sistema funcionando com banco real!

## 🆘 PRECISA DE AJUDA?

Consulte o arquivo **INSTRUCOES_PGADMIN.md** para detalhes completos.

Se der erro, verifique:
1. PostgreSQL está rodando?
2. Senha do .env está correta?
3. Todas as tabelas foram criadas?
4. O servidor foi reiniciado após mudar o .env?
