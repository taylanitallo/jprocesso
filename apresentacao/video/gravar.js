/**
 * gravar.js — grava as cenas do vídeo de apresentação do jProcesso (DEV).
 *
 * Cada cena do roteiro.json vira um .webm com ações reais no sistema (protocolo,
 * DID, pagamento, assinatura eletrônica com o código do autenticador gerado aqui).
 * A duração de cada cena acompanha a narração (duracoes.json, de gerar_audio.py).
 *
 * Uso: node apresentacao/video/gravar.js <pasta-trabalho> [ids das cenas…]
 *   <pasta-trabalho>/audio/duracoes.json  → entrada
 *   <pasta-trabalho>/cenas/<id>.webm + cenas.json → saída
 * ATENÇÃO: cria um processo, conclui uma etapa de DID e registra um pagamento no
 * município de demonstração do DEV (refazer a massa: npm run demo:preparar).
 */
'use strict';
const path = require('path');
const fs = require('fs');
const ROOT = path.resolve(__dirname, '../..');
require(path.join(ROOT, 'node_modules/dotenv')).config({ path: path.join(ROOT, '.env') });
const { chromium } = require(path.join(ROOT, 'node_modules/playwright'));
const { Client } = require(path.join(ROOT, 'node_modules/pg'));
const assinatura = require(path.join(ROOT, 'server/services/assinaturaService'));
const { SEGREDO_TOTP } = require(path.join(ROOT, 'server/scripts/seed_demo/fase2'));

const BASE = 'https://jprocesso-dev.vercel.app';
const T = 'modelo';
const TRABALHO = path.resolve(process.argv[2]);
const SO = process.argv.slice(3);
const ROTEIRO = JSON.parse(fs.readFileSync(path.join(__dirname, 'roteiro.json'), 'utf8'));
const DUR = JSON.parse(fs.readFileSync(path.join(TRABALHO, 'audio/duracoes.json'), 'utf8'));
const DIR_CENAS = path.join(TRABALHO, 'cenas');
fs.mkdirSync(DIR_CENAS, { recursive: true });
const TELA = { width: 1600, height: 900 };
const CPF = { admin: '02680278380', procurador: '73388935785', tesoureiro: '24615495161' };

const esperar = (ms) => new Promise(r => setTimeout(r, ms));
const codigoTotp = () => assinatura.hotp(assinatura.base32Decode(SEGREDO_TOTP), Math.floor(Date.now() / 30000));

// ── Cursor destacado, clique com onda e legenda da cena ───────────────────────
const SCRIPT_PALCO = (legenda) => `
(() => {
  const montar = () => {
    if (document.getElementById('__cursor')) return;
    const st = document.createElement('style');
    st.textContent = \`
      .fixed.bottom-14.right-5, [class*="z-[65]"], #nprogress { display: none !important; }
      #__cursor { position: fixed; left: -100px; top: -100px; width: 26px; height: 26px; border-radius: 50%;
        background: rgba(47,91,234,.28); border: 3px solid #2F5BEA; box-shadow: 0 0 0 6px rgba(47,91,234,.12);
        pointer-events: none; z-index: 2147483647; transform: translate(-50%,-50%); transition: width .15s, height .15s; }
      #__cursor.down { width: 18px; height: 18px; background: rgba(47,91,234,.55); }
      .__onda { position: fixed; width: 18px; height: 18px; border-radius: 50%; border: 3px solid #2F5BEA;
        pointer-events: none; z-index: 2147483646; transform: translate(-50%,-50%); animation: __onda .6s ease-out forwards; }
      @keyframes __onda { to { width: 90px; height: 90px; opacity: 0; } }
      #__legenda { position: fixed; right: 36px; top: 84px; z-index: 2147483645; pointer-events: none;
        font: 600 22px/1 'Segoe UI', Arial, sans-serif; color: #fff; background: linear-gradient(90deg,#12203A,#2F5BEA);
        padding: 14px 24px; border-radius: 999px; box-shadow: 0 12px 30px rgba(18,32,58,.35);
        animation: __entra .7s cubic-bezier(.2,.8,.2,1) both; letter-spacing: .3px; }
      @keyframes __entra { from { transform: translateX(40px); opacity: 0; } to { transform: none; opacity: 1; } }
    \`;
    document.head.appendChild(st);
    const c = document.createElement('div'); c.id = '__cursor'; document.body.appendChild(c);
    if (${JSON.stringify(legenda || '')}) {
      const l = document.createElement('div'); l.id = '__legenda'; l.textContent = ${JSON.stringify(legenda || '')}; document.body.appendChild(l);
    }
    document.addEventListener('mousemove', e => { c.style.left = e.clientX + 'px'; c.style.top = e.clientY + 'px'; }, true);
    document.addEventListener('mousedown', e => {
      c.classList.add('down');
      const o = document.createElement('div'); o.className = '__onda'; o.style.left = e.clientX + 'px'; o.style.top = e.clientY + 'px';
      document.body.appendChild(o); setTimeout(() => o.remove(), 700);
    }, true);
    document.addEventListener('mouseup', () => c.classList.remove('down'), true);
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', montar); else montar();
})();`;

