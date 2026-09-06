// Genera icon-192.png, icon-512.png y apple-touch-icon.png sin dependencias externas.
// Dibuja el mismo motivo que icon.svg (anillo + rayo) rasterizado a mano.
import { deflateSync } from 'node:zlib'
import { writeFileSync } from 'node:fs'

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

const NAVY = [15, 43, 70], RING = [30, 58, 95], TEAL = [20, 184, 166], YELLOW = [250, 204, 21]

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

function render(size, padding = 0) {
  const s = size / 512
  const rows = []
  for (let py = 0; py < size; py++) {
    const row = [0]
    for (let px = 0; px < size; px++) {
      const x = px / s, y = py / s
      // esquinas redondeadas (radio 112) salvo en modo maskable (padding>0 => fondo completo)
      const r = 112, cx = Math.min(Math.max(x, r), 512 - r), cy = Math.min(Math.max(y, r), 512 - r)
      const outside = padding === 0 && Math.hypot(x - cx, y - cy) > r
      let col = NAVY
      const d = Math.hypot(x - 256, y - 256)
      if (d > 130 && d < 170) {
        const ang = Math.atan2(y - 256, x - 256) // -PI..PI, 0 a la derecha
        // arco teal: desde arriba (-90°) en sentido horario hasta ~ -150° (casi vuelta completa)
        let a = (ang + Math.PI / 2 + 2 * Math.PI) % (2 * Math.PI)
        col = a < (2 * Math.PI * 0.83) ? TEAL : RING
      }
      if (inPoly(x, y, bolt)) col = YELLOW
      if (outside) row.push(0, 0, 0, 0)
      else row.push(...col, 255)
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

writeFileSync('public/icon-192.png', render(192))
writeFileSync('public/icon-512.png', render(512))
writeFileSync('public/apple-touch-icon.png', render(180, 1))
console.log('iconos generados')
