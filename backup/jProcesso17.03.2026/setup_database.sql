-- ========================================
-- JPROCESSO - SETUP DO BANCO DE DADOS
-- Execute este script no pgAdmin
-- ========================================

-- 1. CRIAR BANCO DE DADOS GLOBAL
CREATE DATABASE jprocesso_global;

-- 2. CONECTAR AO BANCO (Execute os comandos abaixo após criar o banco)
-- Clique com botão direito em jprocesso_global > Query Tool

-- 3. CRIAR TABELA DE CLIENTES (TENANTS)
CREATE TABLE IF NOT EXISTS clientes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome_municipio VARCHAR(255) NOT NULL,
    cnpj VARCHAR(14) NOT NULL UNIQUE,
    subdominio VARCHAR(100) NOT NULL UNIQUE,
    schema VARCHAR(100) NOT NULL UNIQUE,
    cidade VARCHAR(255) NOT NULL,
    estado VARCHAR(2) NOT NULL,
    ativo BOOLEAN DEFAULT TRUE,
    configuracoes JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_clientes_subdominio ON clientes(subdominio);
CREATE INDEX idx_clientes_ativo ON clientes(ativo);

-- 4. INSERIR CLIENTE DE TESTE (Prefeitura de Teste)
INSERT INTO clientes (nome_municipio, cnpj, subdominio, schema, cidade, estado) VALUES
('Prefeitura de Teste', '00000000000000', 'teste', 'tenant_teste', 'Cidade Teste', 'CE');

-- 5. CRIAR SCHEMA PARA O TENANT
CREATE SCHEMA IF NOT EXISTS tenant_teste;

-- 6. CONFIGURAR SEARCH PATH PARA O SCHEMA DO TENANT
SET search_path TO tenant_teste;

-- ========================================
-- ESTRUTURA DO TENANT
-- ========================================