// ── Ações "humanas" ──────────────────────────────────────────────────────────
async function apontar(page, alvo, { clicar = false, passos = 22, pausa = 350 } = {}) {
  const loc = typeof alvo === 'string' ? page.getByText(alvo, { exact: false }).first() : alvo;
  await loc.scrollIntoViewIfNeeded({ timeout: 8000 }).catch(() => {});
  const box = await loc.boundingBox();
  if (!box) throw new Error('alvo sem posição');
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps: passos });
  await esperar(pausa);
  if (clicar) { await page.mouse.down(); await esperar(90); await page.mouse.up(); await esperar(450); }
  return loc;
}
async function digitar(page, loc, texto, atraso = 32) {
  await apontar(page, loc, { clicar: true, pausa: 200 });
  await loc.pressSequentially(texto, { delay: atraso });
  await esperar(250);
}
async function rolar(page, deslocamento, ms = 1600) {
  await page.evaluate(async ({ dy, ms }) => {
    const candidatos = [...document.querySelectorAll('main, div')].filter(el => {
      const s = getComputedStyle(el); return /(auto|scroll)/.test(s.overflowY) && el.scrollHeight > el.clientHeight + 40;
    }).sort((a, b) => b.clientHeight - a.clientHeight);
    const alvo = candidatos[0] || document.scrollingElement;
    const ini = alvo.scrollTop; const t0 = performance.now();
    await new Promise(fim => {
      const passo = (t) => { const p = Math.min(1, (t - t0) / ms); const e = p < .5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;
        alvo.scrollTop = ini + dy * e; if (p < 1) requestAnimationFrame(passo); else fim(); };
      requestAnimationFrame(passo);
    });
  }, { dy: deslocamento, ms });
  await esperar(300);
}
const campo = (page, rotulo) => page.locator(`xpath=//label[contains(normalize-space(.), "${rotulo}")]/following-sibling::*[1]`).first();

// Assina no modal (senha + código); repete se o código já tiver sido usado neste passo
async function assinar(page) {
  const senha = page.locator('input[type="password"][autocomplete="current-password"]:visible').last();
  await senha.waitFor({ timeout: 20000 });
  await digitar(page, senha, '123456', 60);
  for (let tentativa = 0; tentativa < 3; tentativa++) {
    const codigo = page.locator('input[autocomplete="one-time-code"]:visible').last();
    await codigo.fill('');
    await digitar(page, codigo, codigoTotp(), 90);
    await apontar(page, page.getByRole('button', { name: /^Assinar$/ }).last(), { clicar: true });
    await esperar(2500);
    await page.screenshot({ path: path.join(DIR_CENAS, 'debug-assinar-' + Date.now() + '.png') }).catch(() => {});
    const avisos = (await page.evaluate(() => document.body.innerText)).split(/\n/).filter(l => /erro|falta|inválid|preencha|não foi|negad|obrigat/i.test(l)).slice(0, 6);
    if (avisos.length) console.log('[avisos na tela: ' + avisos.join(' | ') + ']');
    const erro = await page.getByText('já foi usado', { exact: false }).first().isVisible().catch(() => false);
    if (!erro) return;
    await esperar(30500 - (Date.now() % 30000)); // próximo código do aplicativo
  }
}

