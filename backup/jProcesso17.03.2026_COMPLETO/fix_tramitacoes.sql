-- Script para corrigir a tabela tramitacoes
-- Adiciona as colunas faltantes

-- 1. Adicionar coluna tipo_acao
ALTER TABLE tenant_iraucuba.tramitacoes 
ADD COLUMN IF NOT EXISTS tipo_acao VARCHAR(20);

-- 2. Adicionar coluna justificativa_devolucao
ALTER TABLE tenant_iraucuba.tramitacoes 
ADD COLUMN IF NOT EXISTS justificativa_devolucao TEXT;

-- 3. Atualizar valores existentes
UPDATE tenant_iraucuba.tramitacoes 
SET tipo_acao = 'tramite' 
WHERE tipo_acao IS NULL;

-- 4. Tornar tipo_acao NOT NULL
ALTER TABLE tenant_iraucuba.tramitacoes 
ALTER COLUMN tipo_acao SET NOT NULL;

-- 5. Adicionar constraints
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

-- 6. Criar índice
CREATE INDEX IF NOT EXISTS idx_tramitacoes_tipo_acao 
ON tenant_iraucuba.tramitacoes(tipo_acao);