-- A. TABELA DE SECRETARIAS
CREATE TABLE secretarias (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome VARCHAR(255) NOT NULL,
    sigla VARCHAR(20) NOT NULL,
    descricao TEXT,
    ativo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_secretarias_ativo ON secretarias(ativo);

-- B. TABELA DE SETORES
CREATE TABLE setores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    secretaria_id UUID NOT NULL REFERENCES secretarias(id) ON DELETE CASCADE,
    nome VARCHAR(255) NOT NULL,
    sigla VARCHAR(20) NOT NULL,
    descricao TEXT,
    ativo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_setores_secretaria_id ON setores(secretaria_id);
CREATE INDEX idx_setores_ativo ON setores(ativo);

-- C. TABELA DE USUÁRIOS
CREATE TABLE usuarios (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    cpf VARCHAR(11) NOT NULL UNIQUE,
    senha VARCHAR(255) NOT NULL,
    telefone VARCHAR(11),
    tipo VARCHAR(20) NOT NULL DEFAULT 'operacional' 
        CHECK (tipo IN ('admin', 'gestor', 'operacional')),
    ativo BOOLEAN DEFAULT TRUE,
    secretaria_id UUID REFERENCES secretarias(id),
    setor_id UUID REFERENCES setores(id),
    ultimo_acesso TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX idx_usuarios_email ON usuarios(email);
CREATE UNIQUE INDEX idx_usuarios_cpf ON usuarios(cpf);
CREATE INDEX idx_usuarios_setor_id ON usuarios(setor_id);
CREATE INDEX idx_usuarios_tipo ON usuarios(tipo);

-- D. TABELA DE PROCESSOS
CREATE TABLE processos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    numero VARCHAR(50) NOT NULL UNIQUE,
    ano INTEGER NOT NULL,
    sequencial INTEGER NOT NULL,
    assunto VARCHAR(500) NOT NULL,
    descricao TEXT NOT NULL,
    interessado_nome VARCHAR(255) NOT NULL,
    interessado_cpf_cnpj VARCHAR(14) NOT NULL,
    interessado_email VARCHAR(255),
    interessado_telefone VARCHAR(11),
    status VARCHAR(20) NOT NULL DEFAULT 'aberto'
        CHECK (status IN ('aberto', 'em_analise', 'pendente', 'devolvido', 'concluido', 'arquivado')),
    setor_atual_id UUID REFERENCES setores(id),
    usuario_atual_id UUID REFERENCES usuarios(id),
    qrcode TEXT,
    prioridade VARCHAR(20) DEFAULT 'normal'
        CHECK (prioridade IN ('baixa', 'normal', 'alta', 'urgente')),
    data_abertura TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    data_conclusao TIMESTAMP,
    criado_por_id UUID NOT NULL REFERENCES usuarios(id),
    observacoes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX idx_processos_numero ON processos(numero);
CREATE INDEX idx_processos_status ON processos(status);
CREATE INDEX idx_processos_setor_atual ON processos(setor_atual_id);
CREATE INDEX idx_processos_usuario_atual ON processos(usuario_atual_id);
CREATE INDEX idx_processos_ano_seq ON processos(ano, sequencial);
CREATE INDEX idx_processos_data_abertura ON processos(data_abertura);

-- E. TABELA DE TRAMITAÇÕES
CREATE TABLE tramitacoes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    processo_id UUID NOT NULL REFERENCES processos(id) ON DELETE CASCADE,
    origem_usuario_id UUID NOT NULL REFERENCES usuarios(id),
    origem_setor_id UUID REFERENCES setores(id),
    destino_setor_id UUID REFERENCES setores(id),
    destino_usuario_id UUID REFERENCES usuarios(id),
    tipo VARCHAR(20) NOT NULL
        CHECK (tipo IN ('abertura', 'tramitacao', 'devolucao', 'conclusao', 'arquivamento')),
    despacho TEXT,
    observacao TEXT,
    data_hora TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    ip_origem VARCHAR(45),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_tramitacoes_processo_id ON tramitacoes(processo_id);
CREATE INDEX idx_tramitacoes_data_hora ON tramitacoes(data_hora DESC);
CREATE INDEX idx_tramitacoes_origem_usuario ON tramitacoes(origem_usuario_id);
CREATE INDEX idx_tramitacoes_destino_setor ON tramitacoes(destino_setor_id);

-- F. TABELA DE DOCUMENTOS
CREATE TABLE documentos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    processo_id UUID NOT NULL REFERENCES processos(id) ON DELETE CASCADE,
    nome_original VARCHAR(255) NOT NULL,
    nome_sistema VARCHAR(255) NOT NULL,
    caminho VARCHAR(500) NOT NULL,
    tipo_mime VARCHAR(100) NOT NULL,
    tamanho INTEGER NOT NULL,
    hash VARCHAR(64) NOT NULL,
    upload_por_id UUID NOT NULL REFERENCES usuarios(id),
    data_upload TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    descricao TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_documentos_processo_id ON documentos(processo_id);
CREATE INDEX idx_documentos_upload_por ON documentos(upload_por_id);

-- ========================================
-- TRIGGERS E FUNÇÕES
-- ========================================

-- Função para atualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Aplicar triggers
CREATE TRIGGER update_secretarias_updated_at BEFORE UPDATE ON secretarias
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_setores_updated_at BEFORE UPDATE ON setores
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_usuarios_updated_at BEFORE UPDATE ON usuarios
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_processos_updated_at BEFORE UPDATE ON processos
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tramitacoes_updated_at BEFORE UPDATE ON tramitacoes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_documentos_updated_at BEFORE UPDATE ON documentos
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Função para gerar número de processo
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
    NEW.numero := ano_atual || '.' || LPAD(proximo_seq::TEXT, 6, '0');
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_gerar_numero_processo
    BEFORE INSERT ON processos
    FOR EACH ROW
    WHEN (NEW.numero IS NULL)
    EXECUTE FUNCTION gerar_numero_processo();

-- ========================================
-- DADOS INICIAIS (SEED)
-- ========================================

-- Inserir Secretarias
INSERT INTO secretarias (nome, sigla, descricao) VALUES
('Secretaria de Administração', 'SEMAD', 'Gestão administrativa da prefeitura'),
('Secretaria de Educação', 'SEDUC', 'Gestão da educação municipal'),
('Secretaria de Saúde', 'SESAU', 'Gestão da saúde pública'),
('Secretaria de Obras', 'SEOBR', 'Infraestrutura e obras públicas');

-- Inserir Setores
INSERT INTO setores (secretaria_id, nome, sigla) VALUES
((SELECT id FROM secretarias WHERE sigla = 'SEMAD'), 'Protocolo Geral', 'PROTO'),
((SELECT id FROM secretarias WHERE sigla = 'SEMAD'), 'Recursos Humanos', 'RH'),
((SELECT id FROM secretarias WHERE sigla = 'SEDUC'), 'Gestão Escolar', 'GE'),
((SELECT id FROM secretarias WHERE sigla = 'SESAU'), 'Atenção Básica', 'AB'),
((SELECT id FROM secretarias WHERE sigla = 'SEOBR'), 'Projetos', 'PROJ');

-- Inserir Usuário Admin (senha: 123456)
-- Senha criptografada com bcrypt
INSERT INTO usuarios (nome, email, cpf, senha, tipo, secretaria_id, setor_id) VALUES
('Administrador', 'admin@teste.com', '00000000000', '$2a$10$5EaplpxEDeef2Dx7G/r8semyAuQDvam6nrUkHc9nqmjBgZq3y0/Eu', 'admin',
 (SELECT id FROM secretarias WHERE sigla = 'SEMAD'),
 (SELECT id FROM setores WHERE sigla = 'PROTO'));

-- ========================================
-- FIM DO SETUP
-- ========================================

-- IMPORTANTE: Anote as informações de conexão:
-- Host: localhost
-- Port: 5432
-- Database: jprocesso_global
-- Schema: tenant_teste
-- User: postgres (ou seu usuário)
-- Password: (sua senha do postgres)
