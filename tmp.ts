import { createGameStore } from './stores/createGameStore'

const store = createGameStore(() => undefined, () => undefined, async () => null)

console.log('hydrated?', store.getState()._isHydrated)

store.subscribe(
  (state) => state.totalTimeS,
  (value) => {
    console.log('sub value', value)
  },
)

store.setState((s) => ({ totalTimeS: s.totalTimeS + 1 }))
