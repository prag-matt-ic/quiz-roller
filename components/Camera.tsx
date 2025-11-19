'use client'

import { CameraControls, CameraControlsImpl } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { type FC, useRef } from 'react'

import { Stage, useGameStore } from '@/components/GameProvider'
import { usePlayerPosition } from '@/hooks/usePlayerPosition'
import useStage from '@/hooks/useStage'
import usePlayerInput from '@/hooks/usePlayerInput'

const { ACTION } = CameraControlsImpl

// TODO: simplify to match requirements below.
export const CAMERA_CONFIG: Record<
  Stage,
  {
    position: { x: number; y: number; z: number }
    zoom: number
  }
> = {
  [Stage.HOME]: {
    position: { x: 0, y: 4, z: 8 },
    zoom: 1.0,
  },
  [Stage.INFO]: {
    position: { x: 0, y: 4, z: 8 },
    zoom: 1.0,
  },
  [Stage.TERRAIN]: {
    position: { x: 0, y: 7, z: 8 },
    zoom: 1.2,
  },
  [Stage.CTA]: {
    position: { x: 6, y: 12, z: 8 },
    zoom: 0.8,
  },
}

// TOOD: add subtle pointer offset to the camera position.

const Camera: FC = () => {
  const cameraControls = useRef<CameraControls>(null)
  const { playerPosition } = usePlayerPosition()

  const lastMovedBackward = useRef(false)

  usePlayerInput((input) => {
    if (input.down > 0) lastMovedBackward.current = true
    else if (input.up > 0) lastMovedBackward.current = false
  })
  const cameraLookAtPosition = useGameStore((s) => s.cameraLookAtPosition)

  const stage = useStage((nextStage: Stage) => {
    if (!cameraControls.current) return
    cameraControls.current.zoomTo(CAMERA_CONFIG[nextStage].zoom, true)
  })

  useFrame(() => {
    if (!cameraControls.current) return
    const lookAt = cameraLookAtPosition ?? playerPosition.current
    // TODO: review and clean this up...

    // When looking at content, move camera backward to keep player visible
    const isLookingAway = !!cameraLookAtPosition
    let zOffset = isLookingAway
      ? CAMERA_CONFIG[stage.current].position.z + 4 // Move 4 units further back
      : CAMERA_CONFIG[stage.current].position.z

    // Adjust the look based on whether player is moving back or not
    zOffset += lastMovedBackward.current ? 4 : 0

    cameraControls.current.setLookAt(
      playerPosition.current.x,
      CAMERA_CONFIG[stage.current].position.y,
      playerPosition.current.z + zOffset,
      lookAt.x,
      3,
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
