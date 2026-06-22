const axios = require('axios');
const initializedSchemas = new Set();

// Cache em memória — lista de bancos muda raramente
let _bancosCache = null;
let _bancosCacheAt = 0;
const BANCOS_TTL = 24 * 60 * 60 * 1000; // 24h

const listBancos = async (req, res) => {
  try {
    const now = Date.now();
    if (!_bancosCache || now - _bancosCacheAt > BANCOS_TTL) {
      const { data } = await axios.get('https://brasilapi.com.br/api/banks/v1', { timeout: 10000 });
      _bancosCache = data
        .filter(b => b.code != null && b.name)
        .map(b => ({
          code: String(b.code).padStart(3, '0'),
          name: b.name,
          fullName: b.fullName || b.name,
        }))
        .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
      _bancosCacheAt = now;
    }
    res.json({ bancos: _bancosCache });
  } catch (err) {
    console.error('listBancos:', err.message);
    res.status(502).json({ error: 'Não foi possível obter a lista de bancos' });
  }
};

async function ensureTable(req) {
  const schema = req.tenant?.schema;
  if (!schema || initializedSchemas.has(schema)) return;
  const { ContaBancaria } = req.models;
  await ContaBancaria.sync({ force: false });
  initializedSchemas.add(schema);
}

const listContas = async (req, res) => {
  try {
    await ensureTable(req);
    const { ContaBancaria, Secretaria } = req.models;
    const { secretaria_id, ativo } = req.query;

    const where = {};
    if (secretaria_id) {
      where.secretaria_id = secretaria_id;
    } else if (req.user.tipo !== 'admin' && req.user.tipo !== 'jeos' && req.user.secretariaId) {
      where.secretaria_id = req.user.secretariaId;
    }
    if (ativo !== undefined) where.ativo = ativo === 'true';

    const contas = await ContaBancaria.findAll({
      where,
      include: [{ model: Secretaria, as: 'secretaria', attributes: ['id', 'nome', 'sigla'] }],
      order: [['nome', 'ASC']],
    });
    res.json({ contas });
  } catch (err) {
    console.error('listContas:', err);
    res.status(500).json({ error: 'Erro ao listar contas' });
  }
};

const createConta = async (req, res) => {
  try {
    await ensureTable(req);
    const { ContaBancaria } = req.models;
    const {
      nome, secretaria_id, banco_nome, banco_codigo,
      agencia, agencia_digito, conta, conta_digito,
      tipo, natureza, titular, cnpj_titular, observacao, ativo,
    } = req.body;

    if (!nome) return res.status(400).json({ error: 'Nome da conta é obrigatório' });

    const nova = await ContaBancaria.create({
      nome, secretaria_id: secretaria_id || null, banco_nome, banco_codigo,
      agencia, agencia_digito, conta, conta_digito,
      tipo: tipo || 'corrente', natureza: natureza || 'custeio',
      titular, cnpj_titular, observacao,
      ativo: ativo !== false,
    });
    res.status(201).json({ conta: nova });
  } catch (err) {
    console.error('createConta:', err);
    res.status(500).json({ error: 'Erro ao criar conta' });
  }
};

const updateConta = async (req, res) => {
  try {
    const { ContaBancaria } = req.models;
    const { id } = req.params;
    const conta = await ContaBancaria.findByPk(id);
    if (!conta) return res.status(404).json({ error: 'Conta não encontrada' });

    await conta.update(req.body);
    res.json({ conta });
  } catch (err) {
    console.error('updateConta:', err);
    res.status(500).json({ error: 'Erro ao atualizar conta' });
  }
};

const deleteConta = async (req, res) => {
  try {
    const { ContaBancaria } = req.models;
    const { id } = req.params;
    const conta = await ContaBancaria.findByPk(id);
    if (!conta) return res.status(404).json({ error: 'Conta não encontrada' });
    await conta.destroy();
    res.json({ ok: true });
  } catch (err) {
    console.error('deleteConta:', err);
    res.status(500).json({ error: 'Erro ao excluir conta' });
  }
};

module.exports = { listBancos, listContas, createConta, updateConta, deleteConta };
