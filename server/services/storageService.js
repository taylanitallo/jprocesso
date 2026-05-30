/**
 * storageService.js
 * Abstração para o Supabase Storage (bucket privado).
 *
 * Variáveis de ambiente necessárias:
 *   SUPABASE_URL              — URL do projeto Supabase (ex: https://xxx.supabase.co)
 *   SUPABASE_SERVICE_ROLE_KEY — Chave service_role (NUNCA expor no frontend)
 *   SUPABASE_STORAGE_BUCKET   — Nome do bucket (padrão: jprocesso-documentos)
 *
 * O bucket deve ser criado previamente como PRIVADO no painel do Supabase.
 * Consulte INSTRUCOES_BUCKET.md ou a documentação da ETAPA 59.
 */

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const BUCKET = process.env.SUPABASE_STORAGE_BUCKET || 'jprocesso-documentos';

let _client = null;

function getClient() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error(
      'Supabase Storage não configurado. Defina SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY no .env'
    );
  }
  if (!_client) {
    _client = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false }
    });
  }
  return _client;
}

/**
 * Faz upload de um arquivo para o bucket privado.
 *
 * @param {object} opts
 * @param {Buffer} opts.buffer      — Conteúdo do arquivo
 * @param {string} opts.path        — Caminho dentro do bucket (ex: "tenant_x/processoId/arquivo.pdf")
 * @param {string} opts.contentType — MIME type (ex: "application/pdf")
 * @returns {Promise<string>} path do arquivo no storage
 */
async function uploadDocumento({ buffer, path: storagePath, contentType }) {
  const supabase = getClient();
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(storagePath, buffer, {
      contentType,
      upsert: false
    });

  if (error) {
    throw new Error(`Supabase Storage upload error: ${error.message}`);
  }

  return storagePath;
}

/**
 * Baixa um arquivo do bucket e retorna como Buffer.
 *
 * @param {string} storagePath — Caminho dentro do bucket
 * @returns {Promise<Buffer>}
 */
async function downloadDocumento(storagePath) {
  const supabase = getClient();
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .download(storagePath);

  if (error) {
    throw new Error(`Supabase Storage download error: ${error.message}`);
  }

  const arrayBuffer = await data.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

/**
 * Remove um arquivo do bucket.
 *
 * @param {string} storagePath — Caminho dentro do bucket
 */
async function deleteDocumento(storagePath) {
  const supabase = getClient();
  const { error } = await supabase.storage
    .from(BUCKET)
    .remove([storagePath]);

  if (error) {
    throw new Error(`Supabase Storage delete error: ${error.message}`);
  }
}

/**
 * Gera uma signed URL de curta duração para acesso privado temporário.
 *
 * @param {string} storagePath      — Caminho dentro do bucket
 * @param {number} expiresIn        — Duração em segundos (padrão: 60)
 * @returns {Promise<string>} signedUrl
 */
async function createSignedUrl(storagePath, expiresIn = 60) {
  const supabase = getClient();
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(storagePath, expiresIn);

  if (error) {
    throw new Error(`Supabase Storage signed URL error: ${error.message}`);
  }

  return data.signedUrl;
}

/**
 * Verifica se um url_arquivo aponta para storage local legado.
 * Paths que começam com './', 'uploads/' ou contêm separadores Windows
 * são considerados locais.
 *
 * @param {string} urlArquivo
 * @returns {boolean}
 */
function isLocalPath(urlArquivo) {
  if (!urlArquivo) return false;
  return (
    urlArquivo.startsWith('./') ||
    urlArquivo.startsWith('uploads/') ||
    urlArquivo.startsWith('uploads\\') ||
    urlArquivo.includes('\\uploads\\')
  );
}

module.exports = {
  uploadDocumento,
  downloadDocumento,
  deleteDocumento,
  createSignedUrl,
  isLocalPath
};
