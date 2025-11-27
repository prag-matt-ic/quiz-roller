import { useMemo, useState } from 'react'

type ReadyState = {
  tiles: boolean
  rings: boolean
  headings: boolean
  collectibles: boolean
  infoZones: boolean
  cta: boolean
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
  cta: false,
  speedRun: false,
  floatingTiles: false,
}

const READY_STATE_KEYS: ReadyStateKey[] = Object.keys(INITIAL_READY_STATE) as ReadyStateKey[]

export default function useReadyState() {
  const [readyState, setReadyState] = useState<ReadyState>(INITIAL_READY_STATE)

  const readyChangeHandlers = useMemo<Record<ReadyStateKey, ReadyChangeHandler>>(
    () =>
      READY_STATE_KEYS.reduce(
        (handlers, key) => {
          handlers[key] = (isReady: boolean) => {
            setReadyState((prev) => ({ ...prev, [key]: isReady }))
          }
          return handlers
        },
        {} as Record<ReadyStateKey, ReadyChangeHandler>,
      ),
    [setReadyState],
  )

  return { readyState, readyChangeHandlers }
}
