const express = require('express');
const router = express.Router();
const { listar, restaurar, apagar } = require('../controllers/lixeiraController');
const { authenticate, tenantMiddleware, requireTenant } = require('../middleware/auth');

// Permissão checada por tela no controller (admin/Jeos sempre; demais pelo editor)
router.use(tenantMiddleware, requireTenant, authenticate);

router.get('/:entidade',            listar);
router.post('/:entidade/restaurar', restaurar);
router.post('/:entidade/apagar',    apagar);

module.exports = router;
