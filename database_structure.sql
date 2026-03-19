-- ========================================
-- JEOS PROCESSOS - ESTRUTURA DE BANCO DE DADOS
-- Sistema Multi-tenant para Tramitação de Processos
-- ========================================

-- ========================================
-- 1. BANCO DE DADOS GLOBAL (ADMIN)
-- Este banco fica no topo e controla todos os clientes
-- ========================================

CREATE DATABASE jprocesso_global;

\c jprocesso_global;

-- Tabela de Clientes (Prefeituras)
CREATE TABLE clientes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome_municipio VARCHAR(255) NOT NULL COMMENT 'Nome completo da prefeitura',
    cnpj VARCHAR(14) NOT NULL UNIQUE COMMENT 'CNPJ da prefeitura (sem pontuação)',
    subdominio VARCHAR(100) NOT NULL UNIQUE COMMENT 'Subdomínio para acesso (ex: iraucuba)',
    db_name VARCHAR(100) NOT NULL UNIQUE COMMENT 'Nome do banco/schema específico (ex: db_iraucuba)',
    db_user VARCHAR(100) COMMENT 'Usuário específico do banco (opcional)',
    db_password VARCHAR(255) COMMENT 'Senha do banco criptografada (opcional)',
    schema VARCHAR(100) NOT NULL UNIQUE COMMENT 'Schema PostgreSQL para isolamento',
    cidade VARCHAR(255) NOT NULL,
    estado VARCHAR(2) NOT NULL,
    ativo BOOLEAN DEFAULT TRUE,
    configuracoes JSONB DEFAULT '{}' COMMENT 'JSON com logo, brasão, cores, etc',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_clientes_subdominio ON clientes(subdominio);
CREATE INDEX idx_clientes_db_name ON clientes(db_name);
CREATE INDEX idx_clientes_ativo ON clientes(ativo);

-- ========================================
-- 2. BANCO DE DADOS DO CLIENTE (Ex: db_iraucuba)
-- Cada cliente terá uma cópia idêntica desta estrutura
-- Pode ser implementado como SCHEMA ou DATABASE separado
-- ========================================

-- Criar schema para o cliente (Multi-tenant via Schema)
CREATE SCHEMA IF NOT EXISTS db_iraucuba;
SET search_path TO db_iraucuba;

-- A. ESTRUTURA ORGANIZACIONAL
-- ========================================

