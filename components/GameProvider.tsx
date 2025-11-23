'use client'
import { createContext, type FC, type PropsWithChildren, useContext, useState } from 'react'
import { useStore } from 'zustand'
import { useSoundStore } from '@/components/SoundProvider'
import { createGameStore } from '@/stores/createGameStore'
import type { GameStore } from '@/stores/types'
import type { SpeedRunSubmission, SubmitSpeedRunResponse } from '@/model/schema'

// Re-export types for backward compatibility
export {
  Stage,
  type EdgeWarningIntensities,
  type PlayerInput,
  type HudIndicatorConfig,
  type RingIndex,
} from '@/stores/types'

export { PLAYER_INITIAL_POSITION, PLAYER_INITIAL_POSITION_VEC3 } from '@/stores/playerSlice'

const GameContext = createContext<ReturnType<typeof createGameStore>>(undefined!)

type Props = PropsWithChildren<{
  submitSpeedRun: (data: SpeedRunSubmission) => SubmitSpeedRunResponse
}>

export const GameProvider: FC<Props> = ({ children, submitSpeedRun }) => {
  const playSoundFX = useSoundStore((s) => s.playSoundFX)
  const stopSoundFX = useSoundStore((s) => s.stopSoundFX)
  const [store] = useState(() => createGameStore(playSoundFX, stopSoundFX, submitSpeedRun))

  return <GameContext value={store}>{children}</GameContext>
}

export function useGameStore<T>(selector: (state: GameStore) => T): T {
  const store = useContext(GameContext)
  if (!store) throw new Error('Missing Provider in the tree')
  return useStore(store, selector)
}

export function useGameStoreAPI() {
  const store = useContext(GameContext)
  if (!store) throw new Error('Missing Provider in the tree')
  return store
}
