const createSecretaria = async (req, res) => {
  try {
    const {
      nome, sigla, descricao, responsaveis,
      data_inicio, data_fim, email, whatsapp,
      outros_sistemas, cnpj, razao_social, codigo_unidade,
      orcamento, dotacoes
    } = req.body;
    const { Secretaria } = req.models;

    if (!Secretaria) {
      return res.status(500).json({ error: 'Model Secretaria não disponível' });
    }

    const secretaria = await Secretaria.create({
      nome, sigla, descricao,
      responsaveis:    responsaveis    || [],
      data_inicio:     data_inicio     || null,
      data_fim:        data_fim        || null,
      email:           email           || null,
      whatsapp:        whatsapp        || null,
      outros_sistemas: outros_sistemas || false,
      cnpj:            cnpj            || null,
      razao_social:    razao_social    || null,
      codigo_unidade:  codigo_unidade  || null,
      orcamento:       orcamento       || {},
      dotacoes:        dotacoes        || [],
    });

    res.status(201).json(secretaria);
  } catch (error) {
    console.error('Erro ao criar secretaria:', error);
    res.status(500).json({ error: 'Erro ao criar secretaria' });
  }
};

const listSecretarias = async (req, res) => {
  try {
    const { Secretaria, Setor } = req.models;

    const secretarias = await Secretaria.findAll({
      where: { ativo: true },
      include: [{ model: Setor, as: 'setores', required: false }],
      order: [
        ['nome', 'ASC'],
        [{ model: Setor, as: 'setores' }, 'nome', 'ASC']
      ]
    });

    res.json({ secretarias });
  } catch (error) {
    console.error('Erro ao listar secretarias:', error);
    res.status(500).json({ error: 'Erro ao listar secretarias', detail: error.message });
  }
};

const updateSecretaria = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      nome, sigla, descricao, ativo, responsaveis,
      data_inicio, data_fim, email, whatsapp,
      outros_sistemas, cnpj, razao_social, codigo_unidade,
      orcamento, dotacoes
    } = req.body;
    const { Secretaria } = req.models;

    const secretaria = await Secretaria.findByPk(id);
    if (!secretaria) {
      return res.status(404).json({ error: 'Secretaria não encontrada' });
    }

    const updateData = { nome, sigla, descricao, ativo };
    if (responsaveis    !== undefined) updateData.responsaveis    = responsaveis;
    if (data_inicio     !== undefined) updateData.data_inicio     = data_inicio   || null;
    if (data_fim        !== undefined) updateData.data_fim        = data_fim      || null;
    if (email           !== undefined) updateData.email           = email         || null;
    if (whatsapp        !== undefined) updateData.whatsapp        = whatsapp      || null;
    if (outros_sistemas !== undefined) updateData.outros_sistemas = outros_sistemas;
    if (cnpj            !== undefined) updateData.cnpj            = cnpj          || null;
    if (razao_social    !== undefined) updateData.razao_social    = razao_social  || null;
    if (codigo_unidade  !== undefined) updateData.codigo_unidade  = codigo_unidade || null;
    if (orcamento       !== undefined) updateData.orcamento       = orcamento;
    if (dotacoes        !== undefined) updateData.dotacoes        = dotacoes;

    await secretaria.update(updateData);

    res.json({ message: 'Secretaria atualizada com sucesso', secretaria });
  } catch (error) {
    console.error('Erro ao atualizar secretaria:', error);
    res.status(500).json({ error: 'Erro ao atualizar secretaria' });
  }
};

const deleteSecretaria = async (req, res) => {
  try {
    const { id } = req.params;
    const { Secretaria } = req.models;

    const secretaria = await Secretaria.findByPk(id);
    if (!secretaria) {
      return res.status(404).json({ error: 'Secretaria não encontrada' });
    }

    await secretaria.update({ ativo: false });

    res.json({ message: 'Secretaria desativada com sucesso' });
  } catch (error) {
    console.error('Erro ao deletar secretaria:', error);
    res.status(500).json({ error: 'Erro ao deletar secretaria' });
  }
};

const createSetor = async (req, res) => {
  try {
    console.log('📝 Recebendo requisição para criar setor');
    console.log('Body:', req.body);
    
    const { nome, sigla, descricao, secretaria_id } = req.body;
    const { Setor } = req.models;

    if (!Setor) {
      console.error('❌ Model Setor não encontrado!');
      return res.status(500).json({ error: 'Model Setor não disponível' });
    }

    const setor = await Setor.create({
      nome,
      sigla: sigla || null,
      descricao,
      secretariaId: secretaria_id  // Converter para camelCase que o Sequelize espera
    });

    console.log('✅ Setor criado:', setor.id);
    res.status(201).json(setor);
  } catch (error) {
    console.error('Erro ao criar setor:', error);
    res.status(500).json({ error: 'Erro ao criar setor' });
  }
};

