const { Op } = require('sequelize')

/**
 * Returns the secretaria visibility scope for a given permission path.
 * path: e.g. 'almoxarifado', 'requisicoes', 'ver'
 * Returns { scope: 'todas'|'propria'|'algumas'|'none', secretarias: string[] }
 */
const getScope = (user, ...path) => {
  if (!user || user.tipo === 'admin' || user.tipo === 'jeos') {
    return { scope: 'todas', secretarias: [] }
  }

  const permissoes = user.permissoes || {}
  let obj = permissoes
  const actionKey = path[path.length - 1]

  for (const key of path.slice(0, -1)) {
    if (obj == null || typeof obj !== 'object') return { scope: 'propria', secretarias: [] }
    obj = obj[key]
  }

  const val = obj?.[actionKey]
  const secretarias = Array.isArray(obj?.ver_secretarias) ? obj.ver_secretarias : []

  if (val === false) return { scope: 'none', secretarias: [] }
  if (val === 'todas') return { scope: 'todas', secretarias: [] }
  if (val === 'algumas') return { scope: 'algumas', secretarias }

  // true | undefined | 'propria' → propria
  return { scope: 'propria', secretarias: [] }
}

/** Loads permissoes from DB onto req.user if not already present. */
const ensurePermissoes = async (req) => {
  if (req.user.permissoes != null) return
  if (!req.models?.User) return
  try {
    const u = await req.models.User.findByPk(req.user.id, { attributes: ['permissoes'] })
    req.user.permissoes = u?.permissoes || {}
  } catch {
    req.user.permissoes = {}
  }
}

/**
 * Applies secretaria scope to a Sequelize where object.
 * secretariaField: the column name, e.g. 'secretaria_id'
 * permPath: e.g. 'almoxarifado', 'requisicoes', 'ver'
 */
const applyScopeToWhere = async (where, req, secretariaField, ...permPath) => {
  const user = req.user
  if (!user || user.tipo === 'admin' || user.tipo === 'jeos') return

  await ensurePermissoes(req)

  const { scope, secretarias } = getScope(user, ...permPath)

  if (scope === 'none') {
    where[secretariaField] = { [Op.in]: [] }
  } else if (scope === 'propria') {
    if (user.secretariaId) where[secretariaField] = user.secretariaId
  } else if (scope === 'algumas') {
    where[secretariaField] = secretarias.length > 0
      ? { [Op.in]: secretarias }
      : { [Op.in]: [] }
  }
  // scope 'todas': no filter
}

/**
 * Nome da secretaria do usuário, buscado no banco pelo secretariaId (não confia no
 * token: o token renovado já veio sem o nome e o filtro deixava de valer).
 */
const ensureSecretariaNome = async (req) => {
  const user = req.user
  if (user._secretariaNomeConferido) return user.secretariaNome || null
  user._secretariaNomeConferido = true
  if (user.secretariaId && req.models?.Secretaria) {
    try {
      const sec = await req.models.Secretaria.findByPk(user.secretariaId, { attributes: ['nome'] })
      user.secretariaNome = sec?.nome || null
    } catch { /* mantém o do token */ }
  }
  return user.secretariaNome || null
}

/**
 * For modules where secretaria is stored as a name text field (contratos, despesas).
 * nameField: e.g. 'secretaria'
 */
const applyScopeToWhereByName = async (where, req, nameField, ...permPath) => {
  const user = req.user
  if (!user || user.tipo === 'admin' || user.tipo === 'jeos') return

  await ensurePermissoes(req)

  const { scope, secretarias } = getScope(user, ...permPath)

  if (scope === 'none') {
    where[nameField] = { [Op.in]: [] }
  } else if (scope === 'propria') {
    // Sem secretaria não há o que mostrar (antes ficava sem filtro e mostrava todas)
    const nome = await ensureSecretariaNome(req)
    where[nameField] = nome ? { [Op.iLike]: nome } : { [Op.in]: [] }
  } else if (scope === 'algumas') {
    if (secretarias.length > 0 && req.models?.Secretaria) {
      try {
        const secs = await req.models.Secretaria.findAll({
          where: { id: { [Op.in]: secretarias } },
          attributes: ['nome'],
          raw: true,
        })
        const names = secs.map(s => s.nome)
        where[nameField] = names.length > 0 ? { [Op.in]: names } : { [Op.in]: [] }
      } catch {
        if (user.secretariaNome) where[nameField] = { [Op.iLike]: user.secretariaNome }
      }
    } else {
      where[nameField] = { [Op.in]: [] }
    }
  }
}

/**
 * Returns Sequelize include condition overrides for Setor-based secretaria scope.
 * Used for processos where secretaria is accessed via setorAtual.secretariaId.
 * Returns: partial include object { where?, required? } or {} if no restriction.
 */
const getScopeSetorInclude = async (req, ...permPath) => {
  const user = req.user
  if (!user || user.tipo === 'admin' || user.tipo === 'jeos') return {}

  await ensurePermissoes(req)

  const { scope, secretarias } = getScope(user, ...permPath)

  if (scope === 'none') {
    return { where: { secretariaId: { [Op.in]: [] } }, required: true }
  } else if (scope === 'propria') {
    return user.secretariaId
      ? { where: { secretariaId: user.secretariaId }, required: true }
      : {}
  } else if (scope === 'algumas') {
    return {
      where: { secretariaId: secretarias.length > 0 ? { [Op.in]: secretarias } : { [Op.in]: [] } },
      required: true,
    }
  }

  return {} // 'todas': sem restrição
}

/**
 * Like getScopeSetorInclude but for Secretaria model itself (filters on `id`).
 * Used in getArquivoProcessos where secretaria is included directly.
 */
const getScopeSecretariaInclude = async (req, ...permPath) => {
  const user = req.user
  if (!user || user.tipo === 'admin' || user.tipo === 'jeos') return {}

  await ensurePermissoes(req)

  const { scope, secretarias } = getScope(user, ...permPath)

  if (scope === 'none') {
    return { where: { id: { [Op.in]: [] } }, required: true }
  } else if (scope === 'propria') {
    return user.secretariaId
      ? { where: { id: user.secretariaId }, required: true }
      : {}
  } else if (scope === 'algumas') {
    return {
      where: { id: secretarias.length > 0 ? { [Op.in]: secretarias } : { [Op.in]: [] } },
      required: true,
    }
  }

  return {} // 'todas'
}

module.exports = { getScope, ensurePermissoes, ensureSecretariaNome, applyScopeToWhere, applyScopeToWhereByName, getScopeSetorInclude, getScopeSecretariaInclude }
