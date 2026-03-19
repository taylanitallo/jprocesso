# 🔐 Credenciais de Acesso - jProcesso (Modo Mock)

## 📋 Informações Gerais
- **Prefeitura:** `teste`
- **Senha padrão:** `123456`

## 👥 Usuários Disponíveis

### 1️⃣ Administrador (Acesso Total)
- **Nome:** Administrador
- **CPF:** `00000000000`
- **Email:** admin@teste.com
- **Tipo:** Admin
- **Permissões:** Todas

### 2️⃣ João Silva (Gestor)
- **Nome:** João Silva
- **CPF:** `11111111111`
- **Email:** joao@teste.com
- **Tipo:** Gestor
- **Secretaria:** Secretaria de Administração (SEMAD)
- **Setor:** Protocolo Geral

### 3️⃣ Maria Santos (Operacional)
- **Nome:** Maria Santos
- **CPF:** `22222222222`
- **Email:** maria@teste.com
- **Tipo:** Operacional
- **Secretaria:** Secretaria de Educação (SEDUC)
- **Setor:** Gestão Escolar

---

## 🏢 Secretarias Disponíveis

1. **Secretaria de Administração (SEMAD)**
   - Protocolo Geral
   - Recursos Humanos

2. **Secretaria de Educação (SEDUC)**
   - Gestão Escolar

3. **Secretaria de Saúde (SESAU)**
   - Atenção Básica

4. **Secretaria de Obras (SEOBR)**
   - Projetos

---

## 📂 Processos de Exemplo

O sistema possui **15 processos** criados automaticamente, incluindo:

- Solicitação de Material de Escritório
- Manutenção de Equipamentos
- Licitação de Serviços
- Contratação de Pessoal
- Reforma de Unidade Escolar
- Aquisição de Veículos
- E outros...

Cada processo possui:
- Número único no formato `XXXXXX/2026`
- 2 a 5 tramitações com histórico completo
- Status aleatório (tramitação, análise ou concluído)
- Prioridade (normal, alta ou urgente)

---

## 🚀 Como Usar

1. **Login:**
   - Acesse: http://localhost:3000
   - Preencha: Prefeitura, CPF e Senha
   - Clique em "Entrar"

2. **Consulta Pública:**
   - Acesse: http://localhost:3000/consulta-publica
   - Digite o número do processo (ex: `000001/2026`)
   - Preencha a prefeitura: `teste`
   - Clique em "Consultar"

---

## ⚙️ Modo Mock

O sistema está rodando em **modo mock** (sem banco de dados):
- Todos os dados estão em memória
- Nenhuma alteração é persistida
- Reiniciar o servidor reseta os dados
- Ideal para demonstração e testes

Para usar com banco PostgreSQL:
1. Instale o PostgreSQL
2. Configure o .env com as credenciais do banco
3. Mude `USE_MOCK_AUTH=false` no .env
4. Execute: `node seed-database.js`
5. Reinicie o servidor

---

## 📞 Suporte

Em caso de dúvidas, verifique os logs do servidor no terminal.
