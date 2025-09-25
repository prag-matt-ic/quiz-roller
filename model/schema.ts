import { z } from 'zod'

export const AnswerSchema = z.object({
  text: z.string(),
  isCorrect: z.boolean(),
})

export const QuestionSchema = z.object({
  text: z.string(),
  answers: z.array(AnswerSchema).length(2),
})

// TypeScript types inferred from the schemas
export type Answer = z.infer<typeof AnswerSchema>
export type Question = z.infer<typeof QuestionSchema>
