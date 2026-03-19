-- ========================================
-- EXECUTAR ESTE SCRIPT NO PGADMIN
-- Após criar o banco jprocesso_global
-- ========================================

-- IMPORTANTE: Selecione o banco jprocesso_global antes de executar!

-- 1. Criar tabela de clientes
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

-- 2. Inserir cliente de teste
INSERT INTO clientes (nome_municipio, cnpj, subdominio, schema, cidade, estado) 
VALUES ('Prefeitura de Teste', '00000000000000', 'teste', 'tenant_teste', 'Cidade Teste', 'CE')
ON CONFLICT (subdominio) DO NOTHING;

-- 3. Criar schema do tenant
CREATE SCHEMA IF NOT EXISTS tenant_teste;

-- 4. Criar tabelas no schema tenant_teste
CREATE TABLE IF NOT EXISTS tenant_teste.secretarias (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome VARCHAR(255) NOT NULL,
    sigla VARCHAR(20) NOT NULL,
    descricao TEXT,
    ativo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS tenant_teste.setores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    secretaria_id UUID NOT NULL REFERENCES tenant_teste.secretarias(id) ON DELETE CASCADE,
    nome VARCHAR(255) NOT NULL,
    sigla VARCHAR(20) NOT NULL,
    descricao TEXT,
    ativo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS tenant_teste.usuarios (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    cpf VARCHAR(11) NOT NULL UNIQUE,
    senha VARCHAR(255) NOT NULL,
    telefone VARCHAR(11),
    tipo VARCHAR(20) NOT NULL DEFAULT 'operacional' 
        CHECK (tipo IN ('admin', 'gestor', 'operacional')),
    ativo BOOLEAN DEFAULT TRUE,
    secretaria_id UUID REFERENCES tenant_teste.secretarias(id),
    setor_id UUID REFERENCES tenant_teste.setores(id),
    ultimo_acesso TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS tenant_teste.processos (
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
    setor_atual_id UUID REFERENCES tenant_teste.setores(id),
    usuario_atual_id UUID REFERENCES tenant_teste.usuarios(id),
    qrcode TEXT,
    prioridade VARCHAR(20) DEFAULT 'normal'
        CHECK (prioridade IN ('baixa', 'normal', 'alta', 'urgente')),
    data_abertura TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    data_conclusao TIMESTAMP,
    criado_por_id UUID REFERENCES tenant_teste.usuarios(id),
    observacoes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS tenant_teste.tramitacoes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    processo_id UUID NOT NULL REFERENCES tenant_teste.processos(id) ON DELETE CASCADE,
    origem_usuario_id UUID NOT NULL REFERENCES tenant_teste.usuarios(id),
    origem_setor_id UUID REFERENCES tenant_teste.setores(id),
    destino_setor_id UUID REFERENCES tenant_teste.setores(id),
    destino_usuario_id UUID REFERENCES tenant_teste.usuarios(id),
    tipo VARCHAR(20) NOT NULL
        CHECK (tipo IN ('abertura', 'tramitacao', 'devolucao', 'conclusao', 'arquivamento')),
    despacho TEXT,
    observacao TEXT,
    data_hora TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    ip_origem VARCHAR(45),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS tenant_teste.documentos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    processo_id UUID NOT NULL REFERENCES tenant_teste.processos(id) ON DELETE CASCADE,
    nome_original VARCHAR(255) NOT NULL,
    nome_sistema VARCHAR(255) NOT NULL,
    caminho VARCHAR(500) NOT NULL,
    tipo_mime VARCHAR(100) NOT NULL,
    tamanho INTEGER NOT NULL,
    hash VARCHAR(64) NOT NULL,
    upload_por_id UUID NOT NULL REFERENCES tenant_teste.usuarios(id),
    data_upload TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    descricao TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 5. Inserir dados iniciais
INSERT INTO tenant_teste.secretarias (nome, sigla, descricao) VALUES
('Secretaria de Administração', 'SEMAD', 'Gestão administrativa da prefeitura'),
('Secretaria de Educação', 'SEDUC', 'Gestão da educação municipal'),
('Secretaria de Saúde', 'SESAU', 'Gestão da saúde pública'),
('Secretaria de Obras', 'SEOBR', 'Infraestrutura e obras públicas')
ON CONFLICT DO NOTHING;

INSERT INTO tenant_teste.setores (secretaria_id, nome, sigla) VALUES
((SELECT id FROM tenant_teste.secretarias WHERE sigla = 'SEMAD'), 'Protocolo Geral', 'PROTO'),
((SELECT id FROM tenant_teste.secretarias WHERE sigla = 'SEMAD'), 'Recursos Humanos', 'RH'),
((SELECT id FROM tenant_teste.secretarias WHERE sigla = 'SEDUC'), 'Gestão Escolar', 'GE'),
((SELECT id FROM tenant_teste.secretarias WHERE sigla = 'SESAU'), 'Atenção Básica', 'AB'),
((SELECT id FROM tenant_teste.secretarias WHERE sigla = 'SEOBR'), 'Projetos', 'PROJ')
ON CONFLICT DO NOTHING;

-- 6. Inserir usuário admin (senha: 123456)
INSERT INTO tenant_teste.usuarios (nome, email, cpf, senha, tipo, secretaria_id, setor_id) VALUES
('Administrador', 'admin@teste.com', '00000000000', '$2a$10$5EaplpxEDeef2Dx7G/r8semyAuQDvam6nrUkHc9nqmjBgZq3y0/Eu', 'admin',
 (SELECT id FROM tenant_teste.secretarias WHERE sigla = 'SEMAD'),
 (SELECT id FROM tenant_teste.setores WHERE sigla = 'PROTO'))
ON CONFLICT (cpf) DO NOTHING;

-- ========================================
-- FIM - Banco configurado!
-- ========================================
