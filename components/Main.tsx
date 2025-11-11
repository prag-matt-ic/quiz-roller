'use client'

import { type FC } from 'react'

import PerformanceDebug from './debug/PerformanceDebug'
import Game from './Game'
import { PerformanceProvider } from './PerformanceProvider'
import UI from './ui/UI'
import { BackgroundProvider } from './BackgroundProvider'

type Props = {
  isMobile: boolean
  isDebug: boolean
}

const Main: FC<Props> = ({ isMobile, isDebug }) => {
  return (
    <PerformanceProvider isMobile={isMobile}>
      <BackgroundProvider>
        <Game isDebug={isDebug} isMobile={isMobile} />
        <UI isMobile={isMobile} />
        {isDebug && <PerformanceDebug />}
      </BackgroundProvider>
    </PerformanceProvider>
  )
}

export default Main
