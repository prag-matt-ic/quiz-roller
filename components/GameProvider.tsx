import {
  createContext,
  type FC,
  type PropsWithChildren,
  useContext,
  useEffect,
  useRef,
} from 'react'
import { createStore, type StoreApi, useStore } from 'zustand'

import { Answer, Question, topicQuestion } from '@/model/schema'

export enum Stage {
  INTRO = 'intro',
  QUESTION = 'question',
  TERRAIN = 'terrain',
  GAME_OVER = 'game_over',
}

type GameState = {
  stage: Stage
  terrainSpeed: number // Speed of terrain movement

  // Questions
  currentDifficulty: number
  currentQuestionIndex: number
  questions: Question[]

  // Player interaction
  topic: string | null
  confirmingTopic: string | null
  setConfirmingTopic: (topic: string | null) => void
  onTopicConfirmed: () => void

  confirmingAnswer: Answer | null
  setConfirmingAnswer: (answer: Answer | null) => void
  onAnswerConfirmed: () => void
  answerIds: string[] // Answers that have been confirmed

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
  | 'confirmingTopic'
  | 'confirmingAnswer'
  | 'answerIds'
> = {
  stage: Stage.QUESTION,
  terrainSpeed: 0,
  topic: null,
  confirmingTopic: null,
  currentDifficulty: 1,
  questions: [topicQuestion],
  currentQuestionIndex: 0,
  confirmingAnswer: null,
  answerIds: [],
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
  return createStore<GameState>()((set, get) => ({
    // Configurable parameters set on load with default values
    ...INITIAL_STATE,

    setConfirmingTopic: (topic) => {
      console.warn('Topic selected:', topic)
      set({ confirmingTopic: topic })
    },
    onTopicConfirmed: async () => {
      const { confirmingTopic, questions, currentQuestionIndex, goToStage } = get()
      if (!confirmingTopic) {
        console.error('No topic selected to confirm')
        return
      }

      set({
        topic: confirmingTopic,
        confirmingTopic: null,
      })

      goToStage(Stage.TERRAIN)

      const nextQuestion = await fetchQuestion({
        topic: confirmingTopic,
        previousQuestions: [],
        difficulty: 1,
      })

      console.warn('First question received:', nextQuestion)
      set({
        questions: [...questions, nextQuestion],
        currentQuestionIndex: currentQuestionIndex + 1,
      })
    },
    setConfirmingAnswer: (answer: Answer | null) => {
      console.warn('Answer selected:', answer)
      set({ confirmingAnswer: answer })
    },
    onAnswerConfirmed: async () => {
      const { topic, confirmingAnswer, questions, currentQuestionIndex } = get()

      if (!confirmingAnswer) {
        console.error('No answer selected to confirm')
        return
      }
      console.log('Answer confirmed:', confirmingAnswer)
      // Send the confirmed answer using the provided sendAnswer function
      if (!confirmingAnswer.isCorrect) {
        console.warn('Wrong answer chosen!')
        return
      }

      console.warn('Correct answer chosen! Increasing difficulty.')
      const currentDifficulty = get().currentDifficulty
      const newDifficulty = Math.min(currentDifficulty + 1, 10)

      // Start obstacle course
      set({ currentDifficulty: newDifficulty, confirmingAnswer: null })

      get().goToStage(Stage.TERRAIN)

      const newQuestion = await fetchQuestion({
        topic: topic!,
        previousQuestions: questions.map((q) => q.text),
        difficulty: newDifficulty,
      })

      const newQuestions = [...questions, newQuestion]

      console.warn('Next question received:', newQuestion)
      set({
        currentQuestionIndex: newQuestions.length - 1,
        questions: newQuestions,
      })
    },

    goToStage: (stage: Stage) => {
      // Basic function for now, can be expanded later
      if (stage === Stage.QUESTION) {
        set({ terrainSpeed: 0 })
        return
      }

      if (stage === Stage.TERRAIN) {
        set({ terrainSpeed: 3 })
      }

      if (stage === Stage.GAME_OVER) {
        set({ terrainSpeed: 0 })
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
