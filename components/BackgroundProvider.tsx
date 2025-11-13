import { useControls } from 'leva'
import { createContext, type FC, type PropsWithChildren, useContext, useState } from 'react'
import { createStore, type StoreApi, useStore } from 'zustand'

export type BackgroundShaderConfig = {
  seedOffset: number
  grainEnabled: boolean
  grainScale: number
  grainAmplitude: number
  grainMix: number
  fbmEnabled: boolean
  fbmScale: number
  fbmOctaves: number
  fbmLacunarity: number
  fbmGain: number
  fbmMix: number
  edgeZoomStrength: number
}

const DEFAULT_SHADER_CONFIG: BackgroundShaderConfig = {
  seedOffset: 12,
  grainEnabled: true,
  grainScale: 100,
  grainAmplitude: 0.11,
  grainMix: 0.4,
  fbmEnabled: true,
  fbmScale: 6.0,
  fbmOctaves: 4,
  fbmLacunarity: 2.0,
  fbmGain: 0.5,
  fbmMix: 0.38,
  edgeZoomStrength: 0.1,
} as const

type State = {
  shaderConfig: BackgroundShaderConfig
}

type BackgroundStore = StoreApi<State>

const BackgroundContext = createContext<BackgroundStore>(undefined!)

const createBackgroundStore = () => {
  return createStore<State>((set, get) => ({
    shaderConfig: DEFAULT_SHADER_CONFIG,
  }))
}

type Props = PropsWithChildren

export const BackgroundProvider: FC<Props> = ({ children }) => {
  const [store] = useState<BackgroundStore>(createBackgroundStore())

  return (
    // Context.Provider is no longer needed in React 19.
    <BackgroundContext value={store}>
      {children}
      {/* <BackgroundControls /> */}
    </BackgroundContext>
  )
}

export function useBackgroundStore<T>(selector: (state: State) => T): T {
  const store = useContext(BackgroundContext)
  if (!store) throw new Error('Missing BackgroundProvider in the tree')
  return useStore(store, selector)
}

export function useBackgroundStoreAPI(): BackgroundStore {
  const store = useContext(BackgroundContext)
  if (!store) throw new Error('Missing BackgroundProvider in the tree')
  return store
}

const BackgroundControls: FC = () => {
  const store = useBackgroundStoreAPI()
  const setShaderConfig = (newConfig: Partial<BackgroundShaderConfig>) => {
    store.setState((s) => ({
      shaderConfig: {
        ...s.shaderConfig,
        ...newConfig,
      },
    }))
  }

  const [_, setControls] = useControls('Background', () => ({
    seedOffset: {
      value: DEFAULT_SHADER_CONFIG.seedOffset,
      min: -100,
      max: 100,
      step: 1,
      label: 'Seed Offset',
      onChange: (value: number) => {
        setShaderConfig({ seedOffset: value })
      },
    },
    grainEnabled: {
      value: DEFAULT_SHADER_CONFIG.grainEnabled,
      label: 'Grain Enabled',
      onChange: (value: boolean) => {
        setShaderConfig({ grainEnabled: value })
      },
    },
    grainScale: {
      value: DEFAULT_SHADER_CONFIG.grainScale,
      min: 32,
      max: 1024,
      step: 32,
      label: 'Grain Scale',
      onChange: (value: number) => {
        setShaderConfig({ grainScale: value })
      },
    },
    grainAmplitude: {
      value: DEFAULT_SHADER_CONFIG.grainAmplitude,
      min: 0,
      max: 5,
      step: 0.1,
      label: 'Grain Amplitude',
      onChange: (value: number) => {
        setShaderConfig({ grainAmplitude: value })
      },
    },
    grainMix: {
      value: DEFAULT_SHADER_CONFIG.grainMix,
      min: 0,
      max: 1,
      step: 0.01,
      label: 'Grain Mix',
      onChange: (value: number) => {
        setShaderConfig({ grainMix: value })
      },
    },
    fbmEnabled: {
      value: DEFAULT_SHADER_CONFIG.fbmEnabled,
      label: 'FBM Enabled',
      onChange: (value: boolean) => {
        setShaderConfig({ fbmEnabled: value })
      },
    },
    fbmScale: {
      value: DEFAULT_SHADER_CONFIG.fbmScale,
      min: 0.5,
      max: 32,
      step: 0.5,
      label: 'FBM Scale',
      onChange: (value: number) => {
        setShaderConfig({ fbmScale: value })
      },
    },
    fbmOctaves: {
      value: DEFAULT_SHADER_CONFIG.fbmOctaves,
      min: 1,
      max: 12,
      step: 1,
      label: 'FBM Octaves',
      onChange: (value: number) => {
        setShaderConfig({ fbmOctaves: value })
      },
    },
    fbmLacunarity: {
      value: DEFAULT_SHADER_CONFIG.fbmLacunarity,
      min: 1,
      max: 4,
      step: 0.1,
      label: 'FBM Lacunarity',
      onChange: (value: number) => {
        setShaderConfig({ fbmLacunarity: value })
      },
    },
    fbmGain: {
      value: DEFAULT_SHADER_CONFIG.fbmGain,
      min: 0.1,
      max: 1,
      step: 0.05,
      label: 'FBM Gain',
      onChange: (value: number) => {
        setShaderConfig({ fbmGain: value })
      },
    },
    fbmMix: {
      value: DEFAULT_SHADER_CONFIG.fbmMix,
      min: 0,
      max: 1,
      step: 0.01,
      label: 'FBM Mix',
      onChange: (value: number) => {
        setShaderConfig({ fbmMix: value })
      },
    },
    edgeZoomStrength: {
      value: DEFAULT_SHADER_CONFIG.edgeZoomStrength,
      min: 0,
      max: 0.25,
      step: 0.005,
      label: 'Edge Zoom Strength',
      onChange: (value: number) => {
        setShaderConfig({ edgeZoomStrength: value })
      },
    },
  }))

  return null

  // Sync controls with the store state
  // useEffect(() => {
  //   setControls({
  //     shaderConfig,
  //   })
  // }, [setControls, shaderConfig])
}
