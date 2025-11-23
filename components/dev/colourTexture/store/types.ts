import type { Vector3Tuple } from 'three'

export type CosinePaletteParams = {
  a: Vector3Tuple
  b: Vector3Tuple
  c: Vector3Tuple
  d: Vector3Tuple
}

export type PaletteParamKey = keyof CosinePaletteParams

export type TextureConfigState = {
  grainScale: number
  grainAmplitude: number
  grainMix: number
  fbmScale: number
  fbmOctaves: number
  fbmLacunarity: number
  fbmGain: number
  fbmMix: number
  vignetteStrength: number
  vignetteRadius: number
  vignetteSmoothness: number
  worleyScale: number
  worleyJitter: number
  worleyManhattan: boolean
  worleyPattern: number
  worleyMix: number
  blackMix: number
  showGradientOverlay: boolean
  originX: number
  originY: number
}

export type ColourSlice = {
  hex: string
  params: CosinePaletteParams
  setHex: (value: string) => void
  seedFromHex: () => void
  setPaletteParam: (key: PaletteParamKey, axisIndex: number, value: number) => void
}

export type TextureSlice = {
  config: TextureConfigState
  updateConfig: <K extends keyof TextureConfigState>(
    key: K,
    value: TextureConfigState[K],
  ) => void
  setConfig: (config: TextureConfigState) => void
}

export type ColourTextureStore = ColourSlice & TextureSlice
