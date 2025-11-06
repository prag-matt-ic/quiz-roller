'use client'

import { type FC } from 'react'

import PerformanceDebug from './debug/PerformanceDebug'
import Game from './Game'
import { GameProvider } from './GameProvider'
import { PerformanceProvider } from './PerformanceProvider'
import { SoundProvider } from './SoundProvider'
import UI from './ui/UI'

type Props = {
  isMobile: boolean
  isDebug: boolean
}

const Main: FC<Props> = ({ isMobile, isDebug }) => {
  return (
    <SoundProvider>
      <PerformanceProvider isMobile={isMobile}>
        <GameProvider>
          <Game isDebug={isDebug} />
          <UI isMobile={isMobile} />
          {isDebug && <PerformanceDebug />}
        </GameProvider>
      </PerformanceProvider>
    </SoundProvider>
  )
}

export default Main
