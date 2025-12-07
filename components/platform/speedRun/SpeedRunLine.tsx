import { shaderMaterial } from '@react-three/drei'
import { extend } from '@react-three/fiber'
import {
  CuboidCollider,
  type IntersectionEnterHandler,
  type IntersectionExitHandler,
  RapierRigidBody,
  RigidBody,
} from '@react-three/rapier'
import { type FC, type RefObject, useMemo, useRef } from 'react'

import { useGameStore } from '@/components/GameProvider'
import { usePerformanceStore } from '@/components/PerformanceProvider'
import { PLAYER_RADIUS } from '@/components/player/PlayerHUD'
import type { RigidBodyUserData, SpeedRunLineUserData } from '@/model/schema'
import { GameMode, Overlay, SpeedRunStage } from '@/stores/types'
import { COLLISION_GROUPS } from '@/utils/collisionGroups'
import { HIDDEN_POSITION, TILE_SIZE } from '@/utils/tiles'

import finishFragmentShader from './finishLine.frag'
import vertexShader from './finishLine.vert'
import startFragmentShader from './startLine.frag'

type SpeedRunLineShaderUniforms = {
  uAspect: number
  uOpacity: number
  uTilesX: number
  uTilesY: number
  uDistanceFadeEnabled: number
}

const INITIAL_UNIFORMS: SpeedRunLineShaderUniforms = {
  uAspect: 1,
  uOpacity: 1,
  uTilesX: 1,
  uTilesY: 1,
  uDistanceFadeEnabled: 1,
}

const SpeedRunFinishShader = shaderMaterial(
  INITIAL_UNIFORMS,
  vertexShader,
  finishFragmentShader,
)
const SpeedRunStartShader = shaderMaterial(INITIAL_UNIFORMS, vertexShader, startFragmentShader)

const SpeedRunFinishShaderMaterial = extend(SpeedRunFinishShader)
const SpeedRunStartShaderMaterial = extend(SpeedRunStartShader)

type Props = {
  ref?: RefObject<RapierRigidBody | null>
  width: number
  height: number
}

const SpeedRunLine: FC<Props> = ({ ref, width, height }) => {
  const mode = useGameStore((s) => s.mode)
  const speedRunStage = useGameStore((s) => s.speedRunStage)
  const finishSpeedRun = useGameStore((s) => s.finishSpeedRun)
  const setOverlay = useGameStore((s) => s.setOverlay)
  const useDistanceFade = usePerformanceStore((s) => s.sceneConfig.isDistanceFadeEnabled)

  const userData: SpeedRunLineUserData = useMemo(
    () => ({
      type: 'speed-run-line',
    }),
    [],
  )

  const hasTriggeredStart = useRef(false)
  const timeout = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isSpeedRunMode = mode === GameMode.SPEEDRUN
  const isStartLine = !isSpeedRunMode

  const onIntersectionEnter: IntersectionEnterHandler = (event) => {
    const otherUserData = event.other.rigidBodyObject?.userData as RigidBodyUserData
    if (!otherUserData || otherUserData.type !== 'player') return

    if (isSpeedRunMode) {
      if (speedRunStage !== SpeedRunStage.RUNNING) return
      finishSpeedRun()
    } else {
      if (hasTriggeredStart.current) return
      timeout.current = setTimeout(() => {
        hasTriggeredStart.current = true
        setOverlay(Overlay.SPEEDRUN_START)
      }, 500)
    }
  }

  const onIntersectionExit: IntersectionExitHandler = (event) => {
    if (!isStartLine) return
    const otherUserData = event.other.rigidBodyObject?.userData as RigidBodyUserData
    if (!otherUserData || otherUserData.type !== 'player') return

    if (!!timeout.current) clearTimeout(timeout.current)

    timeout.current = setTimeout(() => {
      hasTriggeredStart.current = false
      timeout.current = null
    }, 1000)
  }

  const LineMaterial = useMemo(
    () => (isStartLine ? SpeedRunStartShaderMaterial : SpeedRunFinishShaderMaterial),
    [isStartLine],
  )

  return (
    <RigidBody
      ref={ref}
      // KEEP DYNAMIC
      type="dynamic"
      gravityScale={0}
      friction={0}
      mass={0}
      position={HIDDEN_POSITION}
      rotation={[-Math.PI / 2, 0, 0]}
      colliders={false}
      userData={userData}>
      <CuboidCollider
        args={[width / 2, height / 2, PLAYER_RADIUS * 2]}
        sensor={true}
        mass={0}
        friction={0}
        onIntersectionEnter={onIntersectionEnter}
        onIntersectionExit={onIntersectionExit}
        collisionGroups={COLLISION_GROUPS.finishLineSensor}
      />
      <mesh position={[0, 0, 0.01]} renderOrder={2}>
        <planeGeometry args={[width, height]} />
        <LineMaterial
          transparent={true}
          opacity={1}
          uAspect={width / height}
          uTilesX={width / TILE_SIZE}
          uTilesY={height / TILE_SIZE}
          uDistanceFadeEnabled={useDistanceFade ? 1 : 0}
        />
      </mesh>
    </RigidBody>
  )
}

export default SpeedRunLine
