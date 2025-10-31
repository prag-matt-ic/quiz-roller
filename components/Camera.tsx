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

const TERRAIN_CONFIG = {
  position: { x: 0, y: 6, z: 7 },
  target: { x: 0, y: 0, z: 0 },
  zoom: 0.8,
}

// Unified camera configuration per stage
export const CAMERA_CONFIG: Record<
  Stage,
  {
    position: { x: number; y: number; z: number }
    target: { x: number; y: number; z: number }
    zoom: number
  }
> = {
  [Stage.HOME]: {
    position: { x: 0, y: 8, z: 5 },
    target: { x: 0, y: 0, z: 0 },
    zoom: 0.8,
  },
  [Stage.INTRO]: TERRAIN_CONFIG,
  [Stage.QUESTION]: {
    position: { x: 0, y: 11, z: 5 },
    target: { x: 0, y: 0, z: 0 },
    zoom: 1.2,
  },
  [Stage.TERRAIN]: TERRAIN_CONFIG,
  [Stage.GAME_OVER]: {
    position: { x: 16, y: 12, z: 8 },
    target: { x: 0, y: 0, z: 0 },
    zoom: 0.8,
  },
}

const Camera: FC = () => {
  const cameraControls = useRef<CameraControls>(null)
  const stage = useGameStore((s) => s.stage)
  const { playerPosition } = usePlayerPosition()
  const cameraLookAtPosition = useGameStore((s) => s.cameraLookAtPosition)

  // Update camera position when stage changes
  useEffect(() => {
    if (!cameraControls.current) return

    cameraControls.current.zoomTo(CAMERA_CONFIG[stage].zoom, true)

    if (stage !== Stage.GAME_OVER) return // Position handled in useFrame below

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
    if (stage === Stage.GAME_OVER) return

    const lookAt = !!cameraLookAtPosition ? cameraLookAtPosition : playerPosition.current

    cameraControls.current.setLookAt(
      playerPosition.current.x,
      CAMERA_CONFIG[stage].position.y,
      playerPosition.current.z + CAMERA_CONFIG[stage].position.z,
      lookAt.x,
      lookAt.y,
      lookAt.z,
      true,
    )
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
