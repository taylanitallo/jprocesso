/**
 * capturar-telas.js — Captura as telas do jProcesso para a apresentação comercial.
 *
 * Nota sobre a extensão: o roteiro original pedia .ts, mas este repositório não tem
 * cadeia de build TypeScript (sem tsc, sem tsx, sem ts-node). Um .ts exigiria instalar
 * e configurar tudo isso só para rodar um script. Mantivemos .js — roda com o Node
 * que já está na máquina, sem nenhum passo extra.
 *
 * Pré-requisitos:
 *   1. npm i -D playwright && npx playwright install chromium
 *   2. Massa de demonstração preparada:  npm run demo:tensao
 *   3. Backend no ar:                    npm run dev          (porta 5001)
 *   4. Frontend no ar:                   npm run client       (porta 3000)
 *
 * Uso:
 *   npm run apresentacao:telas
 *   node apresentacao/scripts/capturar-telas.js --url http://localhost:3000 --tenant modelo
 *
 * Saída:
 *   apresentacao/telas/NN-nome.png     — as capturas
 *   apresentacao/telas/arquivos/       — PDF e planilha realmente gerados pelo sistema
 *   apresentacao/telas/INDICE.md       — liga cada print ao argumento de venda
 */
'use strict';

const path = require('path');
const fs = require('fs');
const { chromium } = require('playwright');

// ── Configuração ──────────────────────────────────────────────────────────────
const arg = (nome, padrao) => {
  const i = process.argv.indexOf(`--${nome}`);
  return i > -1 && process.argv[i + 1] ? process.argv[i + 1] : padrao;
};

const BASE    = arg('url', 'http://localhost:3000').replace(/\/$/, '');
const API     = arg('api', 'http://localhost:5001');
const TENANT  = arg('tenant', 'modelo');
const CPF     = arg('cpf', '02680278380');       // Administrador Modelo (dados fictícios)
const SENHA   = arg('senha', '123456');

const DIR_TELAS    = path.resolve(__dirname, '../telas');
const DIR_ARQUIVOS = path.join(DIR_TELAS, 'arquivos');

// 1920×1080 de layout, capturado em 2× para o texto não esfarelar no projetor.
const VIEWPORT = { width: 1920, height: 1080 };
const ESCALA   = 2;

// ── CSS de palco: tira o que não deve aparecer na projeção ────────────────────
// Nada aqui altera o produto — é maquiagem de captura, aplicada só no navegador.
const CSS_PALCO = `
  /* Assistente flutuante e avisos de nova versão: ruído em foto de projetor */
  .fixed.bottom-14.right-5, [class*="z-[65]"], [class*="z-[10001]"] { display: none !important; }
  /* Barra de progresso transitória */
  #nprogress, [class*="GlobalProgressBar"] { display: none !important; }
  /* Congela animações para o print nunca sair borrado */
  *, *::before, *::after {
    animation-duration: 0s !important; animation-delay: 0s !important;
    transition-duration: 0s !important; transition-delay: 0s !important;
  }
  /* Esconde o cursor de texto piscando */
  * { caret-color: transparent !important; }
`;

// Área útil do conteúdo (fora do menu lateral), em coordenadas de tela.
const CONTEUDO = { x: 248, largura: 1664 };

