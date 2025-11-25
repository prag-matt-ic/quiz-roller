import { colorsFromRange, css, rgb } from '@thi.ng/color'

import {
  PARTICLE_RANGE_KEYS,
  type ParticlePaletteConfig,
  type ParticlePaletteRangeKey,
  type ParticlePaletteResult,
} from './types'

export const HEX_COLOR_PATTERN = /^#?([\da-f]{3}|[\da-f]{4}|[\da-f]{6}|[\da-f]{8})$/i

export const DEFAULT_PARTICLE_PALETTE_CONFIG: ParticlePaletteConfig = {
  bright: { enabled: true, count: 7, variance: 0.02 },
  cool: { enabled: true, count: 2, variance: 0.03 },
  neutral: { enabled: true, count: 1, variance: 0.03 },
}

const createEmptyGroups = () =>
  PARTICLE_RANGE_KEYS.reduce(
    (groups, key) => {
      groups[key] = []
      return groups
    },
    {} as ParticlePaletteResult['groups'],
  )

export const normalizeHexColor = (input: string): string => {
  const trimmed = input.trim()
  if (!HEX_COLOR_PATTERN.test(trimmed)) {
    throw new Error(`Invalid hex color: ${input}`)
  }
  const hex = trimmed.startsWith('#') ? trimmed.slice(1) : trimmed
  return `#${hex.toLowerCase()}`
}

const toSafeInteger = (value: number) => {
  if (!Number.isFinite(value)) return 0
  return Math.max(0, Math.round(value))
}

const clampVariance = (value: number) => {
  if (!Number.isFinite(value)) return 0
  return Math.min(Math.max(value, 0), 0.5)
}

const generateColoursForRange = (
  base: ReturnType<typeof rgb>,
  key: ParticlePaletteRangeKey,
  count: number,
  variance: number,
) =>
  Array.from(
    colorsFromRange(key, {
      base,
      num: count,
      variance,
    }),
  ).map((value) => css(value))

export const generateParticlePalette = (
  inputColors: string[],
  config: ParticlePaletteConfig = DEFAULT_PARTICLE_PALETTE_CONFIG,
): ParticlePaletteResult => {
  const normalizedInputs = inputColors
    .map((color) => {
      try {
        return normalizeHexColor(color)
      } catch {
        return null
      }
    })
    .filter((color): color is string => Boolean(color))

  if (normalizedInputs.length === 0) {
    return {
      sources: [],
      groups: createEmptyGroups(),
      combined: [],
    }
  }

  const groups = createEmptyGroups()
  const combined = new Set<string>(normalizedInputs)

  normalizedInputs.forEach((color) => {
    const base = rgb(color)
    PARTICLE_RANGE_KEYS.forEach((key) => {
      const rangeConfig = config[key]
      if (!rangeConfig?.enabled) return
      const count = toSafeInteger(rangeConfig.count)
      if (count === 0) return
      const variance = clampVariance(rangeConfig.variance)
      const generated = generateColoursForRange(base, key, count, variance).map((hex) =>
        normalizeHexColor(hex),
      )
      generated.forEach((hex) => {
        groups[key].push(hex)
        combined.add(hex)
      })
    })
  })

  return {
    sources: normalizedInputs,
    groups,
    combined: Array.from(combined),
  }
}

const sanitizeConstantName = (name: string): string => {
  const cleaned = name.replace(/[^A-Za-z0-9_]/g, '_')
  const noLeadingDigits = cleaned.replace(/^[^A-Za-z_]+/, '')
  return noLeadingDigits || 'particlePalette'
}

export const formatPaletteAsConstant = (name: string, palette: string[]): string => {
  const constantName = sanitizeConstantName(name)
  const body = palette.map((color) => `  '${color}',`).join('\n')
  return `export const ${constantName} = [\n${body}\n] as const`
}

export const generateParticlePaletteList = (
  inputColors: string[],
  config: ParticlePaletteConfig = DEFAULT_PARTICLE_PALETTE_CONFIG,
): string[] => generateParticlePalette(inputColors, config).combined
