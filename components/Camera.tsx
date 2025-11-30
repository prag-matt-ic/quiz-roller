'use client'

import { CameraControls, CameraControlsImpl } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { type FC, useCallback, useEffect, useRef } from 'react'

import { Stage, useGameStore } from '@/components/GameProvider'
import usePlayerInput from '@/hooks/usePlayerInput'
import { usePlayerPosition } from '@/hooks/usePlayerPosition'
import useStage from '@/hooks/useStage'

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
}

export const CAMERA_POSITION_FOR_STAGE_MOBILE: Record<Stage, StageCameraPosition> = {
  [Stage.HOME]: { y: 4, z: 8 },
  [Stage.INFO]: { y: 4, z: 8 },
  [Stage.OBSTACLES]: { y: 6, z: 8 },
  [Stage.CTA]: { y: 6, z: 8 },
  [Stage.SPEED_RUN_FINISH]: { y: 4, z: 10 },
}

export const CAMERA_ZOOM_FOR_STAGE_DESKTOP: Record<Stage, number> = {
  [Stage.HOME]: 1.1,
  [Stage.INFO]: 1.1,
  [Stage.OBSTACLES]: 1.3,
  [Stage.CTA]: 1.1,
  [Stage.SPEED_RUN_FINISH]: 1.1,
}

export const CAMERA_ZOOM_FOR_STAGE_MOBILE: Record<Stage, number> = {
  [Stage.HOME]: 1.25,
  [Stage.INFO]: 1.25,
  [Stage.OBSTACLES]: 1.3,
  [Stage.CTA]: 1.25,
  [Stage.SPEED_RUN_FINISH]: 1.25,
}

type Props = {
  isMobile: boolean
  positions: Record<Stage, StageCameraPosition>
}

const Camera: FC<Props> = ({ isMobile, positions }) => {
  const cameraControls = useRef<CameraControls>(null)
  const { playerPosition } = usePlayerPosition()
  const cameraLookAtPosition = useGameStore((s) => s.cameraLookAtPosition)
  const isConfirmingCollectible = useGameStore((s) => !!s.confirmingCollectible)

  const cameraZoomForStage = isMobile
    ? CAMERA_ZOOM_FOR_STAGE_MOBILE
    : CAMERA_ZOOM_FOR_STAGE_DESKTOP

  const currentZoom = useRef<number>(cameraZoomForStage[Stage.HOME])

  const { input } = usePlayerInput()

  const handleStageChange = useCallback(
    (nextStage: Stage) => {
      if (!cameraControls.current) return
      const zoom = cameraZoomForStage[nextStage]
      currentZoom.current = zoom
      cameraControls.current.zoomTo(zoom, true)
    },
    [cameraZoomForStage],
  )

  const stage = useStage(handleStageChange)

  useEffect(() => {
    if (!cameraControls.current) return
    if (isConfirmingCollectible) {
      cameraControls.current.zoomTo(currentZoom.current + 0.3, true)
    } else {
      cameraControls.current.zoomTo(currentZoom.current, true)
    }
  }, [isConfirmingCollectible])

  useFrame(() => {
    if (!cameraControls.current) return
    const stageCameraPosition = positions[stage.current]

    const lookAt = cameraLookAtPosition ?? playerPosition.current

    // Adjust the camera based on player input
    const positionZOffset = input.current.down > 0 ? 5 : 0
    const lookAtX = lookAt.x + input.current.right - input.current.left
    const lookAtZ = lookAt.z + input.current.down - input.current.up

    cameraControls.current.setLookAt(
      playerPosition.current.x,
      stageCameraPosition.y,
      stageCameraPosition.z + positionZOffset,
      lookAtX,
      3,
      lookAtZ,
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