// ── Roteiro de capturas ───────────────────────────────────────────────────────
// argumento = a que dor do deck este print serve. Vira o INDICE.md.
//
// recorte: a tela inteira, reduzida para caber num slide, fica ilegível no
// projetor. Onde o argumento mora num pedaço da tela, recortamos esse pedaço
// ancorados num texto — assim o corte acompanha o layout em vez de depender de
// coordenadas fixas que quebram à primeira mudança de tela.
const ROTEIRO = [
  { nome: '01-dashboard', rota: '/', espera: 'Alertas Executivos',
    argumento: 'Slide 3 — o sistema em uma frase. Visão geral do município em uma tela.',
    dor: null },

  { nome: '02-alertas-pendencias', rota: '/', espera: 'Alertas Executivos',
    // Só a coluna da direita do painel: alertas executivos + processos urgentes.
    recorte: { ancora: 'Alertas Executivos', acima: 24, abaixo: 700, x: 1298, largura: 412 },
    argumento: 'Slide 6 — "o processo sumiu e o prazo estourou". É a tela que mais impressiona: tudo que está pegando fogo, em um lugar só.',
    dor: 3 },

  { nome: '03-contratos-vencimento', rota: '/contratos/dashboard', espera: 'Vigência',
    recorte: { ancora: 'contratos vencendo nos próximos 30 dias', acima: 215, abaixo: 135 },
    argumento: 'Slide 4 — "contrato venceu e ninguém me avisou". A faixa de alerta nomeia os contratos e os dias que faltam.',
    dor: 1 },

  // "Vencendo em 31" só existe no painel de vigência lá embaixo — o texto "Vencendo em
  // 30 dias" também aparece no cartão do topo e faria o scroll parar antes da hora.
  { nome: '04-contratos-vigencia', rota: '/contratos/dashboard', rolarAte: 'Vencendo em 31',
    argumento: 'Slide 4 (apoio) — a carteira inteira separada em expirados, vencendo e vigentes.',
    dor: 1 },

  { nome: '05-did-certidoes', rota: null, resolver: 'did', rolarAte: 'Certidões',
    // Fecha no bloco de certidões e no despacho do Controle Interno logo abaixo,
    // que devolve o processo justamente por causa do FGTS vencido.
    recorte: { ancora: 'Certidões', acima: 30, abaixo: 500 },
    argumento: 'Slide 5 — "paguei com certidão vencida e o Tribunal glosou". Conferência de certidões dentro do fluxo da despesa.',
    dor: 2 },

  { nome: '06-processos-parados', rota: '/processos', espera: 'Processos',
    argumento: 'Slide 6 (apoio) — a fila real de processos, com prioridade e setor atual.',
    dor: 3 },

  { nome: '07-processo-historico', rota: null, resolver: 'processo', rolarAte: 'Linha do Tempo',
    // Fecha na coluna da linha do tempo; a coluna da direita está vazia aqui.
    recorte: { ancora: 'Linha do Tempo', acima: 30, abaixo: 660, x: 470, largura: 830 },
    argumento: 'Slide 7 — "só a Dona Fulana sabe onde está o processo". Histórico com nome, data e hora de cada passo.',
    dor: 4 },

  // A aba padrão é o cadastro de contas. O argumento do slide é o SALDO — por isso
  // abrimos direto em Relatórios, onde ficam saldo por conta, fluxo e extrato.
  { nome: '08-tesouraria-saldo', rota: '/tesouraria/relatorios', espera: 'Saldo por Conta',
    recorte: { ancora: 'Saldo por Conta Bancária', acima: 30, abaixo: 560 },
    argumento: 'Slide 8 — "não sei quanto tenho em caixa hoje". Saldo por conta e extrato conciliado.',
    dor: 5 },

  { nome: '09-relatorios', rota: '/relatorios', espera: 'Relatórios',
    argumento: 'Slide 9 (Antes × Depois) — o relatório que hoje leva dias sai em um clique, em PDF e planilha.',
    dor: null },

  { nome: '10-almoxarifado-critico', rota: '/almoxarifado/itens', espera: 'Almoxarifado',
    argumento: 'Anexo — estoque abaixo do mínimo e cotas por setor.',
    dor: null },

  { nome: '11-consulta-publica', rota: '/consulta', espera: 'Consulta', publica: true,
    argumento: 'Anexo / Slide 10 — transparência: o cidadão consulta sem login e sem expor dado pessoal.',
    dor: null },

  { nome: '12-registros-auditoria', rota: '/registros', espera: 'Registros',
    recorte: { ancora: 'DATA/HORA', acima: 130, abaixo: 470 },
    argumento: 'Slide 10 — riscos que deixam de existir. Quem fez, o quê, quando e de qual computador.',
    dor: null },

  { nome: '13-permissoes', rota: '/organizacao/usuarios', espera: 'Usuários',
    argumento: 'Anexo — segregação de funções: permissão por módulo e por ação.',
    dor: null },
];

// ── Utilidades ────────────────────────────────────────────────────────────────
const log = (...a) => console.log(...a);

