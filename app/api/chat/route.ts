import { openai } from '@ai-sdk/openai'
import { convertToModelMessages, streamText, type UIMessage } from 'ai'

import { tools } from '@/model/tools'

// Allow streaming responses up to 30 seconds
export const maxDuration = 30

const SYSTEM_PROMPT = `
You are a quiz master.
Your task is to create engaging multiple choice questions on the provided topic.
Questions should start easy, then gradually increase in difficulty.
The topic will be provided by the user in their first message.
When generating questions, use the provided difficulty level to adjust the complexity.
`

export async function POST(req: Request) {
  const {
    messages,
    currentDifficulty = 1,
  }: { messages: UIMessage[]; currentDifficulty?: number } = await req.json()

  const systemPrompt = `${SYSTEM_PROMPT}\n**Current difficulty level: ${currentDifficulty}/10**. Always use the 'generateQuestion' tool with the topic and this difficulty level.`

  const result = streamText({
    model: openai('gpt-5-mini'),
    system: systemPrompt,
    messages: convertToModelMessages(messages),
    tools,
    toolChoice: 'required',
  })

  return result.toUIMessageStreamResponse()
}
