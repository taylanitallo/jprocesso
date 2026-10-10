// Utilitários do seed de demonstração (tenant_modelo)
const crypto = require('crypto');

// ── RNG determinístico (mulberry32) ──────────────────────────────────────────
let _state = 20260717;
const rand = () => {
  _state |= 0; _state = (_state + 0x6D2B79F5) | 0;
  let t = Math.imul(_state ^ (_state >>> 15), 1 | _state);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const ri = (min, max) => Math.floor(rand() * (max - min + 1)) + min;
const pick = (arr) => arr[Math.floor(rand() * arr.length)];
const money = (n) => Math.round(n * 100) / 100;

const uuid = () => crypto.randomUUID();
const sha = (s) => crypto.createHash('sha256').update(String(s)).digest('hex');

// ── CPF / CNPJ válidos (fictícios) ───────────────────────────────────────────
const _usedCpf = new Set();
const cpf = () => {
  for (;;) {
    const d = Array.from({ length: 9 }, () => ri(0, 9));
    let s = d.reduce((a, v, i) => a + v * (10 - i), 0);
    const d1 = ((s * 10) % 11) % 10;
    s = d.reduce((a, v, i) => a + v * (11 - i), 0) + d1 * 2;
    const d2 = ((s * 10) % 11) % 10;
    const v = d.join('') + d1 + d2;
    if (!_usedCpf.has(v) && new Set(v).size > 1) { _usedCpf.add(v); return v; }
  }
};
const _usedCnpj = new Set();
const cnpj = () => {
  for (;;) {
    const base = Array.from({ length: 8 }, () => ri(0, 9)).concat([0, 0, 0, 1]);
    const w1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    let s = base.reduce((a, v, i) => a + v * w1[i], 0);
    const d1 = s % 11 < 2 ? 0 : 11 - (s % 11);
    const w2 = [6].concat(w1);
    s = base.concat([d1]).reduce((a, v, i) => a + v * w2[i], 0);
    const d2 = s % 11 < 2 ? 0 : 11 - (s % 11);
    const dig = base.join('') + d1 + d2;
    if (_usedCnpj.has(dig)) continue;
    _usedCnpj.add(dig);
    return `${dig.slice(0, 2)}.${dig.slice(2, 5)}.${dig.slice(5, 8)}/${dig.slice(8, 12)}-${dig.slice(12)}`;
  }
};
const soDigitos = (s) => String(s || '').replace(/\D/g, '');

// ── Datas: horários "locais" (Fortaleza, UTC-3) armazenados em UTC ───────────
// mk(2026, 6, 15, 9, 30) = 15/jun/2026 09:30 local → 12:30 UTC
const mk = (y, m, d, h = 8, min = 0) => new Date(Date.UTC(y, m - 1, d, h + 3, min, ri(0, 59)));
const addH = (dt, h) => new Date(dt.getTime() + h * 3600000);
const addD = (dt, days) => new Date(dt.getTime() + days * 86400000);
const fmtTs = (dt) => dt.toISOString().replace('T', ' ').slice(0, 19);
const fmtD = (dt) => dt.toISOString().slice(0, 10);
// Empurra para horário comercial local (8h–17h)
const comercial = (dt) => {
  const local = new Date(dt.getTime() - 3 * 3600000);
  let h = local.getUTCHours();
  if (h < 8) return addH(dt, 8 - h + ri(0, 2));
  if (h > 17) return addH(dt, 24 - h + 8 + ri(0, 3));
  return dt;
};

const fone = () => '88 9' + ri(6000, 9999) + '-' + String(ri(0, 9999)).padStart(4, '0');
const foneDig = () => '889' + String(ri(60000000, 99999999));

const semAcento = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const emailDe = (nome, dominio = 'modelo.ce.gov.br') => {
  const partes = semAcento(nome).replace(/[^a-z ]/g, '').trim().split(/\s+/);
  return `${partes[0]}.${partes[partes.length - 1]}@${dominio}`;
};

// ── Insert em lote (chunk por nº de parâmetros) ──────────────────────────────
const batchInsert = async (client, schema, table, cols, rows) => {
  if (!rows.length) return 0;
  const maxParams = 30000;
  const perChunk = Math.max(1, Math.floor(maxParams / cols.length));
  let total = 0;
  for (let i = 0; i < rows.length; i += perChunk) {
    const chunk = rows.slice(i, i + perChunk);
    const values = [];
    const params = [];
    chunk.forEach((row, r) => {
      values.push('(' + cols.map((_, c) => `$${r * cols.length + c + 1}`).join(',') + ')');
      params.push(...row);
    });
    await client.query(
      `INSERT INTO "${schema}"."${table}" (${cols.map((c) => `"${c}"`).join(',')}) VALUES ${values.join(',')}`,
      params
    );
    total += chunk.length;
  }
  return total;
};

module.exports = {
  rand, ri, pick, money, uuid, sha, cpf, cnpj, soDigitos,
  mk, addH, addD, fmtTs, fmtD, comercial, fone, foneDig, semAcento, emailDe,
  batchInsert,
};
