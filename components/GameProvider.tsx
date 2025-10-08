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

import { type AnswerUserData, type Question, topicQuestion } from '@/model/schema'

export enum Stage {
  SPLASH = 'splash', // UI - introduction
  ENTRY = 'entry', // Pathway leading to 1st question
  QUESTION = 'question',
  TERRAIN = 'terrain',
  GAME_OVER = 'game_over',
}

// TODO:
// - TW: Correctly reset game state when restarting from game over - (player position, terrain speed, confirmed answers, current question, difficulty, etc)
// - TW: Persist the user's history personal best for each topic: { topic, correctAnswers: number, distance: number } (create topic enum value. persist store with partialize state).
// - MF: Improve question fetching logic so that it builds a buffer of future questions to avoid waiting times
// - MF: Ensure consistent experience at different framerates - terrain speed and player movement need to be framerate-independent
// - Add sound effects (background terrain, background question, correct answer, wrong answer, UI interactions)

// - TW: Update GameOver UI to include this run vs. previous best run - indicating which one was best (e.g is new run, the new best?)
// - MF: Update Splash UI - simpler, just heading, subheading, start button, volume control

// Bug: Slight bug moving player backward (-z) when the terrain is slowing down - it doesn't rotate even though player is moving backward faster than the terrain speed.

// - MF: Improve the story and splash UI - so it's more about building the future of the web

// - TW: Add trivial player customisation to the splash screen (a slider which changes marble color by adjusting palette input value.).
// - MF: Add a "share my score" button on game over screen which generates a URL with topic, distance and correct answers in the query params - this should then be used in the metadata image generation.

// - MF: Implement basic performance optimisations - less floating tiles, full opacity on floor tiles.

type GameState = {
  stage: Stage
  // Consumers can scale by a constant to get world units per second.
  terrainSpeed: number // Normalized speed in range [0, 1].
  setTerrainSpeed: (speed: number) => void

  confirmationProgress: number // [0, 1]
  playerPosition: { x: number; y: number; z: number }
  setPlayerPosition: (pos: { x: number; y: number; z: number }) => void

  // Distance travelled in rows (increments when terrain rows recycle)
  distanceRows: number
  incrementDistanceRows: (delta?: number) => void

  // Questions
  topic: string | null
  currentDifficulty: number
  currentQuestionIndex: number
  isAwaitingQuestion: boolean
  currentQuestion: Question
  questions: Question[]
  getAndSetNextQuestion: () => Promise<void>

  confirmingAnswer: AnswerUserData | null
  setConfirmingAnswer: (data: AnswerUserData | null) => void
  onAnswerConfirmed: () => void
  confirmedAnswers: AnswerUserData[] // Answers that have been confirmed

  goToStage: (stage: Stage) => void
}

type GameStore = StoreApi<GameState>
const GameContext = createContext<GameStore>(undefined!)

export const PLAYER_INITIAL_POSITION: Vector3Tuple = [0, 3, 2]

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
  | 'isAwaitingQuestion'
  | 'distanceRows'
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
  currentQuestionIndex: 0,
  confirmingAnswer: null,
  confirmedAnswers: [],
  isAwaitingQuestion: false,
  distanceRows: 0,
}

type CreateStoreParams = {
  fetchQuestion: ({
    topic,
    previousQuestions,
    difficulty,
  }: {
    topic: string
    previousQuestions: Question[]
    difficulty: number
  }) => Promise<Question>
}

const CONFIRMATION_DURATION_S = 3

