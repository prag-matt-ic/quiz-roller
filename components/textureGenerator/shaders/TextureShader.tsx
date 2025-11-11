import { shaderMaterial } from '@react-three/drei'
import { extend } from '@react-three/fiber'
import { Vector2 } from 'three'

import backgroundFragment from './background.frag'
import backgroundVertex from './background.vert'

export type BackgroundShaderUniforms = {
  uTime: number
  uResolution: Vector2
  uSeed: number
  uPaletteIndex: number
  uSampleWeight: number
  // Grainy Noise controls
  uGrainScale: number
  uGrainAmplitude: number
  uGrainMix: number
  // Fractal Noise controls
  uFbmScale: number
  uFbmOctaves: number
  uFbmLacunarity: number
  uFbmGain: number
  uFbmMix: number
  // Vignette controls
  uVignetteStrength: number
  uVignetteRadius: number
  uVignetteSmoothness: number
  // Worley Noise controls
  uWorleyScale: number
  uWorleyJitter: number
  uWorleyManhattan: number // 0 or 1 (boolean as int for GLSL)
  uWorleyPattern: number
  uWorleyMix: number
}

export const INITIAL_BACKGROUND_UNIFORMS: BackgroundShaderUniforms = {
  uTime: 0,
  uResolution: new Vector2(1024, 1024),
  uSeed: 0,
  uPaletteIndex: 0,
  uSampleWeight: 1,
  // Grainy Noise defaults
  uGrainScale: 100.0,
  uGrainAmplitude: 0.1,
  uGrainMix: 0.5,
  // Fractal Noise defaults
  uFbmScale: 8.5,
  uFbmOctaves: 6,
  uFbmLacunarity: 1.7,
  uFbmGain: 0.6,
  uFbmMix: 0.28,
  // Vignette defaults
  uVignetteStrength: 0.4,
  uVignetteRadius: 0.44,
  uVignetteSmoothness: 0.53,
  // Worley Noise defaults
  uWorleyScale: 0.5,
  uWorleyJitter: 0.0,
  uWorleyManhattan: 0, // 0 = Euclidean, 1 = Manhattan distance
  uWorleyPattern: 2, // F2-F1 pattern
  uWorleyMix: 0.0,
}

const TextureShaderMaterialImpl = shaderMaterial(
  INITIAL_BACKGROUND_UNIFORMS,
  backgroundVertex,
  backgroundFragment,
)

extend({ TextureShaderMaterial: TextureShaderMaterialImpl })

export const TextureShaderMaterial = TextureShaderMaterialImpl