-- Tabela de Secretarias
CREATE TABLE secretarias (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome VARCHAR(255) NOT NULL COMMENT 'Nome completo da secretaria',
    sigla VARCHAR(20) NOT NULL COMMENT 'Sigla da secretaria (ex: SEJUV)',
    descricao TEXT COMMENT 'Descrição das atribuições',
    ativo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_secretarias_ativo ON secretarias(ativo);

-- Tabela de Setores
CREATE TABLE setores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    secretaria_id UUID NOT NULL REFERENCES secretarias(id) ON DELETE CASCADE,
    nome VARCHAR(255) NOT NULL COMMENT 'Nome do setor',
    sigla VARCHAR(20) NOT NULL COMMENT 'Sigla do setor',
    descricao TEXT,
    ativo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_setores_secretaria_id ON setores(secretaria_id);
CREATE INDEX idx_setores_ativo ON setores(ativo);

-- Tabela de Usuários
CREATE TABLE usuarios (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome VARCHAR(255) NOT NULL COMMENT 'Nome completo do usuário',
    email VARCHAR(255) NOT NULL UNIQUE COMMENT 'Email para login e notificações',
    cpf VARCHAR(11) NOT NULL UNIQUE COMMENT 'CPF para login (sem pontuação)',
    senha VARCHAR(255) NOT NULL COMMENT 'Senha criptografada com bcrypt',
    telefone VARCHAR(11) COMMENT 'Telefone para contato',
    nivel_acesso VARCHAR(20) NOT NULL DEFAULT 'operacional' 
        CHECK (nivel_acesso IN ('admin', 'gestor', 'operacional'))
        COMMENT 'Admin: acesso total; Gestor: relatórios; Operacional: tramitação',
    ativo BOOLEAN DEFAULT TRUE,
    secretaria_id UUID REFERENCES secretarias(id),
    setor_id UUID REFERENCES setores(id),
    ultimo_acesso TIMESTAMP COMMENT 'Último login do usuário',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX idx_usuarios_email ON usuarios(email);
CREATE UNIQUE INDEX idx_usuarios_cpf ON usuarios(cpf);
CREATE INDEX idx_usuarios_setor_id ON usuarios(setor_id);
CREATE INDEX idx_usuarios_nivel_acesso ON usuarios(nivel_acesso);

-- B. PROCESSOS E DOCUMENTOS
-- ========================================

-- Tabela de Processos
CREATE TABLE processos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    numero_processo VARCHAR(50) NOT NULL UNIQUE COMMENT 'Formato: AAAA.NNNN (ex: 2026.0001)',
    ano INTEGER NOT NULL COMMENT 'Ano de abertura',
    sequencial INTEGER NOT NULL COMMENT 'Número sequencial dentro do ano',
    
    -- Dados do Processo
    assunto VARCHAR(500) NOT NULL COMMENT 'Título/resumo do processo',
    descricao TEXT NOT NULL COMMENT 'Descrição detalhada',
    
    -- Dados do Interessado
    interessado_nome VARCHAR(255) NOT NULL COMMENT 'Nome do cidadão/empresa',
    interessado_cpf_cnpj VARCHAR(14) NOT NULL COMMENT 'CPF ou CNPJ (sem pontuação)',
    interessado_email VARCHAR(255),
    interessado_telefone VARCHAR(11),
    
    -- Status e Localização Atual
    status_atual VARCHAR(20) NOT NULL DEFAULT 'aberto'
        CHECK (status_atual IN ('aberto', 'em_analise', 'pendente', 'devolvido', 'concluido', 'arquivado')),
    setor_atual_id UUID REFERENCES setores(id) COMMENT 'Setor onde o processo está',
    usuario_atual_id UUID REFERENCES usuarios(id) COMMENT 'Usuário responsável atual',
    
    -- Metadados
    qrcode TEXT COMMENT 'QR Code em base64 para consulta pública',
    prioridade VARCHAR(20) DEFAULT 'normal'
        CHECK (prioridade IN ('baixa', 'normal', 'alta', 'urgente')),
    data_abertura TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    data_conclusao TIMESTAMP,
    criado_por_id UUID NOT NULL REFERENCES usuarios(id),
    observacoes TEXT,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX idx_processos_numero ON processos(numero_processo);
CREATE INDEX idx_processos_status ON processos(status_atual);
CREATE INDEX idx_processos_setor_atual ON processos(setor_atual_id);
CREATE INDEX idx_processos_usuario_atual ON processos(usuario_atual_id);
CREATE INDEX idx_processos_ano_seq ON processos(ano, sequencial);
CREATE INDEX idx_processos_interessado_cpf ON processos(interessado_cpf_cnpj);
CREATE INDEX idx_processos_data_abertura ON processos(data_abertura);

-- C. HISTÓRICO DE TRAMITAÇÃO (A INTELIGÊNCIA DO SISTEMA)
-- ========================================

-- Tabela de Tramitações
-- Esta tabela registra CADA MOVIMENTO do processo
-- É dela que extraímos o histórico completo
CREATE TABLE tramitacoes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    processo_id UUID NOT NULL REFERENCES processos(id) ON DELETE CASCADE,
    
    -- Quem fez a ação
    origem_usuario_id UUID NOT NULL REFERENCES usuarios(id) COMMENT 'Usuário que realizou a ação',
    origem_setor_id UUID REFERENCES setores(id) COMMENT 'Setor de origem',
    
    -- Para onde foi
    destino_setor_id UUID REFERENCES setores(id) COMMENT 'Setor de destino',
    destino_usuario_id UUID REFERENCES usuarios(id) COMMENT 'Usuário destinatário (opcional)',
    
    -- Tipo de Ação
    tipo_acao VARCHAR(20) NOT NULL
        CHECK (tipo_acao IN ('abertura', 'tramite', 'devolucao', 'conclusao', 'arquivamento'))
        COMMENT 'Tipo de ação realizada',
    
    -- Conteúdo
    despacho TEXT COMMENT 'Parecer/análise do servidor',
    justificativa_devolucao TEXT COMMENT 'OBRIGATÓRIO quando tipo_acao = devolucao',
    
    -- Auditoria e Segurança
    data_hora TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    ip_origem VARCHAR(45) COMMENT 'IP do usuário (IPv4 ou IPv6)',
    assinatura_digital VARCHAR(64) COMMENT 'Hash SHA-256 para validação',
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- CONSTRAINT: Justificativa obrigatória para devolução
    CONSTRAINT chk_justificativa_devolucao 
        CHECK (tipo_acao != 'devolucao' OR justificativa_devolucao IS NOT NULL)
);

CREATE INDEX idx_tramitacoes_processo_id ON tramitacoes(processo_id);
CREATE INDEX idx_tramitacoes_data_hora ON tramitacoes(data_hora DESC);
CREATE INDEX idx_tramitacoes_origem_usuario ON tramitacoes(origem_usuario_id);
CREATE INDEX idx_tramitacoes_destino_setor ON tramitacoes(destino_setor_id);
CREATE INDEX idx_tramitacoes_tipo_acao ON tramitacoes(tipo_acao);

-- Tabela de Anexos (Documentos)
CREATE TABLE anexos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    processo_id UUID NOT NULL REFERENCES processos(id) ON DELETE CASCADE,
    
    -- Arquivo
    nome_arquivo VARCHAR(255) NOT NULL COMMENT 'Nome original do arquivo',
    nome_sistema VARCHAR(255) NOT NULL COMMENT 'Nome único gerado pelo sistema',
    url_arquivo VARCHAR(500) NOT NULL COMMENT 'URL completa (S3, local, etc)',
    tipo_mime VARCHAR(100) NOT NULL COMMENT 'Tipo MIME (application/pdf, etc)',
    tamanho_bytes INTEGER NOT NULL,
    
    -- Segurança e Integridade
    hash_md5 VARCHAR(32) NOT NULL COMMENT 'Hash MD5 para integridade',
    hash_sha256 VARCHAR(64) NOT NULL COMMENT 'Hash SHA-256 para segurança',
    
    -- Metadados
    upload_por_id UUID NOT NULL REFERENCES usuarios(id),
    data_upload TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    descricao TEXT,
    versao INTEGER DEFAULT 1 COMMENT 'Versão do documento',
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_anexos_processo_id ON anexos(processo_id);
CREATE INDEX idx_anexos_upload_por ON anexos(upload_por_id);
CREATE INDEX idx_anexos_hash_sha256 ON anexos(hash_sha256);

-- ========================================
-- 3. VIEWS ÚTEIS
-- ========================================

-- View de Processos com Informações Completas
CREATE OR REPLACE VIEW vw_processos_completos AS
SELECT 
    p.*,
    sa.nome as setor_atual_nome,
    sa.sigla as setor_atual_sigla,
    ua.nome as usuario_atual_nome,
    cp.nome as criado_por_nome,
    (SELECT COUNT(*) FROM tramitacoes WHERE processo_id = p.id) as total_tramitacoes,
    (SELECT COUNT(*) FROM anexos WHERE processo_id = p.id) as total_anexos
FROM processos p
LEFT JOIN setores sa ON p.setor_atual_id = sa.id
LEFT JOIN usuarios ua ON p.usuario_atual_id = ua.id
LEFT JOIN usuarios cp ON p.criado_por_id = cp.id;

-- View de Última Tramitação por Processo
CREATE OR REPLACE VIEW vw_ultima_tramitacao AS
SELECT DISTINCT ON (processo_id)
    t.*,
    u.nome as origem_usuario_nome,
    so.nome as origem_setor_nome,
    sd.nome as destino_setor_nome
FROM tramitacoes t
LEFT JOIN usuarios u ON t.origem_usuario_id = u.id
LEFT JOIN setores so ON t.origem_setor_id = so.id
LEFT JOIN setores sd ON t.destino_setor_id = sd.id
ORDER BY processo_id, data_hora DESC;

-- ========================================
-- 4. FUNÇÕES E TRIGGERS
-- ========================================

-- Função para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Aplicar trigger em todas as tabelas
CREATE TRIGGER update_usuarios_updated_at BEFORE UPDATE ON usuarios
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_processos_updated_at BEFORE UPDATE ON processos
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tramitacoes_updated_at BEFORE UPDATE ON tramitacoes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Função para gerar número de processo automaticamente
CREATE OR REPLACE FUNCTION gerar_numero_processo()
RETURNS TRIGGER AS $$
DECLARE
    ano_atual INTEGER;
    proximo_seq INTEGER;
BEGIN
    ano_atual := EXTRACT(YEAR FROM CURRENT_DATE);
    
    SELECT COALESCE(MAX(sequencial), 0) + 1 INTO proximo_seq
    FROM processos
    WHERE ano = ano_atual;
    
    NEW.ano := ano_atual;
    NEW.sequencial := proximo_seq;
    NEW.numero_processo := ano_atual || '.' || LPAD(proximo_seq::TEXT, 4, '0');
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_gerar_numero_processo
    BEFORE INSERT ON processos
    FOR EACH ROW
    EXECUTE FUNCTION gerar_numero_processo();

-- ========================================
-- 5. DADOS INICIAIS (SEED)
-- ========================================

-- Inserir primeira secretaria (exemplo)
INSERT INTO secretarias (nome, sigla, descricao) VALUES
('Secretaria de Juventude e Esporte', 'SEJUV', 'Responsável por políticas de juventude e esporte'),
('Secretaria de Administração', 'SEMAD', 'Gestão administrativa da prefeitura'),
('Secretaria de Finanças', 'SEFIN', 'Gestão financeira e orçamentária');

-- Inserir setores (exemplo)
INSERT INTO setores (secretaria_id, nome, sigla) VALUES
((SELECT id FROM secretarias WHERE sigla = 'SEJUV'), 'Protocolo Geral', 'PROTO'),
((SELECT id FROM secretarias WHERE sigla = 'SEJUV'), 'Projetos Esportivos', 'PE'),
((SELECT id FROM secretarias WHERE sigla = 'SEMAD'), 'Recursos Humanos', 'RH');

-- ========================================
-- 6. PERMISSÕES E SEGURANÇA
-- ========================================

-- Revogar acesso público
REVOKE ALL ON ALL TABLES IN SCHEMA db_iraucuba FROM PUBLIC;

-- Criar role para o tenant
CREATE ROLE db_iraucuba_user WITH LOGIN PASSWORD 'senha_segura_aqui';
GRANT USAGE ON SCHEMA db_iraucuba TO db_iraucuba_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA db_iraucuba TO db_iraucuba_user;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA db_iraucuba TO db_iraucuba_user;

-- ========================================
-- 7. BACKUP E MANUTENÇÃO
-- ========================================

-- Script de backup (executar via cron)
-- pg_dump -U postgres -h localhost -d jprocesso_global -F c -b -v -f "/backup/jprocesso_global_$(date +%Y%m%d).backup"
-- pg_dump -U postgres -h localhost -n db_iraucuba -F c -b -v -f "/backup/db_iraucuba_$(date +%Y%m%d).backup"

-- ========================================
-- FIM DA ESTRUTURA
-- ========================================
