const express = require('express');
const router = express.Router();
const { listar, apagar } = require('../controllers/lixeiraController');
const { authenticate, tenantMiddleware, requireTenant, authorize } = require('../middleware/auth');

// Excluídos: só administradores e Administrador Jeos (authorize já libera 'jeos')
router.use(tenantMiddleware, requireTenant, authenticate, authorize('admin'));

router.get('/:entidade',         listar);
router.post('/:entidade/apagar', apagar);

module.exports = router;
