'use client'
import gsap from 'gsap'
import {
  createContext,
  type FC,
  type PropsWithChildren,
  type ReactNode,
  useContext,
  useEffect,
  useState,
} from 'react'
import { Vector3, type Vector3Tuple } from 'three'
import { createStore, type StoreApi, useStore, type Mutate } from 'zustand'
import { persist, subscribeWithSelector } from 'zustand/middleware'
import { PLAYER_RADIUS } from '@/components/player/PlayerHUD'
import { type PlaySoundFX, SoundFX, useSoundStore } from '@/components/SoundProvider'
import { MOVE_HUD_INDICATOR, COLLECTIBLES_HUD_CONFIG } from '@/resources/content'
import { CollectibleType } from '@/model/schema'

export enum Stage {
  HOME = 'home',
  INFO = 'info',
  TERRAIN = 'terrain',
  CTA = 'cta',
}

// TODO: Split this into store slices.

export type EdgeWarningIntensities = {
  left: number
  right: number
  near: number
  far: number
}

const clampEdgeWarningValue = (value: number) => Math.min(1, Math.max(0, value))

export type PlayerInput = {
  up: number
  down: number
  left: number
  right: number
}

export type HudIndicatorConfig = {
  content: ReactNode
  autoDismissS?: number
}
export type RingIndex = [row: number, column: number]

type GameState = {
  stage: Stage

  playerInput: PlayerInput
  setPlayerInput: (input: PlayerInput) => void

  infoContentIndex: number
  setInfoContentIndex: (index: number) => void

  paletteIndex: 0 | 1 | 2

  confirmationProgress: number // [0, 1]
  hudIndicator: HudIndicatorConfig | null
  setHudIndicator: (indicator: HudIndicatorConfig | null) => void

  confirmingCollectible: CollectibleType | null
  setConfirmingCollectible: (collectibleType: CollectibleType | null) => void
  collectedCollectibles: CollectibleType[]

  collectedRings: RingIndex[]
  onRingCollected: (indexes: RingIndex) => void

  playerWorldPosition: Vector3
  setPlayerPosition: (pos: { x: number; y: number; z: number }) => void
  edgeWarningIntensities: EdgeWarningIntensities
  setEdgeWarningIntensities: (intensities: EdgeWarningIntensities) => void

  totalRows: number
  setTotalRows: (rows: number) => void
  currentRow: number
  setCurrentRow: (row: number) => void

  cameraLookAtPosition: Vector3 | null // Used if you want to look at something other than the player
  setCameraLookAtPosition: (pos: Vector3 | null) => void

  onOutOfBounds: () => void

  resetGame: () => void
  resetPlayer: () => void
  resetPlatformTick: number
  resetPlayerTick: number
  goToStage: (stage: Stage) => void

  timeElapsed: number
}

type GameStore = Mutate<
  StoreApi<GameState>,
  [
    ['zustand/subscribeWithSelector', never],
    ['zustand/persist', Pick<GameState, 'paletteIndex'>],
  ]
>
const GameContext = createContext<GameStore>(undefined!)

const COLLECTIBLE_DURATION_S = 2.0

export const PLAYER_INITIAL_POSITION: Vector3Tuple = [0.0, PLAYER_RADIUS + 4, 0] // Used when re-spawning to home

export const PLAYER_INITIAL_POSITION_VEC3 = new Vector3(
  PLAYER_INITIAL_POSITION[0],
  PLAYER_INITIAL_POSITION[1],
  PLAYER_INITIAL_POSITION[2],
)

const INITIAL_STATE: Pick<
  GameState,
  | 'stage'
  | 'infoContentIndex'
  | 'confirmationProgress'
  | 'playerInput'
  | 'playerWorldPosition'
  | 'paletteIndex'
  | 'cameraLookAtPosition'
  | 'hudIndicator'
  | 'edgeWarningIntensities'
  | 'confirmingCollectible'
  | 'collectedCollectibles'
  | 'totalRows'
  | 'currentRow'
  | 'collectedRings'
  | 'timeElapsed'
> = {
  stage: Stage.HOME,
  infoContentIndex: 0,
  confirmationProgress: 0,
  playerWorldPosition: PLAYER_INITIAL_POSITION_VEC3,
  playerInput: {
    up: 0,
    down: 0,
    left: 0,
    right: 0,
  },
  paletteIndex: 0,
  cameraLookAtPosition: null,
  hudIndicator: MOVE_HUD_INDICATOR,
  edgeWarningIntensities: {
    left: 0,
    right: 0,
    near: 0,
    far: 0,
  },
  confirmingCollectible: null,
  collectedCollectibles: [],
  collectedRings: [],
  totalRows: 100,
  currentRow: 0,
  timeElapsed: 0,
}

