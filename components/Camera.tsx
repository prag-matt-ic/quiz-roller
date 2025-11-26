'use client'

import { CameraControls, CameraControlsImpl } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { type FC, useEffect, useRef } from 'react'

import { Stage, useGameStore } from '@/components/GameProvider'
import { usePlayerPosition } from '@/hooks/usePlayerPosition'
import useStage from '@/hooks/useStage'
import usePlayerInput from '@/hooks/usePlayerInput'

const { ACTION } = CameraControlsImpl

type StageCameraPosition = {
  y: number
  z: number
}

export const CAMERA_POSITION_FOR_STAGE_DESKTOP: Record<Stage, StageCameraPosition> = {
  [Stage.HOME]: { y: 4, z: 8 },
  [Stage.INFO]: { y: 4, z: 8 },
  [Stage.TERRAIN]: { y: 9, z: 4 },
  [Stage.CTA]: { y: 7, z: 8 },
}

export const CAMERA_POSITION_FOR_STAGE_MOBILE: Record<Stage, StageCameraPosition> = {
  [Stage.HOME]: { y: 4, z: 6 },
  [Stage.INFO]: { y: 4, z: 6 },
  [Stage.TERRAIN]: { y: 9, z: 4 },
  [Stage.CTA]: { y: 6, z: 6 },
}

export const CAMERA_ZOOM_FOR_STAGE: Record<Stage, number> = {
  [Stage.HOME]: 1.0,
  [Stage.INFO]: 1.0,
  [Stage.TERRAIN]: 1.2,
  [Stage.CTA]: 1.4,
}

type Props = {
  isMobile: boolean
  positions: Record<Stage, StageCameraPosition>
}

const Camera: FC<Props> = ({ isMobile, positions }) => {
  const cameraControls = useRef<CameraControls>(null)
  const { playerPosition } = usePlayerPosition()
  const respawnPlayerTick = useGameStore((s) => s.respawnPlayerTick)

  const lastMovedBackward = useRef(false)

  useEffect(() => {
    lastMovedBackward.current = false
  }, [respawnPlayerTick])

  usePlayerInput((input) => {
    if (input.down > 0) lastMovedBackward.current = true
    else if (input.up > 0) lastMovedBackward.current = false
  })

  const cameraLookAtPosition = useGameStore((s) => s.cameraLookAtPosition)

  const stage = useStage((nextStage: Stage) => {
    if (!cameraControls.current) return
    cameraControls.current.zoomTo(CAMERA_ZOOM_FOR_STAGE[nextStage], true)
  })

  const hasLookAtPosition = !!cameraLookAtPosition

  useFrame(() => {
    if (!cameraControls.current) return
    const lookAt = cameraLookAtPosition ?? playerPosition.current

    // When looking at content, move camera backward to keep player visible
    const stageCameraPosition = positions[stage.current]
    let zOffset = hasLookAtPosition ? stageCameraPosition.z - 1.5 : stageCameraPosition.z

    // Adjust the look based on whether player is moving back or not
    zOffset += lastMovedBackward.current ? 4 : 0

    cameraControls.current.setLookAt(
      playerPosition.current.x,
      stageCameraPosition.y,
      zOffset,
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
