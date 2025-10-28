'use client'
import dynamic from 'next/dynamic'
import { type FC } from 'react'

import LoadingOverlay from './loading/LoadingOverlay'
const GameApp = dynamic(() => import('./GameApp'), { ssr: false })

type Props = {
  isMobile: boolean
}

const Main: FC<Props> = ({ isMobile }) => {
  return (
    <main className="h-lvh w-full overflow-hidden">
      <LoadingOverlay />
      <GameApp isMobile={isMobile} />
    </main>
  )
}

export default Main
