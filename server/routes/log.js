const express = require('express');
const router = express.Router();
const { authenticate, tenantMiddleware, requireTenant } = require('../middleware/auth');
const { listLogs, listModulos } = require('../controllers/logController');

// Verifica se o usuário tem acesso ao módulo de registros
const checkRegistrosPermissao = async (req, res, next) => {
  if (!req.user) return res.status(401).json({ error: 'Não autenticado' });
  if (req.user.tipo === 'admin' || req.user.tipo === 'jeos') return next();
  try {
    // JWT não carrega permissoes — busca do banco quando necessário
    if (req.user.permissoes == null && req.models?.User) {
      const u = await req.models.User.findByPk(req.user.id, { attributes: ['permissoes', 'tipo'] });
      if (!u) return res.status(401).json({ error: 'Usuário não encontrado' });
      if (u.tipo === 'admin' || u.tipo === 'jeos') return next();
      req.user.permissoes = u.permissoes || {};
    }
    const p = req.user.permissoes || {};
    // Permissão aninhada (padrão atual) com fallback para o formato plano legado.
    // undefined = permitido (backward compat); false = negado.
    const val = p.administracao?.visualizar_registros ?? p.visualizar_registros;
    if (val !== false) return next();
    return res.status(403).json({ error: 'Acesso negado ao módulo de Registros' });
  } catch (err) {
    return res.status(500).json({ error: 'Erro ao verificar permissão' });
  }
};

router.use(authenticate);
router.use(tenantMiddleware);
router.use(checkRegistrosPermissao);

router.get('/',        listLogs);
router.get('/modulos', listModulos);

module.exports = router;
