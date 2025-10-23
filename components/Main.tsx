'use client'
import dynamic from 'next/dynamic'
import { type FC } from 'react'

import PerformanceDebug from './debug/PerformanceDebug'
import { GameProvider } from './GameProvider'
import { PerformanceProvider } from './PerformanceProvider'
import UI from './ui/UI'

const Game = dynamic(() => import('./Game'), {
  loading: () => (
    <div className="absolute inset-0 flex animate-pulse items-center justify-center text-white/30">
      <p className="text-lg tracking-wide">Loading Game...</p>
    </div>
  ),
})

type Props = {
  isMobile: boolean
}

const Main: FC<Props> = ({ isMobile }) => {
  return (
    <main className="h-lvh w-full overflow-hidden">
      <PerformanceProvider isMobile={isMobile}>
        <GameProvider>
          <Game />
          <UI isMobile={isMobile} />
          {process.env.NODE_ENV === 'development' && <PerformanceDebug />}
        </GameProvider>
      </PerformanceProvider>
    </main>
  )
}

export default Main
