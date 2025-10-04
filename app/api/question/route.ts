import { openai } from '@ai-sdk/openai'
import { generateObject } from 'ai'

import { LLMQuestionSchema, type Question } from '@/model/schema'

export const maxDuration = 30

export async function POST(req: Request) {
  const {
    topic,
    previousQuestions = [],
    difficulty = 1,
  }: { topic: string; previousQuestions: string[]; difficulty: number } = await req.json()

  const getDifficultyDescription = (level: number) => {
    if (level <= 1) return 'very easy, basic knowledge'
    if (level <= 5) return 'moderate difficulty, intermediate knowledge'
    if (level <= 8) return 'challenging, advanced knowledge'
    return 'very difficult, expert level knowledge'
  }

  console.warn(`Generating question on topic "${topic}" with difficulty ${difficulty}`)

  let prompt = `
    You are a graduate-level expert in the field of ${topic}.
    Generate a multiple choice question about: ${topic}.
    The difficulty should be ${getDifficultyDescription(difficulty)} (level ${difficulty}/10).
    Provide two possible answers, one correct and one incorrect.
    The incorrect answer needs to sound plasusible, perhaps a common misconception.
    Adjust the complexity, vocabulary, and depth of knowledge required based on the difficulty level.
    Do not indicate which answer is correct in the question text.`

  // Add previous questions to avoid repeats
  if (previousQuestions.length > 0) {
    prompt += `\n Do not repeat any of these previous questions:\n${previousQuestions.map((q, i) => `${i + 1}. ${q}`).join('\n')}`
  }

  const result = await generateObject({
    model: openai('gpt-5-mini'),
    schema: LLMQuestionSchema,
    prompt,
  })

  const parsedQuestion = LLMQuestionSchema.safeParse(result.object)

  if (!parsedQuestion.success) {
    console.error('Failed to validate generated question', parsedQuestion.error)
    return Response.json({ error: 'Failed to generate question.' }, { status: 500 })
  }

  const questionWithId: Question = {
    id: crypto.randomUUID(),
    ...parsedQuestion.data,
  }

  console.warn('Generated question:', questionWithId)

  return Response.json(questionWithId)
}
