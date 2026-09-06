import { describe, expect, it } from 'vitest'
import { XP, levelInfo, levelName, walkXp, xpForLevel, xpThreshold } from './gamification'

describe('niveles', () => {
  it('xpForLevel = round(100 * n^1.5)', () => {
    expect(xpForLevel(1)).toBe(100)
    expect(xpForLevel(2)).toBe(283)
    expect(xpForLevel(3)).toBe(520)
    expect(xpForLevel(4)).toBe(800)
    expect(xpThreshold(1)).toBe(0)
    expect(xpThreshold(5)).toBe(800)
  })

  it('levelInfo en el nivel 1', () => {
    expect(levelInfo(0)).toEqual({
      level: 1,
      name: 'Semilla',
      xpInLevel: 0,
      xpForNext: 100,
      progress: 0,
    })
    const l = levelInfo(50)
    expect(l.level).toBe(1)
    expect(l.xpInLevel).toBe(50)
    expect(l.progress).toBeCloseTo(0.5)
  })

  it('levelInfo sube en el umbral exacto', () => {
    expect(levelInfo(99).level).toBe(1)
    const l2 = levelInfo(100)
    expect(l2.level).toBe(2)
    expect(l2.name).toBe('Brote')
    expect(l2.xpInLevel).toBe(0)
    expect(l2.xpForNext).toBe(183) // 283 - 100
    expect(levelInfo(800).level).toBe(5)
    expect(levelInfo(800).name).toBe('Sólido')
  })

  it('nombres de nivel, 9+ es Leyenda', () => {
    expect(levelName(3)).toBe('Caminante')
    expect(levelName(9)).toBe('Leyenda')
    expect(levelName(25)).toBe('Leyenda')
  })

  it('XP de caminata', () => {
    expect(walkXp(10)).toBe(20)
    expect(XP.walkBonus).toBe(10)
    expect(XP.strength).toBe(40)
  })
})
