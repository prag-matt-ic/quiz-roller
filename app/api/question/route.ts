import { openai } from '@ai-sdk/openai'
import { generateObject } from 'ai'

import { QuestionSchema } from '@/model/schema'

export const maxDuration = 30

export async function POST(req: Request) {
  const {
    topic,
    previousQuestions = [],
    difficulty = 1,
  }: { topic: string; previousQuestions: string[]; difficulty: number } = await req.json()

  const getDifficultyDescription = (level: number) => {
    if (level <= 3) return 'very easy, basic knowledge'
    if (level <= 6) return 'moderate difficulty, intermediate knowledge'
    if (level <= 8) return 'challenging, advanced knowledge'
    return 'very difficult, expert level knowledge'
  }

  console.warn(`Generating question on topic "${topic}" with difficulty ${difficulty}`)

  let prompt = `Generate a multiple choice question about the following topic: ${topic}.
    The difficulty should be ${getDifficultyDescription(difficulty)} (level ${difficulty}/10).
    Provide two possible answers, one correct and one incorrect.
    Adjust the complexity, vocabulary, and depth of knowledge required based on the difficulty level.`

  // Add previous questions to avoid repeats
  if (previousQuestions.length > 0) {
    prompt += `\n Do not repeat any of these previous questions:\n${previousQuestions.map((q, i) => `${i + 1}. ${q}`).join('\n')}`
  }

  const result = await generateObject({
    model: openai('gpt-5-mini'),
    schema: QuestionSchema,
    prompt,
  })

  const data = QuestionSchema.safeParse(result.object)
  console.warn('Generated question:', data)

  return Response.json({ data })
}
