import { createRef, type RefObject, useCallback, useRef, useState } from 'react'

type SlotAssignment = {
  rowIndex: number
  placementIndex: number
}

type UseSlotPoolOptions<TRef, TState extends Record<string, unknown>> = {
  size: number
  createInitialState: () => TState
}

type UseSlotPoolResult<TRef, TState extends Record<string, unknown>> = {
  refs: RefObject<TRef | null>[]
  slotAssignments: RefObject<Array<SlotAssignment | null>>
  slotStates: TState[]
  updateSlotState: (slotIndex: number, updates: Partial<TState>) => void
  resetSlotState: (slotIndex: number) => void
  releaseSlotsForRow: (
    rowIndex: number | null | undefined,
    onSlotReleased?: (slotIndex: number) => void,
  ) => void
  assignSlot: (slotIndex: number, assignment: SlotAssignment) => void
  findExistingSlot: (rowIndex: number, placementIndex: number) => number
  findAvailableSlot: () => number
}

export function useSlotPool<TRef, TState extends Record<string, unknown>>({
  size,
  createInitialState,
}: UseSlotPoolOptions<TRef, TState>): UseSlotPoolResult<TRef, TState> {
  const [refs] = useState(Array.from({ length: size }, () => createRef<TRef | null>()))

  const slotAssignments = useRef<Array<SlotAssignment | null>>(
    Array.from({ length: size }, () => null),
  )
  const rowToSlots = useRef<Map<number, number[]>>(new Map())
  const initialStateFactory = useRef(createInitialState)

  const [slotStates, setSlotStates] = useState<TState[]>(() =>
    Array.from({ length: size }, () => createInitialState()),
  )

  const updateSlotState = useCallback((slotIndex: number, updates: Partial<TState>) => {
    if (!Object.keys(updates).length) return
    setSlotStates((prev) => {
      const currentState = prev[slotIndex]
      let hasChange = false
      for (const key of Object.keys(updates) as Array<keyof TState>) {
        if (currentState[key] !== updates[key]) {
          hasChange = true
          break
        }
      }
      if (!hasChange) return prev
      const next = [...prev]
      next[slotIndex] = { ...currentState, ...updates }
      return next
    })
  }, [])

  const resetSlotState = useCallback((slotIndex: number) => {
    setSlotStates((prev) => {
      const next = [...prev]
      next[slotIndex] = initialStateFactory.current()
      return next
    })
  }, [])

  const releaseSlotsForRow = useCallback(
    (rowIndex: number | null | undefined, onSlotReleased?: (slotIndex: number) => void) => {
      if (rowIndex == null) return
      const slots = rowToSlots.current.get(rowIndex)
      if (!slots) return
      slots.forEach((slotIndex) => {
        slotAssignments.current[slotIndex] = null
        onSlotReleased?.(slotIndex)
      })
      rowToSlots.current.delete(rowIndex)
    },
    [],
  )

  const assignSlot = useCallback((slotIndex: number, assignment: SlotAssignment) => {
    slotAssignments.current[slotIndex] = assignment
    const slotsForRow = rowToSlots.current.get(assignment.rowIndex) ?? []
    slotsForRow.push(slotIndex)
    rowToSlots.current.set(assignment.rowIndex, slotsForRow)
  }, [])

  const findExistingSlot = useCallback((rowIndex: number, placementIndex: number) => {
    return slotAssignments.current.findIndex((assignment) => {
      if (!assignment) return false
      return assignment.rowIndex === rowIndex && assignment.placementIndex === placementIndex
    })
  }, [])

  const findAvailableSlot = useCallback(() => {
    return slotAssignments.current.findIndex((assignment) => assignment === null)
  }, [])

  return {
    refs,
    slotAssignments,
    slotStates,
    updateSlotState,
    resetSlotState,
    releaseSlotsForRow,
    assignSlot,
    findExistingSlot,
    findAvailableSlot,
  }
}
