import { shaderMaterial } from '@react-three/drei'
import { extend } from '@react-three/fiber'
import { Vector2 } from 'three'

import backgroundFragment from './background.frag'
import backgroundVertex from './background.vert'

export type BackgroundShaderUniforms = {
  uTime: number
  uResolution: Vector2
  uSeed: number
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
  // Grainy Noise defaults
  uGrainScale: 256.0,
  uGrainAmplitude: 1.5,
  uGrainMix: 0.1,
  // Fractal Noise defaults
  uFbmScale: 4.0,
  uFbmOctaves: 4,
  uFbmLacunarity: 2.0,
  uFbmGain: 0.5,
  uFbmMix: 0.3,
  // Vignette defaults
  uVignetteStrength: 0.6,
  uVignetteRadius: 0.3,
  uVignetteSmoothness: 0.6,
  // Worley Noise defaults
  uWorleyScale: 5.0,
  uWorleyJitter: 1.0,
  uWorleyManhattan: 0, // 0 = Euclidean, 1 = Manhattan distance
  uWorleyPattern: 2, // F2-F1 (cell borders)
  uWorleyMix: 0.5,
}

const CustomBackgroundShaderMaterial = shaderMaterial(
  INITIAL_BACKGROUND_UNIFORMS,
  backgroundVertex,
  backgroundFragment,
)

export const TextureShaderMaterial = extend(CustomBackgroundShaderMaterial)
