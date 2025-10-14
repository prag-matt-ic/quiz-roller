'use client'

import { CameraControls, CameraControlsImpl } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import React, { type FC, useEffect, useRef } from 'react'
import { MathUtils } from 'three'

import { PLAYER_INITIAL_POSITION, Stage, useGameStore } from '@/components/GameProvider'
import { usePlayerPosition } from '@/hooks/usePlayerPosition'

const { ACTION } = CameraControlsImpl

const MIN_POLAR_ANGLE = MathUtils.degToRad(20)
const MAX_POLAR_ANGLE = MathUtils.degToRad(60)
const MIN_AZIMUTH_ANGLE = MathUtils.degToRad(-15)
const MAX_AZIMUTH_ANGLE = MathUtils.degToRad(15)

// Unified camera configuration per stage
export const CAMERA_CONFIG: Record<
  Stage,
  {
    position: { x: number; y: number; z: number }
    target: { x: number; y: number; z: number }
    zoom: number
  }
> = {
  [Stage.SPLASH]: {
    // Close to the player with a low Y to keep the path low in view.
    // These are starting values and can be tweaked.
    position: { x: 0, y: 2, z: 10 },
    target: { x: 0, y: PLAYER_INITIAL_POSITION[1], z: PLAYER_INITIAL_POSITION[2] - 2 },
    zoom: 1.2,
  },
  [Stage.INTRO]: {
    position: { x: 0, y: 5, z: 8 },
    target: { x: 0, y: 0, z: 0 },
    zoom: 1,
  },
  [Stage.QUESTION]: {
    position: { x: 0, y: 12, z: 5 },
    target: { x: 0, y: 0, z: 0 },
    zoom: 1,
  },
  [Stage.TERRAIN]: {
    position: { x: 0, y: 6, z: 7 },
    target: { x: 0, y: 0, z: 0 },
    zoom: 0.8,
  },
  [Stage.GAME_OVER]: {
    position: { x: 16, y: 12, z: 8 },
    target: { x: 0, y: 0, z: 0 },
    zoom: 1,
  },
}

type Props = {
  isMobile: boolean
}

const Camera: FC<Props> = () => {
  const cameraControls = useRef<CameraControls>(null)
  const stage = useGameStore((s) => s.stage)
  const resetTick = useGameStore((s) => s.resetTick)
  const { playerPosition } = usePlayerPosition()

  // Update camera position when stage changes
  useEffect(() => {
    if (!cameraControls.current) return

    cameraControls.current.zoomTo(CAMERA_CONFIG[stage].zoom, true)

    if (stage === Stage.INTRO || stage === Stage.QUESTION || stage === Stage.TERRAIN) return // Position handled in useFrame below

    const { position, target } = CAMERA_CONFIG[stage]
    cameraControls.current.setLookAt(
      position.x,
      position.y,
      position.z,
      target.x,
      target.y,
      target.z,
      true,
    )
  }, [stage, playerPosition])

  useFrame(() => {
    if (!cameraControls.current) return

    if (stage === Stage.INTRO) {
      // Track like question stage but keep ENTRY's zoomed-in config
      cameraControls.current.setLookAt(
        playerPosition.current.x, // Follow player X
        CAMERA_CONFIG[stage].position.y,
        playerPosition.current.z + 5, // Slightly behind
        playerPosition.current.x,
        0,
        playerPosition.current.z,
        true,
      )
    }

    if (stage === Stage.QUESTION) {
      cameraControls.current.setLookAt(
        playerPosition.current.x, // Follow player X
        CAMERA_CONFIG[stage].position.y,
        playerPosition.current.z + 5, // Follow the player from slightly behind
        playerPosition.current.x, // Look at the player X
        0,
        playerPosition.current.z, // Look at the player Z
        true,
      )
    }
    if (stage === Stage.TERRAIN) {
      // Follow player X, but with some lag/smoothing
      cameraControls.current.setLookAt(
        playerPosition.current.x, // Follow player X
        CAMERA_CONFIG[stage].position.y, // Fixed Y
        CAMERA_CONFIG[stage].position.z, // Fixed Z
        playerPosition.current.x, // Look at the player X
        0,
        playerPosition.current.z, // Look at the player Z
        true,
      )
    }
  })

  useEffect(() => {
    if (!cameraControls.current) return
    // Reset back to the control's saved default
    cameraControls.current.reset(true) // smooth reset
    // Immediately set the pose for the current stage (usually SPLASH → INTRO next)
    const { position, target, zoom } = CAMERA_CONFIG[stage]
    cameraControls.current.zoomTo(zoom, true)
    cameraControls.current.setLookAt(
      position.x,
      position.y,
      position.z,
      target.x,
      target.y,
      target.z,
      true,
    )
    // Optional: make this the new "default" after reset
    cameraControls.current.saveState()
  }, [resetTick])

  return (
    <CameraControls
      ref={cameraControls}
      minPolarAngle={MIN_POLAR_ANGLE}
      maxPolarAngle={MAX_POLAR_ANGLE}
      minAzimuthAngle={MIN_AZIMUTH_ANGLE}
      maxAzimuthAngle={MAX_AZIMUTH_ANGLE}
      minDistance={3}
      maxDistance={11}
      minZoom={1}
      maxZoom={3}
      makeDefault={true}
      mouseButtons={{
        left: ACTION.NONE,
        middle: ACTION.NONE,
        right: ACTION.NONE,
        wheel: ACTION.NONE,
      }}
      touches={{
        one: ACTION.NONE,
        two: ACTION.NONE,
        three: ACTION.NONE,
      }}
    />
  )
}

export default Camera
