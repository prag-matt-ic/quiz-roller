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
}

export type RigidBodyUserData = PlayerUserData | AnswerUserData | TopicUserData
