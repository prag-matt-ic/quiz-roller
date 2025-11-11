import { shaderMaterial } from '@react-three/drei'
import { extend } from '@react-three/fiber'
import { Texture, Vector4 } from 'three'

import cyclingFragment from './cyclingBackground.frag'
import backgroundVertex from '@/components/textureGenerator/shaders/background.vert'

export type CyclingBackgroundUniforms = {
  uTextureA: Texture | null
  uTextureB: Texture | null
  uBlend: number
  uEdgeIntensities: Vector4
  uEdgeZoomStrength: number
}

export const INITIAL_CYCLING_BACKGROUND_UNIFORMS: CyclingBackgroundUniforms = {
  uTextureA: null,
  uTextureB: null,
  uBlend: 0,
  uEdgeIntensities: new Vector4(0, 0, 0, 0),
  uEdgeZoomStrength: 0.1,
}

const CyclingBackgroundMaterialImpl = shaderMaterial(
  INITIAL_CYCLING_BACKGROUND_UNIFORMS,
  backgroundVertex,
  cyclingFragment,
)

extend({ CyclingBackgroundMaterial: CyclingBackgroundMaterialImpl })

export const CyclingBackgroundMaterial = CyclingBackgroundMaterialImpl
