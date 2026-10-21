// Certidões do DID ligadas aos Documentos Anexados do processo: cada arquivo de certidão
// (Did.cert_sec1_arquivos[certKey].documento_id) é um documento do processo.

// Campo da marcação da certidão no DID: Seção I (cert_sec1_*) ou Tesouraria (cert_teso_*)
const campoDaCertidao = (certKey) => (String(certKey).startsWith('teso_') ? `cert_${certKey}` : `cert_sec1_${certKey}`);

/**
 * Documento excluído no processo: se era o arquivo de uma certidão do DID, a certidão
 * perde o arquivo e a marcação. Devolve as chaves desvinculadas.
 */
async function desvincularCertidaoDoDocumento(req, documento) {
  const { Did } = req.models;
  if (!Did || !documento?.processo_id) return [];
  const did = await Did.findOne({ where: { processo_id: documento.processo_id } });
  const arquivos = { ...(did?.cert_sec1_arquivos || {}) };
  const chaves = Object.keys(arquivos).filter(k => arquivos[k]?.documento_id === documento.id);
  if (!chaves.length) return [];
  const mudancas = {};
  chaves.forEach(k => { delete arquivos[k]; mudancas[campoDaCertidao(k)] = false; });
  did.cert_sec1_arquivos = arquivos;
  did.changed('cert_sec1_arquivos', true);
  Object.assign(did, mudancas);
  await did.save();
  return chaves;
}

module.exports = { campoDaCertidao, desvincularCertidaoDoDocumento };
