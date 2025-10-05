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
    position: { x: 10, y: 10, z: 8 },
    target: { x: 0, y: 0, z: 0 },
    zoom: 1.5,
  },
  [Stage.ENTRY]: {
    position: { x: 0, y: 10, z: 4 },
    target: { x: 0, y: 0, z: 0 },
    zoom: 1.25,
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
  const goToStage = useGameStore((s) => s.goToStage)
  const { playerPosition } = usePlayerPosition()

  // Intro animation: wide arc sweep from side
  useEffect(() => {
    const animateIntro = async () => {
      if (!cameraControls.current) return

      const { position, target, zoom } = CAMERA_CONFIG[Stage.SPLASH]

      // Set initial position without transition (instantly place camera)
      cameraControls.current.setLookAt(
        position.x,
        position.y,
        position.z,
        target.x,
        target.y,
        target.z,
        false,
      )

      cameraControls.current.zoomTo(zoom, false)

      // Sweep to entry position with smooth transition
      const {
        position: entryPos,
        target: entryTarget,
        zoom: entryZoom,
      } = CAMERA_CONFIG[Stage.ENTRY]

      cameraControls.current.setLookAt(
        entryPos.x,
        entryPos.y,
        entryPos.z,
        entryTarget.x,
        entryTarget.y,
        entryTarget.z,
        true,
      )

      await cameraControls.current.zoomTo(entryZoom, true)

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
    if (stage === Stage.SPLASH || stage === Stage.ENTRY) return // Skip for intro animation

    const { x, y, z } = CAMERA_CONFIG[stage].position
    const target = CAMERA_CONFIG[stage].target
    const targetX = stage === Stage.TERRAIN ? playerPosition.current.x : target.x

    cameraControls.current.setLookAt(x, y, z, targetX, target.y, target.z, true)
    cameraControls.current.zoomTo(CAMERA_CONFIG[stage].zoom, true)
  }, [stage, playerPosition])

  useFrame(() => {
    if (!cameraControls.current) return
    if (stage === Stage.QUESTION) {
      // Follow player position
      cameraControls.current.setLookAt(
        playerPosition.current.x,
        CAMERA_CONFIG[stage].position.y,
        playerPosition.current.z + 5,
        playerPosition.current.x,
        0,
        playerPosition.current.z,
        true,
      )
    }
    if (stage === Stage.TERRAIN) {
      // Follow player X, but with some lag/smoothing
      cameraControls.current.setLookAt(
        playerPosition.current.x,
        CAMERA_CONFIG[stage].position.y,
        CAMERA_CONFIG[stage].position.z,
        playerPosition.current.x,
        0,
        playerPosition.current.z,
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
