import gsap from 'gsap'
import {
  createContext,
  type FC,
  type PropsWithChildren,
  useContext,
  useEffect,
  useRef,
} from 'react'
import { type Vector3Tuple } from 'three'
import { createStore, type StoreApi, useStore } from 'zustand'
import { persist } from 'zustand/middleware'

import {
  type AnswerUserData,
  type Question,
  type RunStats,
  Topic,
  topicQuestion,
} from '@/model/schema'
import { getNextQuestion } from '@/resources/content'

export enum Stage {
  SPLASH = 'splash',
  INTRO = 'intro',
  QUESTION = 'question',
  TERRAIN = 'terrain',
  GAME_OVER = 'game_over',
}

// TODO:
// - MF: Setup intro/entry content - so it's more about building the future of the web
// - MF: Add sound effects (background terrain, background question, correct answer, wrong answer, UI interactions)

// TODO:
// - TW: history of runs needs to omit the topic question (maybe we can re-structure store for this?)
// - TW: Add a "share my run" button on game over screen which generates a URL with topic, distance and correct answers in the query params - this should then be used in the metadata image generation.

// Implement basic performance optimisations - less floating tiles, full opacity on floor tiles.

type GameState = {
  stage: Stage
  // Consumers can scale by a constant to get world units per second.
  terrainSpeed: number // Normalized speed in range [0, 1].
  setTerrainSpeed: (speed: number) => void

  // Sound
  isMuted: boolean
  setIsMuted: (muted: boolean) => void

  playerColourIndex: number
  setPlayerColourIndex: (index: number) => void

  confirmationProgress: number // [0, 1]
  playerPosition: { x: number; y: number; z: number }
  setPlayerPosition: (pos: { x: number; y: number; z: number }) => void

  // Distance travelled in rows (increments when terrain rows recycle)
  distanceRows: number
  incrementDistanceRows: (delta: number) => void

  // Questions
  topic: Topic | null
  currentDifficulty: number
  currentQuestionIndex: number
  currentQuestion: Question
  questions: Question[]

  confirmingAnswer: AnswerUserData | null
  setConfirmingAnswer: (data: AnswerUserData | null) => void
  onAnswerConfirmed: () => void
  confirmedAnswers: AnswerUserData[]

  currentRunStats: RunStats | null
  previousRuns: Record<Topic, RunStats[]>

  resetGame: () => void
  resetTick: number
  goToStage: (stage: Stage) => void
}

type GameStore = StoreApi<GameState>
const GameContext = createContext<GameStore>(undefined!)

const CONFIRMATION_DURATION_S = 3
const INTRO_SPEED = 0.25
const TERRAIN_SPEED = 1
const STOP_SPEED = 0
const INTRO_SPEED_DURATION = 1.2
const TERRAIN_SPEED_DURATION = 2.4
const STOP_SPEED_DURATION = 0.4

// Start the player on the floor tiles (no drop-in):
// y ≈ tile top (SAFE tile) + player radius ≈ ~0.1
export const PLAYER_INITIAL_POSITION: Vector3Tuple = [0, 0.1, 4]

const INITIAL_STATE: Pick<
  GameState,
  | 'stage'
  | 'terrainSpeed'
  | 'confirmationProgress'
  | 'playerPosition'
  | 'topic'
  | 'questions'
  | 'currentDifficulty'
  | 'currentQuestionIndex'
  | 'currentQuestion'
  | 'confirmingAnswer'
  | 'confirmedAnswers'
  | 'distanceRows'
  | 'isMuted'
  | 'playerColourIndex'
  | 'currentRunStats'
  | 'previousRuns'
> = {
  stage: Stage.SPLASH,
  terrainSpeed: 0,
  confirmationProgress: 0,
  playerPosition: {
    x: PLAYER_INITIAL_POSITION[0],
    y: PLAYER_INITIAL_POSITION[1],
    z: PLAYER_INITIAL_POSITION[2],
  },
  topic: null,
  currentDifficulty: 0,
  questions: [topicQuestion],
  currentQuestion: topicQuestion,
  currentQuestionIndex: -1,
  confirmingAnswer: null,
  confirmedAnswers: [],
  distanceRows: 0,
  isMuted: true,
  playerColourIndex: 1,
  currentRunStats: null,
  previousRuns: {
    [Topic.UX_UI_DESIGN]: [],
    [Topic.ARTIFICIAL_INTELLIGENCE]: [],
  },
}

