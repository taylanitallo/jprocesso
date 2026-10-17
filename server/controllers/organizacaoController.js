const { Op } = require('sequelize');
const { excluir } = require('../services/lixeiraService');
const { registrarLog } = require('../middleware/activityLogger');

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
      return res.status(500).json({ error: 'Model Secretaria nÃ£o disponÃ­vel' });
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

    const where = { ativo: true };
    if (req.user.tipo !== 'admin' && req.user.tipo !== 'jeos' && req.user.secretariaId) {
      where.id = req.user.secretariaId;
    }

    const secretarias = await Secretaria.findAll({
      where,
      // Setor excluído fica só na tela Excluídos
      include: [{ model: Setor, as: 'setores', required: false, where: { excluido_em: null } }],
      order: [
        ['nome', 'ASC'],
        [{ model: Setor, as: 'setores' }, 'nome', 'ASC']
      ]
    });

    res.json({ secretarias });
  } catch (error) {
    console.error('Erro ao listar secretarias:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

// Responsável vinculado a um agente grava também o nome (o contrato monta a lista de
// fiscais pelo nome; antes ele podia ficar em branco)
const completarNomesResponsaveis = async (req, responsaveis) => {
  if (!Array.isArray(responsaveis)) return responsaveis;
  const ids = responsaveis.filter(r => r && !String(r.nome || '').trim() && r.agente_id).map(r => String(r.agente_id));
  if (!ids.length) return responsaveis;
  const [rows] = await req.tenantDb.query(
    `SELECT id, nome FROM "${req.tenant.schema}".agentes WHERE id::text IN (:ids)`, { replacements: { ids } }
  ).catch(() => [[]]);
  const nomes = new Map(rows.map(a => [String(a.id), a.nome]));
  return responsaveis.map(r => (r && !String(r.nome || '').trim() && nomes.get(String(r.agente_id))) ? { ...r, nome: nomes.get(String(r.agente_id)) } : r);
};

const updateSecretaria = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      nome, sigla, descricao, ativo, responsaveis,
      data_inicio, data_fim, email, whatsapp,
      outros_sistemas, cnpj, razao_social, codigo_unidade,
      orcamento, dotacoes, logo
    } = req.body;
    const { Secretaria } = req.models;

    const secretaria = await Secretaria.findByPk(id);
    if (!secretaria) {
      return res.status(404).json({ error: 'Secretaria nÃ£o encontrada' });
    }

    const updateData = { nome, sigla, descricao, ativo };
    if (responsaveis    !== undefined) updateData.responsaveis    = await completarNomesResponsaveis(req, responsaveis);
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
    if (logo            !== undefined) updateData.logo            = logo          || null;

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
      return res.status(404).json({ error: 'Secretaria nÃ£o encontrada' });
    }

    await excluir(req, 'secretarias', secretaria);

    res.json({ message: 'Secretaria excluída com sucesso' });
  } catch (error) {
    console.error('Erro ao deletar secretaria:', error);
    res.status(500).json({ error: 'Erro ao deletar secretaria' });
  }
};

const createSetor = async (req, res) => {
  try {
    const { nome, sigla, descricao, secretaria_id } = req.body;
    const { Setor } = req.models;

    if (!Setor) {
      return res.status(500).json({ error: 'Erro interno do servidor' });
    }

    const setor = await Setor.create({
      nome,
      sigla: sigla || null,
      descricao,
      secretariaId: secretaria_id  // Converter para camelCase que o Sequelize espera
    });

    console.log('âœ… Setor criado:', setor.id);
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
    } else if (req.user.tipo !== 'admin' && req.user.tipo !== 'jeos' && req.user.secretariaId) {
      where.secretaria_id = req.user.secretariaId;
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
      return res.status(404).json({ error: 'Setor nÃ£o encontrado' });
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
      return res.status(404).json({ error: 'Setor nÃ£o encontrado' });
    }

    await excluir(req, 'setores', setor);

    res.json({ message: 'Setor excluído com sucesso' });
  } catch (error) {
    console.error('Erro ao deletar setor:', error);
    res.status(500).json({ error: 'Erro ao deletar setor' });
  }
};

// Buscar setores de uma secretaria especÃ­fica
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

// Buscar usuÃ¡rios de um setor especÃ­fico
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
    console.error('Erro ao buscar usuÃ¡rios:', error);
    res.status(500).json({ error: 'Erro ao buscar usuÃ¡rios' });
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

