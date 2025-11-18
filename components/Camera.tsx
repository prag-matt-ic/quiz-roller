'use client'

import { CameraControls, CameraControlsImpl } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { type FC, useCallback, useRef } from 'react'

import { Stage, useGameStore } from '@/components/GameProvider'
import { usePlayerPosition } from '@/hooks/usePlayerPosition'
import useStage from '@/hooks/useStage'

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
    position: { x: 0, y: 5, z: 8 },
    target: { x: 0, y: 0, z: 0 },
    zoom: 1.0,
  },
  [Stage.INFO]: {
    position: { x: 0, y: 5, z: 8 },
    target: { x: 0, y: 0, z: 0 },
    zoom: 1.0,
  },
  [Stage.TERRAIN]: {
    position: { x: 0, y: 9, z: 5 },
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
  const { playerPosition } = usePlayerPosition()
  const cameraLookAtPosition = useGameStore((s) => s.cameraLookAtPosition)

  const applyStageCamera = useCallback((nextStage: Stage) => {
    if (!cameraControls.current) return
    cameraControls.current.zoomTo(CAMERA_CONFIG[nextStage].zoom, true)
    console.log('Camera zoom to', CAMERA_CONFIG[nextStage].zoom)
  }, [])

  const stage = useStage(applyStageCamera)

  useFrame(() => {
    if (!cameraControls.current) return
    const lookAt = cameraLookAtPosition ?? playerPosition.current

    // When looking at info content, pan camera backward to keep player visible
    const isLookingAway = !!cameraLookAtPosition
    const zOffset = isLookingAway
      ? CAMERA_CONFIG[stage.current].position.z + 4 // Move 4 units further back
      : CAMERA_CONFIG[stage.current].position.z

    cameraControls.current.setLookAt(
      playerPosition.current.x,
      CAMERA_CONFIG[stage.current].position.y,
      playerPosition.current.z + zOffset,
      lookAt.x,
      3.5,
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
