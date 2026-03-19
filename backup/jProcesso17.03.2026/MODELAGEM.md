# Documentação da Modelagem de Banco de Dados - JEOS Processos

## Arquitetura Multi-tenant

O sistema JEOS Processos utiliza uma arquitetura multi-tenant robusta e escalável, permitindo que múltiplas prefeituras utilizem a mesma aplicação com isolamento completo de dados.

## Estrutura de Dois Níveis

### Nível 1: Banco de Dados Global (Admin)

**Banco:** `jprocesso_global`

Este banco fica no topo da hierarquia e serve **exclusivamente** para:
- Controlar quais clientes (prefeituras) estão cadastrados
- Direcionar o login para o banco correto
- Armazenar configurações globais de cada cliente

#### Tabela: `clientes`

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `id` | UUID | Identificador único |
| `nome_municipio` | VARCHAR(255) | Nome completo (ex: "Prefeitura Municipal de Irauçuba") |
| `cnpj` | VARCHAR(14) | CNPJ da prefeitura (sem pontuação) |
| `subdominio` | VARCHAR(100) | Subdomínio de acesso (ex: "iraucuba") |
| `db_name` | VARCHAR(100) | Nome do banco/schema específico (ex: "db_iraucuba") |
| `db_user` | VARCHAR(100) | Usuário do banco (opcional, para isolamento total) |
| `db_password` | VARCHAR(255) | Senha criptografada (opcional) |
| `schema` | VARCHAR(100) | Schema PostgreSQL para isolamento |
| `cidade` | VARCHAR(255) | Nome da cidade |
| `estado` | VARCHAR(2) | UF |
| `ativo` | BOOLEAN | Define se o cliente está ativo |
| `configuracoes` | JSONB | JSON com logo, brasão, cores institucionais, etc |

**Exemplo de configuracoes JSON:**
```json
{
  "logo_url": "https://cdn.jeos.com.br/iraucuba/logo.png",
  "brasao_url": "https://cdn.jeos.com.br/iraucuba/brasao.png",
  "cor_primaria": "#0066CC",
  "cor_secundaria": "#003366",
  "email_contato": "protocolo@iraucuba.ce.gov.br",
  "telefone": "8899999999"
}
```

### Nível 2: Banco de Dados do Cliente (Ex: db_iraucuba)

Cada cliente possui **seu próprio schema ou banco de dados**, garantindo:
- ✅ Isolamento completo de dados
- ✅ Performance otimizada (bancos pequenos e focados)
- ✅ Conformidade com LGPD
- ✅ Facilidade de backup/restore individual
- ✅ Possibilidade de migração de cliente entre servidores

## Fluxo de Autenticação Multi-tenant

```
1. Usuário acessa: iraucuba.jeos.com.br
   ↓
2. Backend detecta subdomínio: "iraucuba"
   ↓
3. Consulta tabela clientes no banco global
   ↓
4. Identifica: db_name = "db_iraucuba", schema = "db_iraucuba"
   ↓
5. Estabelece conexão com o schema específico
   ↓
6. Todas as queries da sessão usam APENAS dados de Irauçuba
```

## Estrutura Organizacional

### Hierarquia
```
Prefeitura (Tenant)
  └── Secretaria (SEJUV, SEMAD, SEFIN...)
        └── Setor (Protocolo, RH, Almoxarifado...)
              └── Usuário (Servidores)
```

### Tabela: `secretarias`

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `id` | UUID | Identificador único |
| `nome` | VARCHAR(255) | Nome completo da secretaria |
| `sigla` | VARCHAR(20) | Sigla (ex: SEJUV) |
| `descricao` | TEXT | Atribuições da secretaria |
| `ativo` | BOOLEAN | Define se está ativa |

### Tabela: `setores`

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `id` | UUID | Identificador único |
| `secretaria_id` | UUID | FK para secretarias |
| `nome` | VARCHAR(255) | Nome do setor |
| `sigla` | VARCHAR(20) | Sigla do setor |
| `descricao` | TEXT | Descrição das funções |
| `ativo` | BOOLEAN | Define se está ativo |

### Tabela: `usuarios`

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `id` | UUID | Identificador único |
| `nome` | VARCHAR(255) | Nome completo |
| `email` | VARCHAR(255) | Email (único) |
| `cpf` | VARCHAR(11) | CPF para login (único, sem pontuação) |
| `senha` | VARCHAR(255) | Hash bcrypt |
| `telefone` | VARCHAR(11) | Telefone (opcional) |
| `nivel_acesso` | ENUM | `admin`, `gestor`, `operacional` |
| `secretaria_id` | UUID | FK para secretarias |
| `setor_id` | UUID | FK para setores |
| `ativo` | BOOLEAN | Pode fazer login? |
| `ultimo_acesso` | TIMESTAMP | Último login |

**Níveis de Acesso:**
- **Admin:** Acesso total, pode gerenciar usuários e configurações
- **Gestor:** Pode gerar relatórios e gerenciar sua secretaria
- **Operacional:** Apenas tramitação de processos