// â”€â”€ Listar agentes (gestores) ativos do tenant â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Campos do cadastro de agente (o que o formulário edita)
const CAMPOS_AGENTE = ['nome', 'nome_reduzido', 'cpf', 'nascimento', 'telefone', 'email', 'matricula', 'cargo', 'secretaria_id', 'ativo'];
const valorAgente = (campo, v) => {
  if (campo === 'ativo') return v !== false;
  if (v === undefined || v === null) return null;
  const t = String(v).trim();
  return t === '' ? null : t;
};
const COLUNAS_AGENTE = `a.id, a.nome, a.nome_reduzido, a.cpf, to_char(a.nascimento, 'YYYY-MM-DD') AS nascimento,
       a.telefone, a.email, a.matricula, a.cargo, a.secretaria_id, a.ativo`;

const listAgentes = async (req, res) => {
  try {
    const schema = req.tenant.schema
    const [rows] = await req.tenantDb.query(
      `SELECT ${COLUNAS_AGENTE}, s.nome AS secretaria_nome, s.sigla AS secretaria_sigla
       FROM "${schema}".agentes a
       LEFT JOIN "${schema}".secretarias s ON s.id = a.secretaria_id
       WHERE a.ativo = true AND a.excluido_em IS NULL
       ORDER BY a.nome`
    )
    res.json({ agentes: rows })
  } catch (error) {
    // tabela ainda não existe ou erro não-crítico
    res.json({ agentes: [] })
  }
}

const buscarAgente = async (req, id) => {
  const [rows] = await req.tenantDb.query(
    `SELECT ${COLUNAS_AGENTE} FROM "${req.tenant.schema}".agentes a WHERE a.id = :id LIMIT 1`,
    { replacements: { id } }
  );
  return rows[0] || null;
};

// ── Criar agente ─────────────────────────────────────────────────────────────
const createAgente = async (req, res) => {
  try {
    const schema = req.tenant.schema;
    const dados = Object.fromEntries(CAMPOS_AGENTE.filter(c => c !== 'ativo').map(c => [c, valorAgente(c, req.body[c])]));
    if (!dados.nome) return res.status(400).json({ error: 'Nome obrigatório' });
    const cols = Object.keys(dados);
    const [rows] = await req.tenantDb.query(
      `INSERT INTO "${schema}".agentes (${cols.join(', ')}, ativo, created_at, updated_at)
       VALUES (${cols.map(c => `:${c}`).join(', ')}, true, NOW(), NOW())
       RETURNING id`,
      { replacements: dados }
    );
    res.status(201).json({ agente: await buscarAgente(req, rows[0].id) });
  } catch (err) {
    console.error('createAgente:', err);
    res.status(500).json({ error: 'Erro ao criar agente' });
  }
};

// ── Importar agentes (planilha do modelo) ────────────────────────────────────
// Corpo: { agentes: [{ nome, nome_reduzido, cpf, nascimento, telefone, email,
// matricula, cargo, secretaria }] } — secretaria = sigla ou nome. Responde linha a
// linha. Gestor só importa na própria secretaria (vazio = a dele).
const dataDaPlanilha = (v) => {
  if (v === undefined || v === null || String(v).trim() === '') return { ok: true, valor: null };
  if (typeof v === 'number') { // data serial do Excel
    const d = new Date(Math.round((v - 25569) * 86400000));
    return { ok: true, valor: d.toISOString().slice(0, 10) };
  }
  const t = String(v).trim();
  let m = t.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (m) return { ok: true, valor: `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}` };
  m = t.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return { ok: true, valor: `${m[1]}-${m[2]}-${m[3]}` };
  return { ok: false };
};

