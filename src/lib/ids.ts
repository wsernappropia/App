// Ids cortos y únicos. Usa crypto.randomUUID cuando existe; si no, fallback local.

let counter = 0

function randomChunk(): string {
  const g = globalThis as { crypto?: Crypto }
  const c = g.crypto
  if (c && typeof c.getRandomValues === 'function') {
    const buf = new Uint32Array(2)
    c.getRandomValues(buf)
    return buf[0].toString(36) + buf[1].toString(36)
  }
  return Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2)
}

/** Id corto (12 chars aprox). Prefijo opcional: newId('w') -> 'w_1a2b3c'. */
export function newId(prefix?: string): string {
  const g = globalThis as { crypto?: Crypto }
  const c = g.crypto
  let base: string
  if (c && typeof c.randomUUID === 'function') {
    base = c.randomUUID().replace(/-/g, '').slice(0, 12)
  } else {
    counter = (counter + 1) % 1_000_000
    base = (Date.now().toString(36) + randomChunk() + counter.toString(36)).slice(0, 12)
  }
  return prefix ? `${prefix}_${base}` : base
}

export const uid = newId
