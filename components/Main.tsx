'use client'

import { type FC } from 'react'

import Game from './Game'
import { PerformanceProvider } from './PerformanceProvider'
import Timer from './Timer'
import DebugControls from './debug/DebugControls'
import HtmlPortal from './ui/HtmlPortal'
import UI from './ui/UI'

type Props = {
  isMobile: boolean
  isDebug: boolean
}

const Main: FC<Props> = ({ isMobile, isDebug }) => {
  return (
    <PerformanceProvider isMobile={isMobile}>
      <Game isDebug={isDebug} isMobile={isMobile} />
      <HtmlPortal />
      <UI isMobile={isMobile} />
      <Timer />
      {isDebug && <DebugControls />}
    </PerformanceProvider>
  )
}

export default Main
