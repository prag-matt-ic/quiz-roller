import { z } from 'zod'

// Answer schema
export const AnswerSchema = z.object({
  text: z.string(),
  isCorrect: z.boolean(),
})

// Question schema
export const QuestionSchema = z.object({
  id: z.string(),
  text: z.string(),
  answers: z.array(AnswerSchema),
})

// TypeScript types inferred from the schemas
export type Answer = z.infer<typeof AnswerSchema>
export type Question = z.infer<typeof QuestionSchema>

export type PlayerUserData = {
  type: 'player'
}

export type TopicUserData = {
  type: 'topic'
  topic: string
}

export type AnswerUserData = {
  type: 'answer'
  answer: Answer
  // Index into GameProvider.questions for which this tile belongs
  questionIndex: number
}

export type OutOfBoundsUserData = {
  type: 'out-of-bounds'
}

export type RigidBodyUserData = PlayerUserData | AnswerUserData | TopicUserData

export const TOPICS: string[] = [
  'UX/UI Design',
  'Psychology',
  'English',
  'Artificial Intelligence',
]

export const topicQuestion: Question = {
  id: 'topic',
  text: 'Select a topic',
  answers: TOPICS.map((topic) => ({
    text: topic,
    isCorrect: true,
  })),
}
