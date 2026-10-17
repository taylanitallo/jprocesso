const express    = require('express');
const rateLimit  = require('express-rate-limit');
const router     = express.Router();
const { chat, sugerir, registrarTextoUsado, textosFrequentes } = require('../controllers/aylaController');
const { authenticate, tenantMiddleware, requireTenant } = require('../middleware/auth');

// Rate limit específico para IA: mais generoso que login, mas controlado
// Aplica por user ID (pós-auth) para não penalizar IPs compartilhados (NAT)
const aylaLimiter = rateLimit({
  windowMs: 60 * 1000,  // 1 minuto
  max: 20,
  message: { error: 'Muitas perguntas em pouco tempo. Aguarde um momento.' },
  standardHeaders: true,
  legacyHeaders:   false,
  // keyGenerator roda após authenticate — req.user já está disponível
  keyGenerator: (req) => req.user?.id || req.ip,
});

// POST /api/ayla/chat
// Chain: tenant → requireTenant → auth → rate limit → controller
router.post('/chat',
  tenantMiddleware,
  requireTenant,
  authenticate,
  aylaLimiter,
  chat
);

// Sugestões de texto nos campos em branco (despachos, motivos, observações…)
const sugestaoLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  message: { texto: '' },
  standardHeaders: true,
  legacyHeaders:   false,
  keyGenerator: (req) => req.user?.id || req.ip,
});

// POST /api/ayla/sugerir — { campo, rotulo, contexto, anterior? } → { texto }
router.post('/sugerir', tenantMiddleware, requireTenant, authenticate, sugestaoLimiter, sugerir);

// POST /api/ayla/texto-usado — { campo, texto, contexto } (texto final enviado pelo usuário)
router.post('/texto-usado', tenantMiddleware, requireTenant, authenticate, registrarTextoUsado);

// GET /api/ayla/textos-frequentes?campo= — textos mais usados pelo usuário no campo
router.get('/textos-frequentes', tenantMiddleware, requireTenant, authenticate, textosFrequentes);

module.exports = router;
