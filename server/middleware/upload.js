const multer = require('multer');
const path = require('path');

// ── Extensões e tipos permitidos ──────────────────────────────────────────────
const ALLOWED_EXTENSIONS = new Set(['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.jpg', '.jpeg', '.png']);

// Extensões explicitamente bloqueadas (mesmo renomeadas)
const BLOCKED_EXTENSIONS = new Set([
  '.exe', '.bat', '.cmd', '.sh', '.js', '.mjs', '.cjs',
  '.html', '.htm', '.svg', '.php', '.jar', '.msi',
  '.ps1', '.vbs', '.scr', '.pif', '.com', '.hta',
]);

// A-1: magic bytes por extensão
// .docx/.xlsx são ZIP (PK\x03\x04); .doc/.xls são OLE2 (D0 CF 11 E0)
const MAGIC = {
  '.pdf':  { bytes: [0x25, 0x50, 0x44, 0x46] },          // %PDF
  '.png':  { bytes: [0x89, 0x50, 0x4E, 0x47] },          // .PNG
  '.jpg':  { bytes: [0xFF, 0xD8, 0xFF] },                 // JFIF/Exif
  '.jpeg': { bytes: [0xFF, 0xD8, 0xFF] },
  '.docx': { bytes: [0x50, 0x4B, 0x03, 0x04] },          // ZIP (Office Open XML)
  '.xlsx': { bytes: [0x50, 0x4B, 0x03, 0x04] },
  '.doc':  { bytes: [0xD0, 0xCF, 0x11, 0xE0] },          // OLE2
  '.xls':  { bytes: [0xD0, 0xCF, 0x11, 0xE0] },
};

function magicBytesMatch(buffer, ext) {
  const spec = MAGIC[ext];
  if (!spec) return false;
  if (buffer.length < spec.bytes.length) return false;
  return spec.bytes.every((b, i) => buffer[i] === b);
}

// ── Multer: valida extensão na recepção ──────────────────────────────────────
const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();

  if (BLOCKED_EXTENSIONS.has(ext)) {
    return cb(new Error('Arquivo inválido ou não permitido'));
  }

  if (!ALLOWED_EXTENSIONS.has(ext)) {
    return cb(new Error('Arquivo inválido ou não permitido'));
  }

  cb(null, true);
};

const upload = multer({
  storage: multer.memoryStorage(),
  fileFilter,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 20971520, // 20 MB
    files: 1,
  },
});

// ── Middleware pós-multer: valida magic bytes no buffer ──────────────────────
// Usar após upload.single() ou upload.array() nas rotas de upload
const validateFileContent = (req, res, next) => {
  if (!req.file) return next();

  const ext = path.extname(req.file.originalname).toLowerCase();
  const buffer = req.file.buffer;

  if (!magicBytesMatch(buffer, ext)) {
    return res.status(400).json({ error: 'Arquivo inválido ou não permitido' });
  }

  next();
};

module.exports = upload;
module.exports.validateFileContent = validateFileContent;
