import {
  type FC,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
  type RefObject,
} from 'react'
import { RapierRigidBody } from '@react-three/rapier'

import Collectible from '@/components/collectible/Collectible'
import { COLLECTIBLE_IDS } from '@/model/schema'
import {
  HIDE_POSITION_Y,
  HIDE_POSITION_Z,
  type IndexedPlacement,
  type RowData,
} from '@/utils/tiles'
import { INFO_ZONE_HEIGHT, INFO_ZONE_WIDTH } from '@/utils/platform/infoZoneDimensions'

const COLLECTIBLE_COUNT = COLLECTIBLE_IDS.length
const INITIAL_POSITION: [number, number, number] = [0, HIDE_POSITION_Y, HIDE_POSITION_Z]

export type CollectiblesHandle = {
  moveElements: (zStep: number) => void
  positionElementsIfNeeded: (row: RowData | undefined, rowZ: number) => void
  hideElementsIfNeeded: (row: RowData | undefined) => void
}

type CollectibleAssignment = {
  rowIndex: number | null
  placementIndex: number | null
}

const normalizeContentIndex = (index: number) => {
  if (COLLECTIBLE_COUNT === 0) return 0
  const normalized = index % COLLECTIBLE_COUNT
  return normalized < 0 ? normalized + COLLECTIBLE_COUNT : normalized
}

type Props = {
  ref: RefObject<CollectiblesHandle | null>
  onReadyChange: (isReady: boolean) => void
}

const Collectibles: FC<Props> = ({ ref, onReadyChange }) => {
  const collectibleRefs = useRef<Array<RapierRigidBody | null>>(COLLECTIBLE_IDS.map(() => null))
  const assignments = useRef<CollectibleAssignment[]>(
    COLLECTIBLE_IDS.map(() => ({ rowIndex: null, placementIndex: null })),
  )
  const [isVisibleStates, setIsVisibleStates] = useState<boolean[]>(() =>
    COLLECTIBLE_IDS.map(() => false),
  )
  const translation = useRef({ x: 0, y: 0, z: 0 })

  const setIsVisibleState = useCallback((index: number, value: boolean) => {
    setIsVisibleStates((prev) => {
      if (prev[index] === value) return prev
      const next = [...prev]
      next[index] = value
      return next
    })
  }, [])

  const setCollectiblePosition = useCallback(
    (index: number, x: number, y: number, z: number) => {
      const body = collectibleRefs.current[index]
      if (!body) return false
      translation.current.x = x
      translation.current.y = y
      translation.current.z = z
      body.setTranslation(translation.current, true)
      return true
    },
    [collectibleRefs, translation],
  )

  const hideCollectibleAtIndex = useCallback(
    (index: number) => {
      setCollectiblePosition(
        index,
        INITIAL_POSITION[0],
        INITIAL_POSITION[1],
        INITIAL_POSITION[2],
      )
      assignments.current[index] = { rowIndex: null, placementIndex: null }
      setIsVisibleState(index, false)
    },
    [assignments, setCollectiblePosition, setIsVisibleState],
  )

  const ensureCollectiblePlacement = useCallback(
    (rowIndex: number, placementIndex: number, rowZ: number, placement: IndexedPlacement) => {
      const [x, y, relativeZ, contentIndex] = placement
      const collectibleIndex = normalizeContentIndex(contentIndex)
      const targetZ = rowZ + relativeZ

      if (!setCollectiblePosition(collectibleIndex, x, y, targetZ)) return

      assignments.current[collectibleIndex] = { rowIndex, placementIndex }
      setIsVisibleState(collectibleIndex, true)
    },
    [assignments, setCollectiblePosition, setIsVisibleState],
  )

  const positionElementsIfNeeded = useCallback(
    (row: RowData | undefined, rowZ: number) => {
      if (!row?.collectiblePlacements?.length) return
      const rowIndex = row.rowIndex ?? -1
      if (rowIndex < 0) return

      row.collectiblePlacements.forEach((placement, placementIndex) => {
        ensureCollectiblePlacement(rowIndex, placementIndex, rowZ, placement)
      })
    },
    [ensureCollectiblePlacement],
  )

  const hideElementsIfNeeded = useCallback(
    (row: RowData | undefined) => {
      if (!row || row.rowIndex == null) return
      assignments.current.forEach((assignment, index) => {
        if (assignment.rowIndex !== row.rowIndex) return
        hideCollectibleAtIndex(index)
      })
    },
    [assignments, hideCollectibleAtIndex],
  )

  const moveElements = useCallback(
    (zStep: number) => {
      if (zStep === 0) return
      assignments.current.forEach((assignment, index) => {
        if (assignment.rowIndex == null) return
        const body = collectibleRefs.current[index]
        if (!body) return
        const currentPosition = body.translation()
        translation.current.x = currentPosition.x
        translation.current.y = currentPosition.y
        translation.current.z = currentPosition.z + zStep
        body.setTranslation(translation.current, true)
      })
    },
    [assignments, collectibleRefs, translation],
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
    <>
      {COLLECTIBLE_IDS.map((collectibleId, index) => (
        <Collectible
          key={`collectible-${collectibleId}`}
          ref={(node) => {
            collectibleRefs.current[index] = node
          }}
          id={collectibleId}
          position={INITIAL_POSITION}
          width={INFO_ZONE_WIDTH}
          height={INFO_ZONE_HEIGHT}
          isVisible={isVisibleStates[index]}
        />
      ))}
    </>
  )
}

export default Collectibles
