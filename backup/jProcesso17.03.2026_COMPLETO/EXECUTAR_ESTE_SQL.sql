-- SQL COMPLETO - Adiciona TODAS as colunas necessárias
-- Execute TUDO de uma vez no pgAdmin

-- 1. Adicionar TODAS as colunas que podem estar faltando em tramitacoes
ALTER TABLE tenant_iraucuba.tramitacoes 
ADD COLUMN IF NOT EXISTS tipo_acao VARCHAR(20);

ALTER TABLE tenant_iraucuba.tramitacoes 
ADD COLUMN IF NOT EXISTS justificativa_devolucao TEXT;

ALTER TABLE tenant_iraucuba.tramitacoes 
ADD COLUMN IF NOT EXISTS data_hora TIMESTAMP;

ALTER TABLE tenant_iraucuba.tramitacoes 
ADD COLUMN IF NOT EXISTS ip_origem VARCHAR(45);

ALTER TABLE tenant_iraucuba.tramitacoes 
ADD COLUMN IF NOT EXISTS assinatura_digital VARCHAR(64);

-- 2. Preencher valores NULL
UPDATE tenant_iraucuba.tramitacoes 
SET tipo_acao = 'tramite' 
WHERE tipo_acao IS NULL;

UPDATE tenant_iraucuba.tramitacoes 
SET data_hora = CURRENT_TIMESTAMP 
WHERE data_hora IS NULL;

-- 3. Tornar tipo_acao NOT NULL
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM tenant_iraucuba.tramitacoes WHERE tipo_acao IS NULL) THEN
        ALTER TABLE tenant_iraucuba.tramitacoes ALTER COLUMN tipo_acao SET NOT NULL;
    END IF;
END $$;

-- 4. Constraints
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

-- 5. Índices
CREATE INDEX IF NOT EXISTS idx_tramitacoes_tipo_acao 
ON tenant_iraucuba.tramitacoes(tipo_acao);

CREATE INDEX IF NOT EXISTS idx_tramitacoes_processo_id 
ON tenant_iraucuba.tramitacoes(processo_id);

CREATE INDEX IF NOT EXISTS idx_tramitacoes_data_hora 
ON tenant_iraucuba.tramitacoes(data_hora DESC);

-- 6. Verificar resultado
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_schema = 'tenant_iraucuba' 
  AND table_name = 'tramitacoes'
ORDER BY ordinal_position;
