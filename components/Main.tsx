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
}

const Main: FC<Props> = ({ isMobile }) => {
  return (
    <SoundProvider>
      <PerformanceProvider isMobile={isMobile}>
        <GameProvider>
          <Game />
          <UI isMobile={isMobile} />
          {/* {process.env.NODE_ENV === 'development' && <PerformanceDebug />} */}
        </GameProvider>
      </PerformanceProvider>
    </SoundProvider>
  )
}

export default Main
