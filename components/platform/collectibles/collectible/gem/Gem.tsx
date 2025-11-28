'use client'

import { shaderMaterial } from '@react-three/drei'
import { extend } from '@react-three/fiber'
import { type FC, type RefObject, useMemo } from 'react'
import { Color, Float32BufferAttribute, OctahedronGeometry, type Vector3Tuple } from 'three'

import { usePerformanceStore } from '@/components/PerformanceProvider'
import { CollectibleID } from '@/model/schema'
import { GEMS_BY_ID } from '@/resources/content'

import gemShellFragment from './gemShell.frag'
import gemShellVertex from './gemShell.vert'
import Particles from './particles/Particles'

const GEM_RADIUS = 1.25
const BASE_GEOMETRY = new OctahedronGeometry(GEM_RADIUS, 0)
const GEM_LINE_WIDTH = 4.0
const GEM_GLOW_STRENGTH = 4.0
const GEM_POSITION: Vector3Tuple = [0, 3, 0]
const DEFAULT_SURFACE_COLOR = new Color(GEMS_BY_ID[CollectibleID.AI_Prompts].colour)

const GEM_SURFACE_GEOMETRY = (() => {
  const geometry = BASE_GEOMETRY.clone()
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
  uDistanceFadeEnabled: number
}

const DEFAULT_LINE_COLOR = DEFAULT_SURFACE_COLOR.clone()
DEFAULT_LINE_COLOR.offsetHSL(0, 0, 0.2)

type GemConfig = (typeof GEMS_BY_ID)[CollectibleID]

const INITIAL_GEM_SHELL_UNIFORMS: GemShellUniforms = {
  uSurfaceColor: DEFAULT_SURFACE_COLOR,
  uLineColor: DEFAULT_LINE_COLOR,
  uOpacity: 0.2,
  uLineWidth: GEM_LINE_WIDTH,
  uGlowStrength: GEM_GLOW_STRENGTH,
  uConfirmingProgress: 0,
  uTime: 0,
  uDistanceFadeEnabled: 1,
}

const GemShellShader = shaderMaterial(
  INITIAL_GEM_SHELL_UNIFORMS,
  gemShellVertex,
  gemShellFragment,
)

const GemShellShaderMaterial = extend(GemShellShader)

export type GemShellRef = typeof GemShellShaderMaterial & GemShellUniforms

type GroupLikeProps = Record<string, unknown>

export type GemShellProps = GroupLikeProps & {
  isCollected: boolean
  tileWidth: number
  tileHeight: number
  shaderRef: RefObject<GemShellRef | null>
  id: CollectibleID
  isVisible: boolean
}

const Gem: FC<GemShellProps> = ({
  tileWidth,
  tileHeight,
  isCollected,
  shaderRef,
  id,
  isVisible,
  ...props
}) => {
  const useDistanceFade = usePerformanceStore((s) => s.sceneConfig.isDistanceFadeEnabled)

  const gemConfig: GemConfig = GEMS_BY_ID[id] ?? GEMS_BY_ID[CollectibleID.AI_Prompts]
  const surfaceColor = useMemo(() => new Color(gemConfig.colour), [gemConfig])
  const lineColor = useMemo(() => {
    const colour = new Color(gemConfig.colour)
    colour.offsetHSL(0, 0, 0.2)
    return colour
  }, [gemConfig])

  return (
    <group
      {...props}
      renderOrder={2}
      position={[0, 0, 0]}
      rotation={[Math.PI / 2, 0, 0]}
      visible={isVisible}>
      <Particles
        id={id}
        tileWidth={tileWidth}
        tileHeight={tileHeight}
        wasConfirmed={isCollected}
        isVisible={isVisible}
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
          uSurfaceColor={surfaceColor}
          uLineColor={lineColor}
          uOpacity={isCollected ? 0.4 : 0.2}
          uLineWidth={GEM_LINE_WIDTH}
          uGlowStrength={GEM_GLOW_STRENGTH}
          uConfirmingProgress={isCollected ? 1 : 0}
          uTime={INITIAL_GEM_SHELL_UNIFORMS.uTime}
          uDistanceFadeEnabled={useDistanceFade ? 1 : 0}
        />
      </mesh>
    </group>
  )
}

export default Gem