const listSetores = async (req, res) => {
  try {
    const { secretariaId } = req.query;
    const { Setor, Secretaria } = req.models;

    const where = { ativo: true };
    if (secretariaId) {
      where.secretaria_id = secretariaId;
    }

    const setores = await Setor.findAll({
      where,
      include: [{ model: Secretaria, as: 'secretaria' }],
      order: [['nome', 'ASC']]
    });

    res.json({ setores });
  } catch (error) {
    console.error('Erro ao listar setores:', error);
    res.status(500).json({ error: 'Erro ao listar setores' });
  }
};

const updateSetor = async (req, res) => {
  try {
    const { id } = req.params;
    const { nome, sigla, descricao, secretariaId, ativo } = req.body;
    const { Setor } = req.models;

    const setor = await Setor.findByPk(id);
    if (!setor) {
      return res.status(404).json({ error: 'Setor não encontrado' });
    }

    await setor.update({ nome, sigla, descricao, secretariaId, ativo });

    res.json({ message: 'Setor atualizado com sucesso', setor });
  } catch (error) {
    console.error('Erro ao atualizar setor:', error);
    res.status(500).json({ error: 'Erro ao atualizar setor' });
  }
};

const deleteSetor = async (req, res) => {
  try {
    const { id } = req.params;
    const { Setor } = req.models;

    const setor = await Setor.findByPk(id);
    if (!setor) {
      return res.status(404).json({ error: 'Setor não encontrado' });
    }

    await setor.update({ ativo: false });

    res.json({ message: 'Setor desativado com sucesso' });
  } catch (error) {
    console.error('Erro ao deletar setor:', error);
    res.status(500).json({ error: 'Erro ao deletar setor' });
  }
};

// Buscar setores de uma secretaria específica
const getSetoresBySecretaria = async (req, res) => {
  try {
    const { secretariaId } = req.params;
    const { Setor } = req.models;

    const setores = await Setor.findAll({
      where: { 
        secretariaId,
        ativo: true 
      },
      order: [['nome', 'ASC']]
    });

    res.json({ setores });
  } catch (error) {
    console.error('Erro ao buscar setores:', error);
    res.status(500).json({ error: 'Erro ao buscar setores' });
  }
};

// Buscar usuários de um setor específico
const getUsuariosBySetor = async (req, res) => {
  try {
    const { setorId } = req.params;
    const { User } = req.models;

    const usuarios = await User.findAll({
      where: { 
        setorId,
        ativo: true 
      },
      attributes: ['id', 'nome', 'email', 'tipo'],
      order: [['nome', 'ASC']]
    });

    res.json({ usuarios });
  } catch (error) {
    console.error('Erro ao buscar usuários:', error);
    res.status(500).json({ error: 'Erro ao buscar usuários' });
  }
};

const getEntidade = async (req, res) => {
  try {
    const db     = req.tenantDb;
    const schema = req.tenant.schema;
    const [rows] = await db.query(`SELECT * FROM "${schema}".entidade WHERE id = 1 LIMIT 1`);
    res.json({ entidade: rows[0] || {} });
  } catch (error) {
    console.error('Erro ao buscar entidade:', error);
    res.status(500).json({ error: 'Erro ao buscar entidade' });
  }
};

const updateEntidade = async (req, res) => {
  try {
    const {
      nome, nome_abreviado, cnpj, razao_social, codigo_unidade,
      esfera, poder, email, telefone, whatsapp,
      cep, logradouro, numero, complemento, bairro, cidade, uf
    } = req.body;
    const db     = req.tenantDb;
    const schema = req.tenant.schema;

    await db.query(`
      UPDATE "${schema}".entidade SET
        nome           = :nome,
        nome_abreviado = :nome_abreviado,
        cnpj           = :cnpj,
        razao_social   = :razao_social,
        codigo_unidade = :codigo_unidade,
        esfera         = :esfera,
        poder          = :poder,
        email          = :email,
        telefone       = :telefone,
        whatsapp       = :whatsapp,
        cep            = :cep,
        logradouro     = :logradouro,
        numero         = :numero,
        complemento    = :complemento,
        bairro         = :bairro,
        cidade         = :cidade,
        uf             = :uf,
        updated_at     = NOW()
      WHERE id = 1
    `, {
      replacements: {
        nome:           nome           || null,
        nome_abreviado: nome_abreviado || null,
        cnpj:           cnpj           || null,
        razao_social:   razao_social   || null,
        codigo_unidade: codigo_unidade || null,
        esfera:         esfera         || null,
        poder:          poder          || null,
        email:          email          || null,
        telefone:       telefone       || null,
        whatsapp:       whatsapp       || null,
        cep:            cep            || null,
        logradouro:     logradouro     || null,
        numero:         numero         || null,
        complemento:    complemento    || null,
        bairro:         bairro         || null,
        cidade:         cidade         || null,
        uf:             uf             || null,
      },
      type: db.QueryTypes.UPDATE
    });

    const [rows] = await db.query(`SELECT * FROM "${schema}".entidade WHERE id = 1 LIMIT 1`);
    res.json({ success: true, entidade: rows[0] });
  } catch (error) {
    console.error('Erro ao atualizar entidade:', error);
    res.status(500).json({ error: 'Erro ao atualizar entidade' });
  }
};

