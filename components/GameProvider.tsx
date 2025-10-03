import {
  createContext,
  type FC,
  type PropsWithChildren,
  useContext,
  useEffect,
  useRef,
} from 'react'
import { createStore, type StoreApi, useStore } from 'zustand'

import { Answer, Question } from '@/model/schema'

type GameState = {
  // Questions
  currentDifficulty: number
  questions: Question[]
  currentQuestionId: string | null
  handleNewQuestion: (question: Question) => void

  // Player interaction
  topic: string | null
  confirmingTopic: string | null
  setConfirmingTopic: (topic: string | null) => void
  onTopicConfirmed: () => void

  confirmingAnswer: Answer | null
  setConfirmingAnswer: (answer: Answer | null) => void
  onAnswerConfirmed: () => void
}

type GameStore = StoreApi<GameState>
const GameContext = createContext<GameStore>(undefined!)

const INITIAL_STATE: Pick<
  GameState,
  | 'topic'
  | 'questions'
  | 'currentDifficulty'
  | 'currentQuestionId'
  | 'confirmingTopic'
  | 'confirmingAnswer'
> = {
  topic: null,
  confirmingTopic: null,
  currentDifficulty: 1,
  questions: [],
  currentQuestionId: null,
  confirmingAnswer: null,
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
  const getNextQuestion = () => {
    return fetchQuestion
  }

  return createStore<GameState>()((set, get) => ({
    // Configurable parameters set on load with default values
    ...INITIAL_STATE,
    // Topic
    setConfirmingTopic: (topic) => {
      console.warn('Topic selected:', topic)
      set({ confirmingTopic: topic })
    },
    onTopicConfirmed: () => {
      const selectedTopic = get().confirmingTopic
      if (!selectedTopic) {
        console.error('No topic selected to confirm')
        return
      }
      console.log('Topic confirmed:', selectedTopic)
      // FETCH FIRST QUESTION....
      set({ topic: selectedTopic, confirmingTopic: null })
    },
    // Questions
    handleNewQuestion: (question: Question) => {
      const questions = get().questions
      // Avoid duplicates
      console.warn('New question received:', question)
      if (questions.find((q) => q.id === question.id)) {
        console.warn('Duplicate question, ignoring:', question)
        return
      }
      set({ questions: [...questions, question], currentQuestionId: question.id })
    },
    setConfirmingAnswer: (answer: Answer | null) => {
      console.warn('Answer selected:', answer)
      set({ confirmingAnswer: answer })
    },
    onAnswerConfirmed: () => {
      const selectedAnswer = get().confirmingAnswer
      if (!selectedAnswer) {
        console.error('No answer selected to confirm')
        return
      }
      console.log('Answer confirmed:', selectedAnswer)
      // Send the confirmed answer using the provided sendAnswer function
      if (!selectedAnswer.isCorrect) {
        console.warn('Wrong answer chosen!')
        return
      }
      set({ confirmingAnswer: null, currentQuestionId: null })
      console.warn('Correct answer chosen! Increasing difficulty.')
      const difficulty = get().currentDifficulty
      const newDifficulty = Math.min(difficulty + 1, 10)
      // sendMessage({ text: selectedAnswer.text }, { body: { currentDifficulty: newDifficulty } })
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
