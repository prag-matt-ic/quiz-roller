import { z } from 'zod'

// Answer schema
export const AnswerSchema = z.object({
  text: z.string(),
  isCorrect: z.boolean(),
})

// Question schema
export const LLMQuestionSchema = z.object({
  text: z.string(),
  answers: z.array(AnswerSchema),
})

export const QuestionSchema = LLMQuestionSchema.extend({
  id: z.string(),
})

// TypeScript types inferred from the schemas
export type Answer = z.infer<typeof AnswerSchema>
export type Question = z.infer<typeof QuestionSchema>

export type PlayerUserData = {
  type: 'player'
}

export type AnswerUserData = {
  type: 'answer'
  questionId: string
  answer: Answer
}

export type OutOfBoundsUserData = {
  type: 'out-of-bounds'
}

export type RigidBodyUserData = PlayerUserData | AnswerUserData

export const TOPICS: string[] = [
  'UX/UI Design',
  'Psychology',
  'English',
  'Artificial Intelligence',
]

export const topicQuestion: Question = {
  id: 'topic',
  text: 'Select a topic to begin rolling',
  answers: TOPICS.map((topic) => ({
    text: topic,
    isCorrect: true,
  })),
}
