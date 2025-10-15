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
import { selectNextQuestion } from '@/resources/content'

export enum Stage {
  SPLASH = 'splash', // UI - introduction
  INTRO = 'intro', // Pathway leading to 1st question
  QUESTION = 'question',
  TERRAIN = 'terrain',
  GAME_OVER = 'game_over',
}

// Simulation frame-rate limiter. 0 = uncapped (use real delta)
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

  playerColourIndex: number // selected colour band index (0,1,2)
  setPlayerColourIndex: (index: number) => void

  confirmationProgress: number // [0, 1]
  playerPosition: { x: number; y: number; z: number }
  setPlayerPosition: (pos: { x: number; y: number; z: number }) => void

  // Distance travelled in rows (increments when terrain rows recycle)
  distanceRows: number
  incrementDistanceRows: (delta?: number) => void

  // Questions
  topic: Topic | null
  currentDifficulty: number
  currentQuestionIndex: number
  currentQuestion: Question
  questions: Question[]

  confirmingAnswer: AnswerUserData | null
  setConfirmingAnswer: (data: AnswerUserData | null) => void
  onAnswerConfirmed: () => void
  confirmedAnswers: AnswerUserData[] // Answers that have been confirmed

  currentRunStats: RunStats | null
  personalBests: RunStats[]
  previousPersonalBest: RunStats | null
  isNewPersonalBest: boolean

  resetGame: () => void
  resetTick: number
  goToStage: (stage: Stage) => void
}

type GameStore = StoreApi<GameState>
const GameContext = createContext<GameStore>(undefined!)

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
  | 'personalBests'
  | 'currentRunStats'
  | 'isNewPersonalBest'
  | 'previousPersonalBest'
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
  playerColourIndex: 1, // middle band index
  currentRunStats: null,
  personalBests: [],
  isNewPersonalBest: false,
  previousPersonalBest: null,
}

const CONFIRMATION_DURATION_S = 3