const createGameStore = () => {
  let speedTween: GSAPTween | null = null
  const speedTweenTarget = { value: 0 }
  let confirmationTween: GSAPTween | null = null
  const confirmationTweenTarget = { value: 0 }

  return createStore<GameState>()(
    persist(
      (set, get) => ({
        ...INITIAL_STATE,
        setPlayerPosition: (pos) => set({ playerPosition: pos }),
        setTerrainSpeed: (speed) => set({ terrainSpeed: speed }),
        setIsMuted: (muted) => set({ isMuted: muted }),
        setPlayerColourIndex: (index) => set({ playerColourIndex: index }),
        incrementDistanceRows: (delta = 1) =>
          set((s) => ({ distanceRows: Math.max(0, s.distanceRows + delta) })),

        setConfirmingAnswer: (answer: AnswerUserData | null) => {
          confirmationTween?.kill()

          if (answer === null) {
            set({ confirmingAnswer: null })
            confirmationTween = gsap.to(confirmationTweenTarget, {
              duration: 0.3,
              ease: 'power2.out',
              value: 0,
              onUpdate: () => {
                set({ confirmationProgress: confirmationTweenTarget.value })
              },
              onComplete: () => {
                confirmationTween!.kill()
                set({ confirmationProgress: 0 })
              },
            })
          } else {
            // Start confirming this answer
            const { confirmedAnswers, onAnswerConfirmed } = get()
            const hasAlreadyAnswered = confirmedAnswers.some(
              (answer) => answer.questionId === answer.questionId,
            )
            if (hasAlreadyAnswered) return

            set({ confirmingAnswer: answer })
            confirmationTween = gsap.fromTo(
              confirmationTweenTarget,
              {
                value: 0,
              },
              {
                duration: CONFIRMATION_DURATION_S,
                ease: 'none',
                value: 1,
                onUpdate: () => {
                  set({ confirmationProgress: confirmationTweenTarget.value })
                },
                onComplete: () => {
                  if (!!get().confirmingAnswer) onAnswerConfirmed()
                  confirmationTween!.kill()
                },
              },
            )
          }
        },

        onAnswerConfirmed: async () => {
          const { topic, currentDifficulty, confirmingAnswer, goToStage } = get()

          if (!confirmingAnswer) {
            console.error('No answer selected to confirm')
            return
          }

          confirmationTween?.kill()

          if (!confirmingAnswer.answer.isCorrect) {
            handleIncorrectAnswer({ set, confirmingAnswer, goToStage })
            return
          }

          if (!topic) {
            handleTopicSelection({ set, confirmingAnswer })
          } else {
            handleCorrectAnswer({ set, currentDifficulty, confirmingAnswer })
          }

          goToStage(Stage.TERRAIN)
        },

        resetTick: 0,
        resetGame: () => {
          speedTween?.kill()
          confirmationTween?.kill()
          speedTween = null
          confirmationTween = null
          speedTweenTarget.value = 0
          confirmationTweenTarget.value = 0

          const previousRunsToKeep = get().previousRuns
          set((s) => ({
            ...INITIAL_STATE,
            previousRuns: previousRunsToKeep,
            resetTick: s.resetTick + 1,
          }))
        },

        goToStage: (stage: Stage) => {
          if (stage === Stage.SPLASH) {
            get().resetGame()
            return
          }

          if (stage === Stage.INTRO) {
            handleIntroStage({ set, get, speedTween, speedTweenTarget })
            return
          }

          if (stage === Stage.QUESTION) {
            handleQuestionStage({ set, get })
            return
          }

          if (stage === Stage.TERRAIN) {
            handleTerrainStage({ set, speedTween, speedTweenTarget })
            return
          }

          if (stage === Stage.GAME_OVER) {
            handleGameOverStage({ set, get, speedTween, speedTweenTarget })
            return
          }
        },
      }),
      {
        name: 'quiz-roller',
        partialize: (s) => ({
          previousRuns: s.previousRuns,
          playerColourIndex: s.playerColourIndex,
        }),
      },
    ),
  )
}

// Helper functions for onAnswerConfirmed

function handleIncorrectAnswer({
  set,
  confirmingAnswer,
  goToStage,
}: {
  set: StoreApi<GameState>['setState']
  confirmingAnswer: AnswerUserData
  goToStage: (stage: Stage) => void
}) {
  console.warn('Wrong answer chosen! Game over.')
  set((s) => ({
    confirmationProgress: 0,
    confirmingAnswer: null,
    confirmedAnswers: [...s.confirmedAnswers, confirmingAnswer],
  }))
  goToStage(Stage.GAME_OVER)
}

