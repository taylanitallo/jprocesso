const authRoutes         = require('./auth');
const tenantRoutes       = require('./tenant');
const organizacaoRoutes  = require('./organizacao');
const processoRoutes     = require('./processo');
const documentoRoutes    = require('./documento');
const mockRoutes         = require('./mock');
const almoxarifadoRoutes = require('./almoxarifado');
const financeiroRoutes   = require('./financeiro');
const didRoutes          = require('./did');
const schemaContextRoutes = require('./schemaContext');
const contratosRoutes    = require('./contratos');
const importexportRoutes = require('./importexport');
const patrimonioRoutes   = require('./patrimonio');

module.exports = (app) => {
  // Se estiver em modo mock, usar rotas mock
  if (process.env.USE_MOCK_AUTH === 'true') {
    console.log('🔧 Usando rotas MOCK');
    app.use('/api', mockRoutes);
  } else {
    app.use('/api/auth', authRoutes);
    app.use('/api/tenants', tenantRoutes);
    app.use('/api/organizacao', organizacaoRoutes);
    app.use('/api/processos', processoRoutes);
    app.use('/api/documentos', documentoRoutes);
    app.use('/api/almoxarifado', almoxarifadoRoutes);
    app.use('/api/financeiro', financeiroRoutes);
    app.use('/api/did', didRoutes);
    app.use('/api/schema-context', schemaContextRoutes);
    app.use('/api/contratos', contratosRoutes);
    app.use('/api/export', importexportRoutes);
    app.use('/api/import', importexportRoutes);
    app.use('/api/patrimonio', patrimonioRoutes);
  }
};