const createGameStore = () => {
  let speedTween: GSAPTween | null = null
  const speedTweenTarget = { value: 0 }
  let confirmationTween: GSAPTween | null = null
  const confirmationTweenTarget = { value: 0 }

  return createStore<GameState>()(
    persist(
      (set, get) => ({
        // Configurable parameters set on load with default values
        ...INITIAL_STATE,
        setPlayerPosition: (pos) => set({ playerPosition: pos }),
        setTerrainSpeed: (speed) => set({ terrainSpeed: speed }),
        setIsMuted: (muted) => set({ isMuted: muted }),
        setPlayerColourIndex: (index) => set({ playerColourIndex: index }),
        incrementDistanceRows: (delta = 1) =>
          set((s) => ({ distanceRows: Math.max(0, s.distanceRows + delta) })),
        setConfirmingAnswer: (data: AnswerUserData | null) => {
          const cancelConfirmation = () => {
            set({ confirmingAnswer: null })
            confirmationTween?.kill()
            confirmationTween = gsap.to(confirmationTweenTarget, {
              duration: 0.4,
              ease: 'power2.out',
              value: 0,
              onUpdate: () => {
                set({ confirmationProgress: confirmationTweenTarget.value })
              },
            })
          }

          const startConfirmation = (data: AnswerUserData) => {
            const { confirmedAnswers: answers, onAnswerConfirmed } = get()
            const hasAlreadyAnswered = answers.find((a) => a.questionId === data.questionId)
            if (hasAlreadyAnswered) return

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
          }

          if (data === null) {
            cancelConfirmation()
          } else {
            startConfirmation(data)
          }
        },
        onAnswerConfirmed: async () => {
          const { confirmingAnswer, goToStage } = get()
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
            topic: s.topic! ?? confirmingAnswer.answer.text, // 1st correct answer becomes the topic
          }))
          goToStage(Stage.TERRAIN)
        },

        getPersonalBest: (topic: Topic) =>
          get().personalBests.find((pb) => pb.topic === topic) ?? null,

        setIsNewPersonalBest: (stats: RunStats) => {
          const currentPB = get().personalBests.find((pb) => pb.topic === stats.topic)
          const newPB =
            !currentPB ||
            stats.correctAnswers > currentPB.correctAnswers ||
            (stats.correctAnswers === currentPB.correctAnswers &&
              stats.distance > currentPB.distance)
          if (!newPB) return

          const newRecord: RunStats = { ...stats }

          set((s) => {
            const index = s.personalBests.findIndex((pb) => pb.topic === stats.topic)
            const updatedPB =
              index === -1
                ? s.personalBests.concat(newRecord)
                : s.personalBests.with(index, newRecord)
            return { personalBests: updatedPB }
          })
        },
        resetTick: 0,
        resetGame: () => {
          // kill animations and reset tween state
          speedTween?.kill()
          speedTween = null
          confirmationTween?.kill()
          confirmationTween = null
          speedTweenTarget.value = 0
          confirmationTweenTarget.value = 0

          // keep persisted PBs, reset everything else
          const keepPB = get().personalBests
          set((s) => ({ ...INITIAL_STATE, personalBests: keepPB, resetTick: s.resetTick + 1 }))
        },

        goToStage: (stage: Stage) => {
          if (stage === Stage.SPLASH) {
            get().resetGame()
            return
          }
          // Basic function for now, can be expanded later
          if (stage === Stage.INTRO) {
            set({ stage: Stage.INTRO, isNewPersonalBest: false })
            // Ease terrain speed up to 0.25 using GSAP
            speedTween?.kill()
            // Ensure tween starts from the current store value (likely 0 from SPLASH)
            speedTweenTarget.value = get().terrainSpeed
            speedTween = gsap.to(speedTweenTarget, {
              duration: 1.2,
              ease: 'power2.out',
              value: 0.25,
              onUpdate: () => {
                set({ terrainSpeed: speedTweenTarget.value })
              },
            })
            return
          }

          if (stage === Stage.QUESTION) {
            const currentQuestionIndex = get().currentQuestionIndex
            const newQuestionIndex = currentQuestionIndex + 1
            // Speed deceleration is handled in Terrain.tsx, synchronized with row raising
            // Increment question index and update current question
            if (newQuestionIndex === 0) {
              set({
                stage: Stage.QUESTION,
                currentQuestionIndex: newQuestionIndex,
                currentQuestion: topicQuestion,
                questions: [topicQuestion],
              })
            } else {
              const questions = get().questions
              const askedIds = new Set<string>(questions.slice(1).map((q) => q.id))
              const newQuestion = selectNextQuestion({
                topic: get().topic!,
                currentDifficulty: get().currentDifficulty,
                askedIds: askedIds,
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
            const { topic, confirmedAnswers, distanceRows, personalBests } = get()
            if (get().currentRunStats) {
              set({ stage: Stage.GAME_OVER }) // ensure stage is set, but skip recompute
              return
            }
            if (!topic) {
              console.warn('[GAME_OVER] No topic set. Skipping PB compute.')
              set({
                stage: Stage.GAME_OVER,
                isNewPersonalBest: false,
                previousPersonalBest: null,
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

            // previous PB BEFORE overwriting
            const prevPB = personalBests.find((p) => p.topic === topic) ?? null
            if (!prevPB) {
              const topicsInPB = personalBests.map((p) => p.topic)
              console.warn(
                '[GAME_OVER] No previous PB for topic. Possible topic mismatch? topic=',
                topic,
                ' topicsInPB=',
                topicsInPB,
              )
            }

            const isNew =
              !prevPB ||
              run.correctAnswers > prevPB.correctAnswers ||
              (run.correctAnswers === prevPB.correctAnswers && run.distance > prevPB.distance)

            // update state for UI
            set({
              stage: Stage.GAME_OVER,
              currentRunStats: run,
              previousPersonalBest: prevPB,
              isNewPersonalBest: isNew,
            })

            // write new PB if needed
            if (isNew) {
              set((s) => {
                const idx = s.personalBests.findIndex((p) => p.topic === topic)
                const updated =
                  idx === -1 ? s.personalBests.concat(run) : s.personalBests.with(idx, run)
                return { personalBests: updated }
              })
            }

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
      }),
      {
        name: 'quiz-roller',
        partialize: (s) => ({
          personalBests: s.personalBests,
          playerColour: s.playerColourIndex,
        }),
      },
    ),
  )
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