// ── Sessões já autenticadas (o login não aparece no vídeo) ─────────────────────
async function sessao(browser, cpf) {
  const ctx = await browser.newContext({ viewport: TELA, locale: 'pt-BR', timezoneId: 'America/Fortaleza', colorScheme: 'light' });
  await ctx.addInitScript(() => { try { localStorage.setItem('theme', 'light'); } catch {} });
  const page = await ctx.newPage();
  await page.goto(`${BASE}/${T}/login`, { waitUntil: 'domcontentloaded' });
  const c = page.locator('input[autocomplete="username"]:visible').first();
  await c.waitFor({ timeout: 40000 });
  await c.fill(cpf);
  await page.locator('input[autocomplete="current-password"]:visible').first().fill('123456');
  await page.locator('button[type="submit"]:visible').first().click();
  await page.waitForURL(u => !u.pathname.endsWith('/login'), { timeout: 40000 });
  const estado = await ctx.storageState();
  await ctx.close();
  return estado;
}

async function idsDoBanco() {
  const c = new Client({ host: process.env.DB_HOST, port: process.env.DB_PORT, user: process.env.DB_USER,
    password: process.env.DB_PASSWORD, database: process.env.DB_NAME, ssl: { rejectUnauthorized: false } });
  await c.connect();
  const did = async (n) => (await c.query(`SELECT processo_id FROM tenant_modelo.dids WHERE numero_did=$1`, [n])).rows[0]?.processo_id;
  const r = { parecer: await did('SEMAS-002'), tesouraria: await did('SEMAD-008'), concluido: await did('SEDUC-003') };
  await c.end();
  return r;
}
async function ultimaAssinatura() {
  const c = new Client({ host: process.env.DB_HOST, port: process.env.DB_PORT, user: process.env.DB_USER,
    password: process.env.DB_PASSWORD, database: process.env.DB_NAME, ssl: { rejectUnauthorized: false } });
  await c.connect();
  const r = (await c.query(`SELECT codigo_verificador, codigo_crc FROM tenant_modelo.assinaturas_eletronicas ORDER BY created_at DESC LIMIT 1`)).rows[0];
  await c.end();
  return r;
}

