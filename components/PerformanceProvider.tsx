import { createContext, type FC, type PropsWithChildren, useContext, useRef } from 'react'
import { createStore, type StoreApi, useStore } from 'zustand'
import { persist } from 'zustand/middleware'

export type RapierSimFPS = 0 | 30 | 60 | 120 // 0 = 'vary'

export enum SceneQuality {
  HIGH = 'High',
  MEDIUM = 'Medium',
  LOW = 'Low',
}

export type SceneConfig = {
  player: {
    segments: number
    isFlat: boolean
  }
  answerTile: {
    particleCount: number
  }
  floatingTiles: {
    instanceCount: number
  }
  platformTiles: {
    addDetailNoise: boolean
  }
}

const logPerformanceDebug = (...payload: unknown[]) => {
  if (process.env.NODE_ENV !== 'development') return
  console.warn('[PerformanceProvider]', ...payload)
}

const SCENE_CONFIGS: Record<SceneQuality, SceneConfig> = {
  [SceneQuality.HIGH]: {
    answerTile: { particleCount: 81 },
    player: { segments: 64, isFlat: false },
    floatingTiles: { instanceCount: Math.pow(2, 8) },
    platformTiles: { addDetailNoise: true },
  },
  [SceneQuality.MEDIUM]: {
    player: { segments: 40, isFlat: false },
    answerTile: { particleCount: 64 },
    floatingTiles: { instanceCount: Math.pow(2, 6) },
    platformTiles: { addDetailNoise: true },
  },
  [SceneQuality.LOW]: {
    answerTile: { particleCount: 36 },
    player: { segments: 24, isFlat: true },
    floatingTiles: { instanceCount: 0 },
    platformTiles: { addDetailNoise: false },
  },
}

type PerformanceState = {
  isMobile: boolean
  maxDPR: number | undefined
  simFps: RapierSimFPS
  sceneQuality: SceneQuality
  sceneConfig: SceneConfig
  onPerformanceChange: (up: boolean) => void
  setSimFps: (fps: RapierSimFPS) => void
  setSceneQuality: (quality: SceneQuality) => void
  setMaxDpr: (value: number | undefined) => void
  isReady: boolean // Determines if the performance monitor has adjusted performance
  hasBeenManuallySet: boolean
}

type PerformanceStore = StoreApi<PerformanceState>

const PerformanceContext = createContext<PerformanceStore>(undefined!)

const PERFORMANCE_STORAGE_KEY = 'quizroller-performance'

const createPerformanceStore = (initialState: Pick<PerformanceState, 'isMobile'>) => {
  const initialQualityMode = initialState.isMobile ? SceneQuality.LOW : SceneQuality.HIGH

  logPerformanceDebug('creating store', { ...initialState, initialQualityMode })

  return createStore<PerformanceState>()(
    persist(
      (set, get) => ({
        isMobile: initialState.isMobile,
        maxDPR: undefined,
        simFps: 0,
        sceneQuality: initialQualityMode,
        sceneConfig: SCENE_CONFIGS[initialQualityMode],
        isReady: false,
        hasBeenManuallySet: false,
        setSimFps: (fps: RapierSimFPS) => {
          const previous = get().simFps
          logPerformanceDebug('simFps updated', { previous, next: fps })
          set({ simFps: fps })
        },
        setSceneQuality: (quality: SceneQuality) => {
          if (quality === get().sceneQuality) return
          set({
            sceneQuality: quality,
            sceneConfig: SCENE_CONFIGS[quality],
            hasBeenManuallySet: true,
          })
        },
        setMaxDpr: (value: number | undefined) => {
          const previous = get().maxDPR
          logPerformanceDebug('maxDPR override updated', { previous, next: value })
          set({
            maxDPR: value,
          })
        },
        onPerformanceChange: (up: boolean) => {
          const { sceneQuality, hasBeenManuallySet } = get()
          if (hasBeenManuallySet) return

          const order = Object.values(SceneQuality).reverse() // [Low, Medium, High]
          const currentIndex = order.indexOf(sceneQuality)
          const nextIndex = Math.min(
            order.length - 1,
            Math.max(0, currentIndex + (up ? 1 : -1)),
          )
          const nextMode = order[nextIndex]
          if (nextMode === sceneQuality) return

          logPerformanceDebug('sceneQuality auto adjusted', {
            direction: up ? 'up' : 'down',
            previous: sceneQuality,
            next: nextMode,
          })

          set({
            isReady: true,
            sceneQuality: nextMode,
            sceneConfig: SCENE_CONFIGS[nextMode],
          })
        },
      }),
      {
        name: PERFORMANCE_STORAGE_KEY,
        partialize: (state) => ({
          qualityMode: state.sceneQuality,
          sceneQuality: state.sceneQuality,
        }),
        onRehydrateStorage: () => (state) => {},
      },
    ),
  )
}

type Props = PropsWithChildren<{
  isMobile: boolean
}>

export const PerformanceProvider: FC<Props> = ({ children, isMobile }) => {
  const store = useRef<PerformanceStore>(createPerformanceStore({ isMobile }))
  return <PerformanceContext value={store.current}>{children}</PerformanceContext>
}

export function usePerformanceStore<T>(selector: (state: PerformanceState) => T): T {
  const store = useContext(PerformanceContext)
  if (!store) throw new Error('Missing PerformanceProvider in the tree')
  return useStore(store, selector)
}

export function usePerformanceStoreAPI(): PerformanceStore {
  const store = useContext(PerformanceContext)
  if (!store) throw new Error('Missing PerformanceProvider in the tree')
  return store
}
