import { shaderMaterial } from '@react-three/drei'
import { extend } from '@react-three/fiber'
import { type FC, type RefObject } from 'react'
import { Color, type ShaderMaterial } from 'three'

import { usePerformanceStore } from '@/components/PerformanceProvider'

import ringFrag from './ring.frag'
import ringVert from './ring.vert'

export type RingUniforms = {
  uTime: number
  uColor: Color
  uEmissive: Color
  uRotationSpeed: number
  uRotationPhase: number
  uExitProgress: number
  uDistanceFadeEnabled: number
}

const DEFAULT_UNIFORMS: RingUniforms = {
  uTime: 0,
  uColor: new Color('#ffe066'),
  uEmissive: new Color('#ffd43b'),
  uRotationSpeed: 1,
  uRotationPhase: 0,
  uExitProgress: 0,
  uDistanceFadeEnabled: 1,
}

const RingShader = shaderMaterial(DEFAULT_UNIFORMS, ringVert, ringFrag)

const RingShaderMaterial = extend(RingShader)

type Props = {
  isVisible: boolean
  shaderRef: RefObject<(ShaderMaterial & RingUniforms) | null>
  rotationSpeed: number
  rotationPhase: number
  radius: number
  tubeRadius: number
}

const Ring: FC<Props> = ({
  isVisible,
  shaderRef,
  rotationSpeed,
  rotationPhase,
  radius,
  tubeRadius,
}) => {
  const ringConfig = usePerformanceStore((s) => s.sceneConfig.ring)
  const useDistanceFade = usePerformanceStore((s) => s.sceneConfig.isDistanceFadeEnabled)

  return (
    <mesh visible={isVisible}>
      <torusGeometry
        args={[radius, tubeRadius, ringConfig.radialSegments, ringConfig.tubularSegments]}
      />
      <RingShaderMaterial
        ref={shaderRef}
        key={RingShader.key}
        {...DEFAULT_UNIFORMS}
        transparent={true}
        uRotationSpeed={rotationSpeed}
        uRotationPhase={rotationPhase}
        uDistanceFadeEnabled={useDistanceFade ? 1 : 0}
      />
    </mesh>
  )
}

export default Ring
