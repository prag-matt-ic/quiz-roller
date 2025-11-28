import { shaderMaterial } from '@react-three/drei'
import { extend } from '@react-three/fiber'
import { type FC, type Ref } from 'react'
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
}

const DEFAULT_UNIFORMS: RingUniforms = {
  uTime: 0,
  uColor: new Color('#ffe066'),
  uEmissive: new Color('#ffd43b'),
  uRotationSpeed: 1,
  uRotationPhase: 0,
}

const RingsShader = shaderMaterial(DEFAULT_UNIFORMS, ringVert, ringFrag)

const RingsShaderMaterial = extend(RingsShader)

type Props = {
  isVisible: boolean
  shaderRef: Ref<ShaderMaterial & RingUniforms>
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
  return (
    <mesh visible={isVisible}>
      <torusGeometry
        args={[radius, tubeRadius, ringConfig.radialSegments, ringConfig.tubularSegments]}
      />
      <RingsShaderMaterial
        ref={shaderRef}
        key={RingsShader.key}
        {...DEFAULT_UNIFORMS}
        uRotationSpeed={rotationSpeed}
        uRotationPhase={rotationPhase}
      />
    </mesh>
  )
}

export default Ring
