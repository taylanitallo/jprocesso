-- ============================================================
--  JPROCESSO — CRIAÇÃO DAS TABELAS BASE NO SCHEMA tenant_iraucuba
--  Execute este script NO pgAdmin conectado ao banco jprocesso_global
--  ANTES de rodar o MIGRACAO_BANCO.sql
--
--  ⚠️  O script é IDEMPOTENTE: pode ser re-executado sem erros.
-- ============================================================

SET search_path = "tenant_iraucuba";

-- ────────────────────────────────────────────────────────────
-- FUNÇÃO update_updated_at (necessária para os triggers)
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ────────────────────────────────────────────────────────────
-- 1. SECRETARIAS
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS secretarias (
  id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  nome        VARCHAR(255) NOT NULL,
  sigla       VARCHAR(20)  NOT NULL,
  descricao   TEXT,
  ativo       BOOLEAN      NOT NULL DEFAULT true,
  created_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_secretarias_ativo ON secretarias(ativo);

DROP TRIGGER IF EXISTS update_secretarias_updated_at ON secretarias;
CREATE TRIGGER update_secretarias_updated_at
  BEFORE UPDATE ON secretarias
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ────────────────────────────────────────────────────────────
-- 2. SETORES
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS setores (
  id             UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  secretaria_id  UUID         NOT NULL REFERENCES secretarias(id) ON DELETE CASCADE,
  nome           VARCHAR(255) NOT NULL,
  sigla          VARCHAR(20),
  descricao      TEXT,
  ativo          BOOLEAN      NOT NULL DEFAULT true,
  created_at     TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at     TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_setores_secretaria_id ON setores(secretaria_id);
CREATE INDEX IF NOT EXISTS idx_setores_ativo          ON setores(ativo);

DROP TRIGGER IF EXISTS update_setores_updated_at ON setores;
CREATE TRIGGER update_setores_updated_at
  BEFORE UPDATE ON setores
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ────────────────────────────────────────────────────────────
-- 3. USUARIOS
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS usuarios (
  id            UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  nome          VARCHAR(255) NOT NULL,
  email         VARCHAR(255) NOT NULL UNIQUE,
  cpf           VARCHAR(11)  NOT NULL UNIQUE,
  senha         VARCHAR(255) NOT NULL,
  telefone      VARCHAR(11),
  tipo          VARCHAR(20)  NOT NULL DEFAULT 'operacional'
    CHECK (tipo IN ('admin','gestor','operacional')),
  ativo         BOOLEAN      NOT NULL DEFAULT true,
  secretaria_id UUID         REFERENCES secretarias(id),
  setor_id      UUID         REFERENCES setores(id),
  ultimo_acesso TIMESTAMP,
  permissoes    JSONB        NOT NULL DEFAULT '{
    "criar_processo":        true,
    "editar_processo":       true,
    "excluir_processo":      false,
    "tramitar_processo":     true,
    "visualizar_relatorios": false,
    "gerenciar_usuarios":    false,
    "gerenciar_secretarias": false
  }'::jsonb,
  created_at    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_usuarios_email    ON usuarios(email);
CREATE UNIQUE INDEX IF NOT EXISTS idx_usuarios_cpf      ON usuarios(cpf);
CREATE INDEX       IF NOT EXISTS idx_usuarios_setor_id  ON usuarios(setor_id);
CREATE INDEX       IF NOT EXISTS idx_usuarios_tipo      ON usuarios(tipo);

DROP TRIGGER IF EXISTS update_usuarios_updated_at ON usuarios;
CREATE TRIGGER update_usuarios_updated_at
  BEFORE UPDATE ON usuarios
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ────────────────────────────────────────────────────────────
-- 4. PROCESSOS
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS processos (
  id                    UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  numero                VARCHAR(50)  NOT NULL UNIQUE,
  ano                   INTEGER      NOT NULL,
  sequencial            INTEGER      NOT NULL,
  assunto               VARCHAR(500) NOT NULL,
  descricao             TEXT         NOT NULL,
  interessado_nome      VARCHAR(255) NOT NULL,
  interessado_cpf_cnpj  VARCHAR(14)  NOT NULL,
  interessado_email     VARCHAR(255),
  interessado_telefone  VARCHAR(11),
  status                VARCHAR(20)  NOT NULL DEFAULT 'aberto'
    CHECK (status IN ('aberto','em_analise','pendente','devolvido','concluido','arquivado')),
  setor_atual_id        UUID         REFERENCES setores(id),
  usuario_atual_id      UUID         REFERENCES usuarios(id),
  qrcode                TEXT,
  prioridade            VARCHAR(20)  NOT NULL DEFAULT 'normal'
    CHECK (prioridade IN ('baixa','normal','alta','urgente')),
  tipo_processo         VARCHAR(30),
  data_abertura         TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  data_conclusao        TIMESTAMP,
  criado_por_id         UUID         NOT NULL REFERENCES usuarios(id),
  observacoes           TEXT,
  created_at            TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at            TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_processos_numero        ON processos(numero);
CREATE INDEX       IF NOT EXISTS idx_processos_status         ON processos(status);
CREATE INDEX       IF NOT EXISTS idx_processos_setor_atual    ON processos(setor_atual_id);
CREATE INDEX       IF NOT EXISTS idx_processos_usuario_atual  ON processos(usuario_atual_id);
CREATE INDEX       IF NOT EXISTS idx_processos_ano_seq        ON processos(ano, sequencial);
CREATE INDEX       IF NOT EXISTS idx_processos_data_abertura  ON processos(data_abertura);

DROP TRIGGER IF EXISTS update_processos_updated_at ON processos;
CREATE TRIGGER update_processos_updated_at
  BEFORE UPDATE ON processos
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Trigger para gerar número automático do processo
CREATE OR REPLACE FUNCTION gerar_numero_processo()
RETURNS TRIGGER AS $$
DECLARE
  ano_atual    INTEGER;
  proximo_seq  INTEGER;
BEGIN
  ano_atual := EXTRACT(YEAR FROM CURRENT_DATE);
  SELECT COALESCE(MAX(sequencial), 0) + 1 INTO proximo_seq
    FROM processos WHERE ano = ano_atual;
  NEW.ano        := ano_atual;
  NEW.sequencial := proximo_seq;
  NEW.numero     := ano_atual || '.' || LPAD(proximo_seq::TEXT, 6, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_gerar_numero_processo ON processos;
CREATE TRIGGER trigger_gerar_numero_processo
  BEFORE INSERT ON processos
  FOR EACH ROW
  WHEN (NEW.numero IS NULL)
  EXECUTE FUNCTION gerar_numero_processo();

-- ────────────────────────────────────────────────────────────
-- 5. TRAMITACOES
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS tramitacoes (
  id                      UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  processo_id             UUID        NOT NULL REFERENCES processos(id) ON DELETE CASCADE,
  origem_usuario_id       UUID        NOT NULL REFERENCES usuarios(id),
  origem_setor_id         UUID        REFERENCES setores(id),
  destino_setor_id        UUID        REFERENCES setores(id),
  destino_usuario_id      UUID        REFERENCES usuarios(id),
  tipo                    VARCHAR(20) NOT NULL
    CHECK (tipo IN ('abertura','tramitacao','devolucao','conclusao','arquivamento')),
  tipo_acao               VARCHAR(30)
    CHECK (tipo_acao IN ('abertura','tramite','devolucao','conclusao','arquivamento')),
  despacho                TEXT,
  observacao              TEXT,
  justificativa_devolucao TEXT,
  assinatura_digital      VARCHAR(255),
  data_hora               TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ip_origem               VARCHAR(45),
  created_at              TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at              TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_tramitacoes_processo_id      ON tramitacoes(processo_id);
CREATE INDEX IF NOT EXISTS idx_tramitacoes_data_hora        ON tramitacoes(data_hora DESC);
CREATE INDEX IF NOT EXISTS idx_tramitacoes_origem_usuario   ON tramitacoes(origem_usuario_id);
CREATE INDEX IF NOT EXISTS idx_tramitacoes_destino_setor    ON tramitacoes(destino_setor_id);
CREATE INDEX IF NOT EXISTS idx_tramitacoes_tipo_acao        ON tramitacoes(tipo_acao);

DROP TRIGGER IF EXISTS update_tramitacoes_updated_at ON tramitacoes;
CREATE TRIGGER update_tramitacoes_updated_at
  BEFORE UPDATE ON tramitacoes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ────────────────────────────────────────────────────────────
-- 6. DOCUMENTOS (tabela legada, mantida por compatibilidade)
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS documentos (
  id            UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  processo_id   UUID         NOT NULL REFERENCES processos(id) ON DELETE CASCADE,
  nome_original VARCHAR(255) NOT NULL,
  nome_sistema  VARCHAR(255) NOT NULL,
  caminho       VARCHAR(500) NOT NULL,
  tipo_mime     VARCHAR(100) NOT NULL,
  tamanho       INTEGER      NOT NULL,
  hash          VARCHAR(64)  NOT NULL,
  upload_por_id UUID         NOT NULL REFERENCES usuarios(id),
  data_upload   TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  descricao     TEXT,
  created_at    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_documentos_processo_id ON documentos(processo_id);
CREATE INDEX IF NOT EXISTS idx_documentos_upload_por  ON documentos(upload_por_id);

-- ============================================================
--  FIM — Após executar este script, rode o MIGRACAO_BANCO.sql
--  para adicionar as colunas mais recentes e criar as tabelas
--  novas (entidade, anexos, almoxarifado, financeiro, DID, etc.)
-- ============================================================
