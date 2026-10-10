// Link público de acompanhamento do processo e QR code desse link.
// O QR é gerado na hora a partir do link (vale para processos novos e antigos) —
// o campo `qrcode` salvo na abertura codificava só "número-código" e não abria nada.
import QRCodeImpl from 'qr.js/lib/QRCode'
import ErrorCorrectLevel from 'qr.js/lib/ErrorCorrectLevel'

/** Link completo da consulta pública do processo (abre o processo direto, sem login). */
export const urlConsultaProcesso = (subdomain, numero) =>
  `${window.location.origin}/${subdomain}/consulta/${encodeURIComponent(numero)}`

/** Matriz de módulos do QR (true = escuro). Nível M: ~15% de tolerância a danos. */
const matrizQr = (texto) => {
  const qr = new QRCodeImpl(-1, ErrorCorrectLevel.M)
  qr.addData(texto)
  qr.make()
  return qr.modules
}

/** PNG (data URL) do QR code de um texto — para documentos PDF (jsPDF.addImage). */
export function qrPngDataUrl(texto, { tamanho = 360, margem = 4 } = {}) {
  const m = matrizQr(texto)
  const n = m.length
  const total = n + margem * 2
  const escala = Math.max(1, Math.floor(tamanho / total))
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = total * escala
  const ctx = canvas.getContext('2d')
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  ctx.fillStyle = '#000000'
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      if (m[y][x]) ctx.fillRect((x + margem) * escala, (y + margem) * escala, escala, escala)
    }
  }
  return canvas.toDataURL('image/png')
}
