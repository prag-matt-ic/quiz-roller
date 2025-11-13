import { z } from 'zod'

export const AnswerSchema = z.object({
  text: z.string(),
  isCorrect: z.boolean(),
})

export const QuestionSchema = z.object({
  id: z.string(),
  difficulty: z.number().min(1).max(3),
  text: z.string().min(10),
  subtopic: z.string().min(1).optional(),
  answers: z.array(AnswerSchema).length(2),
  sourceUrl: z.url().optional(),
  citation: z.string().optional(),
})

export type Answer = z.infer<typeof AnswerSchema>
export type Question = z.infer<typeof QuestionSchema>

export type PlayerUserData = {
  type: 'player'
}

export type AnswerUserData = {
  type: 'answer'
  questionId: string
  answer: Answer
  answerNumber: number
}

export type StartUserData = {
  type: 'start'
}

export type OutOfBoundsUserData = {
  type: 'out-of-bounds'
}

export type ColourTileUserData = {
  type: 'colour'
  paletteIndex: 0 | 1 | 2
}

export type InfoZoneUserData = {
  type: 'info'
}

export type RigidBodyUserData =
  | PlayerUserData
  | StartUserData
  | AnswerUserData
  | OutOfBoundsUserData
  | ColourTileUserData
  | InfoZoneUserData

export type RunStats = {
  correctAnswers: number
  distance: number
  date: Date
}
