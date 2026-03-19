-- Criar tabela de administradores na schema public
CREATE TABLE IF NOT EXISTS public.admins (
  id SERIAL PRIMARY KEY,
  nome VARCHAR(255) NOT NULL,
  cpf VARCHAR(11) UNIQUE NOT NULL,
  senha VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE,
  ativo BOOLEAN DEFAULT true,
  criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Inserir admin padrão
-- CPF: 00000000191
-- Senha: admin123
-- Hash gerado com bcrypt (10 rounds)
INSERT INTO public.admins (nome, cpf, senha, email, ativo)
VALUES (
  'Administrador do Sistema',
  '00000000191',
  '$2a$10$YourHashHere', -- Precisa ser gerado com bcrypt
  'admin@jprocesso.gov.br',
  true
)
ON CONFLICT (cpf) DO NOTHING;

-- Criar índices
CREATE INDEX IF NOT EXISTS idx_admins_cpf ON public.admins(cpf);
CREATE INDEX IF NOT EXISTS idx_admins_email ON public.admins(email);

COMMENT ON TABLE public.admins IS 'Tabela de administradores do sistema multi-tenant';
COMMENT ON COLUMN public.admins.cpf IS 'CPF do administrador (apenas números)';
COMMENT ON COLUMN public.admins.senha IS 'Senha criptografada com bcrypt';