// ── Cartões de título (abertura e fechamento) ─────────────────────────────────
const cartao = (titulo, subtitulo) => `<!doctype html><html><head><meta charset="utf-8"><style>
  html,body{margin:0;height:100%;overflow:hidden;font-family:'Segoe UI',Arial,sans-serif}
  body{background:radial-gradient(circle at 20% 20%,#2F5BEA 0%,#1B2F5A 45%,#0B1528 100%);color:#F5F6FA;display:flex;align-items:center;justify-content:center}
  .grade{position:absolute;inset:0;background-image:linear-gradient(rgba(255,255,255,.05) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.05) 1px,transparent 1px);background-size:60px 60px;animation:mov 12s linear infinite}
  @keyframes mov{to{background-position:60px 60px}}
  .bolha{position:absolute;border-radius:50%;filter:blur(60px);opacity:.45;animation:flut 8s ease-in-out infinite alternate}
  .b1{width:420px;height:420px;background:#4F7BFF;left:-80px;top:-60px}.b2{width:380px;height:380px;background:#E4761B;right:-60px;bottom:-80px;animation-delay:-3s}
  @keyframes flut{to{transform:translate(60px,40px) scale(1.15)}}
  .c{position:relative;text-align:center}
  .t{font-size:118px;font-weight:800;letter-spacing:-2px;animation:sobe 1.1s cubic-bezier(.2,.8,.2,1) both}
  .t span{color:#9DB8FF}
  .s{font-size:40px;color:#C9D4EA;margin-top:18px;animation:sobe 1.1s .35s cubic-bezier(.2,.8,.2,1) both}
  .l{width:0;height:5px;background:linear-gradient(90deg,#9DB8FF,#E4761B);margin:34px auto 0;border-radius:3px;animation:linha 1.4s .7s ease-out forwards}
  .r{font-size:22px;color:#8FA3C8;margin-top:28px;letter-spacing:4px;text-transform:uppercase;animation:sobe 1s 1.1s both}
  @keyframes sobe{from{opacity:0;transform:translateY(40px)}to{opacity:1;transform:none}}
  @keyframes linha{to{width:520px}}
</style></head><body><div class="grade"></div><div class="bolha b1"></div><div class="bolha b2"></div>
<div class="c"><div class="t">j<span>Processo</span></div><div class="s">${subtitulo}</div><div class="l"></div><div class="r">JEOS Sistemas e Assessoria</div></div></body></html>`;

// ── Cenas ─────────────────────────────────────────────────────────────────────
const ir = (page, rota) => page.goto(`${BASE}/${T}${rota}`, { waitUntil: 'networkidle', timeout: 60000 }).catch(() => {});

