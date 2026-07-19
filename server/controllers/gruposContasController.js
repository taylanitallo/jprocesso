const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Aceita array ou CSV; descarta ids malformados e duplicados
const parseUuidList = (v) => {
  const raw = Array.isArray(v) ? v : String(v || '').split(',');
  return [...new Set(raw.map(s => String(s).trim()).filter(s => UUID_RE.test(s)))];
};

const listGrupos = async (req, res) => {
  try {
    const { TesGrupoConta } = req.models;
    const grupos = await TesGrupoConta.findAll({
      where: { usuario_id: req.user.id, ativo: true },
      order: [['ordem', 'ASC'], ['nome', 'ASC']],
    });
    res.json({ grupos });
  } catch (err) {
    console.error('listGrupos:', err);
    res.status(500).json({ error: 'Erro ao listar grupos de contas' });
  }
};

const createGrupo = async (req, res) => {
  try {
    const { TesGrupoConta } = req.models;
    const nome = String(req.body.nome || '').trim();
    if (!nome) return res.status(400).json({ error: 'Informe o nome do grupo' });

    const contas_ids = parseUuidList(req.body.contas_ids);
    if (!contas_ids.length) return res.status(400).json({ error: 'Selecione ao menos uma conta' });

    const duplicado = await TesGrupoConta.findOne({
      where: { usuario_id: req.user.id, nome, ativo: true },
    });
    if (duplicado) return res.status(400).json({ error: 'Você já tem um grupo com esse nome' });

    const total = await TesGrupoConta.count({ where: { usuario_id: req.user.id, ativo: true } });

    const grupo = await TesGrupoConta.create({
      usuario_id: req.user.id,
      nome,
      descricao: req.body.descricao || null,
      contas_ids,
      ordem: total,
    });
    res.status(201).json({ grupo });
  } catch (err) {
    console.error('createGrupo:', err);
    res.status(500).json({ error: 'Erro ao criar grupo de contas' });
  }
};

const updateGrupo = async (req, res) => {
  try {
    const { TesGrupoConta } = req.models;
    const grupo = await TesGrupoConta.findOne({
      where: { id: req.params.id, usuario_id: req.user.id, ativo: true },
    });
    if (!grupo) return res.status(404).json({ error: 'Grupo de contas não encontrado' });

    const dados = {};

    if (req.body.nome !== undefined) {
      const nome = String(req.body.nome).trim();
      if (!nome) return res.status(400).json({ error: 'Informe o nome do grupo' });
      if (nome !== grupo.nome) {
        const duplicado = await TesGrupoConta.findOne({
          where: { usuario_id: req.user.id, nome, ativo: true },
        });
        if (duplicado) return res.status(400).json({ error: 'Você já tem um grupo com esse nome' });
      }
      dados.nome = nome;
    }

    if (req.body.contas_ids !== undefined) {
      const contas_ids = parseUuidList(req.body.contas_ids);
      if (!contas_ids.length) return res.status(400).json({ error: 'Selecione ao menos uma conta' });
      dados.contas_ids = contas_ids;
    }

    if (req.body.descricao !== undefined) dados.descricao = req.body.descricao || null;
    if (req.body.ordem !== undefined) dados.ordem = parseInt(req.body.ordem) || 0;

    await grupo.update(dados);
    res.json({ grupo });
  } catch (err) {
    console.error('updateGrupo:', err);
    res.status(500).json({ error: 'Erro ao atualizar grupo de contas' });
  }
};

const deleteGrupo = async (req, res) => {
  try {
    const { TesGrupoConta } = req.models;
    const grupo = await TesGrupoConta.findOne({
      where: { id: req.params.id, usuario_id: req.user.id, ativo: true },
    });
    if (!grupo) return res.status(404).json({ error: 'Grupo de contas não encontrado' });

    await grupo.update({ ativo: false });
    res.json({ message: 'Grupo excluído' });
  } catch (err) {
    console.error('deleteGrupo:', err);
    res.status(500).json({ error: 'Erro ao excluir grupo de contas' });
  }
};

module.exports = { listGrupos, createGrupo, updateGrupo, deleteGrupo };
