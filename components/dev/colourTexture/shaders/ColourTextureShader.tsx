import { shaderMaterial } from '@react-three/drei'
import { Vector2, Vector3 } from 'three'

import colourTextureFragment from './colourTexture.frag'
import backgroundVertex from './colourTexture.vert'

export type ColourTextureShaderUniforms = {
  uTime: number
  uResolution: Vector2
  uSeed: number
  uSampleWeight: number
  uBlackMix: number
  uShowGradientOverlay: boolean
  uOriginOffset: Vector2

  // Cosine Palette
  uA: Vector3
  uB: Vector3
  uC: Vector3
  uD: Vector3

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

export const INITIAL_COLOUR_TEXTURE_UNIFORMS: ColourTextureShaderUniforms = {
  uTime: 0,
  uResolution: new Vector2(1024, 1024),
  uSeed: 0,
  uSampleWeight: 1,
  uBlackMix: 0.0,
  uShowGradientOverlay: true,
  uOriginOffset: new Vector2(0, 0),

  // Default Palette (Orange-ish from Gradient page)

  uA: new Vector3(0.5, 0.5, 0.5),
  uB: new Vector3(0.5, 0.5, 0.5),
  uC: new Vector3(1.0, 0.7, 0.4),
  uD: new Vector3(0.0, 0.15, 0.2),

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

export const ColourTextureShader = shaderMaterial(
  INITIAL_COLOUR_TEXTURE_UNIFORMS,
  backgroundVertex,
  colourTextureFragment,
)