async function apiJson(caminho, token) {
  const r = await fetch(`${API}${caminho}`, {
    headers: {
      'X-Tenant-Subdomain': TENANT,
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  if (!r.ok) throw new Error(`${caminho} respondeu ${r.status}`);
  return r.json();
}

/** Descobre, na massa de demonstração, o processo mais "tenso" para servir de exemplo. */
async function resolverAlvos() {
  const login = await fetch(`${API}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Tenant-Subdomain': TENANT },
    body: JSON.stringify({ cpf: CPF, senha: SENHA, subdomain: TENANT }),
  });
  if (!login.ok) throw new Error(`Login na API falhou (${login.status}). Confira CPF/senha e se o backend está no ar.`);
  const { token } = await login.json();

  const { processos = [] } = await apiJson('/api/processos?limit=200', token);

  // Para o histórico: o processo com mais idas e vindas conta a melhor história.
  const urgente = processos.find(p => p.prioridade === 'urgente' && !['concluido', 'arquivado'].includes(p.status));
  const alvoProcesso = urgente || processos.find(p => p.status === 'devolvido') || processos[0];

  // Para o DID, o assunto vai aparecer projetado — então descartamos registros de
  // teste (siglas sem sentido, texto curto, tudo em caixa alta) e damos preferência
  // ao que tem mais peso na história: urgente > alta > resto. Também evitamos repetir
  // o processo do slide de histórico, para os dois prints não parecerem a mesma tela.
  const assuntoApresentavel = (s = '') =>
    s.trim().length >= 20 && s.includes(' ') && /[a-záéíóúãõçâêô]/.test(s);
  const peso = { urgente: 0, alta: 1, normal: 2, baixa: 3 };

  const alvoDid = processos
    .filter(p => p.tipo_processo === 'Did'
              && p.id !== alvoProcesso?.id
              && assuntoApresentavel(p.assunto))
    .sort((a, b) => (peso[a.prioridade] ?? 9) - (peso[b.prioridade] ?? 9))[0]
    || processos.find(p => p.tipo_processo === 'Did' && p.id !== alvoProcesso?.id);

  return {
    processo: alvoProcesso ? { id: alvoProcesso.id, numero: alvoProcesso.numero, assunto: alvoProcesso.assunto } : null,
    did:      alvoDid      ? { id: alvoDid.id,      numero: alvoDid.numero,      assunto: alvoDid.assunto }      : null,
  };
}

/**
 * Converte um recorte ancorado em texto num retângulo de captura.
 * Ancorar num texto (e não em coordenadas fixas) faz o corte acompanhar o layout:
 * se a tela mudar de altura, o recorte continua enquadrando o mesmo conteúdo.
 */
async function calcularRecorte(page, r) {
  const caixa = await page.getByText(r.ancora, { exact: false }).first().boundingBox();
  if (!caixa) throw new Error(`recorte: âncora "${r.ancora}" não encontrada`);

  const topo = Math.max(0, caixa.y - (r.acima || 0));
  const baixo = Math.min(VIEWPORT.height, caixa.y + caixa.height + (r.abaixo || 0));

  return {
    x: r.x ?? CONTEUDO.x,
    y: topo,
    width: Math.min(r.largura ?? CONTEUDO.largura, VIEWPORT.width - (r.x ?? CONTEUDO.x)),
    height: Math.max(120, baixo - topo),
  };
}

async function acalmar(page) {
  // Espera a rede sossegar e dá um respiro para gráficos (recharts) desenharem.
  await page.waitForLoadState('networkidle').catch(() => {});
  await page.waitForTimeout(1200);
  // Volta ao topo: print de página rolada parece descuido.
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(200);
}

// ── Execução ──────────────────────────────────────────────────────────────────
(async () => {
  fs.mkdirSync(DIR_TELAS, { recursive: true });
  fs.mkdirSync(DIR_ARQUIVOS, { recursive: true });

  log(`Alvo:    ${BASE}/${TENANT}`);
  log(`API:     ${API}`);
  log(`Destino: ${DIR_TELAS}\n`);

  log('Resolvendo processos de exemplo na massa de demonstração...');
  const alvos = await resolverAlvos();
  if (alvos.processo) log(`  histórico → ${alvos.processo.numero} (${alvos.processo.assunto})`);
  if (alvos.did)      log(`  DID       → ${alvos.did.numero} (${alvos.did.assunto})`);

  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: VIEWPORT,
    deviceScaleFactor: ESCALA,
    locale: 'pt-BR',
    timezoneId: 'America/Fortaleza',
    colorScheme: 'light',
    acceptDownloads: true,
    reducedMotion: 'reduce',
  });

  // Tema claro antes de qualquer render — o app lê 'theme' do armazenamento local.
  await context.addInitScript(() => {
    try { localStorage.setItem('theme', 'light'); } catch {}
  });

  const page = await context.newPage();
  const capturados = [];
  const falhas = [];

  try {
    // ── Login ────────────────────────────────────────────────────────────────
    log('\nEntrando no sistema...');
    await page.goto(`${BASE}/${TENANT}/login`, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('input[autocomplete="username"]', { timeout: 30000 });
    await page.fill('input[autocomplete="username"]', CPF);
    await page.fill('input[autocomplete="current-password"]', SENHA);
    await page.click('button[type="submit"]');
    await page.waitForURL(u => !u.pathname.endsWith('/login'), { timeout: 30000 });
    log('  autenticado.');

    // ── Percorre o roteiro ───────────────────────────────────────────────────
    for (const passo of ROTEIRO) {
      let rota = passo.rota;
      if (passo.resolver === 'processo') {
        if (!alvos.processo) { falhas.push([passo.nome, 'nenhum processo encontrado na massa']); continue; }
        rota = `/processos/${alvos.processo.id}`;
      }
      if (passo.resolver === 'did') {
        if (!alvos.did) { falhas.push([passo.nome, 'nenhum processo do tipo DID na massa']); continue; }
        rota = `/processos/${alvos.did.id}/did`;
      }

      const url = `${BASE}/${TENANT}${rota === '/' ? '' : rota}`;
      process.stdout.write(`  ${passo.nome} ... `);

      try {
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 });
        await page.addStyleTag({ content: CSS_PALCO });
        await acalmar(page);
        // Reaplica: telas que trocam de aba remontam o DOM.
        await page.addStyleTag({ content: CSS_PALCO });

        // Algumas provas ficam abaixo da dobra (certidões do DID, histórico de
        // tramitação, faixa de vigência). Sem isso, o print mostra o cabeçalho
        // da tela em vez do argumento.
        if (passo.rolarAte) {
          const alvo = page.getByText(passo.rolarAte, { exact: false }).first();
          // A aplicação rola num contêiner interno, não na janela — window.scrollBy
          // simplesmente não faz nada aqui. Por isso mexemos no scrollTop do ancestral
          // rolável do próprio elemento.
          const posicionar = (el, topoDesejado) => {
            const rolavel = (n) => {
              for (let p = n.parentElement; p; p = p.parentElement) {
                const s = getComputedStyle(p);
                if (/(auto|scroll)/.test(s.overflowY) && p.scrollHeight > p.clientHeight) return p;
              }
              return document.scrollingElement || document.documentElement;
            };
            const cont = rolavel(el);
            const dy = el.getBoundingClientRect().top - topoDesejado;
            if (cont === (document.scrollingElement || document.documentElement)) window.scrollBy(0, dy);
            else cont.scrollTop += dy;
          };
          // Duas passadas: telas que carregam o histórico depois do primeiro render
          // crescem e empurram a âncora, então uma medição só não basta.
          for (let i = 0; i < 2; i++) {
            await alvo.evaluate(posicionar, 140);
            await page.waitForTimeout(450);
          }
        }

        const destino = path.join(DIR_TELAS, `${passo.nome}.png`);
        const clip = passo.recorte ? await calcularRecorte(page, passo.recorte) : undefined;
        await page.screenshot({ path: destino, fullPage: false, ...(clip ? { clip } : {}) });

        const kb = Math.round(fs.statSync(destino).size / 1024);
        capturados.push({ ...passo, arquivo: `${passo.nome}.png`, kb });
        log(`ok (${kb} KB)`);
      } catch (e) {
        falhas.push([passo.nome, e.message.split('\n')[0]]);
        log(`FALHOU — ${e.message.split('\n')[0]}`);
      }
    }

    // ── Baixa os arquivos que o próprio sistema gera ─────────────────────────
    // O navegador sem interface não rasteriza PDF; então guardamos o arquivo real,
    // que é o que vale para abrir na frente do prefeito.
    log('\nGerando os arquivos oficiais (PDF e planilha)...');
    try {
      await page.goto(`${BASE}/${TENANT}/relatorios`, { waitUntil: 'domcontentloaded' });
      await acalmar(page);
      for (const [rotulo, texto] of [['relatorio-processos.pdf', 'Exportar PDF'],
                                     ['relatorio-processos.xlsx', 'Exportar Excel']]) {
        try {
          const [download] = await Promise.all([
            page.waitForEvent('download', { timeout: 30000 }),
            page.getByText(texto, { exact: false }).first().click(),
          ]);
          await download.saveAs(path.join(DIR_ARQUIVOS, rotulo));
          log(`  ${rotulo} ok`);
        } catch (e) {
          falhas.push([rotulo, e.message.split('\n')[0]]);
          log(`  ${rotulo} FALHOU — ${e.message.split('\n')[0]}`);
        }
      }
    } catch (e) {
      falhas.push(['arquivos oficiais', e.message.split('\n')[0]]);
    }

    // ── Índice ───────────────────────────────────────────────────────────────
    escreverIndice(capturados, falhas, alvos);
    log(`\nÍndice escrito em apresentacao/telas/INDICE.md`);
    log(`Capturas: ${capturados.length}/${ROTEIRO.length}`);
    if (falhas.length) {
      log(`\nPendências (${falhas.length}):`);
      falhas.forEach(([n, m]) => log(`  - ${n}: ${m}`));
      process.exitCode = 1;
    }
  } finally {
    await browser.close();
  }
})().catch(err => {
  console.error('\nERRO:', err.message);
  process.exit(1);
});

// ── Índice que liga print → argumento ─────────────────────────────────────────
function escreverIndice(capturados, falhas, alvos) {
  const hoje = new Date().toLocaleDateString('pt-BR');
  const linhas = [
    '# ÍNDICE DAS TELAS',
    '',
    `> Geradas em ${hoje} a partir da massa de demonstração do município fictício`,
    '> **Prefeitura Municipal de Modelo (CE)**. Nenhum dado é real: pessoas, empresas,',
    '> CPF, CNPJ e valores são inventados para a apresentação.',
    '',
    `> Resolução: ${VIEWPORT.width}×${VIEWPORT.height} de layout, exportadas em ${ESCALA}× para projeção.`,
    '',
    '| # | Arquivo | Serve a qual argumento | Dor |',
    '|---|---|---|---|',
  ];
  for (const c of capturados) {
    linhas.push(`| ${c.nome.slice(0, 2)} | \`${c.arquivo}\` | ${c.argumento} | ${c.dor ? `Dor ${c.dor}` : '—'} |`);
  }
  linhas.push('', '## Arquivos gerados pelo próprio sistema', '',
    'Ficam em `telas/arquivos/`. Não são imagens: são o PDF e a planilha que o jProcesso',
    'produz de verdade. Abra-os na frente do prefeito — vale mais que um print.', '');

  if (alvos.processo || alvos.did) {
    linhas.push('## Registros usados como exemplo', '');
    if (alvos.processo) linhas.push(`- **Histórico de tramitação:** ${alvos.processo.numero} — ${alvos.processo.assunto}`);
    if (alvos.did)      linhas.push(`- **DID / certidões:** ${alvos.did.numero} — ${alvos.did.assunto}`);
    linhas.push('');
  }

  if (falhas.length) {
    linhas.push('## Não capturado nesta rodada', '',
      'Estas telas falharam e **não devem ser citadas no deck** enquanto não forem geradas:', '');
    falhas.forEach(([n, m]) => linhas.push(`- \`${n}\` — ${m}`));
    linhas.push('');
  }

  linhas.push('## Como recapturar', '',
    '```bash',
    'npm run demo:tensao        # reacende os alertas com base na data de hoje',
    'npm run dev                # backend  (porta 5001)',
    'npm run client             # frontend (porta 3000)',
    'npm run apresentacao:telas # captura tudo de novo',
    '```', '');

  fs.writeFileSync(path.join(DIR_TELAS, 'INDICE.md'), linhas.join('\n'), 'utf8');
}
