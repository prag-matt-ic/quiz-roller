'use client'

import { type FC } from 'react'

import { type Question, QuestionSchema } from '@/model/schema'

import SimFpsHotkeys from './debug/SimFpsHotkeys'
import Game from './Game'
import { GameProvider } from './GameProvider'
import UI from './ui/UI'

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
    return QuestionSchema.parse(data)
  }

  return (
    <main>
      <GameProvider fetchQuestion={fetchQuestion}>
        <Game />
        <UI isMobile={false} />
        {process.env.NODE_ENV === 'development' && <SimFpsHotkeys />}
      </GameProvider>
    </main>
  )
}

export default Main
