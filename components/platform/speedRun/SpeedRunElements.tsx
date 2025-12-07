import { RapierRigidBody } from '@react-three/rapier'
import {
  type FC,
  type RefObject,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
} from 'react'

import { HIDDEN_POSITION, type RowData, TILE_SIZE } from '@/utils/tiles'

import SpeedRunLine from './SpeedRunLine'

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
  const speedRunLine = useRef<RapierRigidBody>(null)

  const positionedRowIndex = useRef<number | null>(null)

  const positionElementsIfNeeded = useCallback((row: RowData | undefined, rowZ: number) => {
    if (!row) return
    if (!speedRunLine.current) return
    const absoluteRowIndex = row.rowIndex as number
    if (positionedRowIndex.current === absoluteRowIndex) return

    const linePosition = row.finishLinePosition
    if (!!linePosition) {
      const newZ = rowZ + linePosition[2]
      translation.current.x = linePosition[0]
      translation.current.y = linePosition[1]
      translation.current.z = newZ
      speedRunLine.current.setTranslation(translation.current, true)
      positionedRowIndex.current = absoluteRowIndex
    }
  }, [])

  const hideElementsIfNeeded = useCallback((row: RowData | undefined) => {
    if (!row) return
    const shouldHideLine = !!row.finishLinePosition

    if (shouldHideLine && speedRunLine.current) {
      translation.current.x = 0
      translation.current.y = HIDDEN_POSITION[1]
      translation.current.z = HIDDEN_POSITION[2]
      speedRunLine.current.setTranslation(translation.current, true)
      positionedRowIndex.current = null
    }
  }, [])

  const moveElements = useCallback((zStep: number) => {
    if (positionedRowIndex.current == null) return
    if (!!speedRunLine.current) {
      const newZ = translation.current.z + zStep
      translation.current.z = newZ
      speedRunLine.current.setTranslation(translation.current, true)
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

  const SPEED_RUN_LINE_WIDTH = 7 * TILE_SIZE
  const SPEED_RUN_LINE_HEIGHT = 4 * TILE_SIZE
  const width = SPEED_RUN_LINE_WIDTH
  const height = SPEED_RUN_LINE_HEIGHT

  return (
    <>
      <SpeedRunLine ref={speedRunLine} width={width} height={height} />
    </>
  )
}

export default SpeedRunElements
