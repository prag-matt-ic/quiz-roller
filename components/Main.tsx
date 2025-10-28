'use client'
import dynamic from 'next/dynamic'
import { type FC } from 'react'

import PerformanceDebug from './debug/PerformanceDebug'
import { GameProvider } from './GameProvider'
import { PerformanceProvider } from './PerformanceProvider'
import { SoundProvider } from './SoundProvider'
import UI from './ui/UI'
import LoadingOverlay from './loading/LoadingOverlay'

const Game = dynamic(() => import('./Game'))

type Props = {
  isMobile: boolean
}

const Main: FC<Props> = ({ isMobile }) => {
  return (
    <main className="h-lvh w-full overflow-hidden">
      {/* Render loader outside providers so it appears immediately */}
      <LoadingOverlay />
      <SoundProvider>
        <PerformanceProvider isMobile={isMobile}>
          <GameProvider>
            <Game />
            <UI isMobile={isMobile} />
            {process.env.NODE_ENV === 'development' && <PerformanceDebug />}
          </GameProvider>
        </PerformanceProvider>
      </SoundProvider>
    </main>
  )
}

export default Main