// ── Listar agentes (gestores) ativos do tenant ────────────────────────────
const listAgentes = async (req, res) => {
  try {
    const schema = req.tenant.schema
    const [rows] = await req.tenantDb.query(
      `SELECT a.id, a.nome, a.cargo, a.matricula, a.cpf, a.email, a.telefone, a.ativo,
              s.nome AS secretaria_nome, s.sigla AS secretaria_sigla
       FROM "${schema}".agentes a
       LEFT JOIN "${schema}".secretarias s ON s.id = a.secretaria_id
       WHERE a.ativo = true
       ORDER BY a.nome`
    )
    res.json({ agentes: rows })
  } catch (error) {
    // tabela ainda não existe ou erro não-crítico
    res.json({ agentes: [] })
  }
}

// ── Criar agente ─────────────────────────────────────────────────────────────
const createAgente = async (req, res) => {
  try {
    const schema = req.tenant.schema;
    const { nome, cargo, matricula, cpf, email, telefone, secretaria_id } = req.body;
    if (!nome) return res.status(400).json({ error: 'Nome obrigatório' });
    const [rows] = await req.tenantDb.query(
      `INSERT INTO "${schema}".agentes
        (nome, cargo, matricula, cpf, email, telefone, secretaria_id, ativo, created_at, updated_at)
       VALUES (:nome,:cargo,:matricula,:cpf,:email,:telefone,:secretaria_id,true,NOW(),NOW())
       RETURNING id, nome, cargo, matricula, cpf, email, telefone, ativo, secretaria_id`,
      {
        replacements: { nome, cargo: cargo||null, matricula: matricula||null, cpf: cpf||null,
          email: email||null, telefone: telefone||null, secretaria_id: secretaria_id||null },
        type: req.tenantDb.QueryTypes.INSERT
      }
    );
    res.status(201).json({ agente: Array.isArray(rows) ? rows[0] : rows });
  } catch (err) {
    console.error('createAgente:', err);
    res.status(500).json({ error: 'Erro ao criar agente' });
  }
};

// ── Atualizar agente ──────────────────────────────────────────────────────────
const updateAgente = async (req, res) => {
  try {
    const schema = req.tenant.schema;
    const { id } = req.params;
    const { nome, cargo, matricula, cpf, email, telefone, secretaria_id, ativo } = req.body;
    await req.tenantDb.query(
      `UPDATE "${schema}".agentes
       SET nome=:nome, cargo=:cargo, matricula=:matricula, cpf=:cpf, email=:email,
           telefone=:telefone, secretaria_id=:secretaria_id, ativo=:ativo, updated_at=NOW()
       WHERE id=:id`,
      {
        replacements: { id, nome, cargo: cargo||null, matricula: matricula||null, cpf: cpf||null,
          email: email||null, telefone: telefone||null, secretaria_id: secretaria_id||null,
          ativo: ativo !== undefined ? ativo : true },
        type: req.tenantDb.QueryTypes.UPDATE
      }
    );
    const [rows] = await req.tenantDb.query(
      `SELECT * FROM "${schema}".agentes WHERE id=:id LIMIT 1`, { replacements: { id }, type: req.tenantDb.QueryTypes.SELECT }
    );
    res.json({ agente: rows[0] });
  } catch (err) {
    console.error('updateAgente:', err);
    res.status(500).json({ error: 'Erro ao atualizar agente' });
  }
};

// ── Excluir agente (soft delete) ──────────────────────────────────────────────
const deleteAgente = async (req, res) => {
  try {
    const schema = req.tenant.schema;
    const { id } = req.params;
    await req.tenantDb.query(
      `UPDATE "${schema}".agentes SET ativo=false, updated_at=NOW() WHERE id=:id`,
      { replacements: { id }, type: req.tenantDb.QueryTypes.UPDATE }
    );
    res.json({ success: true });
  } catch (err) {
    console.error('deleteAgente:', err);
    res.status(500).json({ error: 'Erro ao excluir agente' });
  }
};

module.exports = {
  createSecretaria,
  listSecretarias,
  updateSecretaria,
  deleteSecretaria,
  createSetor,
  listSetores,
  updateSetor,
  deleteSetor,
  getSetoresBySecretaria,
  getUsuariosBySetor,
  getEntidade,
  updateEntidade,
  listAgentes,
  createAgente,
  updateAgente,
  deleteAgente,};