const importarAgentes = async (req, res) => {
  try {
    const linhas = Array.isArray(req.body?.agentes) ? req.body.agentes : null;
    if (!linhas || !linhas.length) return res.status(400).json({ error: 'Planilha sem agentes' });
    if (linhas.length > 2000) return res.status(400).json({ error: 'Máximo de 2000 agentes por planilha' });

    const schema = req.tenant.schema;
    const db = req.tenantDb;
    const [secretarias] = await db.query(`SELECT id, nome, sigla FROM "${schema}".secretarias`);
    const acharSecretaria = (txt) => {
      const t = String(txt || '').trim().toLowerCase();
      if (!t) return null;
      return secretarias.find(s => (s.sigla || '').toLowerCase() === t || (s.nome || '').toLowerCase() === t) || undefined;
    };

    let minhaSec = null;
    if (req.user?.tipo === 'gestor') {
      const eu = await req.models.User.findByPk(req.user.id, { attributes: ['secretariaId'] });
      minhaSec = eu?.secretariaId ? String(eu.secretariaId) : null;
      if (!minhaSec) return res.status(403).json({ error: 'Gestor sem secretaria não pode importar agentes' });
    }

    const [existentes] = await db.query(`SELECT cpf FROM "${schema}".agentes WHERE excluido_em IS NULL AND cpf IS NOT NULL`);
    const cpfsUsados = new Set(existentes.map(r => String(r.cpf).replace(/\D/g, '')).filter(Boolean));

    const resultados = [];
    for (let i = 0; i < linhas.length; i++) {
      const l = linhas[i] || {};
      const linha = i + 2; // linha 1 = cabeçalho
      const nome = valorAgente('nome', l.nome);
      const falha = (msg) => resultados.push({ linha, nome: nome || '—', status: 'erro', msg });
      if (!nome) { falha('Nome obrigatório'); continue; }

      const cpf = l.cpf ? String(l.cpf).replace(/\D/g, '').padStart(11, '0') : null;
      if (cpf && cpf.length !== 11) { falha('CPF deve ter 11 dígitos'); continue; }
      if (cpf && cpfsUsados.has(cpf)) { falha('CPF já cadastrado'); continue; }

      const nasc = dataDaPlanilha(l.nascimento);
      if (!nasc.ok) { falha('Nascimento inválido (use dd/mm/aaaa)'); continue; }

      let secId = null;
      if (String(l.secretaria || '').trim()) {
        const sec = acharSecretaria(l.secretaria);
        if (!sec) { falha(`Secretaria "${l.secretaria}" não encontrada`); continue; }
        secId = String(sec.id);
      }
      if (minhaSec) {
        if (secId && secId !== minhaSec) { falha('Gestor só importa agentes da própria secretaria'); continue; }
        secId = minhaSec;
      }

      const dados = {
        nome,
        nome_reduzido: valorAgente('nome_reduzido', l.nome_reduzido),
        cpf,
        nascimento: nasc.valor,
        telefone: valorAgente('telefone', l.telefone),
        email: valorAgente('email', l.email),
        matricula: valorAgente('matricula', l.matricula),
        cargo: valorAgente('cargo', l.cargo),
        secretaria_id: secId,
      };
      try {
        await db.query(
          `INSERT INTO "${schema}".agentes (${Object.keys(dados).join(', ')}, ativo, created_at, updated_at)
           VALUES (${Object.keys(dados).map(c => `:${c}`).join(', ')}, true, NOW(), NOW())`,
          { replacements: dados }
        );
        if (cpf) cpfsUsados.add(cpf);
        resultados.push({ linha, nome, status: 'ok', msg: 'Importado' });
      } catch (err) {
        console.error('importarAgentes linha', linha, err.message);
        falha('Erro ao gravar');
      }
    }

    res.json({
      importados: resultados.filter(r => r.status === 'ok').length,
      erros: resultados.filter(r => r.status === 'erro').length,
      resultados,
    });
  } catch (err) {
    console.error('importarAgentes:', err);
    res.status(500).json({ error: 'Erro ao importar agentes' });
  }
};

// ── Atualizar agente ─────────────────────────────────────────────────────────
// Só altera os campos enviados: um campo fora do formulário (ex.: secretaria)
// não é apagado ao salvar.
const updateAgente = async (req, res) => {
  try {
    const schema = req.tenant.schema;
    const { id } = req.params;
    const enviados = CAMPOS_AGENTE.filter(c => c in (req.body || {}));
    if (enviados.includes('nome') && !valorAgente('nome', req.body.nome)) return res.status(400).json({ error: 'Nome obrigatório' });
    if (!enviados.length) return res.json({ agente: await buscarAgente(req, id) });
    await req.tenantDb.query(
      `UPDATE "${schema}".agentes SET ${enviados.map(c => `${c} = :${c}`).join(', ')}, updated_at = NOW() WHERE id = :id`,
      { replacements: { id, ...Object.fromEntries(enviados.map(c => [c, valorAgente(c, req.body[c])])) } }
    );
    const agente = await buscarAgente(req, id);
    if (!agente) return res.status(404).json({ error: 'Agente não encontrado' });
    res.json({ agente });
  } catch (err) {
    console.error('updateAgente:', err);
    res.status(500).json({ error: 'Erro ao atualizar agente' });
  }
};

