'use client'

import { type FC } from 'react'

import { type Question, QuestionSchema } from '@/model/schema'

import Game from './Game'
import { GameProvider } from './GameProvider'

const Main: FC = () => {
  const fetchQuestion = async ({
    topic,
    previousQuestions,
    difficulty,
  }: {
    topic: string
    previousQuestions: Array<Question & { difficulty?: number }>
    difficulty: number
  }): Promise<Question> => {
    const response = await fetch('/api/question', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        topic,
        previousQuestions,
        difficulty,
      }),
    })
    if (!response.ok) {
      throw new Error(`Error fetching question: ${response.statusText}`)
    }
    const data = await response.json()
    console.warn('Fetch question payload:', data)
    return QuestionSchema.parse(data)
  }

  return (
    <GameProvider fetchQuestion={fetchQuestion}>
      <Game />
    </GameProvider>
  )
}

export default Main
