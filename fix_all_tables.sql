-- Script completo para corrigir todas as tabelas do sistema
-- Execute este script no pgAdmin conectado ao banco jprocesso_global

-- 1. Corrigir tabela de processos
DO $$ 
BEGIN
    -- Adicionar colunas que podem estar faltando em processos
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'tenant_iraucuba' 
                   AND table_name = 'processos' 
                   AND column_name = 'data_abertura') THEN
        ALTER TABLE tenant_iraucuba.processos ADD COLUMN data_abertura TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'tenant_iraucuba' 
                   AND table_name = 'processos' 
                   AND column_name = 'data_conclusao') THEN
        ALTER TABLE tenant_iraucuba.processos ADD COLUMN data_conclusao TIMESTAMP;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'tenant_iraucuba' 
                   AND table_name = 'processos' 
                   AND column_name = 'observacoes') THEN
        ALTER TABLE tenant_iraucuba.processos ADD COLUMN observacoes TEXT;
    END IF;
END $$;

-- 2. Corrigir tabela de tramitacoes (já feito anteriormente, mas garantindo)
ALTER TABLE tenant_iraucuba.tramitacoes 
ADD COLUMN IF NOT EXISTS tipo_acao VARCHAR(20);

ALTER TABLE tenant_iraucuba.tramitacoes 
ADD COLUMN IF NOT EXISTS justificativa_devolucao TEXT;

ALTER TABLE tenant_iraucuba.tramitacoes 
ADD COLUMN IF NOT EXISTS data_hora TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE tenant_iraucuba.tramitacoes 
ADD COLUMN IF NOT EXISTS ip_origem VARCHAR(45);

ALTER TABLE tenant_iraucuba.tramitacoes 
ADD COLUMN IF NOT EXISTS assinatura_digital VARCHAR(64);

-- Atualizar valores NULL existentes
UPDATE tenant_iraucuba.tramitacoes 
SET tipo_acao = 'tramite' 
WHERE tipo_acao IS NULL;

UPDATE tenant_iraucuba.tramitacoes 
SET data_hora = CURRENT_TIMESTAMP 
WHERE data_hora IS NULL;

-- Tornar NOT NULL apenas se não houver valores NULL
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM tenant_iraucuba.tramitacoes WHERE tipo_acao IS NULL) THEN
        ALTER TABLE tenant_iraucuba.tramitacoes ALTER COLUMN tipo_acao SET NOT NULL;
    END IF;
END $$;

-- Adicionar constraints
ALTER TABLE tenant_iraucuba.tramitacoes 
DROP CONSTRAINT IF EXISTS chk_tipo_acao;

ALTER TABLE tenant_iraucuba.tramitacoes 
ADD CONSTRAINT chk_tipo_acao 
CHECK (tipo_acao IN ('abertura', 'tramite', 'devolucao', 'conclusao', 'arquivamento'));

ALTER TABLE tenant_iraucuba.tramitacoes 
DROP CONSTRAINT IF EXISTS chk_justificativa_devolucao;

ALTER TABLE tenant_iraucuba.tramitacoes 
ADD CONSTRAINT chk_justificativa_devolucao 
CHECK (tipo_acao != 'devolucao' OR justificativa_devolucao IS NOT NULL);

-- Criar índices
CREATE INDEX IF NOT EXISTS idx_tramitacoes_tipo_acao 
ON tenant_iraucuba.tramitacoes(tipo_acao);

CREATE INDEX IF NOT EXISTS idx_tramitacoes_processo_id 
ON tenant_iraucuba.tramitacoes(processo_id);

CREATE INDEX IF NOT EXISTS idx_tramitacoes_data_hora 
ON tenant_iraucuba.tramitacoes(data_hora DESC);

-- 3. Corrigir tabela de usuários
DO $$ 
BEGIN
    -- Verificar e adicionar campo tipo se não existir
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'tenant_iraucuba' 
                   AND table_name = 'usuarios' 
                   AND column_name = 'tipo') THEN
        ALTER TABLE tenant_iraucuba.usuarios ADD COLUMN tipo VARCHAR(20) DEFAULT 'operacional';
    END IF;

    -- Verificar e adicionar campo permissoes se não existir
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'tenant_iraucuba' 
                   AND table_name = 'usuarios' 
                   AND column_name = 'permissoes') THEN
        ALTER TABLE tenant_iraucuba.usuarios ADD COLUMN permissoes JSONB DEFAULT '[]'::jsonb;
    END IF;
END $$;

-- 4. Verificação final
SELECT 'Verificação de Processos:' as status;
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_schema = 'tenant_iraucuba' 
  AND table_name = 'processos'
ORDER BY ordinal_position;

SELECT 'Verificação de Tramitacoes:' as status;
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_schema = 'tenant_iraucuba' 
  AND table_name = 'tramitacoes'
ORDER BY ordinal_position;

SELECT '✅ Correção completa!' as status;