// â”€â”€ Excluir agente (soft delete) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const deleteAgente = async (req, res) => {
  try {
    const agente = await req.models.Agente.findByPk(req.params.id);
    if (!agente || agente.excluido_em) return res.status(404).json({ error: 'Agente não encontrado' });
    await excluir(req, 'agentes', agente);
    res.json({ success: true });
  } catch (err) {
    console.error('deleteAgente:', err);
    res.status(500).json({ error: 'Erro ao excluir agente' });
  }
};

const listSecretariasPublico = async (req, res) => {
  try {
    const { Secretaria } = req.models;
    const secretarias = await Secretaria.findAll({
      where: { ativo: true },
      attributes: ['id', 'nome', 'sigla'],
      order: [['nome', 'ASC']]
    });
    res.json({ secretarias });
  } catch (error) {
    console.error('Erro ao listar secretarias pÃºblicas:', error);
    res.status(500).json({ error: 'Erro ao listar secretarias' });
  }
};

// Endpoint dedicado para gestor atualizar logo da prÃ³pria secretaria
const updateSecretariaLogo = async (req, res) => {
  try {
    const { id } = req.params;
    const { logo } = req.body;
    const { Secretaria } = req.models;

    const secretaria = await Secretaria.findByPk(id);
    if (!secretaria) {
      return res.status(404).json({ error: 'Secretaria nÃ£o encontrada' });
    }

    // Gestores sÃ³ podem alterar a logo da prÃ³pria secretaria
    if (req.user.tipo === 'gestor' && req.user.secretariaId !== id) {
      return res.status(403).json({ error: 'Sem permissÃ£o para alterar outra secretaria' });
    }

    await secretaria.update({ logo: logo || null });

    res.json({ message: 'Logo da secretaria atualizada', logo: secretaria.logo });
  } catch (error) {
    console.error('Erro ao atualizar logo da secretaria:', error);
    res.status(500).json({ error: 'Erro ao atualizar logo da secretaria' });
  }
};

// ── Timbrado da secretaria (Configurações › Layout) ─────────────────────────
// Vale em todo PDF gerado pelos usuários da secretaria, exceto os DIDs (esses usam
// o timbrado do município, cadastrado no superadmin). Sem timbrado próprio, vale o
// do município.
const TIMBRADO_MAX = 6 * 1024 * 1024; // ~6 MB em data URL

// Qualquer usuário do município lê (precisa para gerar os PDFs)
const obterTimbradoSecretaria = async (req, res) => {
  try {
    const sec = await req.models.Secretaria.unscoped().findByPk(req.params.id, { attributes: ['id', 'timbrado', 'timbrado_opacity'] });
    if (!sec) return res.status(404).json({ error: 'Secretaria não encontrada' });
    res.json({ timbrado: sec.timbrado || null, opacity: sec.timbrado_opacity ?? 75 });
  } catch (error) {
    console.error('Erro ao ler timbrado da secretaria:', error);
    res.status(500).json({ error: 'Erro ao carregar o timbrado' });
  }
};

