const express = require('express')
const router  = express.Router()
const { tenantMiddleware, authenticate } = require('../middleware/auth')
const { getSchemaContext } = require('../controllers/schemaContextController')

const mid = [tenantMiddleware, authenticate]

// GET /api/schema-context
// Retorna todas as tabelas e colunas do schema do tenant atual.
// Resultado é cacheado por 5 minutos no servidor.
router.get('/', mid, getSchemaContext)

module.exports = router
