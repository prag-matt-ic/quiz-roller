'use client'

import { RapierRigidBody } from '@react-three/rapier'
import {
  type FC,
  type RefObject,
  createRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react'
import { type Vector3Tuple } from 'three'

import { useGameStore } from '@/components/GameProvider'
import { PALETTE_COUNT } from '@/components/palette'
import ColourTile, {
  type ColourTileOption,
} from '@/components/platform/colourPicker/ColourTile'
import { type ColourTileUserData } from '@/model/schema'
import { HIDDEN_POSITION, type RowData, TILE_SIZE } from '@/utils/tiles'

export type ColourPickerHandle = {
  moveElements: (zStep: number) => void
  positionElementsIfNeeded: (row: RowData, rowZ: number) => void
  hideElementsIfNeeded: (row: RowData) => void
}

type Props = {
  ref: RefObject<ColourPickerHandle | null>
  onReadyChange: (isReady: boolean) => void
}

const OPTION_X_OFFSETS = [-4.5, -1.5, 1.5, 4.5].map((offset) => offset * TILE_SIZE)
const COLOUR_PICKER_Z_OFFSET = -TILE_SIZE * 0.5

const createOptions = (x: number, y: number, z: number): ColourTileOption[] =>
  OPTION_X_OFFSETS.map((offset, index) => ({
    index,
    position: [x + offset, y, z + COLOUR_PICKER_Z_OFFSET] as Vector3Tuple,
    relativeZ: 0,
    userData: {
      type: 'colour-tile',
      paletteIndex: index,
    } satisfies ColourTileUserData,
  }))

const ColourPickerRow: FC<Props> = ({ ref, onReadyChange }) => {
  const paletteIndex = useGameStore((s) => s.paletteIndex)
  const [options, setOptions] = useState<ColourTileOption[]>(() =>
    createOptions(HIDDEN_POSITION[0], HIDDEN_POSITION[1], HIDDEN_POSITION[2]),
  )

  const optionRefs = useMemo<RefObject<RapierRigidBody | null>[]>(
    () => Array.from({ length: PALETTE_COUNT }, () => createRef<RapierRigidBody | null>()),
    [],
  )

  const translation = useRef({
    x: HIDDEN_POSITION[0],
    y: HIDDEN_POSITION[1],
    z: HIDDEN_POSITION[2],
  })

  const isOutOfView = useRef(true)

  const positionElementsIfNeeded = useCallback(
    (row: RowData, rowZ: number) => {
      const placement = row.colourPickerPlacement
      if (!placement) return
      const [x, y, relativeZ] = placement
      const targetZ = rowZ + relativeZ

      setOptions(createOptions(x, y, targetZ))

      optionRefs.forEach((bodyRef, index) => {
        const body = bodyRef.current
        if (!body) return
        translation.current.x = x + OPTION_X_OFFSETS[index]
        translation.current.y = y
        translation.current.z = targetZ + COLOUR_PICKER_Z_OFFSET
        body.setTranslation(translation.current, true)
      })

      isOutOfView.current = false
    },
    [optionRefs],
  )

  const hideElementsIfNeeded = useCallback(
    (row: RowData) => {
      if (!row.colourPickerPlacement) return
      optionRefs.forEach((bodyRef) => {
        const body = bodyRef.current
        if (!body) return
        translation.current.x = HIDDEN_POSITION[0]
        translation.current.y = HIDDEN_POSITION[1]
        translation.current.z = HIDDEN_POSITION[2]
        body.setTranslation(translation.current, true)
      })
      setOptions(createOptions(HIDDEN_POSITION[0], HIDDEN_POSITION[1], HIDDEN_POSITION[2]))
      isOutOfView.current = true
    },
    [optionRefs],
  )

  const moveElements = useCallback(
    (zStep: number) => {
      if (zStep === 0 || isOutOfView.current) return
      optionRefs.forEach((bodyRef) => {
        const body = bodyRef.current
        if (!body) return
        const currentPosition = body.translation()
        translation.current.x = currentPosition.x
        translation.current.y = currentPosition.y
        translation.current.z = currentPosition.z + zStep
        body.setTranslation(translation.current, true)
      })
    },
    [optionRefs],
  )

  useImperativeHandle(
    ref,
    () => ({
      moveElements,
      positionElementsIfNeeded,
      hideElementsIfNeeded,
    }),
    [hideElementsIfNeeded, moveElements, positionElementsIfNeeded],
  )

  useEffect(() => {
    onReadyChange(true)
    return () => {
      onReadyChange(false)
    }
  }, [onReadyChange])

  return (
    <group>
      {options.map((option) => (
        <ColourTile
          ref={optionRefs[option.index]}
          key={option.index}
          option={option}
          isActive={option.index === paletteIndex}
          isOutOfView={isOutOfView}
        />
      ))}
    </group>
  )
}

export default ColourPickerRow
