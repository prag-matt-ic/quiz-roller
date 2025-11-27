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

import {
  HIDE_POSITION_Y,
  HIDE_POSITION_Z,
  type IndexedPlacement,
  type RowData,
} from '@/utils/tiles'
import { INFO_ZONE_HEIGHT, INFO_ZONE_WIDTH } from '@/utils/platform/infoZoneDimensions'
import { InfoZone } from '@/components/infoZone/InfoZone'
import { INFO_ZONES_CONTENT } from '@/resources/content'

const INITIAL_POSITION: [number, number, number] = [0, HIDE_POSITION_Y, HIDE_POSITION_Z]

export type InfoZonesHandle = {
  moveElements: (zStep: number) => void
  positionElementsIfNeeded: (row: RowData | undefined, rowZ: number) => void
  hideElementsIfNeeded: (row: RowData | undefined) => void
}

type Assignment = {
  rowIndex: number | null
  placementIndex: number | null
}

type Props = {
  ref: RefObject<InfoZonesHandle | null>
  onReadyChange: (isReady: boolean) => void
}

const InfoZones: FC<Props> = ({ ref, onReadyChange }) => {
  const [refs] = useState(INFO_ZONES_CONTENT.map(() => createRef<RapierRigidBody | null>()))
  const [isVisibleStates, setIsVisibleStates] = useState<boolean[]>(() =>
    INFO_ZONES_CONTENT.map(() => false),
  )
  const assignments = useRef<Assignment[]>(
    INFO_ZONES_CONTENT.map(() => ({ rowIndex: null, placementIndex: null })),
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

  const setPosition = useCallback(
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

  const hideAtIndex = useCallback(
    (index: number) => {
      setPosition(index, INITIAL_POSITION[0], INITIAL_POSITION[1], INITIAL_POSITION[2])
      assignments.current[index] = { rowIndex: null, placementIndex: null }
      setIsVisibleState(index, false)
    },
    [assignments, setPosition, setIsVisibleState],
  )

  const ensurePlacement = useCallback(
    (rowIndex: number, placementIndex: number, rowZ: number, placement: IndexedPlacement) => {
      const [x, y, relativeZ, contentIndex] = placement
      if (contentIndex < 0 || contentIndex >= refs.length) return
      const assignment = assignments.current[contentIndex]
      if (assignment?.rowIndex === rowIndex && assignment.placementIndex === placementIndex)
        return
      const targetZ = rowZ + relativeZ

      if (!setPosition(contentIndex, x, y, targetZ)) return

      assignments.current[contentIndex] = { rowIndex, placementIndex }
      setIsVisibleState(contentIndex, true)
    },
    [assignments, refs.length, setPosition, setIsVisibleState],
  )

  const releaseUnusedPlacements = useCallback(
    (rowIndex: number, placementCount: number) => {
      assignments.current.forEach((assignment, index) => {
        if (assignment.rowIndex !== rowIndex) return
        if (assignment.placementIndex != null && assignment.placementIndex < placementCount)
          return
        hideAtIndex(index)
      })
    },
    [assignments, hideAtIndex],
  )

  const positionElementsIfNeeded = useCallback(
    (row: RowData | undefined, rowZ: number) => {
      if (!row?.infoZonePlacements?.length) return

      const rowIndex = row.rowIndex ?? -1
      if (rowIndex < 0) return

      row.infoZonePlacements.forEach((placement, placementIndex) => {
        ensurePlacement(rowIndex, placementIndex, rowZ, placement)
      })
      releaseUnusedPlacements(rowIndex, row.infoZonePlacements.length)
    },
    [ensurePlacement, releaseUnusedPlacements],
  )

  const hideElementsIfNeeded = useCallback(
    (row: RowData | undefined) => {
      if (!row || row.rowIndex == null) return
      assignments.current.forEach((assignment, index) => {
        if (assignment.rowIndex !== row.rowIndex) return
        hideAtIndex(index)
      })
    },
    [assignments, hideAtIndex],
  )

  const moveElements = useCallback(
    (zStep: number) => {
      if (zStep === 0) return
      assignments.current.forEach((assignment, index) => {
        if (assignment.rowIndex == null) return
        const body = refs[index]
        if (!body?.current) return
        const currentPosition = body.current.translation()
        translation.current.x = currentPosition.x
        translation.current.y = currentPosition.y
        translation.current.z = currentPosition.z + zStep
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
      {refs.map((ref, index) => {
        const content = INFO_ZONES_CONTENT[index]
        return (
          <InfoZone
            key={`info-zone-${index}`}
            ref={ref}
            position={[0, HIDE_POSITION_Y, HIDE_POSITION_Z]}
            width={INFO_ZONE_WIDTH}
            height={INFO_ZONE_HEIGHT}
            infoContainerClassName={content.containerClassName}
            isVisible={isVisibleStates[index]}>
            {content.content ?? null}
          </InfoZone>
        )
      })}
    </>
  )
}

export default InfoZones
