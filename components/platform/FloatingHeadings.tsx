import {
  type FC,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  type RefObject,
} from 'react'
import { Mesh } from 'three'

import { FloatingHeading } from '@/components/floatingHeading/FloatingHeading'
import { FLOATING_HEADINGS_CONTENT } from '@/resources/content'
import { HIDDEN_POSITION, type IndexedPlacement, type RowData } from '@/utils/tiles'
import { HEADING_HEIGHT, HEADING_WIDTH, HEADING_Y } from '@/utils/platform/floatingHeading'
import { useSlotPool } from './useSlotPool'

const MAX_FLOATING_HEADINGS = 4
const HEADING_CONTENT_LENGTH = Math.max(1, FLOATING_HEADINGS_CONTENT.length)
const IS_DEV_ENV = process.env.NODE_ENV !== 'production'

type DebugPayload = Record<string, unknown>

const logDebug = (message: string, payload?: DebugPayload) => {
  if (!IS_DEV_ENV) return
  if (payload) {
    console.warn(`[FloatingHeadings] ${message}`, payload)
    return
  }
  console.warn(`[FloatingHeadings] ${message}`)
}

export type FloatingHeadingsHandle = {
  moveElements: (zStep: number) => void
  positionElementsIfNeeded: (row: RowData | undefined, rowZ: number) => void
  hideElementsIfNeeded: (row: RowData | undefined) => void
}

type SlotState = {
  contentIndex: number
  isVisible: boolean
}

type Props = {
  ref: RefObject<FloatingHeadingsHandle | null>
  onReadyChange: (isReady: boolean) => void
}

const FloatingHeadings: FC<Props> = ({ ref, onReadyChange }) => {
  const {
    refs,
    slotAssignments,
    slotStates,
    updateSlotState,
    resetSlotState,
    assignSlot,
    releaseSlotsForRow,
    findExistingSlot,
    findAvailableSlot,
  } = useSlotPool<Mesh, SlotState>({
    size: MAX_FLOATING_HEADINGS,
    createInitialState: () => ({
      contentIndex: 0,
      isVisible: false,
    }),
  })
  const loggedRowsRef = useRef<Set<number>>(new Set())
  const loggedPlacementsRef = useRef<Set<string>>(new Set())
  const missingHeadingSlotsRef = useRef<Set<number>>(new Set())

  const setHeadingPosition = useCallback(
    (slotIndex: number, x: number, y: number, z: number) => {
      const heading = refs[slotIndex].current
      if (!heading) {
        if (!missingHeadingSlotsRef.current.has(slotIndex)) {
          missingHeadingSlotsRef.current.add(slotIndex)
          logDebug('Missing mesh ref when positioning heading.', {
            slotIndex,
          })
        }
        return
      }

      if (missingHeadingSlotsRef.current.has(slotIndex)) {
        missingHeadingSlotsRef.current.delete(slotIndex)
      }

      heading.position.set(x, y, z + 7)
    },
    [refs, missingHeadingSlotsRef],
  )

  const ensureHeadingForPlacement = useCallback(
    (rowIndex: number, placementIndex: number, rowZ: number, placement: IndexedPlacement) => {
      const [x, y, relativeZ, contentIndex] = placement
      const normalizedContentIndex =
        ((contentIndex % HEADING_CONTENT_LENGTH) + HEADING_CONTENT_LENGTH) %
        HEADING_CONTENT_LENGTH

      const existingSlot = findExistingSlot(rowIndex, placementIndex)

      const targetZ = rowZ + relativeZ
      const placementKey = `${rowIndex}:${placementIndex}`

      if (existingSlot >= 0) {
        setHeadingPosition(existingSlot, x, y, targetZ)
        updateSlotState(existingSlot, {
          contentIndex: normalizedContentIndex,
          isVisible: true,
        })
        if (!loggedPlacementsRef.current.has(placementKey)) {
          loggedPlacementsRef.current.add(placementKey)
        }
        return
      }

      const availableSlot = findAvailableSlot()
      if (availableSlot === -1) {
        if (process.env.NODE_ENV !== 'production') {
          console.error(
            '[FloatingHeadings] Exceeded heading pool capacity. Increase MAX_FLOATING_HEADINGS.',
          )
        }
        return
      }

      assignSlot(availableSlot, { rowIndex, placementIndex })
      setHeadingPosition(availableSlot, x, y, targetZ)
      updateSlotState(availableSlot, {
        contentIndex: normalizedContentIndex,
        isVisible: true,
      })
      loggedPlacementsRef.current.add(placementKey)
    },
    [assignSlot, findAvailableSlot, findExistingSlot, setHeadingPosition, updateSlotState],
  )

  const positionElementsIfNeeded = useCallback(
    (row: RowData | undefined, rowZ: number) => {
      if (!row) return
      if (!row.floatingHeadingPlacements?.length) return
      const rowIndex = row.rowIndex ?? -1
      if (rowIndex < 0) return

      if (!loggedRowsRef.current.has(rowIndex)) {
        loggedRowsRef.current.add(rowIndex)
      }

      row.floatingHeadingPlacements.forEach((placement, placementIndex) => {
        ensureHeadingForPlacement(rowIndex, placementIndex, rowZ, placement)
      })
    },
    [ensureHeadingForPlacement],
  )

  const hideElementsIfNeeded = useCallback(
    (row: RowData | undefined) => {
      if (!row) return
      const rowIndex = row.rowIndex
      if (rowIndex != null && rowIndex >= 0) {
        loggedRowsRef.current.delete(rowIndex)
        for (const key of loggedPlacementsRef.current) {
          if (key.startsWith(`${rowIndex}:`)) {
            loggedPlacementsRef.current.delete(key)
          }
        }
      }
      releaseSlotsForRow(row.rowIndex, (slotIndex) => {
        updateSlotState(slotIndex, { isVisible: false })
        setHeadingPosition(
          slotIndex,
          HIDDEN_POSITION[0],
          HIDDEN_POSITION[1],
          HIDDEN_POSITION[2],
        )
        resetSlotState(slotIndex)
      })
    },
    [releaseSlotsForRow, resetSlotState, setHeadingPosition, updateSlotState],
  )

  const moveElements = useCallback(
    (zStep: number) => {
      if (zStep === 0) return
      slotAssignments.current.forEach((assignment, slotIndex) => {
        if (!assignment) return
        const heading = refs[slotIndex].current
        if (!heading) return
        heading.position.z += zStep
      })
    },
    [refs, slotAssignments],
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
      {slotStates.map((slotState, slotIndex) => {
        const text = FLOATING_HEADINGS_CONTENT[slotState.contentIndex] ?? ''
        return (
          <FloatingHeading
            key={`info-floating-heading-${slotIndex}`}
            ref={refs[slotIndex]}
            text={text}
            position={HIDDEN_POSITION}
            width={HEADING_WIDTH}
            height={HEADING_HEIGHT}
            isVisible={slotState.isVisible}
          />
        )
      })}
    </>
  )
}

export default FloatingHeadings
