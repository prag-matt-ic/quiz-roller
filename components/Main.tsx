'use client'

import { type FC } from 'react'

import PerformanceDebug from './debug/PerformanceDebug'
import Game from './Game'
import { PerformanceProvider } from './PerformanceProvider'
import UI from './ui/UI'

type Props = {
  isMobile: boolean
  isDebug: boolean
}

const Main: FC<Props> = ({ isMobile, isDebug }) => {
  return (
    <PerformanceProvider isMobile={isMobile}>
      <Game isDebug={isDebug} />
      <UI isMobile={isMobile} />
      {isDebug && <PerformanceDebug />}
    </PerformanceProvider>
  )
}

export default Main