function handleTopicSelection({
  set,
  confirmingAnswer,
}: {
  set: StoreApi<GameState>['setState']
  confirmingAnswer: AnswerUserData
}) {
  console.warn('Topic selected:', confirmingAnswer.answer.text)
  set({
    confirmationProgress: 0,
    currentDifficulty: 1,
    confirmingAnswer: null,
    topic: confirmingAnswer.answer.text as Topic,
    confirmedAnswers: [confirmingAnswer],
  })
}

function handleCorrectAnswer({
  set,
  currentDifficulty,
  confirmingAnswer,
}: {
  set: StoreApi<GameState>['setState']
  currentDifficulty: number
  confirmingAnswer: AnswerUserData
}) {
  const MAX_DIFFICULTY = 10
  const newDifficulty = Math.min(currentDifficulty + 1, MAX_DIFFICULTY)
  set((s) => ({
    confirmationProgress: 0,
    currentDifficulty: newDifficulty,
    confirmingAnswer: null,
    confirmedAnswers: [...s.confirmedAnswers, confirmingAnswer],
  }))
}

// Helper functions for goToStage

function handleIntroStage({
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
  set({ stage: Stage.INTRO })
  speedTween?.kill()
  speedTweenTarget.value = get().terrainSpeed
  gsap.to(speedTweenTarget, {
    duration: INTRO_SPEED_DURATION,
    ease: 'power2.out',
    value: INTRO_SPEED,
    onUpdate: () => {
      set({ terrainSpeed: speedTweenTarget.value })
    },
  })
}

function handleQuestionStage({
  set,
  get,
}: {
  set: StoreApi<GameState>['setState']
  get: StoreApi<GameState>['getState']
}) {
  const currentQuestionIndex = get().currentQuestionIndex
  const newQuestionIndex = currentQuestionIndex + 1

  if (newQuestionIndex === 0) {
    set({
      stage: Stage.QUESTION,
      currentQuestionIndex: newQuestionIndex,
      currentQuestion: topicQuestion,
      questions: [topicQuestion],
    })
    return
  }

  const questions = get().questions
  const askedIds = new Set<string>(questions.slice(1).map((q) => q.id))
  const newQuestion = getNextQuestion({
    topic: get().topic!,
    currentDifficulty: get().currentDifficulty,
    askedIds,
  })

  if (!newQuestion) {
    console.error('No more questions available for topic:', get().topic)
    return
  }

  set({
    stage: Stage.QUESTION,
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
  set({ stage: Stage.TERRAIN })
  speedTween?.kill()
  gsap.to(speedTweenTarget, {
    duration: TERRAIN_SPEED_DURATION,
    ease: 'power2.out',
    value: TERRAIN_SPEED,
    onUpdate: () => {
      set({ terrainSpeed: speedTweenTarget.value })
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
  const { topic, confirmedAnswers, distanceRows, currentRunStats } = get()

  if (currentRunStats) {
    set({ stage: Stage.GAME_OVER })
    return
  }

  if (!topic) {
    console.warn('[GAME_OVER] No topic set. Skipping PB compute.')
    set({
      stage: Stage.GAME_OVER,
      currentRunStats: null,
    })
    return
  }

  const totalCorrect = confirmedAnswers.filter((a) => a.answer.isCorrect).length
  const run: RunStats = {
    topic,
    correctAnswers: totalCorrect,
    distance: distanceRows,
    date: new Date(),
  }

  set((s) => {
    const existingRuns = s.previousRuns[topic] ?? []
    return {
      stage: Stage.GAME_OVER,
      currentRunStats: run,
      previousRuns: {
        ...s.previousRuns,
        [topic]: [...existingRuns, run],
      },
    }
  })

  speedTween?.kill()
  gsap.to(speedTweenTarget, {
    duration: STOP_SPEED_DURATION,
    ease: 'power2.out',
    value: STOP_SPEED,
    onUpdate: () => {
      set({ terrainSpeed: speedTweenTarget.value })
    },
  })
}

type Props = PropsWithChildren

export const GameProvider: FC<Props> = ({ children }) => {
  const store = useRef<GameStore>(createGameStore())

  useEffect(() => {
    return () => {
      // Any cleanup logic if needed when Provider is unmounted
    }
  }, [])

  return <GameContext.Provider value={store.current}>{children}</GameContext.Provider>
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
