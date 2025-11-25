'use client'

import { RefObject, type FC } from 'react'
import { extend } from '@react-three/fiber'
import { shaderMaterial } from '@react-three/drei'

import gemShellVertex from './gemShell.vert'
import gemShellFragment from './gemShell.frag'
import Particles from './particles/Particles'
import { OctahedronGeometry, Color, type Vector3Tuple, Float32BufferAttribute } from 'three'

const GEM_RADIUS = 1.1
const BASE_GEOMETRY = new OctahedronGeometry(GEM_RADIUS, 0)
const GEM_LINE_WIDTH = 4.0
const GEM_GLOW_STRENGTH = 2.0
const COLOUR = '#F6B253'
const GEM_POSITION: Vector3Tuple = [0, 3, 0]

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

  geometry.setAttribute('aBarycentric', new Float32BufferAttribute(barycentric, 3))
  geometry.computeVertexNormals()

  return geometry
})()

type GemShellUniforms = {
  uSurfaceColor: Color
  uLineColor: Color
  uOpacity: number
  uLineWidth: number
  uGlowStrength: number
  uConfirmingProgress: number
  uTime: number
}

const surfaceColour = new Color(COLOUR)

const lineColor = surfaceColour.clone()
lineColor.offsetHSL(0, 0, 0.2)

const INITIAL_GEM_SHELL_UNIFORMS: GemShellUniforms = {
  uSurfaceColor: surfaceColour,
  uLineColor: lineColor,
  uOpacity: 0.2,
  uLineWidth: GEM_LINE_WIDTH,
  uGlowStrength: GEM_GLOW_STRENGTH,
  uConfirmingProgress: 0,
  uTime: 0,
}

const GemShellShader = shaderMaterial(
  INITIAL_GEM_SHELL_UNIFORMS,
  gemShellVertex,
  gemShellFragment,
)

const GemShellShaderMaterial = extend(GemShellShader)

export type GemShellRef = typeof GemShellShaderMaterial & GemShellUniforms

export type GemShellProps = React.ComponentProps<'group'> & {
  isCollected: boolean
  tileWidth: number
  tileHeight: number
  shaderRef: RefObject<GemShellRef | null>
}

const Gem: FC<GemShellProps> = ({
  tileWidth,
  tileHeight,
  isCollected,
  shaderRef,
  ...props
}) => {
  return (
    <group {...props} renderOrder={2} position={[0, 0, 0]} rotation={[Math.PI / 2, 0, 0]}>
      <Particles
        tileWidth={tileWidth}
        tileHeight={tileHeight}
        wasConfirmed={isCollected}
        position={[0, 0, 0]}
        gemPosition={GEM_POSITION}
        gemScale={GEM_RADIUS}
      />

      <mesh geometry={GEM_SURFACE_GEOMETRY} dispose={null} position={GEM_POSITION}>
        <GemShellShaderMaterial
          key={GemShellShader.key}
          ref={shaderRef}
          transparent={true}
          depthWrite={false}
          depthTest={true}
          toneMapped={false}
          uOpacity={isCollected ? 0.35 : 0.15}
          uLineWidth={GEM_LINE_WIDTH}
          uGlowStrength={GEM_GLOW_STRENGTH}
          uConfirmingProgress={isCollected ? 1 : 0}
          uTime={INITIAL_GEM_SHELL_UNIFORMS.uTime}
        />
      </mesh>
    </group>
  )
}

export default Gem