const CENAS = {
  's00-abertura': { cartao: true },
  's15-fechamento': { cartao: true },

  's01-painel': { usuario: 'admin', inicio: (p) => ir(p, ''), acao: async (p) => {
    await p.mouse.move(800, 450);
    for (const t of ['URGENTES', 'ALERTA 48H', 'VALOR PAGO', 'ESTOQUE CRÍTICO', 'REQ. PENDENTES']) await apontar(p, t, { pausa: 1300 });
    await rolar(p, 420, 1800);
    await apontar(p, 'Alertas Executivos', { pausa: 1200 });
    await apontar(p, 'pendentes há +48h', { pausa: 1500 });
  } },

  's02-processos': { usuario: 'admin', inicio: (p) => ir(p, '/processos'), acao: async (p) => {
    await p.mouse.move(700, 300);
    await rolar(p, 300, 1500);
    await rolar(p, -300, 1200);
    const busca = p.locator('input[placeholder*="uscar"], input[placeholder*="esquis"]').first();
    if (await busca.count()) { await digitar(p, busca, 'energia', 110); await esperar(2200); }
    const linha = p.getByText('Proc.2026', { exact: false }).first();
    await apontar(p, linha, { pausa: 1500 });
  } },

  's03-protocolo': { usuario: 'admin', inicio: (p) => ir(p, '/processos/novo'), acao: async (p, ctx) => {
    await apontar(p, p.getByRole('button', { name: /Protocolo/ }).first(), { clicar: true });
    await esperar(800);
    await digitar(p, p.locator('[name="assunto"]'), 'Requerimento de reparo na iluminação da Rua do Comércio');
    await digitar(p, p.locator('[name="descricao"]'), 'Moradores relatam três postes apagados há uma semana, próximo ao nº 210.', 22);
    await digitar(p, p.locator('[name="interessado_nome"]'), 'Associação Comercial de Modelo');
    await apontar(p, p.locator('[name="destinoSecretariaId"]'), { clicar: false });
    const sec = p.locator('[name="destinoSecretariaId"]');
    const valSec = await sec.locator('option', { hasText: 'SEINFRA' }).first().getAttribute('value');
    await sec.selectOption(valSec); await esperar(1200);
    const set = p.locator('[name="destinoSetorId"]');
    await apontar(p, set);
    const valSet = await set.locator('option', { hasText: 'Iluminação' }).first().getAttribute('value');
    await set.selectOption(valSet); await esperar(900);
    await apontar(p, p.getByRole('button', { name: /Criar Processo/ }), { clicar: true });
    await assinar(p);
    await p.waitForURL(/\/processos\/[0-9a-f-]{36}/, { timeout: 20000 }).catch(() => {});
    ctx.processoCriado = p.url();
    await p.getByText('Linha do Tempo').first().waitFor({ timeout: 25000 }).catch(() => {});
    await apontar(p, 'Linha do Tempo', { pausa: 1500 }).catch(() => {});
  } },

  's04-linha-do-tempo': { usuario: 'admin', inicio: (p, ctx) => ir(p, `/processos/${ctx.ids.concluido}`), acao: async (p) => {
    await apontar(p, 'Linha do Tempo', { pausa: 600 });
    await rolar(p, 250, 1500);
    await apontar(p, 'Documento assinado eletronicamente', { pausa: 2200 });
    await rolar(p, 380, 2200);
    await apontar(p, 'Verificar autenticidade', { pausa: 1800 });
    await rolar(p, 380, 2200);
  } },

  's05-did-parecer': { usuario: 'procurador', inicio: (p, ctx) => ir(p, `/processos/${ctx.ids.parecer}/did`), acao: async (p) => {
    await apontar(p, 'Etapas do DID', { pausa: 900 });
    await apontar(p, 'Assessoria Jurídica —', { pausa: 900 });
    await p.getByText('Seção III — Assessoria Jurídica — Parecer').first().scrollIntoViewIfNeeded();
    await rolar(p, 120, 800);
    await digitar(p, campo(p, 'Parecer jurídico'), 'Verificada a regularidade formal: contrato vigente, certidões válidas e nota fiscal atestada. Opino pelo prosseguimento.', 18);
    await apontar(p, p.getByLabel('Sim', { exact: true }).last(), { clicar: true });
    for (const item of ['Contrato vigente', 'Certidões de regularidade válidas', 'Nota fiscal atestada']) {
      const cx = p.getByLabel(item, { exact: true }).last();
      await apontar(p, cx, { clicar: true, pausa: 250 });
      if (!(await cx.isChecked())) await cx.check();
    }
    await digitar(p, campo(p, 'Nº do parecer'), 'PJ 071/2026', 70);
    await apontar(p, p.getByRole('button', { name: 'Concluir e assinar' }).first(), { clicar: true });
    await apontar(p, p.getByRole('button', { name: 'Concluir e assinar' }).last(), { clicar: true });
    await assinar(p);
    await esperar(3000);
    await apontar(p, 'Etapas do DID', { pausa: 1500 }).catch(() => {});
  } },

  's06-fluxos': { usuario: 'admin', inicio: (p) => ir(p, '/configuracoes/fluxos'), acao: async (p) => {
    await apontar(p, 'SEQUÊNCIA', { pausa: 700 }).catch(() => apontar(p, 'Sequência', { pausa: 700 }));
    await apontar(p, 'III Assessoria Jurídica', { pausa: 1500 });
    await rolar(p, 330, 1500);
    const editar = p.getByRole('button', { name: /Editar/ }).nth(2);
    await apontar(p, editar, { clicar: true });
    await esperar(800);
    await rolar(p, 380, 2000);
    await esperar(1200);
  } },

  's07-pagamento': { usuario: 'tesoureiro', inicio: (p, ctx) => ir(p, `/processos/${ctx.ids.tesouraria}/did`), acao: async (p) => {
    await apontar(p, 'Etapas do DID', { pausa: 700 });
    await p.getByText('Seção VI — Tesouraria').first().scrollIntoViewIfNeeded();
    await rolar(p, 60, 600);
    const conta = campo(p, 'Conta de Pagamento');
    await apontar(p, conta, { clicar: false });
    const op = await conta.locator('option', { hasText: 'Movimento' }).first().getAttribute('value');
    await conta.selectOption(op); await esperar(1500);
    for (const cert of ['Municipal', 'Trabalhista', 'FGTS', 'Estadual', 'Federal']) {
      await apontar(p, p.locator('label', { hasText: new RegExp(`^${cert}$`) }).last(), { clicar: true, pausa: 200 });
    }
    await rolar(p, 380, 1300);
    await apontar(p, p.getByRole('button', { name: /Sim — Pago/ }), { clicar: true });
    const hoje = new Date(Date.now() - 3 * 3600000).toISOString().slice(0, 10);
    await p.locator('input[type="date"]:visible').last().fill(hoje);
    await esperar(900);
    await apontar(p, p.getByRole('button', { name: 'Concluir e assinar' }).first(), { clicar: true });
    await apontar(p, p.getByRole('button', { name: 'Concluir e assinar' }).last(), { clicar: true });
    await assinar(p);
    await esperar(2500);
  } },

  's08-financeiro': { usuario: 'admin', inicio: (p) => ir(p, '/tesouraria/relatorios'), acao: async (p) => {
    await apontar(p, p.getByText('Este ano', { exact: true }), { clicar: true });
    await apontar(p, p.getByRole('button', { name: /Atualizar/ }), { clicar: true });
    await esperar(1200);
    await apontar(p, 'Conta Movimento Geral', { pausa: 1200 });
    await apontar(p, 'A recolher', { pausa: 900 }).catch(() => {});
    await apontar(p, 'Disponível', { pausa: 900 }).catch(() => {});
    await ir(p, '/financeiro/painel');
    await apontar(p, 'Pago', { pausa: 1500 }).catch(() => {});
  } },

  's09-contratos': { usuario: 'admin', inicio: (p) => ir(p, '/contratos/dashboard'), acao: async (p) => {
    await apontar(p, 'Vencendo em 30 dias', { pausa: 900 });
    await apontar(p, 'contratos vencendo nos próximos 30 dias', { pausa: 1300 });
    await ir(p, '/contratos/licitacoes');
    await p.mouse.move(800, 420, { steps: 15 });
    await esperar(1500);
    await ir(p, '/contratos/ordens');
    await apontar(p, 'SALDO', { pausa: 900 }).catch(() => {});
    await apontar(p, 'Vinculada DID', { pausa: 1300 }).catch(() => {});
  } },

  's10-almoxarifado': { usuario: 'admin', inicio: (p) => ir(p, '/almoxarifado/painel'), acao: async (p) => {
    await p.mouse.move(800, 400, { steps: 15 });
    await rolar(p, 300, 1500);
    await ir(p, '/almoxarifado/requisicoes');
    for (const t of ['Entregue', 'Autorizada', 'Em Separação']) await apontar(p, t, { pausa: 700 }).catch(() => {});
  } },

  's11-patrimonio': { usuario: 'admin', inicio: (p) => ir(p, '/patrimonio/painel'), acao: async (p) => {
    await p.mouse.move(800, 400, { steps: 15 });
    await ir(p, '/patrimonio/bens');
    await rolar(p, 250, 1500);
  } },

  's12-seguranca': { usuario: 'admin', inicio: (p) => ir(p, '/contratos/licitacoes'), acao: async (p) => {
    await apontar(p, p.getByRole('button', { name: /Excluídos/ }).first(), { clicar: true });
    await esperar(1200);
    await apontar(p, 'EXCLUÍDO POR', { pausa: 900 }).catch(() => {});
    await apontar(p, p.getByRole('button', { name: /Restaurar selecionados/ }), { pausa: 900 }).catch(() => {});
    await p.keyboard.press('Escape');
    await ir(p, '/registros');
    await rolar(p, 300, 1500);
  } },

  's13-verificacao': { usuario: null, inicio: (p) => ir(p, '/verificar'), acao: async (p, ctx) => {
    const a = ctx.ultimaAssinatura;
    const campos = p.locator('input:visible');
    await digitar(p, campos.nth(0), a.codigo_verificador, 90);
    await digitar(p, campos.nth(1), a.codigo_crc, 90);
    await apontar(p, p.getByRole('button', { name: /Verificar/ }).last(), { clicar: true });
    await esperar(1500);
    await apontar(p, 'Assinatura válida', { pausa: 1200 });
    await rolar(p, 250, 1500);
  } },

  's14-celular': { usuario: 'admin', celular: true, inicio: (p) => ir(p, ''), acao: async (p) => {
    await esperar(1200);
    await rolar(p, 600, 2500);
    await ir(p, '/financeiro/painel');
    await rolar(p, 500, 2200);
  } },
};

