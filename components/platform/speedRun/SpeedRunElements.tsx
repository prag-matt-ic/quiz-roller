import { RapierRigidBody } from '@react-three/rapier'
import {
  type FC,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  type RefObject,
} from 'react'

import { HIDE_POSITION_Y, HIDE_POSITION_Z, TILE_SIZE, type RowData } from '@/utils/tiles'

import FinishLine from './FinishLine'

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

  const positionedRowIndex = useRef<number | null>(null)

  const positionElementsIfNeeded = useCallback((row: RowData | undefined, rowZ: number) => {
    if (!row) return
    if (row.type !== 'speed-run-finish') return
    const absoluteRowIndex = row.rowIndex as number
    if (positionedRowIndex.current === absoluteRowIndex) return

    const finishLinePos = row.finishLinePosition
    if (!!finishLinePos && finishLine.current) {
      const newZ = rowZ + finishLinePos[2]
      translation.current.x = finishLinePos[0]
      translation.current.y = finishLinePos[1]
      translation.current.z = newZ
      finishLine.current.setTranslation(translation.current, true)
      positionedRowIndex.current = absoluteRowIndex
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
      positionedRowIndex.current = null
    }
  }, [])

  const moveElements = useCallback((zStep: number) => {
    if (positionedRowIndex.current == null) return
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

  const FINISH_LINE_WIDTH = 7 * TILE_SIZE
  const FINISH_LINE_HEIGHT = 4 * TILE_SIZE
  const width = FINISH_LINE_WIDTH
  const height = FINISH_LINE_HEIGHT

  return (
    <>
      <FinishLine ref={finishLine} width={width} height={height} />
    </>
  )
}

export default SpeedRunElements