## O Processo

### Tabela: `processos`

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `id` | UUID | Identificador único |
| `numero_processo` | VARCHAR(50) | Formato: AAAA.NNNN (ex: 2026.0001) |
| `ano` | INTEGER | Ano de abertura |
| `sequencial` | INTEGER | Número sequencial no ano |
| `assunto` | VARCHAR(500) | Título/resumo |
| `descricao` | TEXT | Descrição detalhada |
| **Interessado** |  |  |
| `interessado_nome` | VARCHAR(255) | Nome do cidadão/empresa |
| `interessado_cpf_cnpj` | VARCHAR(14) | CPF ou CNPJ (sem pontuação) |
| `interessado_email` | VARCHAR(255) | Email (opcional) |
| `interessado_telefone` | VARCHAR(11) | Telefone (opcional) |
| **Status e Localização** |  |  |
| `status_atual` | ENUM | `aberto`, `em_analise`, `pendente`, `devolvido`, `concluido`, `arquivado` |
| `setor_atual_id` | UUID | FK: Onde o processo está AGORA |
| `usuario_atual_id` | UUID | FK: Quem é o responsável AGORA |
| **Metadados** |  |  |
| `qrcode` | TEXT | QR Code em base64 |
| `prioridade` | ENUM | `baixa`, `normal`, `alta`, `urgente` |
| `data_abertura` | TIMESTAMP | Data/hora de abertura |
| `data_conclusao` | TIMESTAMP | Data/hora de conclusão (se concluído) |
| `criado_por_id` | UUID | FK: Quem abriu o processo |
| `observacoes` | TEXT | Observações gerais |

### Geração Automática de Número

O número do processo é gerado automaticamente seguindo o padrão:
- **Formato:** `AAAA.NNNN`
- **Exemplo:** `2026.0001`

**Lógica:**
1. Detecta o ano atual
2. Busca o último sequencial do ano
3. Incrementa +1
4. Formata com 4 dígitos (padding com zeros)

## A Inteligência: Tramitação

### Tabela: `tramitacoes`

Esta é a **tabela mais importante** do sistema. Ela registra **CADA MOVIMENTO** do processo, criando um histórico imutável e auditável.

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `id` | UUID | Identificador único |
| `processo_id` | UUID | FK para processos |
| **Origem** |  |  |
| `origem_usuario_id` | UUID | FK: Quem fez a ação |
| `origem_setor_id` | UUID | FK: De onde saiu |
| **Destino** |  |  |
| `destino_setor_id` | UUID | FK: Para onde foi |
| `destino_usuario_id` | UUID | FK: Para quem foi (opcional) |
| **Ação** |  |  |
| `tipo_acao` | ENUM | `abertura`, `tramite`, `devolucao`, `conclusao`, `arquivamento` |
| `despacho` | TEXT | Parecer do servidor |
| `justificativa_devolucao` | TEXT | **OBRIGATÓRIO** quando tipo_acao = devolucao |
| **Auditoria** |  |  |
| `data_hora` | TIMESTAMP | Timestamp da ação |
| `ip_origem` | VARCHAR(45) | IP do usuário (auditoria) |
| `assinatura_digital` | VARCHAR(64) | Hash SHA-256 para autenticidade |

### Tipos de Ação

1. **abertura:** Registro inicial da criação do processo
2. **tramite:** Envio normal de um setor para outro
3. **devolucao:** Retorno ao setor anterior (justificativa obrigatória)
4. **conclusao:** Finalização do processo
5. **arquivamento:** Arquivamento sem conclusão

### Regra de Negócio: Devolução Automática

Quando um usuário clica em **"Devolver"**:

```javascript
// 1. Justificativa é OBRIGATÓRIA
if (!justificativa || justificativa.length < 20) {
  throw new Error('Justificativa obrigatória (mín. 20 caracteres)');
}

// 2. Buscar a última tramitação
const ultimaTramitacao = await Tramitacao.findOne({
  where: { processo_id, tipo_acao: ['tramite', 'devolucao'] },
  order: [['data_hora', 'DESC']]
});

// 3. Criar nova tramitação DEVOLVENDO para a origem
await Tramitacao.create({
  processo_id,
  tipo_acao: 'devolucao',
  justificativa_devolucao: justificativa,
  origem_usuario_id: usuarioAtual.id,
  origem_setor_id: setorAtual.id,
  // IMPORTANTE: Destino = Origem da última tramitação
  destino_setor_id: ultimaTramitacao.origem_setor_id,
  destino_usuario_id: ultimaTramitacao.origem_usuario_id
});

// 4. Atualizar localização do processo
await Processo.update({
  status_atual: 'devolvido',
  setor_atual_id: ultimaTramitacao.origem_setor_id,
  usuario_atual_id: ultimaTramitacao.origem_usuario_id
});
```

### Constraint de Validação

