import { z } from 'zod'

export const AnswerSchema = z.object({
  text: z.string(),
  isCorrect: z.boolean(),
})

export const QuestionSchema = z.object({
  id: z.string(),
  difficulty: z.number().min(0).max(10),
  text: z.string().min(1),
  subtopic: z.string().min(1).optional(),
  answers: z.array(AnswerSchema).length(2),
  sourceUrl: z.url().optional(),
  citation: z.string().optional(),
})

export type Answer = z.infer<typeof AnswerSchema>
export type Question = z.infer<typeof QuestionSchema>

export type TopicQuestionBank = Record<number, Question[]>
export type ContentLibrary = Record<Topic, TopicQuestionBank>

export type PlayerUserData = {
  type: 'player'
}

export type AnswerUserData = {
  type: 'answer'
  questionId: string
  answer: Answer
  answerNumber: number
}

export type TopicUserData = {
  type: 'topic'
  topic: Topic
}

export type OutOfBoundsUserData = {
  type: 'out-of-bounds'
}

export type MarbleColourUserData = {
  type: 'marble-colour'
  colourIndex: number
}

export type InfoHotspotUserData = {
  type: 'info'
  // Other values
}

export type RigidBodyUserData =
  | PlayerUserData
  | TopicUserData
  | AnswerUserData
  | OutOfBoundsUserData
  | MarbleColourUserData
  | InfoHotspotUserData

export enum Topic {
  UX_UI_DESIGN = 'UX/UI Design',
  ARTIFICIAL_INTELLIGENCE = 'Artificial Intelligence',
  // PSYCHOLOGY = 'Psychology',
  // ENGLISH = 'English',
}

export const topicQuestion: Question = {
  id: 'topic',
  subtopic: '-',
  difficulty: 0,
  text: 'Confirm a topic by rolling over the tile',
  answers: Object.values(Topic).map((topic) => ({
    text: topic,
    isCorrect: true,
  })),
}

export type RunStats = {
  topic: Topic
  correctAnswers: number
  distance: number
  date: Date
}
