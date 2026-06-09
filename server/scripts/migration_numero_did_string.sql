-- Migração: Altera numero_did de INTEGER para VARCHAR(30)
-- Execute no schema do tenant antes do próximo deploy:
--   SET search_path TO tenant_iraucuba;  (ou o schema correto)
--   \i migration_numero_did_string.sql

ALTER TABLE dids
  ALTER COLUMN numero_did TYPE VARCHAR(30) USING numero_did::text;
