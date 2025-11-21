import {
  CuboidCollider,
  type IntersectionEnterHandler,
  type IntersectionExitHandler,
  RapierRigidBody,
  RigidBody,
} from '@react-three/rapier'
import {
  type FC,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  type RefObject,
} from 'react'

import { HIDE_POSITION_Y, HIDE_POSITION_Z, TILE_SIZE, type RowData } from '@/utils/tiles'

import { type RigidBodyUserData, type FinishLineUserData } from '@/model/schema'
import { COLLISION_GROUPS } from '@/utils/collisionGroups'
import { PLAYER_RADIUS } from '@/components/player/PlayerHUD'
import { useGameStore } from '@/components/GameProvider'

export type SpeedRunElementsHandle = {
  moveElements: (zStep: number) => void
  positionElementsIfNeeded: (row: RowData | undefined, rowZ: number) => void
  hideElementsIfNeeded: (row: RowData | undefined) => void
}

type Props = {
  ref: RefObject<SpeedRunElementsHandle | null>
  onReadyChange: (isReady: boolean) => void
}

const SpeedRunElements: FC<Props> = ({ ref, onReadyChange }) => {
  const translation = useRef({ x: 0, y: 0, z: 0 })
  const finishLine = useRef<RapierRigidBody>(null)

  const finishSpeedRun = useGameStore((s) => s.finishSpeedRun)

  const positionElementsIfNeeded = useCallback((row: RowData | undefined, rowZ: number) => {
    if (!row) return
    if (row.type !== 'speed-run-finish') return

    const finishLinePos = row.finishLinePosition
    if (!!finishLinePos && finishLine.current) {
      const newZ = rowZ + finishLinePos[2]
      translation.current.x = finishLinePos[0]
      translation.current.y = finishLinePos[1]
      translation.current.z = newZ
      finishLine.current.setTranslation(translation.current, true)
    }
  }, [])

  const hideElementsIfNeeded = useCallback((row: RowData | undefined) => {
    if (!row) return
    if (row.type !== 'speed-run-finish') return

    const shouldHideFinishLine = !!row.finishLinePosition

    if (shouldHideFinishLine && finishLine.current) {
      translation.current.x = 0
      translation.current.y = HIDE_POSITION_Y
      translation.current.z = HIDE_POSITION_Z
      finishLine.current.setTranslation(translation.current, true)
    }
  }, [])

  const moveElements = useCallback((zStep: number) => {
    if (!!finishLine.current) {
      const currentTranslation = finishLine.current.translation()
      const newZ = currentTranslation.z + zStep
      translation.current.x = currentTranslation.x
      translation.current.y = currentTranslation.y
      translation.current.z = newZ
      finishLine.current.setTranslation(translation.current, true)
    }
  }, [])

  useImperativeHandle(
    ref,
    () => ({
      moveElements,
      positionElementsIfNeeded,
      hideElementsIfNeeded,
    }),
    [moveElements, positionElementsIfNeeded, hideElementsIfNeeded],
  )

  useEffect(() => {
    onReadyChange(true)
    return () => {
      onReadyChange(false)
    }
  }, [onReadyChange])

  const lookAtInfo = () => {
    // if (!ref || !ref.current) return
    // const currentTranslation = ref.current.translation()
    // const targetPosition = new Vector3(
    //   currentTranslation.x - infoPositionOffset[0],
    //   currentTranslation.y - infoPositionOffset[1],
    //   currentTranslation.z - infoPositionOffset[2],
    // )
    // setCameraLookAtPosition(targetPosition)
  }

  const onIntersectionEnter: IntersectionEnterHandler = (event) => {
    const otherUserData = event.other.rigidBodyObject?.userData as RigidBodyUserData
    if (!otherUserData) return
    if (otherUserData.type !== 'player') return
    finishSpeedRun()
    lookAtInfo()
  }

  const onIntersectionExit: IntersectionExitHandler = (event) => {
    const otherUserData = event.other.rigidBodyObject?.userData as RigidBodyUserData
    if (!otherUserData) return
    if (otherUserData.type !== 'player') return
  }

  const userData: FinishLineUserData = {
    type: 'finish-line',
  }

  const FINISH_LINE_WIDTH = 7 * TILE_SIZE
  const FINISH_LINE_HEIGHT = 4 * TILE_SIZE
  const width = FINISH_LINE_WIDTH
  const height = FINISH_LINE_HEIGHT

  return (
    <>
      {/* Finish Line */}
      <RigidBody
        ref={finishLine}
        // KEEP DYNAMIC
        type="dynamic"
        gravityScale={0}
        friction={0}
        mass={0}
        position={[0, HIDE_POSITION_Y, HIDE_POSITION_Z]}
        rotation={[-Math.PI / 2, 0, 0]}
        colliders={false}
        userData={userData}>
        <CuboidCollider
          args={[width / 2, height / 2, PLAYER_RADIUS * 2]}
          sensor={true}
          mass={0}
          friction={0}
          onIntersectionEnter={onIntersectionEnter}
          onIntersectionExit={onIntersectionExit}
          collisionGroups={COLLISION_GROUPS.finishLineSensor}
        />
        <mesh position={[0, 0, 0.01]} renderOrder={2}>
          <planeGeometry args={[width, height]} />
          <meshBasicMaterial color="red" transparent={true} opacity={1} />
        </mesh>
      </RigidBody>
    </>
  )
}

export default SpeedRunElements
