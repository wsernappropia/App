// Rasterizador propio (sin dependencias) del motivo de Momentum: anillo + rayo.
//
// Genera dos cosas:
//   1. Los iconos de la PWA en public/ (icon-192, icon-512, apple-touch-icon).
//   2. Las imágenes fuente en assets/ que consume `@capacitor/assets` para producir
//      los mipmaps adaptativos y el splash de Android (ver README).
//
// Se ejecuta con `npm run icons`.
import { deflateSync } from 'node:zlib'
import { writeFileSync, mkdirSync } from 'node:fs'

const crcTable = new Uint32Array(256).map((_, n) => {
  let c = n
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
  return c >>> 0
})
const crc32 = (buf) => {
  let c = 0xffffffff
  for (const b of buf) c = crcTable[(c ^ b) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}
const chunk = (type, data) => {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length)
  const td = Buffer.concat([Buffer.from(type), data])
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td))
  return Buffer.concat([len, td, crc])
}

export const NAVY = [15, 43, 70]        // #0f2b46 — fondo del icono / status bar
export const NAVY_DEEP = [11, 26, 43]   // #0b1a2b — fondo del splash
const RING = [30, 58, 95], TEAL = [20, 184, 166], YELLOW = [250, 204, 21]

// Rayo como polígono (coordenadas en base 512)
const bolt = [[292, 150], [214, 274], [270, 274], [216, 366], [302, 234], [246, 234]]
const inPoly = (x, y, poly) => {
  let inside = false
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i], [xj, yj] = poly[j]
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside
  }
  return inside
}

// Color del motivo en coordenadas base 512, o null donde no hay motivo (fondo).
// El motivo ocupa el 66 % central del lienzo (anillo de diámetro 340/512), que es
// justo la "safe zone" de un icono adaptativo de Android (66dp de 108dp).
function motifAt(x, y) {
  if (inPoly(x, y, bolt)) return YELLOW
  const d = Math.hypot(x - 256, y - 256)
  if (d > 130 && d < 170) {
    const ang = Math.atan2(y - 256, x - 256) // -PI..PI, 0 a la derecha
    // arco teal: desde arriba (-90°) en sentido horario hasta ~ -150° (casi vuelta completa)
    const a = (ang + Math.PI / 2 + 2 * Math.PI) % (2 * Math.PI)
    return a < 2 * Math.PI * 0.83 ? TEAL : RING
  }
  return null
}

/**
 * Rasteriza el motivo a un PNG RGBA.
 * @param {number} size  lado en píxeles
 * @param {object} opts
 * @param {number[]|null} opts.background  color de fondo, o null para fondo transparente
 * @param {boolean} opts.rounded  esquinas redondeadas (radio 112 en base 512)
 * @param {number} opts.scale  fracción del lienzo que ocupa el lienzo de diseño (1 = todo)
 * @param {boolean} opts.motif  dibujar el anillo + rayo (false = solo fondo liso)
 */
export function render(size, { background = NAVY, rounded = false, scale = 1, motif = true } = {}) {
  const off = (size * (1 - scale)) / 2
  const s = (size * scale) / 512 // píxeles por unidad de diseño
  const r = (112 * size) / 512
  const rows = []
  for (let py = 0; py < size; py++) {
    const row = [0]
    for (let px = 0; px < size; px++) {
      let col = background
      if (rounded && col) {
        const cx = Math.min(Math.max(px, r), size - r), cy = Math.min(Math.max(py, r), size - r)
        if (Math.hypot(px - cx, py - cy) > r) col = null
      }
      if (motif) {
        const x = (px - off) / s, y = (py - off) / s
        if (x >= 0 && x < 512 && y >= 0 && y < 512) {
          const m = motifAt(x, y)
          if (m) col = m
        }
      }
      if (col) row.push(...col, 255)
      else row.push(0, 0, 0, 0)
    }
    rows.push(Buffer.from(row))
  }
  const raw = Buffer.concat(rows)
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4)
  ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

// --- Iconos de la PWA ---------------------------------------------------------
writeFileSync('public/icon-192.png', render(192, { rounded: true }))
writeFileSync('public/icon-512.png', render(512, { rounded: true }))
writeFileSync('public/apple-touch-icon.png', render(180))

// --- Fuentes para `@capacitor/assets` (Android) -------------------------------
// Los nombres son los que espera `@capacitor/assets`: icon-foreground / icon-background
// alimentan el icono adaptativo (mipmap-*), icon-only.png el icono legacy y splash.png
// la pantalla de arranque.
mkdirSync('assets', { recursive: true })
writeFileSync('assets/icon-only.png', render(1024, { rounded: true }))
writeFileSync('assets/icon-foreground.png', render(1024, { background: null }))
writeFileSync('assets/icon-background.png', render(1024, { background: NAVY, motif: false }))
const splash = render(2732, { background: NAVY_DEEP, scale: 0.28 })
writeFileSync('assets/splash.png', splash)
writeFileSync('assets/splash-dark.png', splash)

console.log('iconos generados (public/ + assets/)')
