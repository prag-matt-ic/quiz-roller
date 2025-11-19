'use client'
import { useGSAP } from '@gsap/react'
import gsap from 'gsap'
import { type FC, useRef } from 'react'

import AudioToggle from '@/components/ui/AudioToggle'
import Controls from '@/components/ui/controls/Controls'
import Collectibles from '@/components/ui/Collectibles'
import ProgressBar from '@/components/ui/ProgressBar'
import { useGameStore } from '../GameProvider'

gsap.registerPlugin(useGSAP)

type Props = {
  isMobile: boolean
}

const UI: FC<Props> = ({ isMobile }) => {
  const collectibles = useRef<HTMLDivElement>(null)

  const timeElapsed = useGameStore((s) => s.timeElapsed)

  useGSAP(
    () => {
      gsap.fromTo(
        collectibles.current,
        { opacity: 0, y: 24 },
        { opacity: 1, y: 0, duration: 0.4, delay: 2, ease: 'power2.out' },
      )
    },
    { dependencies: [] },
  )

  return (
    <>
      <Controls isMobile={isMobile} />
      <ProgressBar />
      <Collectibles ref={collectibles} />
      <AudioToggle />

      <div className="fixed top-10 right-20">{timeElapsed}</div>
    </>
  )
}

export default UI
