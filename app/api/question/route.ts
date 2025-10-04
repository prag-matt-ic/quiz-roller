import { openai } from '@ai-sdk/openai'
import { generateObject } from 'ai'

import { LLMQuestionSchema, type Question } from '@/model/schema'

export const maxDuration = 30

export async function POST(req: Request) {
  const {
    topic,
    previousQuestions = [],
    difficulty = 1,
  }: {
    topic: string
    previousQuestions: Question[]
    difficulty: number
  } = await req.json()

  console.warn(`Generating question on topic "${topic}" with difficulty ${difficulty}`)

  // const getDifficultyDescription = (difficulty: number) => {
  //   if (difficulty <= 1) return 'easy, basic knowledge'
  //   if (difficulty <= 5) return 'moderate difficulty, intermediate knowledge'
  //   if (difficulty <= 8) return 'challenging, advanced knowledge'
  //   return 'very difficult, expert level knowledge'
  // }

  const system =
    'You create one two-option multiple-choice question at a time for a quiz game. Use British English.'

  const task = `Task:\n- Topic: ${topic}\n- Target difficulty: ${difficulty}/10  (use simpler wording for lower levels; allow slightly more context for higher levels)\n- Choose a clear, concise subtopic within the topic (1-6 words).`

  const authoringRules = `Authoring rules:\n1) Write a single question (the stem) about the chosen subtopic.\n2) Provide exactly two answer options: one correct and one incorrect.\n3) Make the incorrect option plausible (prefer a common misconception).\n4) Do NOT reveal which option is correct (no “(correct)”, ticks/emojis, hints, or asymmetric phrasing).\n5) Avoid negations like “Which of the following is NOT…”.\n6) Keep the stem concise and aligned to the difficulty (shorter/simpler for easier questions; modest context allowed for harder ones).\n7) Do not repeat or closely paraphrase any of the previous questions listed below; also avoid reusing their subtopics.`

  const previousBlock =
    previousQuestions.length > 0
      ? `Previous questions to avoid repeating:\n${previousQuestions
          .map((q, i) => {
            const diff = q.difficulty != null ? `${q.difficulty}/10` : '—'
            const sub = q.subtopic ? q.subtopic : '—'
            return `${i + 1}. [Difficulty: ${diff}] [Subtopic: ${sub}]\n  Stem: ${q.text}`
          })
          .join('\n')}`
      : ''

  const prompt = [task, authoringRules, previousBlock]
    .filter((s) => s && s.trim().length > 0)
    .join('\n\n')

  const result = await generateObject({
    model: openai('gpt-5-mini'),
    schema: LLMQuestionSchema,
    system,
    prompt,
  })

  const parsedQuestion = LLMQuestionSchema.safeParse(result.object)

  if (!parsedQuestion.success) {
    console.error('Failed to validate generated question', parsedQuestion.error)
    return Response.json({ error: 'Failed to generate question.' }, { status: 500 })
  }

  const questionWithId: Question = {
    id: crypto.randomUUID(),
    difficulty,
    ...parsedQuestion.data,
  }

  console.warn('Generated question:', questionWithId)

  return Response.json(questionWithId)
}