// Gestor da própria secretaria (administrador e Administrador Jeos: qualquer uma)
const salvarTimbradoSecretaria = async (req, res) => {
  try {
    const { id } = req.params;
    const { User, Secretaria } = req.models;
    if (req.user.tipo === 'gestor') {
      const eu = await User.findByPk(req.user.id, { attributes: ['secretariaId'] });
      if (String(eu?.secretariaId || '') !== String(id)) {
        return res.status(403).json({ error: 'O gestor só altera o timbrado da própria secretaria.' });
      }
    }
    const sec = await Secretaria.unscoped().findByPk(id);
    if (!sec) return res.status(404).json({ error: 'Secretaria não encontrada' });

    const dados = {};
    if (req.body?.timbrado !== undefined) {
      const t = req.body.timbrado;
      if (t !== null && t !== '' && !/^data:image\/(png|jpe?g|webp);base64,/.test(String(t))) {
        return res.status(400).json({ error: 'Envie uma imagem PNG, JPG ou WEBP.' });
      }
      if (t && String(t).length > TIMBRADO_MAX) return res.status(400).json({ error: 'Imagem muito grande (máximo de ~4,5 MB).' });
      dados.timbrado = t || null;
    }
    if (req.body?.opacity !== undefined) {
      const o = Math.round(Number(req.body.opacity));
      if (!Number.isFinite(o) || o < 0 || o > 100) return res.status(400).json({ error: 'Opacidade deve ficar entre 0 e 100.' });
      dados.timbrado_opacity = o;
    }
    await sec.update(dados);
    await registrarLog(req, {
      acao: 'timbrado_secretaria', modulo: 'configuracoes',
      descricao: `Timbrado da secretaria ${sec.sigla || sec.nome} ${dados.timbrado === null ? 'removido' : 'atualizado'}`,
      referencia_id: sec.id,
    });
    res.json({ timbrado: sec.timbrado || null, opacity: sec.timbrado_opacity ?? 75 });
  } catch (error) {
    console.error('Erro ao salvar timbrado da secretaria:', error);
    res.status(500).json({ error: 'Erro ao salvar o timbrado' });
  }
};

// ── Assinantes de documentos da secretaria (ordens de compra/serviço) ───────
// Secretário vigente (ordenador de despesa) e responsáveis vigentes, com cargo e
// amparo legal (Organização › Responsáveis). Busca a secretaria pelo nome ou sigla,
// sem diferenciar maiúscula/acento (contratos/ordens guardam o nome em texto).
const semAcento = (t) => String(t || '').normalize('NFD').replace(/[̀-ͯ]/g, '').trim().toLowerCase();

const assinantesSecretaria = async (req, res) => {
  try {
    const alvo = semAcento(req.query.nome);
    if (!alvo) return res.json({ secretario: null, responsaveis: [] });
    const secretarias = await req.models.Secretaria.findAll({ attributes: ['id', 'nome', 'sigla', 'responsaveis'] });
    const sec = secretarias.find(s => semAcento(s.nome) === alvo || semAcento(s.sigla) === alvo);
    if (!sec) return res.json({ secretario: null, responsaveis: [] });

    const hoje = new Date().toISOString().slice(0, 10);
    const vigentes = (Array.isArray(sec.responsaveis) ? sec.responsaveis : []).filter(r =>
      String(r?.nome || '').trim() && (!r.data_inicio || r.data_inicio <= hoje) && (!r.data_fim || r.data_fim >= hoje));

    // Cargo do cadastro do agente (ex.: "Secretário de Educação") tem prioridade sobre o da função
    const ids = vigentes.map(r => r.agente_id).filter(Boolean).map(String);
    const [agentes] = ids.length
      ? await req.tenantDb.query(`SELECT id::text AS id, cargo FROM "${req.tenant.schema}".agentes WHERE id::text IN (:ids)`, { replacements: { ids } }).catch(() => [[]])
      : [[]];
    const cargoAgente = new Map(agentes.map(a => [a.id, a.cargo]));
    const resp = vigentes.map(r => ({
      nome: String(r.nome).trim(),
      funcao: r.cargo || null,
      cargo: cargoAgente.get(String(r.agente_id)) || r.cargo || null,
      amparo: r.amparo || null,
    }));
    // Secretário (ou gestor/ordenador); sem eles, o primeiro responsável vigente que não é fiscal
    const secretario = resp.find(r => /secret/i.test(r.funcao || '')) || resp.find(r => /gestor|ordenador/i.test(r.funcao || ''))
      || resp.find(r => !/fiscal/i.test(r.funcao || '')) || null;
    res.json({ secretaria: { nome: sec.nome, sigla: sec.sigla }, secretario, responsaveis: resp });
  } catch (error) {
    console.error('Erro ao buscar assinantes da secretaria:', error);
    res.status(500).json({ error: 'Erro ao buscar os assinantes' });
  }
};

module.exports = {
  assinantesSecretaria,
  obterTimbradoSecretaria,
  salvarTimbradoSecretaria,
  createSecretaria,
  listSecretarias,
  updateSecretaria,
  updateSecretariaLogo,
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
  importarAgentes,
  updateAgente,
  deleteAgente,
  listSecretariasPublico,
};

