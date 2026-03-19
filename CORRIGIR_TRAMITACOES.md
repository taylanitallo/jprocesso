# ⚠️ CORREÇÃO URGENTE - Tabela Tramitacoes

## Problema
A coluna `tipo_acao` está faltando na tabela `tramitacoes`, causando erro ao criar processos.

## Solução

### Opção 1: Via pgAdmin (Recomendado)

1. Abra o **pgAdmin**
2. Conecte-se ao servidor PostgreSQL
3. Navegue até: **jprocesso_global > Schemas > tenant_iraucuba > Tables > tramitacoes**
4. Clique com botão direito em **tramitacoes** > **Query Tool**
5. Cole e execute o SQL abaixo:

```sql
-- Adicionar coluna tipo_acao
ALTER TABLE tenant_iraucuba.tramitacoes 
ADD COLUMN IF NOT EXISTS tipo_acao VARCHAR(20);

-- Atualizar registros existentes (se houver)
UPDATE tenant_iraucuba.tramitacoes 
SET tipo_acao = 'tramite' 
WHERE tipo_acao IS NULL;

-- Tornar NOT NULL
ALTER TABLE tenant_iraucuba.tramitacoes 
ALTER COLUMN tipo_acao SET NOT NULL;

-- Adicionar constraint CHECK
ALTER TABLE tenant_iraucuba.tramitacoes 
DROP CONSTRAINT IF EXISTS chk_tipo_acao;

ALTER TABLE tenant_iraucuba.tramitacoes 
ADD CONSTRAINT chk_tipo_acao 
CHECK (tipo_acao IN ('abertura', 'tramite', 'devolucao', 'conclusao', 'arquivamento'));

-- Adicionar constraint de justificativa
ALTER TABLE tenant_iraucuba.tramitacoes 
DROP CONSTRAINT IF EXISTS chk_justificativa_devolucao;

ALTER TABLE tenant_iraucuba.tramitacoes 
ADD CONSTRAINT chk_justificativa_devolucao 
CHECK (tipo_acao != 'devolucao' OR justificativa_devolucao IS NOT NULL);

-- Criar índice
CREATE INDEX IF NOT EXISTS idx_tramitacoes_tipo_acao 
ON tenant_iraucuba.tramitacoes(tipo_acao);
```

6. Clique em **Execute/Run** (ícone de play ▶️)
7. Se ver "Query returned successfully", está pronto!

### Opção 2: Via linha de comando

Abra o terminal e execute:

```bash
psql -U postgres -d jprocesso_global -f fix_tramitacoes.sql
```

## Após executar

1. Volte ao navegador
2. Tente criar um processo novamente
3. Deve funcionar perfeitamente! ✅

## Se ainda houver erro

Me avise no chat e vou verificar outros campos que possam estar faltando.
