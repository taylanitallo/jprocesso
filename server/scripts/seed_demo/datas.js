// Linha do tempo da demonstração: os dados são escritos em datas fixas
// (fev–jul/2026) e, antes de gravar, todas as datas são deslocadas para que o
// registro mais recente caia pouco antes do momento em que o seed roda. Assim
// painéis, filtros "este mês" e vencimentos sempre mostram dados atuais.
//
// Desloca: Date, "AAAA-MM-DD[ HH:MM:SS]", "DD/MM/AAAA" e "maio/2026",
// "maio de 2026" dentro de textos e JSON.
const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
const DIA = 86400000;

const RE_TS = /^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2}):(\d{2})$/;     // fmtTs (UTC)
const RE_ISO = /\b(20\d\d)-(\d\d)-(\d\d)(?=$|[ T"'.,;)\]}]|\b)/g;
const RE_BR = /\b(\d\d)\/(\d\d)\/(20\d\d)\b/g;
const RE_MES = new RegExp(`\\b(${MESES.join('|')})(\\/| de )(20\\d\\d)\\b`, 'gi');

const pad = (n) => String(n).padStart(2, '0');
const isoDe = (d) => `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
const tsDe = (d) => d.toISOString().replace('T', ' ').slice(0, 19);

/** Maior data/hora de evento encontrada nas linhas (só "AAAA-MM-DD HH:MM:SS" e Date) */
function maisRecente(valor, max = 0) {
  if (valor instanceof Date) return Math.max(max, valor.getTime());
  if (typeof valor === 'string') {
    const m = RE_TS.exec(valor);
    return m ? Math.max(max, Date.parse(valor.replace(' ', 'T') + 'Z')) : max;
  }
  if (Array.isArray(valor)) return valor.reduce((a, v) => maisRecente(v, a), max);
  if (valor && typeof valor === 'object') return Object.values(valor).reduce((a, v) => maisRecente(v, a), max);
  return max;
}

/**
 * Cria o deslocador. dias: deslocamento de todas as datas; meses: para os nomes
 * de mês nos textos ("Junho/2026" → "Setembro/2026"). agora: teto dos eventos.
 */
function criarDeslocador(dias, agora) {
  const meses = Math.round(dias / 30.44);
  const desloca = (ms) => ms + dias * DIA;
  const teto = agora.getTime() - 30 * 60000;
  let seq = 0;
  // Evento que passaria do "agora" (horário comercial somado) volta algumas horas
  const limitar = (ms) => (ms > teto ? teto - ((seq++ % 40) + 1) * 37 * 60000 : ms);

  const texto = (s) => {
    const ts = RE_TS.exec(s);
    if (ts) return tsDe(new Date(limitar(desloca(Date.parse(s.replace(' ', 'T') + 'Z')))));
    return s
      .replace(RE_ISO, (_, a, m, d) => isoDe(new Date(desloca(Date.UTC(+a, +m - 1, +d)))))
      .replace(RE_BR, (_, d, m, a) => {
        const n = new Date(desloca(Date.UTC(+a, +m - 1, +d)));
        return `${pad(n.getUTCDate())}/${pad(n.getUTCMonth() + 1)}/${n.getUTCFullYear()}`;
      })
      .replace(RE_MES, (_, mes, sep, ano) => {
        const i = MESES.indexOf(mes.toLowerCase()) + meses;
        const nome = MESES[((i % 12) + 12) % 12];
        const novoAno = +ano + Math.floor(i / 12);
        const caixa = mes[0] === mes[0].toUpperCase() ? nome[0].toUpperCase() + nome.slice(1) : nome;
        return `${caixa}${sep}${novoAno}`;
      });
  };

  const valor = (v) => {
    if (v instanceof Date) return new Date(limitar(desloca(v.getTime())));
    if (typeof v === 'string') return texto(v);
    if (Array.isArray(v)) return v.map(valor);
    if (v && typeof v === 'object' && !Buffer.isBuffer(v)) {
      return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, valor(x)]));
    }
    return v;
  };
  return { dias, meses, valor, texto };
}

/** Dias para levar o evento mais recente para ~3h antes de agora (dias inteiros) */
function diasAteHoje(maxMs, agora = new Date()) {
  if (!maxMs) return 0;
  return Math.max(0, Math.floor((agora.getTime() - 3 * 3600000 - maxMs) / DIA));
}

module.exports = { maisRecente, criarDeslocador, diasAteHoje };
