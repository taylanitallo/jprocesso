/**
 * setup-superadmin.js — Configura o SuperAdmin a partir de variáveis de ambiente.
 *
 * Uso:
 *   SUPERADMIN_EMAIL=admin@exemplo.com \
 *   SUPERADMIN_PASSWORD=SenhaForte123 \
 *   SUPERADMIN_NAME="Administrador Geral" \
 *   node server/scripts/setup-superadmin.js
 *
 * Ou defina as variáveis no .env e execute:
 *   node server/scripts/setup-superadmin.js
 *
 * O script NUNCA imprime a senha nem o hash no console.
 */
'use strict';

require('dotenv').config();
const bcrypt = require('bcryptjs');
const { QueryTypes } = require('sequelize');
const { masterDb } = require('../config/database');

const EMAIL    = process.env.SUPERADMIN_EMAIL;
const PASSWORD = process.env.SUPERADMIN_PASSWORD;
const NAME     = process.env.SUPERADMIN_NAME || 'Administrador Geral';

(async () => {
  // ── Validação de entradas ──────────────────────────────────────────────
  if (!EMAIL) {
    console.error('ERRO: SUPERADMIN_EMAIL não definido. Defina a variável de ambiente e tente novamente.');
    process.exit(1);
  }
  if (!PASSWORD) {
    console.error('ERRO: SUPERADMIN_PASSWORD não definido. Defina a variável de ambiente e tente novamente.');
    process.exit(1);
  }
  if (PASSWORD.length < 8) {
    console.error('ERRO: SUPERADMIN_PASSWORD deve ter pelo menos 8 caracteres.');
    process.exit(1);
  }

  try {
    // ── Garantir coluna email (idempotente) ───────────────────────────────
    await masterDb.query(
      `ALTER TABLE IF EXISTS public.admins ADD COLUMN IF NOT EXISTS email VARCHAR(255)`,
      { type: QueryTypes.RAW }
    ).catch(() => {});

    await masterDb.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS idx_admins_email ON public.admins (email) WHERE email IS NOT NULL`,
      { type: QueryTypes.RAW }
    ).catch(() => {});

    // ── Hash da senha ──────────────────────────────────────────────────────
    const hash = await bcrypt.hash(PASSWORD, 12);

    // ── Verificar se admin já existe ──────────────────────────────────────
    const existing = await masterDb.query(
      'SELECT id FROM public.admins WHERE email = :email',
      { replacements: { email: EMAIL }, type: QueryTypes.SELECT }
    );

    if (existing.length > 0) {
      // Atualizar senha e nome do admin existente
      await masterDb.query(
        `UPDATE public.admins SET senha = :hash, nome = :nome, ativo = true WHERE email = :email`,
        { replacements: { hash, nome: NAME, email: EMAIL }, type: QueryTypes.RAW }
      );
      console.log('SuperAdmin configurado com sucesso. (admin existente atualizado)');
    } else {
      // Criar novo admin
      await masterDb.query(
        `INSERT INTO public.admins (nome, email, senha, ativo)
         VALUES (:nome, :email, :hash, true)`,
        { replacements: { nome: NAME, email: EMAIL, hash }, type: QueryTypes.RAW }
      );
      console.log('SuperAdmin configurado com sucesso. (novo admin criado)');
    }

    process.exit(0);
  } catch (err) {
    console.error('ERRO ao configurar SuperAdmin:', err.message);
    process.exit(1);
  }
})();
