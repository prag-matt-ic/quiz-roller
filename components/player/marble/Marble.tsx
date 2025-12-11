'use client'

import { shaderMaterial, useTexture } from '@react-three/drei'
import { extend } from '@react-three/fiber'
import { type FC, type RefObject, Suspense, useRef } from 'react'
import { Mesh, Texture } from 'three'

import normal from '@/assets/textures/marble/normal.webp'
import { useGameStore } from '@/components/GameProvider'
import { usePerformanceStore } from '@/components/PerformanceProvider'
import { PLAYER_RADIUS } from '@/components/player/PlayerHUD'
import fragment from '@/components/player/marble/marble.frag'
import vertex from '@/components/player/marble/marble.vert'
import { useConfirmationProgress } from '@/hooks/useConfirmationProgress'
import useGameFrame from '@/hooks/useGameFrame'
import { usePlayerInput } from '@/hooks/usePlayerInput'
import usePlayerSpeed from '@/hooks/usePlayerSpeed'
import { PLAYER_SPEED_MAX } from '@/stores/playerSlice'
import { SPEED_SMOOTH_HALF_LIFE, stepSmoothedSpeed } from '@/utils/smoothedSpeed'

export type MarbleShaderUniforms = {
  uTime: number
  uConfirmingProgress: number
  uNormalMap: Texture | null
  uNormalScale: number
  uIsFlat: boolean
  uEnableVeins: boolean
  uPaletteIndex: number
  uConfirmingPaletteIndex: number
  uSpeed: number
}

const INITIAL_UNIFORMS: MarbleShaderUniforms = {
  uTime: 0,
  uConfirmingProgress: 0,
  uNormalMap: null,
  uNormalScale: 0.3,
  uIsFlat: false,
  uEnableVeins: false,
  uPaletteIndex: 0,
  uConfirmingPaletteIndex: -1,
  uSpeed: 0,
}

const MarbleShader = shaderMaterial(INITIAL_UNIFORMS, vertex, fragment)
export const MarbleShaderMaterial = extend(MarbleShader)

type MarbleProps = {
  ref: RefObject<Mesh | null>
}

export const Marble: FC<MarbleProps> = ({ ref }) => {
  const playerConfig = usePerformanceStore((s) => s.sceneConfig.player)
  const { segments, isFlat, enableVeins } = playerConfig
  const normalMap = useTexture(normal.src)
  const paletteIndex = useGameStore((s) => s.paletteIndex)
  const confirmingPaletteIndex = useGameStore((s) => s.confirmingPaletteIndex ?? -1)

  const shader = useRef<typeof MarbleShaderMaterial & MarbleShaderUniforms>(null)

  // Shader time accumulator
  const shaderTime = useRef(0)
  const { confirmationProgress } = useConfirmationProgress()
  const smoothedSpeed = useRef(0)
  const { input } = usePlayerInput()
  const { speedUnits } = usePlayerSpeed()

  useGameFrame((_, deltaTime) => {
    if (!shader.current) return
    // Update shader animation time
    shaderTime.current += deltaTime
    shader.current.uTime = shaderTime.current

    const inputZ = input.current.up - input.current.down
    const targetSpeed = Math.min(1, Math.abs((inputZ * speedUnits.current) / PLAYER_SPEED_MAX))
    shader.current.uSpeed = stepSmoothedSpeed(
      smoothedSpeed,
      targetSpeed,
      deltaTime,
      SPEED_SMOOTH_HALF_LIFE,
    )

    if (confirmationProgress.current === 0 && shader.current.uConfirmingProgress === 0) return
    shader.current.uConfirmingProgress = confirmationProgress.current
  })

  return (
    <mesh ref={ref}>
      <sphereGeometry args={[PLAYER_RADIUS, segments, segments]} />
      <Suspense fallback={null}>
        <MarbleShaderMaterial
          key={MarbleShader.key}
          ref={shader}
          uTime={INITIAL_UNIFORMS.uTime}
          uNormalMap={normalMap}
          uNormalScale={INITIAL_UNIFORMS.uNormalScale}
          uIsFlat={isFlat}
          uEnableVeins={enableVeins}
          uPaletteIndex={paletteIndex}
          uConfirmingPaletteIndex={confirmingPaletteIndex}
          uSpeed={INITIAL_UNIFORMS.uSpeed}
          transparent
        />
      </Suspense>
    </mesh>
  )
}
