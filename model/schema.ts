import { z } from 'zod'

// Answer schema
export const AnswerSchema = z.object({
  text: z.string(),
  isCorrect: z.boolean(),
})

// Question schema
export const QuestionSchema = z.object({
  text: z.string(),
  answers: z.array(AnswerSchema),
})

// TypeScript types inferred from the schemas
export type Answer = z.infer<typeof AnswerSchema>
export type Question = z.infer<typeof QuestionSchema>

export type PlayerUserData = {
  type: 'player'
}

export type AnswerUserData = {
  type: 'answer'
  text: string
}

export type RigidBodyUserData = PlayerUserData | AnswerUserData
