import { type Question, Topic } from '@/model/schema'

export type TopicDifficultyBank = Record<number, Question[]>
export type ContentLibrary = Record<Topic, TopicDifficultyBank>

export const pickRandom = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)]

export function selectNextQuestion({
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
    console.warn('[CONTENT] Unknown topic:', topic)
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
  [Topic.UX_UI_DESIGN]: {
    1: [
      {
        id: 'ux-1-1',
        subtopic: 'Basics',
        difficulty: 1,
        text: 'What does UX stand for?',
        answers: [
          { text: 'User Experience', isCorrect: true },
          { text: 'Universal Exchange', isCorrect: false },
        ],
      },
      {
        id: 'ux-1-2',
        subtopic: 'Basics',
        difficulty: 1,
        text: 'A wireframe is used primarily to…',
        answers: [
          { text: 'Outline structure and layout', isCorrect: true },
          { text: 'Measure server throughput', isCorrect: false },
        ],
      },
    ],
    2: [
      {
        id: 'ux-2-1',
        subtopic: 'Interaction',
        difficulty: 2,
        text: 'Which principle improves perceived performance?',
        answers: [
          { text: 'Skeleton screens', isCorrect: true },
          { text: 'Modal stacking', isCorrect: false },
        ],
      },
      {
        id: 'ux-2-2',
        subtopic: 'Accessibility',
        difficulty: 2,
        text: 'Minimum color contrast (WCAG AA) for body text is…',
        answers: [
          { text: '4.5:1', isCorrect: true },
          { text: '1.5:1', isCorrect: false },
        ],
      },
    ],
    3: [
      {
        id: 'ux-3-1',
        subtopic: 'Research',
        difficulty: 3,
        text: 'Which method yields qualitative insights?',
        answers: [
          { text: 'User interviews', isCorrect: true },
          { text: 'Synthetic benchmarks', isCorrect: false },
        ],
      },
    ],
  },
  [Topic.PSYCHOLOGY]: {
    1: [
      {
        id: 'psy-1-1',
        subtopic: 'Basics',
        difficulty: 1,
        text: 'Classical conditioning was pioneered by…',
        answers: [
          { text: 'Ivan Pavlov', isCorrect: true },
          { text: 'Marie Curie', isCorrect: false },
        ],
      },
      {
        id: 'psy-1-2',
        subtopic: 'Memory',
        difficulty: 1,
        text: 'Short-term memory capacity is about…',
        answers: [
          { text: '7 ± 2 items', isCorrect: true },
          { text: '20 ± 5 items', isCorrect: false },
        ],
      },
    ],
    2: [
      {
        id: 'psy-2-1',
        subtopic: 'Bias',
        difficulty: 2,
        text: 'The tendency to seek info confirming beliefs is…',
        answers: [
          { text: 'Confirmation bias', isCorrect: true },
          { text: 'Bandwagon effect', isCorrect: false },
        ],
      },
    ],
  },
  [Topic.ENGLISH]: {
    1: [
      {
        id: 'eng-1-1',
        subtopic: 'Grammar',
        difficulty: 1,
        text: 'Choose the correct form: “She ____ to school.”',
        answers: [
          { text: 'goes', isCorrect: true },
          { text: 'go', isCorrect: false },
        ],
      },
      {
        id: 'eng-1-2',
        subtopic: 'Vocabulary',
        difficulty: 1,
        text: 'Synonym of “begin” is…',
        answers: [
          { text: 'start', isCorrect: true },
          { text: 'finish', isCorrect: false },
        ],
      },
    ],
    2: [
      {
        id: 'eng-2-1',
        subtopic: 'Punctuation',
        difficulty: 2,
        text: 'Use a semicolon to…',
        answers: [
          { text: 'Link related clauses', isCorrect: true },
          { text: 'Start a new paragraph', isCorrect: false },
        ],
      },
    ],
  },
  [Topic.ARTIFICIAL_INTELLIGENCE]: {
    1: [
      {
        id: 'ai-1-1',
        subtopic: 'ML Basics',
        difficulty: 1,
        text: 'Supervised learning requires…',
        answers: [
          { text: 'Labeled data', isCorrect: true },
          { text: 'Only unlabeled data', isCorrect: false },
        ],
      },
      {
        id: 'ai-1-2',
        subtopic: 'ML Basics',
        difficulty: 1,
        text: 'A loss function measures…',
        answers: [
          { text: 'Prediction error', isCorrect: true },
          { text: 'Model size', isCorrect: false },
        ],
      },
    ],
    2: [
      {
        id: 'ai-2-1',
        subtopic: 'NNs',
        difficulty: 2,
        text: 'ReLU activation outputs…',
        answers: [
          { text: 'max(0, x)', isCorrect: true },
          { text: 'x^2', isCorrect: false },
        ],
      },
    ],
    3: [
      {
        id: 'ai-3-1',
        subtopic: 'Optimization',
        difficulty: 3,
        text: 'Adam optimizer combines…',
        answers: [
          { text: 'Momentum + RMSProp', isCorrect: true },
          { text: 'SGD + Dropout', isCorrect: false },
        ],
      },
    ],
  },
}
