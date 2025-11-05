import { openai } from '@ai-sdk/openai'
import {
  generateObject,
  type InferToolOutput,
  type InferUITool,
  type InferUITools,
  ModelMessage,
  tool,
  type TypedToolCall,
  type TypedToolResult,
  type UIDataTypes,
  type UIMessage,
} from 'ai'
import { z } from 'zod'

import { QuestionSchema } from './schema'

export const generateQuestion = tool({
  description: 'Generate a quiz question with multiple choice answers for a given topic',
  inputSchema: z.object({
    topic: z.string().describe('The topic to generate a question about'),
    difficulty: z
      .number()
      .min(1)
      .max(5)
      .describe('The difficulty level of the question, from 1 (easy) to 5 (expert)'),
  }),
  outputSchema: QuestionSchema,
  execute: async ({ topic, difficulty }, { messages }) => {
    // Extract previous questions (as text) from tool results in messages to avoid repeats
    const previousQuestions: string[] = []
    const toolMessages = messages.filter(
      (msg): msg is Extract<ModelMessage, { role: 'tool' }> => msg.role === 'tool',
    )

    for (const msg of toolMessages) {
      for (const item of msg.content) {
        if (item.type !== 'tool-result') continue
        if (item.toolName !== 'generateQuestion') continue
        if (item.output?.type !== 'json') continue
        const value = item.output.value as GenerateQuestionOutput
        previousQuestions.push(value.text)
      }
    }

    const getDifficultyDescription = (level: number) => {
      const clamped = Math.max(1, Math.min(5, Math.floor(level)))
      if (clamped === 1) return 'very easy, foundational knowledge'
      if (clamped === 2) return 'moderate difficulty, intermediate knowledge'
      if (clamped === 3) return 'challenging, applied knowledge'
      if (clamped === 4) return 'difficult, expert-level insight'
      return 'very difficult, mastery-level analysis'
    }

    console.warn(`Generating question on topic "${topic}" with difficulty ${difficulty}`)

    let prompt = `Generate a multiple choice question about the following topic: ${topic}.
    The difficulty should be ${getDifficultyDescription(difficulty)} (level ${difficulty}/5).
    Provide two possible answers, one correct and one incorrect.
    Adjust the complexity, vocabulary, and depth of knowledge required based on the difficulty level.`

    // Add previous questions to avoid repeats
    if (previousQuestions.length > 0) {
      prompt += `\n\Avoid repeating these previous questions:\n${previousQuestions.map((q, i) => `${i + 1}. ${q}`).join('\n')}`
    }

    const result = await generateObject({
      model: openai('gpt-5-mini'),
      schema: QuestionSchema,
      prompt,
    })
    return result.object
  },
})

export const tools = {
  generateQuestion,
}

// Type inference for the tool
export type GenerateQuestionUITool = InferUITool<typeof generateQuestion>
export type GenerateQuestionOutput = InferToolOutput<typeof generateQuestion>

type Tools = typeof tools

export type MyToolCall = TypedToolCall<Tools>
export type MyToolResult = TypedToolResult<Tools>
export type MyUITools = InferUITools<Tools>
export type MyUIMessage = UIMessage<unknown, UIDataTypes, MyUITools>
