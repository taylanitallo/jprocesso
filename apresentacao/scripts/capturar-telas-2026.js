/**
 * capturar-telas-2026.js — prints do jProcesso para a apresentação e o vídeo.
 *
 * Captura do ambiente DEV (mesma massa de demonstração de produção; a produção
 * fica atrás do desafio do Cloudflare, que bloqueia navegador automatizado).
 *
 * Uso:  node apresentacao/scripts/capturar-telas-2026.js [--saida pasta]
 * Requer: massa preparada (npm run demo:preparar) e o .env do DEV (lê ids no banco).
 */
'use strict';
const path = require('path');
const fs = require('fs');
const ROOT = path.resolve(__dirname, '../..');
require(path.join(ROOT, 'node_modules/dotenv')).config({ path: path.join(ROOT, '.env') });
const { chromium } = require(path.join(ROOT, 'node_modules/playwright'));
const { Client } = require(path.join(ROOT, 'node_modules/pg'));

const arg = (n, d) => { const i = process.argv.indexOf(`--${n}`); return i > -1 ? process.argv[i + 1] : d; };
const BASE = 'https://jprocesso-dev.vercel.app';
const T = 'modelo';
const SO = arg('so', null); // 'celular' = só os prints de celular
const SAIDA = path.resolve(arg('saida', path.join(ROOT, 'apresentacao/telas-2026')));
fs.mkdirSync(SAIDA, { recursive: true });

const USUARIOS = {
  admin: '02680278380', tesoureiro: '24615495161', procurador: '73388935785',
  contadora: '57434126426', prefeito: '82557587044', almoxarife: '92009797183',
};

const CSS_PALCO = `
  .fixed.bottom-14.right-5, [class*="z-[65]"], [class*="z-[10001]"] { display: none !important; }
  #nprogress, [class*="GlobalProgressBar"] { display: none !important; }
  *, *::before, *::after { animation-duration: 0s !important; animation-delay: 0s !important; transition-duration: 0s !important; }
  * { caret-color: transparent !important; }
`;

async function idsDoBanco() {
  if (!/rlwy\.net/.test(process.env.DB_HOST || '')) throw new Error('.env não é o DEV');
  const c = new Client({ host: process.env.DB_HOST, port: process.env.DB_PORT, user: process.env.DB_USER,
    password: process.env.DB_PASSWORD, database: process.env.DB_NAME, ssl: { rejectUnauthorized: false } });
  await c.connect();
  const did = async (n) => (await c.query(`SELECT processo_id FROM tenant_modelo.dids WHERE numero_did=$1`, [n])).rows[0]?.processo_id;
  const ids = {
    didTesouraria: await did('SEMAD-008'), didParecer: await did('SEMAS-002'), didConcluido: await did('SEDUC-003'),
    didDevolvido: await did('SESAU-006'), didAlmox: await did('SEMAD-013'),
  };
  const a = (await c.query(`SELECT a.codigo_verificador, a.codigo_crc FROM tenant_modelo.assinaturas_eletronicas a
    JOIN tenant_modelo.dids d ON d.processo_id=a.processo_id WHERE a.tipo_ato='did_etapa' ORDER BY a.assinado_em DESC LIMIT 1`)).rows[0];
  ids.assinatura = a;
  await c.end();
  return ids;
}

async function entrar(browser, cpf, opcoes = {}) {
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1, locale: 'pt-BR',
    timezoneId: 'America/Fortaleza', colorScheme: 'light', reducedMotion: 'reduce', ...opcoes,
  });
  await context.addInitScript(() => { try { localStorage.setItem('theme', 'light'); } catch {} });
  const page = await context.newPage();
  if (cpf) {
    await page.goto(`${BASE}/${T}/login`, { waitUntil: 'domcontentloaded' });
    // O login tem um formulário por layout (celular/desktop): usa o visível
    const cpfInput = page.locator('input[autocomplete="username"]:visible').first();
    await cpfInput.waitFor({ timeout: 40000 });
    await cpfInput.fill(cpf);
    await page.locator('input[autocomplete="current-password"]:visible').first().fill('123456');
    await page.locator('button[type="submit"]:visible').first().click();
    await page.waitForURL(u => !u.pathname.endsWith('/login'), { timeout: 40000 });
  }
  return { context, page };
}

