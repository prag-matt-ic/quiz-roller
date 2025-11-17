'use client'
import gsap from 'gsap'
import { createContext, type FC, type PropsWithChildren, useContext, useState } from 'react'
import { Vector3, type Vector3Tuple } from 'three'
import { createStore, type StoreApi, useStore } from 'zustand'
import { persist } from 'zustand/middleware'
import { PLAYER_RADIUS } from '@/components/player/PlayerHUD'
import { type PlaySoundFX, SoundFX, useSoundStore } from '@/components/SoundProvider'

export enum Stage {
  HOME = 'home',
  INFO = 'info',
  TERRAIN = 'terrain',
  CTA = 'cta',
}

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

type GameState = {
  stage: Stage

  playerInput: PlayerInput
  setPlayerInput: (input: PlayerInput) => void

  infoContentIndex: number
  setInfoContentIndex: (index: number) => void

  paletteIndex: 0 | 1 | 2
  setConfirmingPaletteIndex: (index: 0 | 1 | 2 | null) => void

  confirmationProgress: number // [0, 1]
  hudIndicator: null | 'move'

  playerWorldPosition: Vector3
  setPlayerPosition: (pos: { x: number; y: number; z: number }) => void
  edgeWarningIntensities: EdgeWarningIntensities
  setEdgeWarningIntensities: (intensities: EdgeWarningIntensities) => void

  cameraLookAtPosition: Vector3 | null // Used if you want to look at something other than the player
  setCameraLookAtPosition: (pos: Vector3 | null) => void

  onOutOfBounds: () => void

  resetGame: () => void
  resetPlayer: () => void
  resetPlatformTick: number
  resetPlayerTick: number
  goToStage: (stage: Stage) => void
}

type GameStore = StoreApi<GameState>
const GameContext = createContext<GameStore>(undefined!)

const CONFIRMING_ANSWER_DURATION_S = 2.4
const CONFIRMING_PALETTE_DURATION_S = 1.5

export const PLAYER_INITIAL_POSITION: Vector3Tuple = [0.0, PLAYER_RADIUS + 4, 2] // Used when re-spawning to home

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
  hudIndicator: 'move',
  edgeWarningIntensities: {
    left: 0,
    right: 0,
    near: 0,
    far: 0,
  },
}

const createGameStore = (playSoundFX: PlaySoundFX, stopSoundFX: (fx: SoundFX) => void) => {
  let confirmationTween: GSAPTween | null = null
  const confirmationTweenTarget = { value: 0 }

  function startConfirmation(
    set: StoreApi<GameState>['setState'],
    onComplete: () => void,
    duration: number = CONFIRMING_ANSWER_DURATION_S,
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
      // confirmingStart: null,
      // confirmingAnswer: null,
      // confirmingPaletteIndex: null,
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
    persist(
      (set, get) => ({
        ...INITIAL_STATE,
        setPlayerInput(input) {
          set({ playerInput: input })
        },
        setPlayerPosition: (position) => {
          set((s) => ({
            playerWorldPosition: s.playerWorldPosition.set(position.x, position.y, position.z),
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

        setConfirmingPaletteIndex: (newPaletteIndex) => {
          const { paletteIndex } = get()

          if (newPaletteIndex === paletteIndex) return // Already selected
          confirmationTween?.kill()

          if (newPaletteIndex === null) {
            cancelConfirmation(set)
            stopSoundFX(SoundFX.CHANGE_COLOUR)
            return
          }

          playSoundFX(SoundFX.CHANGE_COLOUR)

          set({
            // confirmingPaletteIndex: newPaletteIndex,
            confirmationProgress: 0,
          })

          const onConfirmed = () => {
            // if (get().confirmingPaletteIndex !== newPaletteIndex) return
            // set({
            //   paletteIndex: newPaletteIndex,
            //   confirmingPaletteIndex: null,
            //   confirmationProgress: 0,
            // })
          }

          startConfirmation(set, onConfirmed, CONFIRMING_PALETTE_DURATION_S)
        },

        // setConfirmingStart: (startData: StartUserData | null) => {
        //   const { stage, hasStarted, confirmingStart } = get()

        //   if (stage !== Stage.HOME || hasStarted) return

        //   if (!!startData && !!confirmingStart) return // No change
        //   confirmationTween?.kill()

        //   if (startData === null) {
        //     cancelConfirmation(set)
        //     return
        //   }

        //   set({
        //     confirmingStart: startData,
        //     // confirmingAnswer: null,
        //     confirmingPaletteIndex: null,
        //     confirmationProgress: 0,
        //   })

        //   const onConfirmed = () => {
        //     if (!!get().confirmingStart) {
        //       // get().onStartConfirmed()
        //     }
        //   }

        //   startConfirmation(set, onConfirmed)
        // },

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
          const { stage, resetPlayer, goToStage } = get()
          playSoundFX(SoundFX.OUT_OF_BOUNDS)
          if (stage === Stage.HOME) {
            resetPlayer()
          } else {
            goToStage(Stage.HOME)
          }
        },

        goToStage: (newStage: Stage) => {
          if (newStage === Stage.HOME) {
            set({ stage: Stage.HOME, hudIndicator: 'move' })
          }

          if (newStage === Stage.INFO) {
            set({ stage: Stage.INFO, hudIndicator: null })
            return
          }

          if (newStage === Stage.TERRAIN) {
            set({ stage: Stage.TERRAIN, hudIndicator: null })
            return
          }

          if (newStage === Stage.CTA) {
            set({ stage: Stage.CTA, hudIndicator: null })
            return
          }
        },
      }),
      {
        name: 'quizroller',
        partialize: (s) => ({
          paletteIndex: s.paletteIndex,
        }),
        version: 2,
      },
    ),
  )
}

type Props = PropsWithChildren

export const GameProvider: FC<Props> = ({ children }) => {
  const playSoundFX = useSoundStore((s) => s.playSoundFX)
  const stopSoundFX = useSoundStore((s) => s.stopSoundFX)
  const [store] = useState<GameStore>(createGameStore(playSoundFX, stopSoundFX))

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
