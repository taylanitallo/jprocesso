-- Migração: adiciona coluna 'responsaveis' na tabela secretarias
-- Execute uma vez no banco de dados do tenant (multi-tenant: aplicar em cada schema)
-- Data: 2025

ALTER TABLE secretarias
  ADD COLUMN IF NOT EXISTS responsaveis JSONB NOT NULL DEFAULT '[]'::jsonb;

COMMENT ON COLUMN secretarias.responsaveis IS
  'Lista de responsáveis por período. Formato: [{nome, cargo, data_inicio, data_fim}]';
