import gsap from 'gsap'
import {
  createContext,
  type FC,
  type PropsWithChildren,
  useContext,
  useEffect,
  useRef,
} from 'react'
import { Vector3, type Vector3Tuple } from 'three'
import { createStore, type StoreApi, useStore } from 'zustand'
import { persist } from 'zustand/middleware'

import {
  type AnswerUserData,
  type Question,
  type RunStats,
  Topic,
  TopicUserData,
} from '@/model/schema'
import { getNextQuestion } from '@/resources/content'

import { PLAYER_RADIUS } from './player/ConfirmationBar'
import { type PlaySoundFX, SoundFX, useSoundStore } from './SoundProvider'

export enum Stage {
  HOME = 'home',
  INTRO = 'intro',
  QUESTION = 'question',
  TERRAIN = 'terrain',
  GAME_OVER = 'game_over',
}

// - [ ] Update UX/UI questions
// - [ ] Add AI content
// - [ ] Add Mobile/touch controls
// - [ ] Design “about” content
// TODO:
// - TW: Add a "share my run" button on game over screen which generates a URL with topic, distance and correct answers in the query params - this should then be used in the metadata image generation.

export type PlayerInput = {
  up: boolean
  down: boolean
  left: boolean
  right: boolean
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

  playerWorldPosition: Vector3
  setPlayerPosition: (pos: { x: number; y: number; z: number }) => void

  cameraLookAtPosition: Vector3 | null // Used if you want to look at something other than the player
  setCameraLookAtPosition: (pos: Vector3 | null) => void

  // Distance travelled in rows (increments when terrain rows recycle)
  distanceRows: number
  incrementDistanceRows: (delta: number) => void

  // Topic selection
  topic: Topic | null
  confirmingTopic: TopicUserData | null
  setConfirmingTopic: (data: TopicUserData | null) => void
  onTopicConfirmed: () => void

  // Questions
  currentDifficulty: number
  currentQuestionIndex: number
  currentQuestion: Question | null
  questions: Question[]
  confirmingAnswer: AnswerUserData | null
  setConfirmingAnswer: (data: AnswerUserData | null) => void
  onAnswerConfirmed: () => void
  confirmedAnswers: AnswerUserData[]

  currentRunStats: RunStats | null
  previousRuns: Record<Topic, RunStats[]>

  onOutOfBounds: () => void

  resetGame: () => void
  resetPlatformTick: number
  resetPlayerTick: number
  goToStage: (stage: Stage) => void
}

type GameStore = StoreApi<GameState>
const GameContext = createContext<GameStore>(undefined!)

const MAX_DIFFICULTY = 10
const CONFIRMING_ANSWER_DURATION_S = 2.4
const CONFIRMING_COLOUR_DURATION_S = 1.5
const INTRO_SPEED_DURATION = 1.2
const TERRAIN_SPEED_DURATION = 2.4

export const PLAYER_INITIAL_POSITION: Vector3Tuple = [0.0, PLAYER_RADIUS + 3, 0] // Used when re-spawning to home

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
  | 'topic'
  | 'confirmingTopic'
  | 'confirmingColourIndex'
  | 'questions'
  | 'currentDifficulty'
  | 'currentQuestionIndex'
  | 'currentQuestion'
  | 'confirmingAnswer'
  | 'confirmedAnswers'
  | 'distanceRows'
  | 'colourIndex'
  | 'currentRunStats'
  | 'previousRuns'
  | 'cameraLookAtPosition'
