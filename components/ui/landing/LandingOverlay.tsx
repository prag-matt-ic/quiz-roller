'use client'

import dynamic from 'next/dynamic'
import Image from 'next/image'
import { type FC, type TransitionEvent, useEffect, useState } from 'react'
import { twJoin } from 'tailwind-merge'

import speedroller from '@/assets/brand/SPEEDROLLER.svg'
import speedrollerFaint from '@/assets/brand/speedroller-faint.svg'
import { PLAYER_INITIAL_POSITION, useGameStore } from '@/components/GameProvider'
import { MOVE_HUD_CONFIG } from '@/resources/content/hud'
import { Overlay } from '@/stores/types'

const LandingControls = dynamic(() => import('./LandingControls'), { ssr: false })

type Props = {
  isMobile: boolean
}

const LandingOverlay: FC<Props> = ({ isMobile }) => {
  const isShowingLandingOverlay = useGameStore((s) => s.overlay === Overlay.LANDING)
  const setOverlay = useGameStore((s) => s.setOverlay)
  const isHydrated = useGameStore((s) => s._isHydrated)
  const isPlatformReady = useGameStore((s) => s.isPlatformReady)
  const respawnPlayer = useGameStore((s) => s.respawnPlayer)
  const inputType = useGameStore((s) => s.inputType)

  const [isExiting, setIsExiting] = useState(false)

  const isLoaded = isHydrated && isPlatformReady

  const onStart = () => {
    setIsExiting(true)
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (isShowingLandingOverlay) setIsExiting(false)
  }, [isShowingLandingOverlay])

  const onTransitionEnd = (e: TransitionEvent<HTMLDivElement>) => {
    if (!isExiting) return
    if (e.target !== e.currentTarget) return
    setOverlay(Overlay.NONE)
    const hud = MOVE_HUD_CONFIG[inputType]
    respawnPlayer(PLAYER_INITIAL_POSITION, hud)
  }

  if (!isShowingLandingOverlay) return null

  return (
    <div
      id="landing-overlay"
      onTransitionEnd={onTransitionEnd}
      className={twJoin(
        'fixed inset-0 z-5000 grid grid-cols-1 grid-rows-2 gap-5 px-8 pt-12 pb-2 lg:gap-6',
        'transition-opacity delay-50 duration-300 ease-out motion-reduce:duration-0',
        'bg-linear-0 from-black/20 via-black/90 to-black/20 backdrop-blur-sm',
        isExiting ? 'opacity-0' : 'opacity-100',
      )}>
      <div
        className={twJoin(
          'absolute inset-0 bg-black transition-opacity delay-400 duration-500',
          isLoaded ? 'opacity-0' : 'opacity-100',
        )}
      />

      <header className="relative mx-auto flex w-3xl max-w-4/5 flex-col justify-center gap-2 self-end overflow-hidden">
        <p className="relative w-full">
          <span className="font-unbounded text-lg font-medium">Pragmattic</span>
          <span className="px-2 tracking-wider text-white/50">AND</span>
          <span className="font-unbounded text-lg font-medium">Loopspeed</span>
          <span className="px-2 tracking-wider text-white/50">PRESENTS</span>
        </p>
        <div className="relative h-fit w-full">
          <Image
            src={speedrollerFaint}
            alt=""
            className="relative h-fit w-full object-contain"
            priority
          />
          <Image
            src={speedroller}
            alt="Speedroller"
            className="animate-reveal-logo absolute inset-0 h-fit w-full object-contain motion-reduce:transition-none"
            priority
          />
        </div>
      </header>

      <LandingControls isLoaded={isLoaded} isMobile={isMobile} onStart={onStart} />
    </div>
  )
}

export default LandingOverlay
