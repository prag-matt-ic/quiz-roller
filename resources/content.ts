import { type Question, type QuestionBank } from '@/model/schema'
import { QUESTIONS } from '@/resources/questions'

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
  currentDifficulty,
  askedIds,
}: {
  currentDifficulty: number
  askedIds: Set<string>
}): Question | undefined {
  const sortedDifficultyLevels = Array.from(
    new Set(QUESTION_BANK.map((question) => question.difficulty)),
  ).sort((a, b) => a - b)

  let availableQuestions = QUESTION_BANK.filter(
    (question) => question.difficulty === currentDifficulty,
  )

  if (!availableQuestions.length) {
    const fallbackDifficulty = findFallbackDifficulty({
      availableDifficulties: sortedDifficultyLevels,
      currentDifficulty,
    })

    availableQuestions =
      fallbackDifficulty !== undefined
        ? QUESTION_BANK.filter((question) => question.difficulty === fallbackDifficulty)
        : []
  }

  if (!availableQuestions.length) {
    console.warn('[CONTENT] No questions available')
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

// Difficulty keys start at 1. Add more as needed.
export const QUESTION_BANK: QuestionBank = QUESTIONS
