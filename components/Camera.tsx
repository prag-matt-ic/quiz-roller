'use client'

import { CameraControls, CameraControlsImpl } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import React, { type FC, useEffect, useRef } from 'react'
import { MathUtils } from 'three'

import { Stage, useGameStore } from '@/components/GameProvider'
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
    position: { x: 20, y: 12, z: 8 },
    target: { x: 0, y: 0, z: 0 },
    zoom: 1,
  },
  [Stage.ENTRY]: {
    position: { x: 0, y: 8, z: 5 },
    target: { x: 0, y: 0, z: 0 },
    zoom: 1.2,
  },
  [Stage.QUESTION]: {
    position: { x: 0, y: 12, z: 5 },
    target: { x: 0, y: 0, z: 0 },
    zoom: 1,
  },
  [Stage.TERRAIN]: {
    position: { x: 0, y: 6, z: 7 },
    target: { x: 0, y: 0, z: 0 },
    zoom: 0.75,
  },
  [Stage.GAME_OVER]: {
    position: { x: 0, y: 16, z: 4 },
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
  const { playerPosition } = usePlayerPosition()

  // Update camera position when stage changes
  useEffect(() => {
    if (!cameraControls.current) return

    cameraControls.current.zoomTo(CAMERA_CONFIG[stage].zoom, true)

    if (stage === Stage.QUESTION || stage === Stage.TERRAIN) return // Handled in useFrame below

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
