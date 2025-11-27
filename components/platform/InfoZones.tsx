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

const INFO_ZONE_SLOT_COUNT = 3
const INFO_ZONE_CONTENT_LENGTH = Math.max(1, INFO_ZONES_CONTENT.length)
const INITIAL_POSITION: [number, number, number] = [0, HIDE_POSITION_Y, HIDE_POSITION_Z]

type SlotAssignment = {
  rowIndex: number | null
  placementIndex: number | null
}

type SlotState = {
  contentIndex: number
  isPositioned: boolean
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
    Array.from({ length: INFO_ZONE_SLOT_COUNT }, () => null),
  )
  const assignments = useRef<SlotAssignment[]>(
    Array.from({ length: INFO_ZONE_SLOT_COUNT }, () => ({
      rowIndex: null,
      placementIndex: null,
    })),
  )
  const [slotStates, setSlotStates] = useState<SlotState[]>(() =>
    Array.from({ length: INFO_ZONE_SLOT_COUNT }, () => ({
      contentIndex: 0,
      isPositioned: false,
    })),
  )
  const [isVisibleStates, setIsVisibleStates] = useState<boolean[]>(() =>
    Array.from({ length: INFO_ZONE_SLOT_COUNT }, () => false),
  )
  const translation = useRef({ x: 0, y: 0, z: 0 })

  const setSlotState = useCallback((slotIndex: number, updates: Partial<SlotState>) => {
    setSlotStates((prev) => {
      const current = prev[slotIndex]
      const next = { ...current, ...updates }
      if (
        current.contentIndex === next.contentIndex &&
        current.isPositioned === next.isPositioned
      ) {
        return prev
      }
      const copy = [...prev]
      copy[slotIndex] = next
      return copy
    })
  }, [])

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

  const findExistingSlot = useCallback((rowIndex: number, placementIndex: number) => {
    return assignments.current.findIndex((assignment) => {
      if (assignment.rowIndex == null) return false
      return assignment.rowIndex === rowIndex && assignment.placementIndex === placementIndex
    })
  }, [])

  const findAvailableSlot = useCallback(() => {
    return assignments.current.findIndex((assignment) => assignment.rowIndex == null)
  }, [])

  const hideSlot = useCallback(
    (slotIndex: number) => {
      setInfoZonePosition(
        slotIndex,
        INITIAL_POSITION[0],
        INITIAL_POSITION[1],
        INITIAL_POSITION[2],
      )
      assignments.current[slotIndex] = { rowIndex: null, placementIndex: null }
      setSlotState(slotIndex, { isPositioned: false })
      setIsVisibleState(slotIndex, false)
    },
    [setInfoZonePosition, setIsVisibleState, setSlotState],
  )

  const releaseRow = useCallback(
    (rowIndex: number | null | undefined) => {
      if (rowIndex == null) return
      assignments.current.forEach((assignment, slotIndex) => {
        if (assignment.rowIndex !== rowIndex) return
        hideSlot(slotIndex)
      })
    },
    [hideSlot],
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

      let slotIndex = findExistingSlot(rowIndex, placementIndex)
      if (slotIndex === -1) {
        slotIndex = findAvailableSlot()
        if (slotIndex === -1) {
          if (process.env.NODE_ENV !== 'production') {
            console.warn(
              '[InfoZones] No available info zone slots. Increase INFO_ZONE_SLOT_COUNT.',
            )
          }
          return
        }
        assignments.current[slotIndex] = { rowIndex, placementIndex }
      }

      if (!setInfoZonePosition(slotIndex, x, y, targetZ)) return

      setSlotState(slotIndex, { contentIndex: normalizedIndex, isPositioned: true })
      setIsVisibleState(slotIndex, true)
    },
    [findAvailableSlot, findExistingSlot, setInfoZonePosition, setIsVisibleState, setSlotState],
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
      {slotStates.map((slotState, slotIndex) => {
        const normalizedIndex = normalizeContentIndex(slotState.contentIndex)
        const infoContent =
          INFO_ZONES_CONTENT.length > 0
            ? INFO_ZONES_CONTENT[normalizedIndex % INFO_ZONES_CONTENT.length]
            : undefined

        return (
          <InfoZone
            key={`info-zone-slot-${slotIndex}`}
            ref={(node) => {
              infoZoneRefs.current[slotIndex] = node
            }}
            position={[0, HIDE_POSITION_Y, HIDE_POSITION_Z]}
            width={INFO_ZONE_WIDTH}
            height={INFO_ZONE_HEIGHT}
            infoContainerClassName={infoContent?.containerClassName}
            isPositioned={slotState.isPositioned}
            isVisible={isVisibleStates[slotIndex]}>
            {infoContent?.content ?? null}
          </InfoZone>
        )
      })}
    </>
  )
}

export default InfoZones
