const express = require('express');
const router = express.Router();

// Mock auth
const { mockLogin } = require('../mock-auth');

// Mock controllers
const mockProcessoController = require('../controllers/mockProcessoController');
const mockOrganizacaoController = require('../controllers/mockOrganizacaoController');

// Rotas de autenticação
router.post('/auth/login', mockLogin);

// Rotas de processos
router.get('/processos', mockProcessoController.listarProcessos);
router.get('/processos/estatisticas', mockProcessoController.estatisticas);
router.get('/processos/:id', mockProcessoController.buscarProcesso);
router.get('/consulta-publica/:subdomain/:numero', mockProcessoController.consultarPublico);

// Rotas de organização
router.get('/organizacao/secretarias', mockOrganizacaoController.listarSecretarias);
router.post('/organizacao/secretarias', mockOrganizacaoController.criarSecretaria);
router.put('/organizacao/secretarias/:id', mockOrganizacaoController.atualizarSecretaria);
router.delete('/organizacao/secretarias/:id', mockOrganizacaoController.deletarSecretaria);

router.get('/organizacao/setores', mockOrganizacaoController.listarSetores);
router.post('/organizacao/setores', mockOrganizacaoController.criarSetor);
router.put('/organizacao/setores/:id', mockOrganizacaoController.atualizarSetor);
router.delete('/organizacao/setores/:id', mockOrganizacaoController.deletarSetor);

module.exports = router;
