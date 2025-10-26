import { type ContentLibrary, type Question, Topic } from '@/model/schema'
import { UX_UI_CONTENT } from '@/resources/content/uxui'

export const pickRandom = <T>(items: T[]): T => items[Math.floor(Math.random() * items.length)]

const findFallbackDifficulty = ({
  availableDifficulties,
  currentDifficulty,
}: {
  availableDifficulties: number[]
  currentDifficulty: number
}): number | undefined => {
  let fallbackDifficulty: number | undefined

  for (let index = 0; index < availableDifficulties.length; index += 1) {
    const difficulty = availableDifficulties[index]

    if (difficulty <= currentDifficulty) {
      fallbackDifficulty = difficulty
      continue
    }

    return fallbackDifficulty ?? difficulty
  }

  return fallbackDifficulty
}

export function getNextQuestion({
  topic,
  currentDifficulty,
  askedIds,
}: {
  topic: Topic
  currentDifficulty: number
  askedIds: Set<string>
}): Question | undefined {
  const topicQuestionBank = CONTENT[topic]
  if (!topicQuestionBank) {
    console.error('[CONTENT] Unknown topic:', topic)
    return undefined
  }

  const sortedDifficultyLevels = Object.keys(topicQuestionBank)
    .map((difficultyKey) => Number(difficultyKey))
    .sort((a, b) => a - b)

  let availableQuestions = topicQuestionBank[currentDifficulty] ?? []

  if (!availableQuestions.length) {
    const fallbackDifficulty = findFallbackDifficulty({
      availableDifficulties: sortedDifficultyLevels,
      currentDifficulty,
    })

    availableQuestions =
      fallbackDifficulty !== undefined ? topicQuestionBank[fallbackDifficulty] ?? [] : []
  }

  if (!availableQuestions.length) {
    console.warn('[CONTENT] No questions available for topic', topic)
    return undefined
  }

  const unaskedQuestions = availableQuestions.filter((question) => !askedIds.has(question.id))
  const candidateQuestions = unaskedQuestions.length ? unaskedQuestions : availableQuestions
  const randomQuestion = pickRandom(candidateQuestions)

  const shuffledAnswers = [...randomQuestion.answers].sort(() => Math.random() - 0.5)

  return {
    ...randomQuestion,
    answers: shuffledAnswers,
  }
}

// Placeholder questions for each topic and difficulty.
// Difficulty keys start at 1. Add more as needed.
export const CONTENT: ContentLibrary = {
  [Topic.UX_UI_DESIGN]: UX_UI_CONTENT,
  [Topic.ARTIFICIAL_INTELLIGENCE]: { 1: [] },
}
