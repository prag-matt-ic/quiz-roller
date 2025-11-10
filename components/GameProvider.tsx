'use client'
import gsap from 'gsap'
import { createContext, type FC, type PropsWithChildren, useContext, useRef } from 'react'
import { Vector3, type Vector3Tuple } from 'three'
import { createStore, type StoreApi, useStore } from 'zustand'
import { persist } from 'zustand/middleware'

import {
  type AnswerUserData,
  type Question,
  type RunStats,
  type StartUserData,
} from '@/model/schema'
import { getNextQuestion } from '@/resources/content'
import { PLAYER_RADIUS } from '@/components/player/PlayerHUD'
import { type PlaySoundFX, SoundFX, useSoundStore } from '@/components/SoundProvider'

export enum Stage {
  HOME = 'home',
  QUESTION = 'question',
  TERRAIN = 'terrain',
  GAME_OVER = 'game_over',
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
  // Consumers can scale by a constant to get world units per second.
  terrainSpeed: number // Normalized speed in range [0, 1].
  setTerrainSpeed: (speed: number) => void

  playerInput: PlayerInput
  setPlayerInput: (input: PlayerInput) => void

  colourIndex: number
  confirmingColourIndex: number | null
  setConfirmingColourIndex: (index: number | null) => void

  confirmationProgress: number // [0, 1]
  hudIndicator: null | 'correct' | 'incorrect' | 'move' // Set when confirmation completes and then clear

  playerWorldPosition: Vector3
  setPlayerPosition: (pos: { x: number; y: number; z: number }) => void
  edgeWarningIntensities: EdgeWarningIntensities
  setEdgeWarningIntensities: (intensities: EdgeWarningIntensities) => void

  cameraLookAtPosition: Vector3 | null // Used if you want to look at something other than the player
  setCameraLookAtPosition: (pos: Vector3 | null) => void

  // Distance travelled in rows (increments when terrain rows recycle)
  distanceRows: number
  incrementDistanceRows: (delta: number) => void

  // Start confirmation
  hasStarted: boolean
  confirmingStart: StartUserData | null
  setConfirmingStart: (data: StartUserData | null) => void
  onStartConfirmed: () => void

  // Questions
  currentDifficulty: number
  currentQuestionIndex: number
  currentQuestion: Question | null
  questions: Question[]
  confirmingAnswer: AnswerUserData | null
  setConfirmingAnswer: (data: AnswerUserData | null) => void
  onAnswerConfirmed: () => void
  confirmedAnswers: AnswerUserData[]

  currentRun: RunStats | null
  previousRuns: RunStats[]

  onOutOfBounds: () => void

  resetGame: () => void
  resetPlayer: () => void
  resetPlatformTick: number
  resetPlayerTick: number
  goToStage: (stage: Stage) => void
}

type GameStore = StoreApi<GameState>
const GameContext = createContext<GameStore>(undefined!)

const MAX_DIFFICULTY = 3
const CONFIRMING_ANSWER_DURATION_S = 2.4
const CONFIRMING_COLOUR_DURATION_S = 1.5
const TERRAIN_SPEED_DURATION = 2.4

export const PLAYER_INITIAL_POSITION: Vector3Tuple = [0.0, PLAYER_RADIUS + 4, 2] // Used when re-spawning to home

export const PLAYER_INITIAL_POSITION_VEC3 = new Vector3(
  PLAYER_INITIAL_POSITION[0],
  PLAYER_INITIAL_POSITION[1],
  PLAYER_INITIAL_POSITION[2],
)

const INITIAL_STATE: Pick<
  GameState,
  | 'stage'
  | 'terrainSpeed'
  | 'confirmationProgress'
  | 'playerInput'
  | 'playerWorldPosition'
  | 'hasStarted'
  | 'confirmingStart'
  | 'confirmingColourIndex'
  | 'questions'
  | 'currentDifficulty'
  | 'currentQuestionIndex'
  | 'currentQuestion'
  | 'confirmingAnswer'
  | 'confirmedAnswers'
  | 'distanceRows'
  | 'colourIndex'
  | 'currentRun'
  | 'previousRuns'
  | 'cameraLookAtPosition'
  | 'hudIndicator'
  | 'edgeWarningIntensities'
> = {
  stage: Stage.HOME,
  terrainSpeed: 0,
  confirmationProgress: 0,
  playerWorldPosition: PLAYER_INITIAL_POSITION_VEC3,
  hasStarted: false,
  playerInput: {
    up: 0,
    down: 0,
    left: 0,
    right: 0,
  },
  confirmingStart: null,
  currentDifficulty: 1,
  questions: [],
  currentQuestion: null,
  currentQuestionIndex: 0,
  confirmingAnswer: null,
  confirmedAnswers: [],
  distanceRows: 0,
  colourIndex: 1,
  confirmingColourIndex: null,
  currentRun: null,
  cameraLookAtPosition: null,
  previousRuns: [],
  hudIndicator: null,
  edgeWarningIntensities: {
    left: 0,
    right: 0,
    near: 0,
    far: 0,
  },
}