```sql
-- GARANTE que justificativa_devolucao seja preenchida
CONSTRAINT chk_justificativa_devolucao 
    CHECK (tipo_acao != 'devolucao' OR justificativa_devolucao IS NOT NULL)
```

## Documentos (Anexos)

### Tabela: `anexos`

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `id` | UUID | Identificador único |
| `processo_id` | UUID | FK para processos |
| `nome_arquivo` | VARCHAR(255) | Nome original |
| `nome_sistema` | VARCHAR(255) | Nome único gerado |
| `url_arquivo` | VARCHAR(500) | URL completa (S3, local, etc) |
| `tipo_mime` | VARCHAR(100) | Tipo MIME |
| `tamanho_bytes` | INTEGER | Tamanho em bytes |
| `hash_md5` | VARCHAR(32) | Hash MD5 para integridade |
| `hash_sha256` | VARCHAR(64) | Hash SHA-256 para segurança |
| `upload_por_id` | UUID | FK: Quem fez upload |
| `data_upload` | TIMESTAMP | Data/hora do upload |
| `descricao` | TEXT | Descrição opcional |
| `versao` | INTEGER | Versão do documento |

### Segurança de Arquivos

1. **Duplo Hash:** MD5 + SHA-256 para integridade
2. **Nome Único:** Sistema gera UUID para evitar conflitos
3. **Armazenamento:** Suporta local ou AWS S3
4. **Auditoria:** Registra quem fez upload e quando

## Assinatura Digital

Cada tramitação gera uma **assinatura digital** usando SHA-256:

```javascript
const assinaturaDigital = crypto
  .createHash('sha256')
  .update(`${processo.id}-${usuario.id}-${tipoAcao}-${timestamp}`)
  .digest('hex');
```

**Benefícios:**
- ✅ Prova de autenticidade
- ✅ Não-repúdio (usuário não pode negar que fez a ação)
- ✅ Substituição de assinatura física
- ✅ Validade jurídica

## Views Otimizadas

### vw_processos_completos

Retorna processos com informações agregadas:
- Nome do setor atual
- Nome do usuário atual
- Total de tramitações
- Total de anexos

### vw_ultima_tramitacao

Retorna apenas a última tramitação de cada processo (útil para dashboards)

## Índices para Performance

```sql
-- Processos
CREATE INDEX idx_processos_status ON processos(status_atual);
CREATE INDEX idx_processos_setor_atual ON processos(setor_atual_id);
CREATE INDEX idx_processos_usuario_atual ON processos(usuario_atual_id);

-- Tramitações (índice DESC para buscar últimas ações)
CREATE INDEX idx_tramitacoes_data_hora ON tramitacoes(data_hora DESC);
CREATE INDEX idx_tramitacoes_processo_id ON tramitacoes(processo_id);
```

## Queries Comuns

### Buscar processos na caixa de um usuário
```sql
SELECT * FROM processos 
WHERE usuario_atual_id = 'user-uuid-here'
  AND status_atual != 'concluido'
ORDER BY data_abertura DESC;
```

### Histórico completo de um processo
```sql
SELECT 
  t.*,
  u.nome as origem_usuario_nome,
  so.nome as origem_setor_nome,
  sd.nome as destino_setor_nome
FROM tramitacoes t
LEFT JOIN usuarios u ON t.origem_usuario_id = u.id
LEFT JOIN setores so ON t.origem_setor_id = so.id
LEFT JOIN setores sd ON t.destino_setor_id = sd.id
WHERE t.processo_id = 'processo-uuid-here'
ORDER BY t.data_hora ASC;
```

### Processos parados há mais de 48h
```sql
SELECT * FROM processos
WHERE status_atual NOT IN ('concluido', 'arquivado')
  AND data_abertura < NOW() - INTERVAL '48 hours';
```

## Backup e Recuperação

### Backup do banco global
```bash
pg_dump -U postgres -h localhost -d jprocesso_global \
  -F c -b -v -f "/backup/global_$(date +%Y%m%d).backup"
```

### Backup de um cliente específico
```bash
pg_dump -U postgres -h localhost -n db_iraucuba \
  -F c -b -v -f "/backup/iraucuba_$(date +%Y%m%d).backup"
```

### Restore
```bash
pg_restore -U postgres -d jprocesso_global -v "/backup/global_20260203.backup"
```

## Escalabilidade

A arquitetura permite:

1. **Escala Horizontal:** Cada cliente pode ser movido para um servidor dedicado
2. **Escala Vertical:** Aumentar recursos do servidor conforme crescimento
3. **Sharding:** Separar clientes grandes em servidores próprios
4. **Read Replicas:** Criar réplicas de leitura para relatórios

## Conformidade LGPD

- ✅ Isolamento completo de dados por cliente
- ✅ Auditoria de todas as ações
- ✅ Possibilidade de exclusão total de dados de um cliente
- ✅ Hash de senhas com bcrypt
- ✅ Registro de IP para rastreabilidade

---

**Desenvolvido por:** JEOS Ecossistema  
**Versão da Documentação:** 1.0  
**Data:** Fevereiro 2026
