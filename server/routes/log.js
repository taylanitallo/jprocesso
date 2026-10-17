const express = require('express');
const router = express.Router();
const { authenticate, tenantMiddleware, requireTenant, ignoraPermissoes } = require('../middleware/auth');
const { listLogs, listModulos } = require('../controllers/logController');
// SEGURANÇA: tenantMiddleware DEVE rodar antes de authenticate para que o binding
// token↔tenant (em authenticate) seja aplicado. Caso contrário req.tenant fica
// indefinido e um token válido de outro município passaria sem verificação.

// Verifica se o usuário tem acesso ao módulo de registros
const checkRegistrosPermissao = async (req, res, next) => {
  if (!req.user) return res.status(401).json({ error: 'Não autenticado' });
  // Só o Administrador Jeos passa direto; o Administrador segue o editor de permissões
  if (req.user.tipo === 'jeos') return next();
  try {
    // JWT não carrega permissoes — busca do banco quando necessário
    if (req.user.permissoes == null && req.models?.User) {
      const u = await req.models.User.findByPk(req.user.id, { attributes: ['permissoes', 'tipo'] });
      if (!u) return res.status(401).json({ error: 'Usuário não encontrado' });
      if (ignoraPermissoes(u)) return next();
      req.user.permissoes = u.permissoes || {};
    }
    const p = req.user.permissoes || {};
    if (ignoraPermissoes({ tipo: req.user.tipo, permissoes: p })) return next();
    // Permissão aninhada (padrão atual) com fallback para o formato plano legado.
    // undefined = permitido (backward compat); false = negado.
    // Acesso ao grupo Administração desligado: sem Registros
    if (p.administracao?.acessar === false) return res.status(403).json({ error: 'Acesso negado ao módulo de Registros' });
    const val = p.administracao?.visualizar_registros ?? p.visualizar_registros;
    if (val !== false) return next();
    return res.status(403).json({ error: 'Acesso negado ao módulo de Registros' });
  } catch (err) {
    return res.status(500).json({ error: 'Erro ao verificar permissão' });
  }
};

router.use(tenantMiddleware);
router.use(requireTenant);
router.use(authenticate);
router.use(checkRegistrosPermissao);

router.get('/',        listLogs);
router.get('/modulos', listModulos);

module.exports = router;