async function capturar(page, nome, rota, { rolarAte, esperar = 3500, clicar, fullPage = false } = {}) {
  process.stdout.write(`  ${nome} ... `);
  try {
    await page.goto(`${BASE}/${T}${rota}`, { waitUntil: 'networkidle', timeout: 60000 }).catch(() => {});
    await page.addStyleTag({ content: CSS_PALCO });
    await page.waitForTimeout(esperar);
    for (const c of [].concat(clicar || [])) { await page.getByText(c, { exact: true }).first().click({ timeout: 8000 }); await page.waitForTimeout(2500); }
    await page.addStyleTag({ content: CSS_PALCO });
    if (rolarAte) {
      const alvo = page.getByText(rolarAte, { exact: false }).first();
      for (let i = 0; i < 2; i++) {
        await alvo.evaluate((el) => {
          let p = el.parentElement;
          for (; p; p = p.parentElement) { const s = getComputedStyle(p); if (/(auto|scroll)/.test(s.overflowY) && p.scrollHeight > p.clientHeight) break; }
          const dy = el.getBoundingClientRect().top - 120;
          if (p) p.scrollTop += dy; else window.scrollBy(0, dy);
        });
        await page.waitForTimeout(500);
      }
    }
    await page.screenshot({ path: path.join(SAIDA, `${nome}.png`), fullPage });
    console.log('ok');
  } catch (e) { console.log('FALHOU —', e.message.split('\n')[0]); }
}

(async () => {
  const ids = await idsDoBanco();
  const browser = await chromium.launch();
  try {
    let context, page;
    if (!SO) {
    // ── Administrador: visão do município inteiro ──
    ({ context, page } = await entrar(browser, USUARIOS.admin));
    await capturar(page, '01-painel', '');
    await capturar(page, '02-processos', '/processos');
    await capturar(page, '03-novo-processo', '/processos/novo');
    await capturar(page, '04-processo-historico', `/processos/${ids.didConcluido}`, { rolarAte: 'Linha do Tempo' });
    await capturar(page, '05-did-concluido', `/processos/${ids.didConcluido}/did`);
    await capturar(page, '06-did-devolvido', `/processos/${ids.didDevolvido}/did`);
    await capturar(page, '07-fluxos-processo', '/configuracoes/fluxos');
    await capturar(page, '08-contratos-painel', '/contratos/dashboard');
    await capturar(page, '09-contratos-lista', '/contratos/contratos');
    await capturar(page, '10-ordens', '/contratos/ordens');
    await capturar(page, '11-licitacoes', '/contratos/licitacoes');
    await capturar(page, '12-tesouraria-contas', '/tesouraria/contas');
    await capturar(page, '13-tesouraria-relatorios', '/tesouraria/relatorios', { clicar: ['Este ano', 'Atualizar'] });
    await capturar(page, '13b-tesouraria-fluxo', '/tesouraria/relatorios', { clicar: ['Fluxo Mensal', 'Este ano', 'Atualizar'] });
    await capturar(page, '14-financeiro-painel', '/financeiro/painel');
    await capturar(page, '15-almox-painel', '/almoxarifado/painel');
    await capturar(page, '16-almox-requisicoes', '/almoxarifado/requisicoes');
    await capturar(page, '17-patrimonio', '/patrimonio/painel');
    await capturar(page, '18-relatorios', '/relatorios');
    await capturar(page, '19-registros', '/registros');
    await capturar(page, '20-lixeira', '/contratos/licitacoes', { clicar: 'Excluídos' }).catch(() => {});
    await context.close();

    // ── Quem preenche a etapa: a tela de quem trabalha ──
    ({ context, page } = await entrar(browser, USUARIOS.tesoureiro));
    await capturar(page, '21-did-tesouraria', `/processos/${ids.didTesouraria}/did`, { rolarAte: 'Seção VI — Tesouraria' });
    await capturar(page, '22-did-linha-etapas', `/processos/${ids.didTesouraria}/did`, { rolarAte: 'Etapas do DID' });
    await context.close();
    ({ context, page } = await entrar(browser, USUARIOS.procurador));
    await capturar(page, '23-did-parecer', `/processos/${ids.didParecer}/did`, { rolarAte: 'Seção III — Assessoria Jurídica — Parecer' });
    await context.close();

    // ── Público: consulta e verificação de assinatura ──
    ({ context, page } = await entrar(browser, null));
    await capturar(page, '24-consulta-publica', '/consulta');
    if (ids.assinatura) await capturar(page, '25-verificar-assinatura', `/verificar?codigo=${ids.assinatura.codigo_verificador}&crc=${ids.assinatura.codigo_crc}`);
    await context.close();

    }
    // ── Celular: dado na palma da mão ──
    const celular = { viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true };
    ({ context, page } = await entrar(browser, USUARIOS.admin, celular));
    await capturar(page, '26-celular-painel', '');
    await capturar(page, '27-celular-processo', `/processos/${ids.didConcluido}`);
    await capturar(page, '28-celular-tesouraria', '/financeiro/painel');
    await context.close();
  } finally {
    await browser.close();
  }
  console.log('Prints em', SAIDA);
})().catch(e => { console.error('ERRO', e); process.exit(1); });