> = {
  stage: Stage.HOME,
  terrainSpeed: 0,
  confirmationProgress: 0,
  playerWorldPosition: PLAYER_INITIAL_POSITION_VEC3,
  topic: null,
  playerInput: {
    up: false,
    down: false,
    left: false,
    right: false,
  },
  confirmingTopic: null,
  currentDifficulty: 1,
  questions: [],
  currentQuestion: null,
  currentQuestionIndex: 0,
  confirmingAnswer: null,
  confirmedAnswers: [],
  distanceRows: 0,
  colourIndex: 1,
  confirmingColourIndex: null,
  currentRunStats: null,
  cameraLookAtPosition: null,
  previousRuns: {
    [Topic.UX_UI_DESIGN]: [],
    [Topic.ARTIFICIAL_INTELLIGENCE]: [],
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
      confirmingTopic: null,
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
        setPlayerPosition: (position) => {
          set((s) => ({
            playerWorldPosition: s.playerWorldPosition.set(position.x, position.y, position.z),
          }))
        },
        setCameraLookAtPosition: (cameraLookAtPosition) => {
          set({ cameraLookAtPosition })
        },
        setTerrainSpeed: (terrainSpeed) => set({ terrainSpeed }),
        setPlayerInput(input) {
          set({ playerInput: input })
        },
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
            confirmingTopic: null,
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

        setConfirmingTopic: (topicData: TopicUserData | null) => {
          const { stage, topic, confirmingTopic } = get()

          if (topicData?.topic === confirmingTopic?.topic) return // No change
          confirmationTween?.kill()

          if (topicData === null) {
            cancelConfirmation(set)
            return
          }

          if (stage !== Stage.HOME || topic !== null) return

          set({
            confirmingTopic: topicData,
            confirmingAnswer: null,
            confirmingColourIndex: null,
            confirmationProgress: 0,
          })

          const onConfirmed = () => {
            if (get().confirmingTopic?.topic === topicData.topic) {
              get().onTopicConfirmed()
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
            confirmingTopic: null,
            confirmingColourIndex: null,
            confirmationProgress: 0,
          })

          const onConfirmed = () => {
            if (!!get().confirmingAnswer) onAnswerConfirmed()
          }

          startConfirmation(set, onConfirmed)
        },

        onTopicConfirmed: () => {
          const { confirmingTopic, goToStage } = get()

          if (!confirmingTopic) {
            console.error('No topic selected to confirm')
            return
          }

          const firstQuestion = getNextQuestion({
            topic: confirmingTopic.topic,
            currentDifficulty: 1,
            askedIds: new Set(),
          })

          if (!firstQuestion) {
            console.error('No questions available for topic:', confirmingTopic.topic)
            set({ confirmingTopic: null, confirmationProgress: 0 })
            return
          }

          set({
            topic: confirmingTopic.topic,
            questions: [firstQuestion],
            currentQuestionIndex: 0,
            currentQuestion: firstQuestion,
            confirmingAnswer: null,
          })

          goToStage(Stage.INTRO)
        },

        onAnswerConfirmed: async () => {
          const { currentDifficulty, confirmingAnswer } = get()

          if (!confirmingAnswer) {
            console.error('No answer selected to confirm')
            return
          }

          confirmationTween?.kill()

          if (!confirmingAnswer.answer.isCorrect) {
            handleIncorrectAnswer({ confirmingAnswer, set })
            playSoundFX(SoundFX.INCORRECT_ANSWER)
            return
          }

          handleCorrectAnswer({ currentDifficulty, confirmingAnswer, set })
          playSoundFX(SoundFX.CORRECT_ANSWER)
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

        onOutOfBounds: () => {
          const { stage, goToStage } = get()
          if (stage === Stage.HOME) {
            set((s) => ({
              playerWorldPosition: PLAYER_INITIAL_POSITION_VEC3,
              resetPlayerTick: s.resetPlayerTick + 1,
            }))
          } else {
            goToStage(Stage.GAME_OVER)
          }
        },

        goToStage: (newStage: Stage) => {
          if (newStage === Stage.INTRO) {
            handleIntroStage({ set, get, speedTween, speedTweenTarget })
            return
          }

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
      },
    ),
  )
}

// Helper functions for onAnswerConfirmed

function handleIncorrectAnswer({
  set,
  confirmingAnswer,
}: {
  set: StoreApi<GameState>['setState']
  confirmingAnswer: AnswerUserData
}) {
  console.warn('Wrong answer chosen! Game over.')
  set((s) => ({
    confirmationProgress: 0,
    confirmingAnswer: null,
    confirmedAnswers: [...s.confirmedAnswers, confirmingAnswer],
  }))
}

function handleCorrectAnswer({
  set,
  currentDifficulty,
  confirmingAnswer,
}: {
  currentDifficulty: number
  confirmingAnswer: AnswerUserData
  set: StoreApi<GameState>['setState']
}) {
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
    value: 1.0,
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

  const questions = get().questions
  const askedIds = new Set<string>(questions.map((q) => q.id))
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
    value: 1.0,
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
  const { topic, confirmedAnswers, distanceRows } = get()

  speedTween?.kill()
  gsap.to(speedTweenTarget, {
    duration: 0.4,
    ease: 'power2.out',
    value: 0,
    onUpdate: () => {
      set({ terrainSpeed: speedTweenTarget.value })
    },
  })

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
}

type Props = PropsWithChildren

export const GameProvider: FC<Props> = ({ children }) => {
  const playSoundFX = useSoundStore((s) => s.playSoundFX)
  const stopSoundFX = useSoundStore((s) => s.stopSoundFX)
  const store = useRef<GameStore>(createGameStore(playSoundFX, stopSoundFX))
  const input = useRef(store.current.getState().playerInput)

  useEffect(() => {
    const setPlayerInput = store.current.getState().setPlayerInput

    const updateInput = (key: keyof PlayerInput, value: boolean) => {
      if (input.current[key] === value) return
      const nextInput = { ...input.current, [key]: value }
      input.current = nextInput
      setPlayerInput(nextInput)
    }

    const onKeyDown = (e: KeyboardEvent) => {
      switch (e.code) {
        case 'ArrowUp':
        case 'KeyW':
          updateInput('up', true)
          break
        case 'ArrowDown':
        case 'KeyS':
          updateInput('down', true)
          break
        case 'ArrowLeft':
        case 'KeyA':
          updateInput('left', true)
          break
        case 'ArrowRight':
        case 'KeyD':
          updateInput('right', true)
          break
      }
    }

    const onKeyUp = (e: KeyboardEvent) => {
      switch (e.code) {
        case 'ArrowUp':
        case 'KeyW':
          updateInput('up', false)
          break
        case 'ArrowDown':
        case 'KeyS':
          updateInput('down', false)
          break
        case 'ArrowLeft':
        case 'KeyA':
          updateInput('left', false)
          break
        case 'ArrowRight':
        case 'KeyD':
          updateInput('right', false)
          break
      }
    }

    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
    }
  }, [])

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
