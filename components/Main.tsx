'use client'

import { type FC } from 'react'

import SimFpsHotkeys from './debug/SimFpsHotkeys'
import Game from './Game'
import { GameProvider } from './GameProvider'
import UI from './ui/UI'

const Main: FC = () => {
  return (
    <main>
      <GameProvider>
        <Game />
        <UI isMobile={false} />
        {process.env.NODE_ENV === 'development' && <SimFpsHotkeys />}
      </GameProvider>
    </main>
  )
}

export default Main
