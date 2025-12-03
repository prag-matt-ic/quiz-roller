import {
  type FC,
  type RefObject,
  createRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useState,
} from 'react'

import { useGameStore } from '@/components/GameProvider'
import {
  type ConfettiParticleEmitterHandle,
  PARTICLE_PALETTE,
} from '@/components/platform/confetti/ConfettiParticleEmitter'
import ConfettiRow from '@/components/platform/confetti/ConfettiRow'
import useDynamicRigidBodies from '@/components/platform/useDynamicRigidBodies'
import { HIDDEN_POSITION, type RowData } from '@/utils/tiles'

export type ConfettiHandle = {
  moveElements: (zStep: number) => void
  positionElementsIfNeeded: (row: RowData, rowZ: number) => void
  hideElementsIfNeeded: (row: RowData) => void
}

type Props = {
  ref: RefObject<ConfettiHandle | null>
  onReadyChange: (isReady: boolean) => void
  palette?: readonly string[]
}

type EmitterPair = [
  RefObject<ConfettiParticleEmitterHandle | null>,
  RefObject<ConfettiParticleEmitterHandle | null>,
]

const createEmitterPairs = (count: number): EmitterPair[] =>
  Array.from({ length: count }, () => [createRef(), createRef()])

const createDimensionState = (count: number): number[] => Array.from({ length: count }, () => 1)

const ConfettiRows: FC<Props> = ({ ref, onReadyChange, palette }) => {
  const totalCount = useGameStore((s) => s.totalCounts.confetti)
  const paletteToUse = palette ?? PARTICLE_PALETTE

  const { refs, isVisibleStates, translation, applyPlacement, hideRigidBodyAtIndex } =
    useDynamicRigidBodies(totalCount)

  const [emitterRefs, setEmitterRefs] = useState<EmitterPair[]>(() =>
    createEmitterPairs(totalCount),
  )
  const [widthByIndex, setWidthByIndex] = useState<number[]>(() =>
    createDimensionState(totalCount),
  )
  const [depthByIndex, setDepthByIndex] = useState<number[]>(() =>
    createDimensionState(totalCount),
  )

  useEffect(() => {
    if (emitterRefs.length === totalCount) return
    setEmitterRefs(createEmitterPairs(totalCount))
    setWidthByIndex(createDimensionState(totalCount))
    setDepthByIndex(createDimensionState(totalCount))
  }, [emitterRefs.length, totalCount])

  const setDimensionsForIndex = useCallback((index: number, width: number, depth: number) => {
    setWidthByIndex((prev) => {
      if (prev[index] === width) return prev
      const next = [...prev]
      next[index] = width
      return next
    })
    setDepthByIndex((prev) => {
      if (prev[index] === depth) return prev
      const next = [...prev]
      next[index] = depth
      return next
    })
  }, [])

  const resetEmittersForIndex = useCallback(
    (index: number) => {
      const pair = emitterRefs[index]
      if (!pair) return
      pair[0].current?.reset()
      pair[1].current?.reset()
    },
    [emitterRefs],
  )

  const positionElementsIfNeeded = useCallback(
    (row: RowData, rowZ: number) => {
      const placements = row.confettiPlacements
      if (!placements?.length) return

      placements.forEach((placement) => {
        const { position, width, depth, contentIndex } = placement
        if (contentIndex < 0 || contentIndex >= refs.length) return
        const indexedPlacement: [number, number, number, number] = [
          position[0],
          position[1],
          position[2],
          contentIndex,
        ]
        applyPlacement(indexedPlacement, rowZ)
        setDimensionsForIndex(contentIndex, width, depth)
        resetEmittersForIndex(contentIndex)
      })
    },
    [applyPlacement, refs.length, resetEmittersForIndex, setDimensionsForIndex],
  )

  const hideElementsIfNeeded = useCallback(
    (row: RowData) => {
      const placements = row.confettiPlacements
      if (!placements?.length) return
      placements.forEach((placement) => {
        const contentIndex = placement.contentIndex
        if (contentIndex == null) return
        hideRigidBodyAtIndex(contentIndex)
        resetEmittersForIndex(contentIndex)
      })
    },
    [hideRigidBodyAtIndex, resetEmittersForIndex],
  )

  const moveElements = useCallback(
    (zStep: number) => {
      if (zStep === 0) return
      isVisibleStates.forEach((isVisible, index) => {
        if (!isVisible) return
        const body = refs[index]
        if (!body?.current) return
        const currentPosition = body.current.translation()
        translation.current.x = currentPosition.x ?? HIDDEN_POSITION[0]
        translation.current.y = currentPosition.y ?? HIDDEN_POSITION[1]
        translation.current.z = (currentPosition.z ?? HIDDEN_POSITION[2]) + zStep
        body.current.setTranslation(translation.current, true)
      })
    },
    [isVisibleStates, refs, translation],
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

  const emitterRefsMemo = useMemo(() => emitterRefs, [emitterRefs])

  return (
    <>
      {refs.map((bodyRef, index) => {
        const emitters = emitterRefsMemo[index] ?? emitterRefsMemo[0]
        const width = widthByIndex[index] ?? 1
        const depth = depthByIndex[index] ?? 1
        return (
          <ConfettiRow
            key={`confetti-${index}`}
            ref={bodyRef}
            emitterRefs={emitters}
            isVisible={isVisibleStates[index]}
            width={width}
            depth={depth}
            index={index}
            palette={paletteToUse}
          />
        )
      })}
    </>
  )
}

export default ConfettiRows