const createGameStore = (playSoundFX: PlaySoundFX, stopSoundFX: (fx: SoundFX) => void) => {
  let speedTween: GSAPTween | null = null
  const speedTweenTarget = { value: 0 }
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
      confirmingStart: null,
      confirmingAnswer: null,
      confirmingColourIndex: null,
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
        setTerrainSpeed: (terrainSpeed) => set({ terrainSpeed }),

        incrementDistanceRows: (delta = 1) =>
          set((s) => ({ distanceRows: Math.max(0, s.distanceRows + delta) })),

        setConfirmingColourIndex: (newColourIndex) => {
          const { colourIndex } = get()

          if (newColourIndex === colourIndex) return // Already selected
          confirmationTween?.kill()

          if (newColourIndex === null) {
            cancelConfirmation(set)
            stopSoundFX(SoundFX.CHANGE_COLOUR)
            return
          }

          playSoundFX(SoundFX.CHANGE_COLOUR)

          set({
            confirmingColourIndex: newColourIndex,
            confirmingStart: null,
            confirmingAnswer: null,
            confirmationProgress: 0,
          })

          const onConfirmed = () => {
            if (get().confirmingColourIndex !== newColourIndex) return
            set({
              colourIndex: newColourIndex,
              confirmingColourIndex: null,
              confirmationProgress: 0,
            })
          }

          startConfirmation(set, onConfirmed, CONFIRMING_COLOUR_DURATION_S)
        },

        setConfirmingStart: (startData: StartUserData | null) => {
          const { stage, hasStarted, confirmingStart } = get()

          if (stage !== Stage.HOME || hasStarted) return

          if (!!startData && !!confirmingStart) return // No change
          confirmationTween?.kill()

          if (startData === null) {
            cancelConfirmation(set)
            return
          }

          set({
            confirmingStart: startData,
            confirmingAnswer: null,
            confirmingColourIndex: null,
            confirmationProgress: 0,
          })

          const onConfirmed = () => {
            if (!!get().confirmingStart) {
              get().onStartConfirmed()
            }
          }

          startConfirmation(set, onConfirmed)
        },

        setConfirmingAnswer: (answer: AnswerUserData | null) => {
          const { confirmingAnswer, confirmedAnswers, onAnswerConfirmed } = get()
          if (answer?.questionId === confirmingAnswer?.questionId) return // No change

          confirmationTween?.kill()

          if (answer === null) {
            cancelConfirmation(set)
            return
          }

          const hasAlreadyAnswered = confirmedAnswers.some(
            ({ questionId }) => questionId === answer.questionId,
          )
          if (hasAlreadyAnswered) return

          set({
            confirmingAnswer: answer,
            confirmingStart: null,
            confirmingColourIndex: null,
            confirmationProgress: 0,
          })

          const onConfirmed = () => {
            if (!!get().confirmingAnswer) onAnswerConfirmed()
          }

          startConfirmation(set, onConfirmed)
        },

        onStartConfirmed: () => {
          const { confirmingStart, goToStage } = get()

          if (!confirmingStart) {
            console.error('No start tile selected to confirm')
            return
          }

          const firstQuestion = getNextQuestion({
            currentDifficulty: 1,
            askedIds: new Set(),
          })

          if (!firstQuestion) {
            console.error('No questions available to start the game')
            set({ confirmingStart: null, confirmationProgress: 0 })
            return
          }

          set({
            hasStarted: true,
            questions: [firstQuestion],
            currentQuestionIndex: 0,
            currentQuestion: firstQuestion,
            confirmingStart: null,
          })

          goToStage(Stage.TERRAIN)
        },

        onAnswerConfirmed: async () => {
          const { confirmingAnswer } = get()

          if (!confirmingAnswer) {
            console.error('No answer selected to confirm')
            return
          }

          confirmationTween?.kill()

          if (confirmingAnswer.answer.isCorrect) {
            handleCorrectAnswer({ confirmingAnswer, set })
            playSoundFX(SoundFX.CORRECT_ANSWER)
          } else {
            handleIncorrectAnswer({ confirmingAnswer, set })
            playSoundFX(SoundFX.INCORRECT_ANSWER)
          }
        },

        resetPlatformTick: 0,
        resetPlayerTick: 0,
        resetGame: () => {
          speedTween?.kill()
          confirmationTween?.kill()
          speedTween = null
          confirmationTween = null
          speedTweenTarget.value = 0
          confirmationTweenTarget.value = 0
          set((s) => ({
            ...INITIAL_STATE,
            colourIndex: s.colourIndex,
            previousRuns: s.previousRuns,
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
            goToStage(Stage.GAME_OVER)
          }
        },

        goToStage: (newStage: Stage) => {
          if (get().stage === Stage.GAME_OVER) return // Prevent moving to other stages from GAME_OVER

          if (newStage === Stage.QUESTION) {
            handleQuestionStage({ set, get })
            return
          }

          if (newStage === Stage.TERRAIN) {
            handleTerrainStage({ set, speedTween, speedTweenTarget })
            return
          }

          if (newStage === Stage.GAME_OVER) {
            handleGameOverStage({ set, get, speedTween, speedTweenTarget })
            return
          }
        },
      }),
      {
        name: 'quizroller',
        partialize: (s) => ({
          previousRuns: s.previousRuns,
          playerColourIndex: s.colourIndex,
        }),
        version: 1,
      },
    ),
  )
}