const createGameStore = ({ fetchQuestion }: CreateStoreParams) => {
  let speedTween: GSAPTween | null = null
  const speedTweenTarget = { value: 0 }
  let confirmationTween: GSAPTween | null = null
  const confirmationTweenTarget = { value: 0 }

  return createStore<GameState>()((set, get) => ({
    // Configurable parameters set on load with default values
    ...INITIAL_STATE,
    setPlayerPosition: (pos) => set({ playerPosition: pos }),
    setTerrainSpeed: (speed) => set({ terrainSpeed: speed }),
    incrementDistanceRows: (delta = 1) =>
      set((s) => ({ distanceRows: Math.max(0, s.distanceRows + delta) })),
    getAndSetNextQuestion: async () => {
      const { topic, questions, currentDifficulty, currentQuestionIndex } = get()
      set({ isAwaitingQuestion: true })
      const nextQuestion = await fetchQuestion({
        topic: topic!,
        previousQuestions: questions.splice(1), // Exclude topic question
        difficulty: currentDifficulty,
      })
      console.warn('New question received:', nextQuestion)
      set((s) => ({
        questions: [...s.questions, nextQuestion],
        currentQuestionIndex: currentQuestionIndex + 1,
        isAwaitingQuestion: false,
        currentQuestion: nextQuestion,
      }))
    },
    setConfirmingAnswer: (data: AnswerUserData | null) => {
      if (!data) {
        set({ confirmingAnswer: null })
        // Animate confirmation progress back to 0
        confirmationTween?.kill()
        confirmationTween = gsap.to(confirmationTweenTarget, {
          duration: 0.4,
          ease: 'power2.out',
          value: 0,
          onUpdate: () => {
            set({ confirmationProgress: confirmationTweenTarget.value })
          },
        })
        return
      }
      const { confirmedAnswers: answers, onAnswerConfirmed } = get()
      if (answers.find((a) => a.questionId === data.questionId)) {
        console.warn('Answer already confirmed for this question:', data)
        return
      }
      set({ confirmingAnswer: data })
      // Animate confirmation progress from 0 to 1
      confirmationTween?.kill()
      confirmationTween = gsap.to(confirmationTweenTarget, {
        duration: CONFIRMATION_DURATION_S,
        ease: 'none',
        value: 1,
        onUpdate: () => {
          set({ confirmationProgress: confirmationTweenTarget.value })
        },
        onComplete: () => {
          if (!!get().confirmingAnswer) onAnswerConfirmed()
        },
      })
    },
    onAnswerConfirmed: async () => {
      const { confirmingAnswer, goToStage, getAndSetNextQuestion } = get()
      if (!confirmingAnswer) {
        console.error('No answer selected to confirm')
        return
      }

      // Kill confirmation animation
      confirmationTween?.kill()
      set({ confirmationProgress: 0 })

      if (!confirmingAnswer.answer.isCorrect) {
        console.warn('Wrong answer chosen! Game over.')
        set((s) => ({
          ...s,
          confirmingAnswer: null,
          confirmedAnswers: [...s.confirmedAnswers, confirmingAnswer],
        }))
        goToStage(Stage.GAME_OVER)
        return
      }

      const currentDifficulty = get().currentDifficulty
      const newDifficulty = Math.min(currentDifficulty + 1, 10)
      set((s) => ({
        ...s,
        currentDifficulty: newDifficulty,
        confirmingAnswer: null,
        confirmedAnswers: [...s.confirmedAnswers, confirmingAnswer],
        topic: s.topic ?? confirmingAnswer.answer.text, // 1st correct answer becomes the topic
      }))
      goToStage(Stage.TERRAIN)
      getAndSetNextQuestion()
    },

    goToStage: (stage: Stage) => {
      if (stage === Stage.SPLASH) {
        set({ ...INITIAL_STATE })
      }
      // Basic function for now, can be expanded later
      if (stage === Stage.ENTRY) {
        set({ stage: Stage.ENTRY })
        speedTween?.kill()
        speedTween = gsap.to(speedTweenTarget, {
          duration: 2,
          ease: 'power2.out',
          value: 1, // normalized
          onUpdate: () => {
            set({ terrainSpeed: speedTweenTarget.value })
          },
        })
        return
      }

      if (stage === Stage.QUESTION) {
        // Speed deceleration is handled in Terrain.tsx, synchronized with row raising
        set({ stage: Stage.QUESTION })
        return
      }

      if (stage === Stage.TERRAIN) {
        set({ stage: Stage.TERRAIN })
        speedTween?.kill()
        speedTween = gsap.to(speedTweenTarget, {
          duration: 2.4,
          ease: 'power2.out',
          value: 1, // normalized
          onUpdate: () => {
            set({ terrainSpeed: speedTweenTarget.value })
          },
        })
      }

      if (stage === Stage.GAME_OVER) {
        // TODO: store personal best if applicable
        set({ stage: Stage.GAME_OVER })
        speedTween?.kill()
        speedTween = gsap.to(speedTweenTarget, {
          duration: 0.4,
          ease: 'power2.out',
          value: 0, // normalized
          onUpdate: () => {
            set({ terrainSpeed: speedTweenTarget.value })
          },
        })
        return
      }
    },
  }))
}

type Props = PropsWithChildren<CreateStoreParams>

export const GameProvider: FC<Props> = ({ children, ...storeParams }) => {
  const store = useRef<GameStore>(createGameStore(storeParams))

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
