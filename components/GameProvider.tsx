import gsap from 'gsap'
import {
  createContext,
  type FC,
  type PropsWithChildren,
  useContext,
  useEffect,
  useRef,
} from 'react'
import { createStore, type StoreApi, useStore } from 'zustand'

import { type Answer, AnswerUserData, type Question, topicQuestion } from '@/model/schema'

export enum Stage {
  INTRO = 'intro',
  QUESTION = 'question',
  TERRAIN = 'terrain',
  GAME_OVER = 'game_over',
}

type GameState = {
  stage: Stage
  terrainSpeed: number // Speed of terrain movement

  topic: string | null

  // Questions
  currentDifficulty: number
  currentQuestionIndex: number
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

const INITIAL_STATE: Pick<
  GameState,
  | 'stage'
  | 'terrainSpeed'
  | 'topic'
  | 'questions'
  | 'currentDifficulty'
  | 'currentQuestionIndex'
  | 'confirmingAnswer'
  | 'confirmedAnswers'
> = {
  stage: Stage.QUESTION,
  terrainSpeed: 0,
  topic: null,
  currentDifficulty: 0,
  questions: [topicQuestion],
  currentQuestionIndex: 0,
  confirmingAnswer: null,
  confirmedAnswers: [],
}

type CreateStoreParams = {
  fetchQuestion: ({
    topic,
    previousQuestions,
    difficulty,
  }: {
    topic: string
    previousQuestions: string[]
    difficulty: number
  }) => Promise<Question>
}

const createGameStore = ({ fetchQuestion }: CreateStoreParams) => {
  let speedTween: GSAPTween | null = null
  const speedTweenTarget = { value: 0 }

  return createStore<GameState>()((set, get) => ({
    // Configurable parameters set on load with default values
    ...INITIAL_STATE,
    getAndSetNextQuestion: async () => {
      const { topic, questions, currentDifficulty, currentQuestionIndex } = get()
      const nextQuestion = await fetchQuestion({
        topic: topic!,
        previousQuestions: [],
        difficulty: currentDifficulty,
      })
      console.warn('Question received:', nextQuestion)
      set({
        questions: [...questions, nextQuestion],
        currentQuestionIndex: currentQuestionIndex + 1,
      })
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
        set((s) => ({ ...s, confirmedAnswers: [...s.confirmedAnswers, confirmingAnswer] }))
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
      if (stage === Stage.QUESTION) {
        speedTween?.kill()
        speedTween = gsap.to(speedTweenTarget, {
          duration: 2,
          ease: 'power2.out',
          value: 0,
          onUpdate: () => {
            set({ terrainSpeed: speedTweenTarget.value })
          },
          onComplete: () => {
            set({ stage: Stage.QUESTION })
          },
        })
        return
      }

      if (stage === Stage.TERRAIN) {
        speedTween?.kill()
        speedTween = gsap.to(speedTweenTarget, {
          duration: 2,
          ease: 'power2.out',
          value: 5,
          onUpdate: () => {
            set({ terrainSpeed: speedTweenTarget.value })
          },
          onComplete: () => {
            set({ stage: Stage.TERRAIN })
          },
        })
      }

      if (stage === Stage.GAME_OVER) {
        speedTween?.kill()
        speedTween = gsap.to(speedTweenTarget, {
          duration: 4,
          ease: 'power2.out',
          value: 0,
          onUpdate: () => {
            set({ terrainSpeed: speedTweenTarget.value })
          },
          onComplete: () => {
            set({ stage: Stage.GAME_OVER })
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
