'use client'

import { type FC, useEffect, useState } from 'react'

import { Question } from '@/model/schema'

import Game from './Game'
import { GameProvider } from './GameProvider'

const Main: FC = () => {
  const fetchQuestion = async ({
    topic,
    previousQuestions,
    difficulty,
  }: {
    topic: string | null
    previousQuestions: string[]
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
    return data.question as Question
  }

  return (
    <GameProvider fetchQuestion={fetchQuestion}>
      <Game />
    </GameProvider>
  )
}

export default Main
