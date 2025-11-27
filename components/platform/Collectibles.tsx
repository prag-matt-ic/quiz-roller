import {
  type FC,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
  type RefObject,
  createRef,
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

const INITIAL_POSITION: [number, number, number] = [0, HIDE_POSITION_Y, HIDE_POSITION_Z]

export type CollectiblesHandle = {
  moveElements: (zStep: number) => void
  positionElementsIfNeeded: (row: RowData | undefined, rowZ: number) => void
  hideElementsIfNeeded: (row: RowData | undefined) => void
}

type Assignment = {
  rowIndex: number | null
  placementIndex: number | null
}

type Props = {
  ref: RefObject<CollectiblesHandle | null>
  onReadyChange: (isReady: boolean) => void
}

const Collectibles: FC<Props> = ({ ref, onReadyChange }) => {
  const [refs] = useState(COLLECTIBLE_IDS.map(() => createRef<RapierRigidBody | null>()))

  const assignments = useRef<Assignment[]>(
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
      const body = refs[index]
      if (!body?.current) return false
      translation.current.x = x
      translation.current.y = y
      translation.current.z = z
      body.current.setTranslation(translation.current, true)
      return true
    },
    [refs, translation],
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

  const ensurePlacement = useCallback(
    (rowIndex: number, placementIndex: number, rowZ: number, placement: IndexedPlacement) => {
      const [x, y, relativeZ, contentIndex] = placement
      if (contentIndex < 0 || contentIndex >= refs.length) return
      const assignment = assignments.current[contentIndex]
      if (assignment?.rowIndex === rowIndex && assignment.placementIndex === placementIndex)
        return
      const targetZ = rowZ + relativeZ

      if (!setCollectiblePosition(contentIndex, x, y, targetZ)) return

      assignments.current[contentIndex] = { rowIndex, placementIndex }
      setIsVisibleState(contentIndex, true)
    },
    [assignments, refs.length, setCollectiblePosition, setIsVisibleState],
  )

  const releaseUnusedPlacements = useCallback(
    (rowIndex: number, placementCount: number) => {
      assignments.current.forEach((assignment, index) => {
        if (assignment.rowIndex !== rowIndex) return
        if (assignment.placementIndex != null && assignment.placementIndex < placementCount)
          return
        hideCollectibleAtIndex(index)
      })
    },
    [assignments, hideCollectibleAtIndex],
  )

  const positionElementsIfNeeded = useCallback(
    (row: RowData | undefined, rowZ: number) => {
      if (!row?.collectiblePlacements?.length) return
      const rowIndex = row.rowIndex ?? -1
      if (rowIndex < 0) return

      row.collectiblePlacements.forEach((placement, placementIndex) => {
        ensurePlacement(rowIndex, placementIndex, rowZ, placement)
      })
      releaseUnusedPlacements(rowIndex, row.collectiblePlacements.length)
    },
    [ensurePlacement, releaseUnusedPlacements],
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
        const body = refs[index]
        if (!body?.current) return
        const currentPosition = body.current.translation()
        translation.current.x = currentPosition?.x ?? 0
        translation.current.y = currentPosition?.y ?? 0
        translation.current.z = (currentPosition?.z ?? 0) + zStep
        body.current.setTranslation(translation.current, true)
      })
    },
    [assignments, refs, translation],
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
          ref={refs[index]}
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
