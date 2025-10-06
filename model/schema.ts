import { z } from 'zod'

// Answer schema
export const AnswerSchema = z.object({
  text: z.string().min(1),
  isCorrect: z.boolean(),
})

// LLM response schema (strict two-option MCQ with subtopic)
export const LLMQuestionSchema = z.object({
  text: z.string().min(1),
  subtopic: z.string().min(1),
  answers: z.array(AnswerSchema).length(2),
})

// App-level question schema (allows >2 options for initial topic selection)
export const QuestionSchema = LLMQuestionSchema.extend({
  id: z.string(),
  difficulty: z.number().min(0).max(10),
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

export type RigidBodyUserData = PlayerUserData | AnswerUserData | OutOfBoundsUserData 

export const TOPICS: string[] = [
  'UX/UI Design',
  'Psychology',
  'English',
  'Artificial Intelligence',
]

export const topicQuestion: Question = {
  id: 'topic',
  subtopic: '-',
  difficulty: 0,
  text: 'Select a topic',
  answers: TOPICS.map((topic) => ({
    text: topic,
    isCorrect: true,
  })),
}
