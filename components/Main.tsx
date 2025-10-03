'use client'

import { useChat, type UseChatHelpers } from '@ai-sdk/react'
import { type FC, useEffect, useState } from 'react'

import Game from './Game'
import { GameProvider, useGameStore } from './GameProvider'

const Main: FC = () => {
  return (
    <GameProvider>
      <Game />
    </GameProvider>
  )
}

export default Main
