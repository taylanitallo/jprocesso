/**
 * Schema Context Controller
 * ─────────────────────────────────────────────────────────────────────────
 * Introspecção automática do banco de dados do tenant.
 *
 * Lê as tabelas e colunas reais do schema PostgreSQL e gera um "Schema
 * Context" em texto, que é injetado no System Prompt da IA interna (Ayla).
 *
 * • Cache por schema com TTL de 5 minutos (evita queries a cada mensagem)
 * • invalidateSchemaCache() pode ser chamado após runTenantMigrations()
 * • O texto gerado segue o formato esperado por gerarResposta() no JAI
 */

// ── Cache em memória (por schema) ────────────────────────────────────────
const schemaCache = new Map()
// { schema → { ts: number, tables: Array, context: string, generated_at: string } }

const CACHE_TTL_MS = 5 * 60 * 1000 // 5 minutos

// ── Prefixos de módulo para agrupamento visual ───────────────────────────
const MODULE_MAP = {
  almoxarifado: 'Almoxarifado',
  financeiro:   'Financeiro',
  contrato:     'Contratos',
  credore:      'Contratos › Credores',
  responsave:   'Contratos › Responsáveis',
  agente:       'Contratos › Agentes',
  did:          'DID',
  processo:     'Processos',
  tramitacao:   'Processos › Tramitações',
  documento:    'Processos › Documentos',
  secretaria:   'Organização › Secretarias',
  setor:        'Organização › Setores',
  usuario:      'Usuários',
  entidade:     'Entidade',
  tenant:       'Sistema › Tenants',
}

function detectarModulo(tableName) {
  const lower = tableName.toLowerCase()
  for (const [prefix, label] of Object.entries(MODULE_MAP)) {
    if (lower.startsWith(prefix)) return label
  }
  return 'Outros'
}

// ── Mapeia tipo PostgreSQL para rótulo legível ────────────────────────────
function tipoLegivel(dataType, maxLen) {
  const map = {
    'character varying': maxLen ? `texto(${maxLen})` : 'texto',
    'text':              'texto longo',
    'integer':           'inteiro',
    'bigint':            'inteiro grande',
    'smallint':          'inteiro pequeno',
    'numeric':           'número decimal',
    'double precision':  'decimal',
    'real':              'decimal simples',
    'boolean':           'booleano',
    'date':              'data',
    'timestamp without time zone': 'timestamp',
    'timestamp with time zone':    'timestamp com fuso',
    'uuid':              'UUID',
    'jsonb':             'JSON',
    'json':              'JSON',
    'bytea':             'binário',
    'serial':            'inteiro auto-incremento',
  }
  return map[dataType] || dataType
}

// ── Geração do contexto textual ──────────────────────────────────────────
function buildContextText(tables, schema, generated_at) {
  // Agrupa por módulo
  const byModule = {}
  for (const t of tables) {
    const mod = detectarModulo(t.nome)
    if (!byModule[mod]) byModule[mod] = []
    byModule[mod].push(t)
  }

  const lines = [
    `SCHEMA DO BANCO DE DADOS — ${schema}`,
    `Gerado em: ${new Date(generated_at).toLocaleString('pt-BR')}`,
    `Total de tabelas: ${tables.length}`,
    '',
  ]

  for (const [modulo, tbls] of Object.entries(byModule).sort()) {
    lines.push(`── MÓDULO: ${modulo} ──`)
    for (const t of tbls) {
      lines.push(`  TABELA: ${t.nome} (${t.colunas.length} colunas)`)
      for (const c of t.colunas) {
        const obrig  = c.obrigatorio ? '[obrigatório]' : ''
        const padrao = c.padrao ? `[padrão: ${c.padrao.replace(/::[\w\s]+/g, '')}]` : ''
        lines.push(`    • ${c.nome}: ${c.tipo} ${obrig} ${padrao}`.trimEnd())
      }
    }
    lines.push('')
  }

  return lines.join('\n')
}

// ── Query ao banco ────────────────────────────────────────────────────────
async function fetchSchemaFromDb(tenantDb, schema) {
  // 1. Lista todas as tabelas do schema
  const [tablesRaw] = await tenantDb.query(`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = :schema
      AND table_type   = 'BASE TABLE'
    ORDER BY table_name
  `, { replacements: { schema } })

  if (!tablesRaw.length) return []

  // 2. Busca todas as colunas em uma única query
  const [columnsRaw] = await tenantDb.query(`
    SELECT
      c.table_name,
      c.column_name,
      c.data_type,
      c.character_maximum_length,
      c.is_nullable,
      c.column_default,
      c.ordinal_position
    FROM information_schema.columns c
    WHERE c.table_schema = :schema
    ORDER BY c.table_name, c.ordinal_position
  `, { replacements: { schema } })

  // 3. Agrupa colunas por tabela
  const columnsByTable = {}
  for (const col of columnsRaw) {
    if (!columnsByTable[col.table_name]) columnsByTable[col.table_name] = []
    columnsByTable[col.table_name].push({
      nome:        col.column_name,
      tipo:        tipoLegivel(col.data_type, col.character_maximum_length),
      obrigatorio: col.is_nullable === 'NO',
      padrao:      col.column_default || null,
    })
  }

  return tablesRaw.map(t => ({
    nome:    t.table_name,
    modulo:  detectarModulo(t.table_name),
    colunas: columnsByTable[t.table_name] || [],
  }))
}

// ── Handler principal ─────────────────────────────────────────────────────
const getSchemaContext = async (req, res) => {
  try {
    const schema = req.tenant.schema

    // Verifica cache
    const cached = schemaCache.get(schema)
    if (cached && (Date.now() - cached.ts) < CACHE_TTL_MS) {
      return res.json({
        schema,
        tables:       cached.tables,
        context:      cached.context,
        generated_at: cached.generated_at,
        cached:       true,
      })
    }

    // Constrói a partir do banco
    const tables       = await fetchSchemaFromDb(req.tenantDb, schema)
    const generated_at = new Date().toISOString()
    const context      = buildContextText(tables, schema, generated_at)

    // Salva no cache
    schemaCache.set(schema, { ts: Date.now(), tables, context, generated_at })

    res.json({ schema, tables, context, generated_at, cached: false })
  } catch (error) {
    console.error('[SchemaContext] Erro ao inspecionar banco:', error)
    res.status(500).json({ error: 'Erro ao inspecionar banco de dados' })
  }
}

// ── Invalidação do cache (chamar após migrations) ─────────────────────────
const invalidateSchemaCache = (schema) => {
  schemaCache.delete(schema)
  console.log(`[SchemaContext] Cache invalidado para schema: ${schema}`)
}

module.exports = { getSchemaContext, invalidateSchemaCache }
