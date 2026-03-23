const express = require('express');
const router = express.Router();
const { authenticate, tenantMiddleware } = require('../middleware/auth');
const { listLogs, listModulos } = require('../controllers/logController');

// Verifica se o usuário tem acesso ao módulo de registros
const checkRegistrosPermissao = (req, res, next) => {
  if (!req.user) return res.status(401).json({ error: 'Não autenticado' });
  if (req.user.tipo === 'admin') return next();
  if (req.user.permissoes?.visualizar_registros) return next();
  return res.status(403).json({ error: 'Acesso negado ao módulo de Registros' });
};

router.use(authenticate);
router.use(tenantMiddleware);
router.use(checkRegistrosPermissao);

router.get('/',        listLogs);
router.get('/modulos', listModulos);

module.exports = router;
