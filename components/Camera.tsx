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

// Camera positions (where the camera IS located)
export const CAMERA_POSITIONS: Record<Stage, { x: number; y: number; z: number }> = {
  [Stage.SPLASH]: { x: 0, y: 10, z: 8 },
  [Stage.ENTRY]: { x: 0, y: 10, z: 4 },
  [Stage.QUESTION]: { x: 0, y: 12, z: 5 },
  [Stage.TERRAIN]: { x: 0, y: 6, z: 6 },
  [Stage.GAME_OVER]: { x: 0, y: 16, z: 4 },
}

// Camera targets (what the camera is LOOKING AT)
export const CAMERA_TARGETS: Record<Stage, { x: number; y: number; z: number }> = {
  [Stage.SPLASH]: { x: 0, y: 0, z: 0 },
  [Stage.ENTRY]: { x: 0, y: 0, z: 0 },
  [Stage.QUESTION]: { x: 0, y: 0, z: 0 },
  [Stage.TERRAIN]: { x: 0, y: 0, z: 0 },
  [Stage.GAME_OVER]: { x: 0, y: 0, z: 0 },
}

// Intro animation start position (wide arc sweep from side)
export const INTRO_START_POSITION = { x: -10, y: 0, z: 12 }
const INTRO_START_TARGET = { x: 0, y: 0, z: 0 }

const CAMERA_ZOOMS: Record<Stage, number> = {
  [Stage.SPLASH]: 1,
  [Stage.ENTRY]: 1.5,
  [Stage.TERRAIN]: 0.75,
  [Stage.QUESTION]: 1,
  [Stage.GAME_OVER]: 1,
}

type Props = {
  isMobile: boolean
}

const Camera: FC<Props> = () => {
  const cameraControls = useRef<CameraControls>(null)
  const stage = useGameStore((s) => s.stage)
  const goToStage = useGameStore((s) => s.goToStage)
  const { playerPosition } = usePlayerPosition()

  // Intro animation: wide arc sweep from side
  useEffect(() => {
    const animateIntro = async () => {
      if (!cameraControls.current) return

      // Set initial position without transition (instantly place camera)
      await cameraControls.current.setLookAt(
        INTRO_START_POSITION.x,
        INTRO_START_POSITION.y,
        INTRO_START_POSITION.z,
        INTRO_START_TARGET.x,
        INTRO_START_TARGET.y,
        INTRO_START_TARGET.z,
        false,
      )

      // Sweep to entry position with smooth transition
      const entryPos = CAMERA_POSITIONS[Stage.ENTRY]
      const entryTarget = CAMERA_TARGETS[Stage.ENTRY]

      await cameraControls.current.setLookAt(
        entryPos.x,
        entryPos.y,
        entryPos.z,
        entryTarget.x,
        entryTarget.y,
        entryTarget.z,
        true,
      )

      // Transition to entry stage after animation completes
      setTimeout(() => {
        goToStage(Stage.ENTRY)
      }, 200)
    }

    if (stage === Stage.SPLASH) animateIntro()
  }, [stage, goToStage])

  // Update camera position when stage changes
  useEffect(() => {
    if (!cameraControls.current) return
    if (stage === Stage.SPLASH) return // Skip for intro animation

    const { x, y, z } = CAMERA_POSITIONS[stage]
    const target = CAMERA_TARGETS[stage]
    const targetX = stage === Stage.TERRAIN ? playerPosition.current.x : target.x

    cameraControls.current.setLookAt(x, y, z, targetX, target.y, target.z, true)
    cameraControls.current.zoomTo(CAMERA_ZOOMS[stage], true)
  }, [stage, playerPosition])

  useFrame(() => {
    if (!cameraControls.current) return
    if (stage === Stage.TERRAIN || stage === Stage.QUESTION) {
      // Smoothly follow player x position
      const targetX = playerPosition.current.x
      cameraControls.current.setLookAt(
        targetX,
        CAMERA_POSITIONS[stage].y,
        CAMERA_POSITIONS[stage].z,
        playerPosition.current.x,
        0,
        0,
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
        left: ACTION.ROTATE,
        middle: ACTION.NONE,
        right: ACTION.NONE,
        wheel: ACTION.ZOOM,
      }}
      touches={{
        one: ACTION.TOUCH_ROTATE,
        two: ACTION.NONE,
        three: ACTION.NONE,
      }}
    />
  )
}

export default Camera
