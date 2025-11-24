import type { Vector3Tuple } from 'three'

export type CosinePaletteParams = {
  a: Vector3Tuple
  b: Vector3Tuple
  c: Vector3Tuple
  d: Vector3Tuple
}

export type PaletteParamKey = keyof CosinePaletteParams

export type ResolutionPreset = {
  id: string
  label: string
  width: number
  height: number
}

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
  gradientRange: number
  originX: number
  originY: number
}

export type UserColour = {
  id: string
  timestamp: number
  name: string
  hex: string
  params: CosinePaletteParams
  config: TextureConfigState
}

export type ColourSlice = {
  name: string
  hex: string
  params: CosinePaletteParams
  userColours: UserColour[]
  setName: (name: string) => void
  setHex: (value: string) => void
  seedFromHex: () => void
  setPaletteParam: (key: PaletteParamKey, axisIndex: number, value: number) => void
  saveUserColour: () => void
  loadUserColour: (id: string) => void
  deleteUserColour: (id: string) => void
}

export type TextureSlice = {
  config: TextureConfigState
  updateConfig: <K extends keyof TextureConfigState>(
    key: K,
    value: TextureConfigState[K],
  ) => void
  setConfig: (config: TextureConfigState) => void
}

export type DisplayConfigState = {
  resolutionPresetId: string
  customResolutionInput: string
  aspectWidthInput: string
  aspectHeightInput: string
}

export type DisplaySlice = {
  display: DisplayConfigState
  updateDisplay: <K extends keyof DisplayConfigState>(
    key: K,
    value: DisplayConfigState[K],
  ) => void
  setDisplay: (display: DisplayConfigState) => void
}

export type TexturePreset = {
  id: string
  name: string
  config: TextureConfigState
}

export type PresetSlice = {
  texturePresets: TexturePreset[]
  saveTexturePreset: (name: string) => void
  loadTexturePreset: (id: string) => void
  deleteTexturePreset: (id: string) => void
}

export type ColourTextureStore = ColourSlice & TextureSlice & DisplaySlice & PresetSlice