function handleIncorrectAnswer({
  set,
  confirmingAnswer,
}: {
  set: StoreApi<GameState>['setState']
  confirmingAnswer: AnswerUserData
}) {
  set((s) => ({
    confirmingAnswer: null,
    confirmedAnswers: [...s.confirmedAnswers, confirmingAnswer],
    hudIndicator: 'incorrect',
  }))
}

function handleCorrectAnswer({
  set,
  confirmingAnswer,
}: {
  confirmingAnswer: AnswerUserData
  set: StoreApi<GameState>['setState']
}) {
  set((s) => {
    const newConfirmedAnswers = [...s.confirmedAnswers, confirmingAnswer]
    const totalCorrect = newConfirmedAnswers.filter((a) => a.answer.isCorrect).length

    // Increment difficulty every 2 correct answers
    const newDifficulty = Math.min(Math.floor(totalCorrect / 2) + 1, MAX_DIFFICULTY)

    return {
      currentDifficulty: newDifficulty,
      confirmingAnswer: null,
      confirmedAnswers: newConfirmedAnswers,
      hudIndicator: 'correct',
    }
  })
}

// Helper functions for goToStage

function handleQuestionStage({
  set,
  get,
}: {
  set: StoreApi<GameState>['setState']
  get: StoreApi<GameState>['getState']
}) {
  const currentQuestionIndex = get().currentQuestionIndex
  const newQuestionIndex = currentQuestionIndex + 1

  const questions = get().questions
  const askedIds = new Set<string>(questions.map((q) => q.id))
  const newQuestion = getNextQuestion({
    currentDifficulty: get().currentDifficulty,
    askedIds,
  })

  if (!newQuestion) {
    console.error('No more questions available')
    return
  }

  set({
    stage: Stage.QUESTION,
    confirmationProgress: 0,
    currentQuestionIndex: newQuestionIndex,
    currentQuestion: newQuestion,
    questions: [...questions, newQuestion],
  })
}

function handleTerrainStage({
  set,
  speedTween,
  speedTweenTarget,
}: {
  set: StoreApi<GameState>['setState']
  speedTween: GSAPTween | null
  speedTweenTarget: { value: number }
}) {
  set({ stage: Stage.TERRAIN, hudIndicator: 'move' }) // Updates confirmation result to show prompt to move..
  speedTween?.kill()
  gsap.to(speedTweenTarget, {
    duration: TERRAIN_SPEED_DURATION,
    ease: 'power2.out',
    value: 1.0,
    onUpdate: () => {
      set({ terrainSpeed: speedTweenTarget.value })
    },
    onComplete: () => {
      set({ hudIndicator: null })
    },
  })
}

function handleGameOverStage({
  set,
  get,
  speedTween,
  speedTweenTarget,
}: {
  set: StoreApi<GameState>['setState']
  get: StoreApi<GameState>['getState']
  speedTween: GSAPTween | null
  speedTweenTarget: { value: number }
}) {
  const { confirmedAnswers, distanceRows } = get()

  speedTween?.kill()
  gsap.to(speedTweenTarget, {
    duration: 0.4,
    ease: 'power2.out',
    value: 0,
    onUpdate: () => {
      set({ terrainSpeed: speedTweenTarget.value })
    },
  })

  // if (!hasStarted) {
  //   console.warn('[GAME_OVER] Run was never started. Skipping PB compute.')
  //   set({
  //     stage: Stage.GAME_OVER,
  //     currentRunStats: null,
  //   })
  //   return
  // }

  const totalCorrect = confirmedAnswers.filter((a) => a.answer.isCorrect).length
  const run: RunStats = {
    correctAnswers: totalCorrect,
    distance: distanceRows,
    date: new Date(),
  }

  console.log('[GAME_OVER] Run stats computed:', { run })

  set((s) => ({
    stage: Stage.GAME_OVER,
    currentRun: run,
    hasStarted: false,
    previousRuns: [...s.previousRuns, run],
  }))
}

type Props = PropsWithChildren

export const GameProvider: FC<Props> = ({ children }) => {
  const playSoundFX = useSoundStore((s) => s.playSoundFX)
  const stopSoundFX = useSoundStore((s) => s.stopSoundFX)
  const store = useRef<GameStore>(createGameStore(playSoundFX, stopSoundFX))

  return <GameContext value={store.current}>{children}</GameContext>
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
