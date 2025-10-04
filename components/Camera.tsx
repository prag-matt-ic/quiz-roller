'use client'

import { CameraControls, CameraControlsImpl } from '@react-three/drei'
import React, { type FC, useEffect, useRef } from 'react'
import { MathUtils } from 'three'

import { Stage, useGameStore } from '@/components/GameProvider'

const { ACTION } = CameraControlsImpl

const MIN_POLAR_ANGLE = MathUtils.degToRad(20)
const MAX_POLAR_ANGLE = MathUtils.degToRad(60)

const MIN_AZIMUTH_ANGLE = MathUtils.degToRad(-15)
const MAX_AZIMUTH_ANGLE = MathUtils.degToRad(15)

export const CAMERA_POSITIONS: Record<Stage, { x: number; y: number; z: number }> = {
  [Stage.INTRO]: { x: 12, y: 10, z: 8 },
  [Stage.QUESTION]: { x: 0, y: 14, z: 8 },
  [Stage.TERRAIN]: { x: 0, y: 7, z: 6 },
  [Stage.GAME_OVER]: { x: 0, y: 16, z: 4 },
}

const CAMERA_ZOOMS: Record<Stage, number> = {
  [Stage.INTRO]: 1,
  [Stage.TERRAIN]: 1,
  [Stage.QUESTION]: 1.5,
  [Stage.GAME_OVER]: 1,
}

type Props = {
  isMobile: boolean
}

const Camera: FC<Props> = () => {
  const cameraControls = useRef<CameraControls>(null)
  const stage = useGameStore((s) => s.stage)

  // useEffect(() => {
  //   const animateIntro = async () => {
  //     if (!cameraControls.current) return
  //     const { x, y, z } = CAMERA_POSITIONS[Stage.OUTER]
  //     await cameraControls.current.setLookAt(x, y, z, 0, 0, 0, true)
  //     setTimeout(() => {
  //       setStage(Stage.OUTER)
  //     }, 1800)
  //   }
  //   if (stage === Stage.INTRO) animateIntro()
  // }, [stage, setStage])

  useEffect(() => {
    if (!cameraControls.current) return
    const { x, y, z } = CAMERA_POSITIONS[stage]
    cameraControls.current.setLookAt(x, y, z, 0, 0, 0, true)
    cameraControls.current.zoomTo(CAMERA_ZOOMS[stage], true)
  }, [stage])

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
