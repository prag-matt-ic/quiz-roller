'use client'

import { CameraControls, CameraControlsImpl } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { type FC, useEffect, useRef } from 'react'

import { Stage, useGameStore } from '@/components/GameProvider'
import { usePlayerPosition } from '@/hooks/usePlayerPosition'

const { ACTION } = CameraControlsImpl

export const CAMERA_CONFIG: Record<
  Stage,
  {
    position: { x: number; y: number; z: number }
    target: { x: number; y: number; z: number }
    zoom: number
  }
> = {
  [Stage.HOME]: {
    position: { x: 0, y: 4, z: 7 },
    target: { x: 0, y: 0, z: 0 },
    zoom: 0.8,
  },
  [Stage.INFO]: {
    position: { x: 0, y: 4, z: 7 },
    target: { x: 0, y: 0, z: 0 },
    zoom: 0.8,
  },
  [Stage.TERRAIN]: {
    position: { x: 0, y: 11, z: 7 },
    target: { x: 0, y: 0, z: 0 },
    zoom: 1.0,
  },
  [Stage.CTA]: {
    position: { x: 6, y: 12, z: 8 },
    target: { x: 0, y: 0, z: 0 },
    zoom: 0.8,
  },
}

const Camera: FC = () => {
  const cameraControls = useRef<CameraControls>(null)
  const stage = useGameStore((s) => s.stage)
  const { playerPosition } = usePlayerPosition()
  const cameraLookAtPosition = useGameStore((s) => s.cameraLookAtPosition)

  useEffect(() => {
    if (!cameraControls.current) return
    cameraControls.current.zoomTo(CAMERA_CONFIG[stage].zoom, true)

    if (stage !== Stage.CTA) return // Position handled in useFrame below

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
    if (stage === Stage.CTA) return
    const lookAt = !!cameraLookAtPosition ? cameraLookAtPosition : playerPosition.current

    cameraControls.current.setLookAt(
      playerPosition.current.x,
      CAMERA_CONFIG[stage].position.y,
      playerPosition.current.z + CAMERA_CONFIG[stage].position.z,
      lookAt.x,
      4.0,
      lookAt.z,
      true,
    )
  })

  return (
    <CameraControls
      ref={cameraControls}
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
