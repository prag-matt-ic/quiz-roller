import { ContentLibrary, type Question, Topic } from '@/model/schema'
import { UX_UI_CONTENT } from '@/resources/content/uxui'

export const pickRandom = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)]

export function getNextQuestion({
  topic,
  currentDifficulty,
  askedIds,
}: {
  topic: Topic
  currentDifficulty: number
  askedIds: Set<string>
}): Question | undefined {
  const topicBank = CONTENT[topic]
  if (!topicBank) {
    console.error('[CONTENT] Unknown topic:', topic)
    return undefined
  }

  const diffs = Object.keys(topicBank)
    .map((d) => Number(d))
    .sort((a, b) => a - b)

  let pool = topicBank[currentDifficulty] ?? []
  if (!pool.length) {
    const lower = diffs.filter((d) => d <= currentDifficulty).reverse()
    const higher = diffs.filter((d) => d > currentDifficulty)
    const chosen = lower[0] ?? higher[0]
    pool = chosen ? (topicBank[chosen] ?? []) : []
  }

  if (!pool.length) {
    console.warn('[CONTENT] No questions available for topic', topic)
    return undefined
  }

  const unasked = pool.filter((q) => !askedIds.has(q.id))
  const candidates = unasked.length ? unasked : pool
  return pickRandom(candidates)
}

// Placeholder questions for each topic and difficulty.
// Difficulty keys start at 1. Add more as needed.
export const CONTENT: ContentLibrary = {
  [Topic.UX_UI_DESIGN]: UX_UI_CONTENT,
  [Topic.ARTIFICIAL_INTELLIGENCE]: { 1: [] },
}
