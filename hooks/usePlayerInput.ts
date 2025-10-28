import { useEffect, useRef } from 'react'

import { type PlayerInput, useGameStoreAPI } from '@/components/GameProvider'

export function usePlayerInput(onInputChange?: (input: PlayerInput) => void) {
  const gameStoreAPI = useGameStoreAPI()
  const input = useRef(gameStoreAPI.getState().playerInput)

  useEffect(() => {
    const unsubscribe = gameStoreAPI.subscribe((state, prevState) => {
      if (state.playerInput === prevState.playerInput) return
      input.current = state.playerInput
      onInputChange?.(input.current)
    })

    return unsubscribe
  }, [gameStoreAPI, onInputChange])

  useEffect(() => {
    onInputChange?.(input.current)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return { input }
}

export default usePlayerInput
