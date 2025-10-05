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
  SPLASH = 'splash',
  ENTRY = 'entry',
  QUESTION = 'question',
  TERRAIN = 'terrain',
  GAME_OVER = 'game_over',
}

type GameState = {
  stage: Stage
  // Normalized terrain speed in range [0, 1].
  // Consumers can scale by a constant to get world units per second.
  terrainSpeed: number
  playerPosition: { x: number; y: number; z: number }
  setPlayerPosition: (pos: { x: number; y: number; z: number }) => void

  topic: string | null

  // Questions
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
  | 'playerPosition'
  | 'topic'
  | 'questions'
  | 'currentDifficulty'
  | 'currentQuestionIndex'
  | 'currentQuestion'
  | 'confirmingAnswer'
  | 'confirmedAnswers'
  | 'isAwaitingQuestion'
> = {
  stage: Stage.SPLASH,
  terrainSpeed: 0,
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

const createGameStore = ({ fetchQuestion }: CreateStoreParams) => {
  let speedTween: GSAPTween | null = null
  const speedTweenTarget = { value: 0 }

  return createStore<GameState>()((set, get) => ({
    // Configurable parameters set on load with default values
    ...INITIAL_STATE,
    setPlayerPosition: (pos) => set({ playerPosition: pos }),
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
        return
      }
      const { confirmedAnswers: answers } = get()
      if (answers.find((a) => a.questionId === data.questionId)) {
        console.warn('Answer already confirmed for this question:', data)
        return
      }
      set({ confirmingAnswer: data })
    },
    onAnswerConfirmed: async () => {
      const { confirmingAnswer, goToStage, getAndSetNextQuestion } = get()
      if (!confirmingAnswer) {
        console.error('No answer selected to confirm')
        return
      }
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
          onComplete: () => {},
        })
        return
      }

      if (stage === Stage.QUESTION) {
        set({ stage: Stage.QUESTION })
        speedTween?.kill()
        speedTween = gsap.to(speedTweenTarget, {
          duration: 0.5,
          ease: 'power1.out',
          value: 0, // normalized
          onUpdate: () => {
            set({ terrainSpeed: speedTweenTarget.value })
          },
          onComplete: () => {},
        })
        return
      }

      if (stage === Stage.TERRAIN) {
        set({ stage: Stage.TERRAIN })
        speedTween?.kill()
        speedTween = gsap.to(speedTweenTarget, {
          duration: 2.5,
          ease: 'power2.out',
          value: 1, // normalized
          onUpdate: () => {
            set({ terrainSpeed: speedTweenTarget.value })
          },
          onComplete: () => {},
        })
      }

      if (stage === Stage.GAME_OVER) {
        set({ stage: Stage.GAME_OVER })
        speedTween?.kill()
        speedTween = gsap.to(speedTweenTarget, {
          duration: 4,
          ease: 'power2.out',
          value: 0, // normalized
          onUpdate: () => {
            set({ terrainSpeed: speedTweenTarget.value })
          },
          onComplete: () => {},
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
    // Kick off the entry movement tween on mount
    store.current.getState().goToStage(Stage.ENTRY)
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
