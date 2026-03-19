-- =====================================================
-- SCRIPT DEFINITIVO PARA CORRIGIR BANCO DE DADOS
-- Execute este SQL no pgAdmin ou via psql
-- =====================================================

-- Conectar ao banco jprocesso_global
\c jprocesso_global

-- Definir schema
SET search_path TO tenant_iraucuba;

-- =====================================================
-- 1. VERIFICAR E ADICIONAR COLUNAS FALTANTES EM TRAMITACOES
-- =====================================================

-- Adicionar tipo_acao (ENUM)
DO $$ 
BEGIN
    -- Primeiro criar o tipo ENUM se não existir
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_tramitacoes_tipo_acao') THEN
        CREATE TYPE tenant_iraucuba.enum_tramitacoes_tipo_acao AS ENUM ('abertura', 'tramite', 'devolucao', 'conclusao', 'arquivamento');
    END IF;
    
    -- Adicionar coluna tipo_acao se não existir
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'tenant_iraucuba' 
                   AND table_name = 'tramitacoes' 
                   AND column_name = 'tipo_acao') THEN
        ALTER TABLE tenant_iraucuba.tramitacoes 
        ADD COLUMN tipo_acao tenant_iraucuba.enum_tramitacoes_tipo_acao NOT NULL DEFAULT 'abertura';
        
        -- Remover default após adicionar
        ALTER TABLE tenant_iraucuba.tramitacoes 
        ALTER COLUMN tipo_acao DROP DEFAULT;
    END IF;
END $$;

-- Adicionar justificativa_devolucao
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'tenant_iraucuba' 
                   AND table_name = 'tramitacoes' 
                   AND column_name = 'justificativa_devolucao') THEN
        ALTER TABLE tenant_iraucuba.tramitacoes 
        ADD COLUMN justificativa_devolucao TEXT NULL;
    END IF;
END $$;

-- Adicionar data_hora
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'tenant_iraucuba' 
                   AND table_name = 'tramitacoes' 
                   AND column_name = 'data_hora') THEN
        ALTER TABLE tenant_iraucuba.tramitacoes 
        ADD COLUMN data_hora TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW();
        
        -- Remover default após adicionar
        ALTER TABLE tenant_iraucuba.tramitacoes 
        ALTER COLUMN data_hora DROP DEFAULT;
    END IF;
END $$;

-- Adicionar ip_origem
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'tenant_iraucuba' 
                   AND table_name = 'tramitacoes' 
                   AND column_name = 'ip_origem') THEN
        ALTER TABLE tenant_iraucuba.tramitacoes 
        ADD COLUMN ip_origem VARCHAR(45) NULL;
    END IF;
END $$;

-- Adicionar assinatura_digital
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'tenant_iraucuba' 
                   AND table_name = 'tramitacoes' 
                   AND column_name = 'assinatura_digital') THEN
        ALTER TABLE tenant_iraucuba.tramitacoes 
        ADD COLUMN assinatura_digital VARCHAR(255) NULL;
    END IF;
END $$;

-- =====================================================
-- 2. CRIAR ÍNDICES PARA PERFORMANCE
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_tramitacoes_processo_id 
ON tenant_iraucuba.tramitacoes(processo_id);

CREATE INDEX IF NOT EXISTS idx_tramitacoes_data_hora 
ON tenant_iraucuba.tramitacoes(data_hora);

CREATE INDEX IF NOT EXISTS idx_tramitacoes_origem_usuario_id 
ON tenant_iraucuba.tramitacoes(origem_usuario_id);

CREATE INDEX IF NOT EXISTS idx_tramitacoes_destino_setor_id 
ON tenant_iraucuba.tramitacoes(destino_setor_id);

CREATE INDEX IF NOT EXISTS idx_tramitacoes_tipo_acao 
ON tenant_iraucuba.tramitacoes(tipo_acao);

-- =====================================================
-- 3. VERIFICAR ESTRUTURA FINAL
-- =====================================================

SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'tenant_iraucuba' 
  AND table_name = 'tramitacoes'
ORDER BY ordinal_position;

-- =====================================================
-- FIM DO SCRIPT
-- =====================================================
COMMIT;
