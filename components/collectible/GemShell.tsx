'use client'

import { type FC, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { extend, useFrame } from '@react-three/fiber'
import { shaderMaterial } from '@react-three/drei'

import gemShellVertex from './gemShell.vert'
import gemShellFragment from './gemShell.frag'

const BASE_GEOMETRY = new THREE.OctahedronGeometry(1, 0)

const GEM_SURFACE_GEOMETRY = (() => {
  const geometry = BASE_GEOMETRY.clone().toNonIndexed()
  const positionCount = geometry.attributes.position.count
  const barycentric = new Float32Array(positionCount * 3)

  for (let i = 0; i < positionCount; i += 3) {
    const start = i * 3
    barycentric[start + 0] = 1
    barycentric[start + 1] = 0
    barycentric[start + 2] = 0

    barycentric[start + 3] = 0
    barycentric[start + 4] = 1
    barycentric[start + 5] = 0

    barycentric[start + 6] = 0
    barycentric[start + 7] = 0
    barycentric[start + 8] = 1
  }

  geometry.setAttribute('aBarycentric', new THREE.Float32BufferAttribute(barycentric, 3))
  geometry.computeVertexNormals()

  return geometry
})()

const GEM_ROTATION_SPEED = 0.33
const GEM_LINE_WIDTH = 3.0
const GEM_GLOW_STRENGTH = 1.4

type GemShellUniforms = {
  uSurfaceColor: THREE.Color
  uLineColor: THREE.Color
  uOpacity: number
  uLineWidth: number
  uGlowStrength: number
}

const surfaceColour = new THREE.Color('#E97449')

const lineColor = surfaceColour.clone()
lineColor.offsetHSL(0, 0, 0.15)

const INITIAL_GEM_SHELL_UNIFORMS: GemShellUniforms = {
  uSurfaceColor: surfaceColour,
  uLineColor: lineColor,
  uOpacity: 0.35,
  uLineWidth: GEM_LINE_WIDTH,
  uGlowStrength: GEM_GLOW_STRENGTH,
}

const GemShellShader = shaderMaterial(
  INITIAL_GEM_SHELL_UNIFORMS,
  gemShellVertex,
  gemShellFragment,
)

const GemShellShaderMaterial = extend(GemShellShader)

export type GemShellProps = React.ComponentProps<'group'> & {
  opacity?: number
}

const GemShell: FC<GemShellProps> = ({ opacity = 0.35, ...props }) => {
  const groupRef = useRef<THREE.Group>(null)

  useFrame((_, delta) => {
    const group = groupRef.current
    if (!group) return
    group.rotation.z += delta * GEM_ROTATION_SPEED
  })

  return (
    <group ref={groupRef} {...props}>
      <group rotation={[Math.PI / 2, 0, 0]}>
        <mesh geometry={GEM_SURFACE_GEOMETRY} dispose={null}>
          <GemShellShaderMaterial
            key={GemShellShader.key}
            transparent={true}
            depthWrite={false}
            depthTest={true}
            toneMapped={false}
            uOpacity={opacity}
            uLineWidth={GEM_LINE_WIDTH}
            uGlowStrength={GEM_GLOW_STRENGTH}
          />
        </mesh>
      </group>
    </group>
  )
}

export default GemShell
