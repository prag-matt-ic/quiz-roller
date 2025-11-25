export const PARTICLE_RANGE_KEYS = ['bright', 'cool', 'neutral'] as const

export type ParticlePaletteRangeKey = (typeof PARTICLE_RANGE_KEYS)[number]

export type ParticlePaletteRangeConfig = {
  enabled: boolean
  count: number
  variance: number
}

export type ParticlePaletteConfig = Record<ParticlePaletteRangeKey, ParticlePaletteRangeConfig>

export type ParticlePaletteGroups = Record<ParticlePaletteRangeKey, string[]>

export type ParticlePaletteResult = {
  sources: string[]
  groups: ParticlePaletteGroups
  combined: string[]
}
