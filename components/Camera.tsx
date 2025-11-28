'use client'

import { CameraControls, CameraControlsImpl } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { type FC, useCallback, useEffect, useRef } from 'react'

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
  [Stage.OBSTACLES]: { y: 6, z: 8 },
  [Stage.CTA]: { y: 4, z: 10 },
  [Stage.SPEED_RUN_FINISH]: { y: 4, z: 10 },
  [Stage.TEST]: { y: 4, z: 8 },
}

export const CAMERA_POSITION_FOR_STAGE_MOBILE: Record<Stage, StageCameraPosition> = {
  [Stage.HOME]: { y: 4, z: 9 },
  [Stage.INFO]: { y: 4, z: 9 },
  [Stage.OBSTACLES]: { y: 6, z: 9 },
  [Stage.CTA]: { y: 6, z: 9 },
  [Stage.SPEED_RUN_FINISH]: { y: 4, z: 10 },
  [Stage.TEST]: { y: 4, z: 9 },
}

export const CAMERA_ZOOM_FOR_STAGE_DESKTOP: Record<Stage, number> = {
  [Stage.HOME]: 1.1,
  [Stage.INFO]: 1.1,
  [Stage.OBSTACLES]: 1.3,
  [Stage.CTA]: 1.1,
  [Stage.SPEED_RUN_FINISH]: 1.1,
  [Stage.TEST]: 1.1,
}

export const CAMERA_ZOOM_FOR_STAGE_MOBILE: Record<Stage, number> = {
  [Stage.HOME]: 1.25,
  [Stage.INFO]: 1.25,
  [Stage.OBSTACLES]: 1.3,
  [Stage.CTA]: 1.25,
  [Stage.SPEED_RUN_FINISH]: 1.25,
  [Stage.TEST]: 1.25,
}

type Props = {
  isMobile: boolean
  positions: Record<Stage, StageCameraPosition>
}

const Camera: FC<Props> = ({ isMobile, positions }) => {
  const cameraControls = useRef<CameraControls>(null)
  const { playerPosition } = usePlayerPosition()
  const playerStatus = useGameStore((s) => s.playerStatus)

  const lastMovedBackward = useRef(false)

  useEffect(() => {
    if (playerStatus !== 'normal') {
      lastMovedBackward.current = false
    }
  }, [playerStatus])

  usePlayerInput((input) => {
    if (input.down > 0) lastMovedBackward.current = true
    else if (input.up > 0) lastMovedBackward.current = false
  })

  const cameraLookAtPosition = useGameStore((s) => s.cameraLookAtPosition)

  const cameraZoomForStage = isMobile
    ? CAMERA_ZOOM_FOR_STAGE_MOBILE
    : CAMERA_ZOOM_FOR_STAGE_DESKTOP

  const handleStageChange = useCallback(
    (nextStage: Stage, previousStage: Stage) => {
      void previousStage
      if (!cameraControls.current) return
      cameraControls.current.zoomTo(cameraZoomForStage[nextStage], true)
    },
    [cameraZoomForStage],
  )

  const stage = useStage(handleStageChange)

  const hasLookAtPosition = !!cameraLookAtPosition

  useFrame(() => {
    if (!cameraControls.current) return
    const lookAt = cameraLookAtPosition ?? playerPosition.current

    // When looking at content, move camera backward to keep player visible
    const stageCameraPosition = positions[stage.current]
    let zOffset = hasLookAtPosition ? stageCameraPosition.z - 1.5 : stageCameraPosition.z

    // Adjust the look based on whether player is moving back or not
    zOffset += lastMovedBackward.current ? (isMobile ? 3 : 4) : 0

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
