import { useEffect, useMemo, useRef } from 'react'

export type ReadyState = {
  tiles: boolean
  rings: boolean
  headings: boolean
  collectibles: boolean
  infoZones: boolean
  confetti: boolean
  speedRun: boolean
  floatingTiles: boolean
}
export type ReadyStateKey = keyof ReadyState
type ReadyChangeHandler = (isReady: boolean) => void

const INITIAL_READY_STATE: ReadyState = {
  tiles: false,
  rings: false,
  headings: false,
  collectibles: false,
  infoZones: false,
  confetti: false,
  speedRun: false,
  floatingTiles: false,
}

const READY_STATE_KEYS: ReadyStateKey[] = Object.keys(INITIAL_READY_STATE) as ReadyStateKey[]

const DEFAULT_DEPENDENCIES: unknown[] = []

export default function useReadyState(
  onStateChange?: (readyState: ReadyState) => void,
  resetDependencies: unknown[] = DEFAULT_DEPENDENCIES,
) {
  const readyState = useRef<ReadyState>(INITIAL_READY_STATE)

  // Reset ready state when dependencies change
  useEffect(() => {
    readyState.current = INITIAL_READY_STATE
    // We don't necessarily need to notify change here if the consumer
    // also resets their logic based on the same dependencies.
    // But let's be safe.
    onStateChange?.(INITIAL_READY_STATE)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, resetDependencies)

  const readyChangeHandlers = useMemo<Record<ReadyStateKey, ReadyChangeHandler>>(
    () =>
      READY_STATE_KEYS.reduce(
        (handlers, key) => {
          handlers[key] = (isReady: boolean) => {
            if (readyState.current[key] === isReady) return
            readyState.current = { ...readyState.current, [key]: isReady }
            onStateChange?.(readyState.current)
          }
          return handlers
        },
        {} as Record<ReadyStateKey, ReadyChangeHandler>,
      ),
    [onStateChange],
  )

  return { readyState: readyState.current, readyChangeHandlers }
}
