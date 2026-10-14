/**
 * montar.js — junta as cenas gravadas (gravar.js) com a narração (gerar_audio.py)
 * num MP4 1920×1080: cada cena sincronizada com o áudio dela, transições suaves e
 * a cena do celular dentro de uma moldura de aparelho.
 *
 * Uso: node apresentacao/video/montar.js <pasta-trabalho> <ffmpeg> <saida.mp4>
 */
'use strict';
const path = require('path');
const fs = require('fs');
const { execFileSync } = require('child_process');
const ROOT = path.resolve(__dirname, '../..');
const { chromium } = require(path.join(ROOT, 'node_modules/playwright'));

const [TRABALHO, FF, SAIDA] = process.argv.slice(2).map((p) => path.resolve(p));
const ROTEIRO = JSON.parse(fs.readFileSync(path.join(__dirname, 'roteiro.json'), 'utf8'));
const DUR = JSON.parse(fs.readFileSync(path.join(TRABALHO, 'audio/duracoes.json'), 'utf8'));
const CENAS = JSON.parse(fs.readFileSync(path.join(TRABALHO, 'cenas/cenas.json'), 'utf8'));
const DIR = path.join(TRABALHO, 'montagem');
fs.mkdirSync(DIR, { recursive: true });

const ff = (args) => execFileSync(FF, ['-y', '-loglevel', 'error', ...args], { stdio: 'inherit' });
const FADE = 0.35;
const ATRASO_VOZ = 0.45; // a narração entra logo depois da transição

// Fundo da cena do celular (marca + texto ao lado do aparelho)
async function fundoCelular(arquivo, legenda) {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1920, height: 1080 } });
  await p.setContent(`<!doctype html><html><body style="margin:0;width:1920px;height:1080px;font-family:'Segoe UI',Arial,sans-serif;
    background:radial-gradient(circle at 15% 25%,#2F5BEA 0%,#1B2F5A 45%,#0B1528 100%);color:#F5F6FA;position:relative;overflow:hidden">
    <div style="position:absolute;left:150px;top:330px;width:900px">
      <div style="font-size:30px;letter-spacing:5px;text-transform:uppercase;color:#9DB8FF;font-weight:600">${legenda}</div>
      <div style="font-size:84px;font-weight:800;line-height:1.05;margin-top:22px">Os números do município no seu celular</div>
      <div style="font-size:36px;color:#C9D4EA;margin-top:26px">Painel, processos e pagamentos em tempo real.</div>
    </div>
    <div style="position:absolute;left:1236px;top:24px;width:518px;height:1032px;border-radius:64px;background:#0A1426;box-shadow:0 40px 120px rgba(0,0,0,.55)"></div>
  </body></html>`);
  await p.screenshot({ path: arquivo });
  await b.close();
}

(async () => {
  const partes = [];
  for (const cena of ROTEIRO) {
    const c = CENAS[cena.id];
    if (!c) { console.log(`(sem gravação: ${cena.id})`); continue; }
    const voz = path.join(TRABALHO, 'audio', `${cena.id}.mp3`);
    const D = Math.max(c.duracao, (DUR[cena.id] || 0) + ATRASO_VOZ + 0.9);
    const saida = path.join(DIR, `${cena.id}.mp4`);
    const fades = `fade=t=in:st=0:d=${FADE},fade=t=out:st=${(D - FADE).toFixed(2)}:d=${FADE}`;
    const audio = `[1:a]adelay=${Math.round(ATRASO_VOZ * 1000)}|${Math.round(ATRASO_VOZ * 1000)},apad,atrim=0:${D.toFixed(2)},afade=t=out:st=${(D - 0.3).toFixed(2)}:d=0.3[a]`;
    let filtro;
    const entradas = ['-ss', c.corte.toFixed(2), '-t', D.toFixed(2), '-i', c.arquivo, '-i', voz];
    if (c.celular) {
      const fundo = path.join(DIR, 'fundo-celular.png');
      await fundoCelular(fundo, cena.legenda);
      entradas.push('-loop', '1', '-t', D.toFixed(2), '-i', fundo);
      // aparelho: 478×1004 dentro da moldura desenhada no fundo
      filtro = `[0:v]fps=30,scale=478:1004,setsar=1[cel];[2:v]fps=30,scale=1920:1080,setsar=1[bg];[bg][cel]overlay=1256:38,${fades},format=yuv420p[v];${audio}`;
    } else {
      filtro = `[0:v]fps=30,scale=1920:1080:flags=lanczos,setsar=1,${fades},format=yuv420p[v];${audio}`;
    }
    ff([...entradas, '-filter_complex', filtro, '-map', '[v]', '-map', '[a]', '-t', D.toFixed(2),
      '-c:v', 'libx264', '-preset', 'medium', '-crf', '19', '-r', '30', '-c:a', 'aac', '-b:a', '192k', '-ar', '48000', '-ac', '2', saida]);
    partes.push(saida);
    console.log(`${cena.id}: ${D.toFixed(1)}s`);
  }
  const lista = path.join(DIR, 'lista.txt');
  fs.writeFileSync(lista, partes.map((p) => `file '${p.replace(/\\/g, '/')}'`).join('\n'));
  ff(['-f', 'concat', '-safe', '0', '-i', lista, '-c', 'copy', '-movflags', '+faststart', SAIDA]);
  console.log('Vídeo:', SAIDA);
})().catch((e) => { console.error('ERRO', e.message); process.exit(1); });