// ── Gravação ─────────────────────────────────────────────────────────────────
(async () => {
  const browser = await chromium.launch();
  const ctxGlobal = { ids: await idsDoBanco() };
  const estados = {};
  for (const u of ['admin', 'procurador', 'tesoureiro']) estados[u] = await sessao(browser, CPF[u]);
  const saida = fs.existsSync(path.join(DIR_CENAS, 'cenas.json')) ? JSON.parse(fs.readFileSync(path.join(DIR_CENAS, 'cenas.json'), 'utf8')) : {};

  for (const cena of ROTEIRO) {
    if (SO.length && !SO.includes(cena.id)) continue;
    const def = CENAS[cena.id];
    const alvo = (DUR[cena.id] || 8) + 1.4; // narração + respiro
    process.stdout.write(`${cena.id} (${alvo.toFixed(1)}s) ... `);
    if (cena.id === 's13-verificacao') ctxGlobal.ultimaAssinatura = await ultimaAssinatura();
    const tamanho = def.celular ? { width: 390, height: 844 } : TELA;
    const context = await browser.newContext({
      viewport: tamanho, deviceScaleFactor: def.celular ? 2 : 1, isMobile: !!def.celular, hasTouch: !!def.celular,
      locale: 'pt-BR', timezoneId: 'America/Fortaleza', colorScheme: 'light',
      storageState: def.usuario ? estados[def.usuario] : undefined,
      recordVideo: { dir: DIR_CENAS, size: def.celular ? { width: 780, height: 1688 } : TELA },
    });
    await context.addInitScript(() => { try { localStorage.setItem('theme', 'light'); localStorage.setItem('subdomain', 'modelo'); } catch {} });
    await context.addInitScript(SCRIPT_PALCO(cena.legenda));
    const criado = Date.now();
    const page = await context.newPage();
    try {
      if (def.cartao) await page.setContent(cartao(cena.titulo, cena.subtitulo));
      else await def.inicio(page, ctxGlobal);
      await esperar(def.cartao ? 100 : 1500);
      const inicio = Date.now();
      if (def.acao) await def.acao(page, ctxGlobal).catch(e => console.log(`[ação parcial: ${e.message.split('\n')[0]}] `));
      const resto = alvo * 1000 - (Date.now() - inicio);
      if (resto > 0) await esperar(resto);
      const dur = (Date.now() - inicio) / 1000;
      await page.screenshot({ path: path.join(DIR_CENAS, cena.id + '-fim.png') }).catch(() => {});
      await context.close();
      const video = await page.video().path();
      const destino = path.join(DIR_CENAS, `${cena.id}.webm`);
      fs.renameSync(video, destino);
      saida[cena.id] = { arquivo: destino, corte: (inicio - criado) / 1000, duracao: dur, celular: !!def.celular };
      fs.writeFileSync(path.join(DIR_CENAS, 'cenas.json'), JSON.stringify(saida, null, 1));
      console.log(`ok (${dur.toFixed(1)}s)`);
    } catch (e) {
      console.log('FALHOU —', e.message.split('\n')[0]);
      await context.close().catch(() => {});
    }
  }
  await browser.close();
})().catch(e => { console.error('ERRO', e); process.exit(1); });