const createGameStore = (playSoundFX: PlaySoundFX, stopSoundFX: (fx: SoundFX) => void) => {
  let confirmationTween: GSAPTween | null = null
  const confirmationTweenTarget = { value: 0 }

  function startConfirmation(
    set: StoreApi<GameState>['setState'],
    onComplete: () => void,
    duration: number,
  ) {
    confirmationTweenTarget.value = 0
    confirmationTween = gsap.fromTo(
      confirmationTweenTarget,
      { value: 0 },
      {
        duration,
        ease: 'none',
        value: 1,
        onUpdate: () => {
          set({ confirmationProgress: confirmationTweenTarget.value })
        },
        onComplete: () => {
          onComplete()
          confirmationTween?.kill()
          confirmationTween = null
        },
      },
    )
  }

  function cancelConfirmation(set: StoreApi<GameState>['setState']) {
    set({
      confirmingCollectible: null,
    })
    confirmationTween = gsap.to(confirmationTweenTarget, {
      duration: 0.3,
      ease: 'power2.out',
      value: 0,
      onUpdate: () => {
        set({ confirmationProgress: confirmationTweenTarget.value })
      },
      onComplete: () => {
        confirmationTweenTarget.value = 0
        confirmationTween?.kill()
        confirmationTween = null
      },
    })
  }

  return createStore<GameState>()(
    subscribeWithSelector(
      persist(
        (set, get) => ({
          ...INITIAL_STATE,
          setPlayerInput(input) {
            set({ playerInput: input })
          },
          setPlayerPosition: (position) => {
            set((s) => ({
              playerWorldPosition: s.playerWorldPosition.set(
                position.x,
                position.y,
                position.z,
              ),
            }))
          },
          setEdgeWarningIntensities: (intensities) => {
            set({
              edgeWarningIntensities: {
                left: clampEdgeWarningValue(intensities.left),
                right: clampEdgeWarningValue(intensities.right),
                near: clampEdgeWarningValue(intensities.near),
                far: clampEdgeWarningValue(intensities.far),
              },
            })
          },
          setCameraLookAtPosition: (cameraLookAtPosition) => {
            set({ cameraLookAtPosition })
          },

          setInfoContentIndex: (index) => {
            set({ infoContentIndex: index })
          },

          setHudIndicator: (indicator) => {
            set({ hudIndicator: indicator })
          },

          onRingCollected: (ringIndex: [number, number]) => {
            const isAlreadyCollected = get().collectedRings.some(
              (rc) => rc[0] === ringIndex[0] && rc[1] === ringIndex[1],
            )
            if (isAlreadyCollected) return
            set((s) => ({
              collectedRings: [...s.collectedRings, ringIndex],
            }))
            playSoundFX(SoundFX.COIN_COLLECTED)
          },

          setConfirmingCollectible: (collectibleType: CollectibleType | null) => {
            confirmationTween?.kill()

            if (collectibleType === null) {
              cancelConfirmation(set)
              set({ confirmingCollectible: null })
              stopSoundFX(SoundFX.CHANGE_COLOUR)
              return
            }

            // Don't re-confirm already collected
            if (get().collectedCollectibles.includes(collectibleType)) return

            set({
              confirmingCollectible: collectibleType,
              confirmationProgress: 0,
            })

            playSoundFX(SoundFX.CHANGE_COLOUR)

            const onConfirmed = () => {
              const currentConfirming = get().confirmingCollectible
              if (currentConfirming !== collectibleType) return
              set((s) => ({
                collectedCollectibles: [...s.collectedCollectibles, collectibleType],
                confirmingCollectible: null,
                hudIndicator: COLLECTIBLES_HUD_CONFIG[currentConfirming],
              }))
              playSoundFX(SoundFX.OPEN_INFO)
            }

            startConfirmation(set, onConfirmed, COLLECTIBLE_DURATION_S)
          },

          setTotalRows: (totalRows) => {
            set({ totalRows })
          },

          setCurrentRow: (currentRow) => {
            set({ currentRow })
          },

          resetPlatformTick: 0,
          resetPlayerTick: 0,
          resetGame: () => {
            confirmationTween?.kill()
            confirmationTween = null
            confirmationTweenTarget.value = 0
            set((s) => ({
              ...INITIAL_STATE,
              paletteIndex: s.paletteIndex,
              resetPlatformTick: s.resetPlatformTick + 1,
              resetPlayerTick: s.resetPlayerTick + 1,
            }))
          },

          resetPlayer: () => {
            set((s) => ({
              playerWorldPosition: PLAYER_INITIAL_POSITION_VEC3,
              resetPlayerTick: s.resetPlayerTick + 1,
            }))
          },

          onOutOfBounds: () => {
            playSoundFX(SoundFX.OUT_OF_BOUNDS)
            get().resetPlayer()
          },

          goToStage: (newStage: Stage) => {
            if (newStage === Stage.HOME) {
              set({ stage: Stage.HOME })
            }

            if (newStage === Stage.INFO) {
              set({ stage: Stage.INFO })
            }

            if (newStage === Stage.TERRAIN) {
              set({ stage: Stage.TERRAIN })
            }

            if (newStage === Stage.CTA) {
              set({ stage: Stage.CTA })
            }
          },
        }),
        {
          name: 'quizroller-page',
          partialize: (s) => ({
            paletteIndex: s.paletteIndex,
          }),
          version: 1,
        },
      ),
    ),
  )
}

type Props = PropsWithChildren

export const GameProvider: FC<Props> = ({ children }) => {
  const playSoundFX = useSoundStore((s) => s.playSoundFX)
  const stopSoundFX = useSoundStore((s) => s.stopSoundFX)
  const [store] = useState<GameStore>(createGameStore(playSoundFX, stopSoundFX))

  useEffect(() => {
    store.setState({ timeElapsed: 0 })

    const interval = setInterval(() => {
      store.setState((prev) => ({
        timeElapsed: prev.timeElapsed + 1,
      }))
    }, 1000) // update every second

    return () => clearInterval(interval)
  }, [store])

  return <GameContext value={store}>{children}</GameContext>
}

export function useGameStore<T>(selector: (state: GameState) => T): T {
  const store = useContext(GameContext)
  if (!store) throw new Error('Missing Provider in the tree')
  return useStore(store, selector)
}

export function useGameStoreAPI(): GameStore {
  const store = useContext(GameContext)
  if (!store) throw new Error('Missing Provider in the tree')
  return store
}
