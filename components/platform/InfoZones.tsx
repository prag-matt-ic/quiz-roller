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

import { InfoZone } from '@/components/infoZone/InfoZone'
import { INFO_ZONES_CONTENT } from '@/resources/content'
import {
  HIDE_POSITION_Y,
  HIDE_POSITION_Z,
  type IndexedPlacement,
  type RowData,
} from '@/utils/tiles'
import { INFO_ZONE_HEIGHT, INFO_ZONE_WIDTH } from '@/utils/platform/infoZoneDimensions'

const INFO_ZONE_CONTENT_LENGTH = Math.max(1, INFO_ZONES_CONTENT.length)
const INITIAL_POSITION: [number, number, number] = [0, HIDE_POSITION_Y, HIDE_POSITION_Z]

type InfoZoneAssignment = {
  rowIndex: number | null
  placementIndex: number | null
}

const normalizeContentIndex = (index: number) => {
  const normalized = index % INFO_ZONE_CONTENT_LENGTH
  return normalized < 0 ? normalized + INFO_ZONE_CONTENT_LENGTH : normalized
}

export type InfoZonesHandle = {
  moveElements: (zStep: number) => void
  positionElementsIfNeeded: (row: RowData | undefined, rowZ: number) => void
  hideElementsIfNeeded: (row: RowData | undefined) => void
}

type Props = {
  ref: RefObject<InfoZonesHandle | null>
  onReadyChange: (isReady: boolean) => void
}

const InfoZones: FC<Props> = ({ ref, onReadyChange }) => {
  const infoZoneRefs = useRef<Array<RapierRigidBody | null>>(
    Array.from({ length: INFO_ZONE_CONTENT_LENGTH }, () => null),
  )
  const assignments = useRef<InfoZoneAssignment[]>(
    Array.from({ length: INFO_ZONE_CONTENT_LENGTH }, () => ({
      rowIndex: null,
      placementIndex: null,
    })),
  )
  const [isVisibleStates, setIsVisibleStates] = useState<boolean[]>(() =>
    Array.from({ length: INFO_ZONE_CONTENT_LENGTH }, () => false),
  )
  const translation = useRef({ x: 0, y: 0, z: 0 })

  const setIsVisibleState = useCallback((slotIndex: number, value: boolean) => {
    setIsVisibleStates((prev) => {
      if (prev[slotIndex] === value) return prev
      const next = [...prev]
      next[slotIndex] = value
      return next
    })
  }, [])

  const setInfoZonePosition = useCallback(
    (slotIndex: number, x: number, y: number, z: number) => {
      const body = infoZoneRefs.current[slotIndex]
      if (!body) return false
      translation.current.x = x
      translation.current.y = y
      translation.current.z = z
      body.setTranslation(translation.current, true)
      return true
    },
    [],
  )

  const hideInfoZoneAtIndex = useCallback(
    (index: number) => {
      setInfoZonePosition(index, INITIAL_POSITION[0], INITIAL_POSITION[1], INITIAL_POSITION[2])
      assignments.current[index] = { rowIndex: null, placementIndex: null }
      setIsVisibleState(index, false)
    },
    [setInfoZonePosition, setIsVisibleState],
  )

  const releaseRow = useCallback(
    (rowIndex: number | null | undefined) => {
      if (rowIndex == null) return
      assignments.current.forEach((assignment, slotIndex) => {
        if (assignment.rowIndex !== rowIndex) return
        hideInfoZoneAtIndex(slotIndex)
      })
    },
    [hideInfoZoneAtIndex],
  )

  const ensureInfoZoneForPlacement = useCallback(
    (
      rowIndex: number,
      placementIndex: number,
      rowZ: number,
      placement: IndexedPlacement | null,
    ) => {
      if (!placement) return
      const [x, y, relativeZ, contentIndex] = placement
      const normalizedIndex = normalizeContentIndex(contentIndex)
      const targetZ = rowZ + relativeZ

      if (!setInfoZonePosition(normalizedIndex, x, y, targetZ)) return

      assignments.current[normalizedIndex] = { rowIndex, placementIndex }
      setIsVisibleState(normalizedIndex, true)
    },
    [setInfoZonePosition, setIsVisibleState],
  )

  const positionElementsIfNeeded = useCallback(
    (row: RowData | undefined, rowZ: number) => {
      if (!row) return
      if (!row.infoZonePlacements?.length) return
      const rowIndex = row.rowIndex ?? -1
      if (rowIndex < 0) return

      row.infoZonePlacements.forEach((placement, placementIndex) => {
        if (!placement) return
        ensureInfoZoneForPlacement(rowIndex, placementIndex, rowZ, placement)
      })
    },
    [ensureInfoZoneForPlacement],
  )

  const hideElementsIfNeeded = useCallback(
    (row: RowData | undefined) => {
      if (!row) return
      releaseRow(row.rowIndex)
    },
    [releaseRow],
  )

  const moveElements = useCallback((zStep: number) => {
    if (zStep === 0) return
    assignments.current.forEach((assignment, slotIndex) => {
      if (assignment.rowIndex == null) return
      const body = infoZoneRefs.current[slotIndex]
      if (!body) return
      const currentTranslation = body.translation()
      translation.current.x = currentTranslation.x
      translation.current.y = currentTranslation.y
      translation.current.z = currentTranslation.z + zStep
      body.setTranslation(translation.current, true)
    })
  }, [])

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
      {Array.from({ length: INFO_ZONE_CONTENT_LENGTH }, (_, index) => {
        const infoContent =
          INFO_ZONES_CONTENT.length > 0
            ? INFO_ZONES_CONTENT[index % INFO_ZONES_CONTENT.length]
            : undefined

        return (
          <InfoZone
            key={`info-zone-${index}`}
            ref={(node) => {
              infoZoneRefs.current[index] = node
            }}
            position={[0, HIDE_POSITION_Y, HIDE_POSITION_Z]}
            width={INFO_ZONE_WIDTH}
            height={INFO_ZONE_HEIGHT}
            infoContainerClassName={infoContent?.containerClassName}
            isVisible={isVisibleStates[index]}>
            {infoContent?.content ?? null}
          </InfoZone>
        )
      })}
    </>
  )
}

export default InfoZones
