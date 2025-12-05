'use client'

import dynamic from 'next/dynamic'
import Image from 'next/image'
import { type FC, type TransitionEvent, useEffect, useState } from 'react'
import { twJoin } from 'tailwind-merge'

import speedroller from '@/assets/brand/SPEEDROLLER.svg'
import speedrollerFaint from '@/assets/brand/speedroller-faint.svg'
import { PLAYER_INITIAL_POSITION, useGameStore } from '@/components/GameProvider'
import { useSoundStore } from '@/components/SoundProvider'
import { MOVE_HUD_CONFIG } from '@/resources/content'

const LandingControls = dynamic(() => import('./LandingControls'), { ssr: false })

type Props = {
  isMobile: boolean
}

const LandingOverlay: FC<Props> = ({ isMobile }) => {
  const setIsMuted = useSoundStore((s) => s.setIsMuted)

  const isShowingLandingOverlay = useGameStore((s) => s.isShowingLandingOverlay)
  const setIsShowingLandingOverlay = useGameStore((s) => s.setIsShowingLandingOverlay)
  const isHydrated = useGameStore((s) => s._isHydrated)
  const isPlatformReady = useGameStore((s) => s.isPlatformReady)
  const respawnPlayer = useGameStore((s) => s.respawnPlayer)
  const inputType = useGameStore((s) => s.inputType)

  const [isExiting, setIsExiting] = useState(false)
  const [isMobileLandscape, setIsMobileLandscape] = useState(!isMobile)

  const isLoaded = isHydrated && isPlatformReady
  const canStart = isLoaded && (!isMobile || isMobileLandscape)

  const [startMuted, setStartMuted] = useState(false)

  const onStartClick = () => {
    setIsMuted(startMuted)
    setIsExiting(true)
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (isShowingLandingOverlay) setIsExiting(false)
  }, [isShowingLandingOverlay])

  const onTransitionEnd = (e: TransitionEvent<HTMLDivElement>) => {
    if (!isExiting) return
    if (e.target !== e.currentTarget) return
    setIsShowingLandingOverlay(false)
    const hud = MOVE_HUD_CONFIG[inputType]
    respawnPlayer(PLAYER_INITIAL_POSITION, hud)
  }

  if (!isShowingLandingOverlay) return null

  return (
    <div
      id="landing-overlay"
      onTransitionEnd={onTransitionEnd}
      className={twJoin(
        'fixed inset-0 z-5000 flex flex-col items-center justify-center gap-6 px-6 py-4 lg:gap-8',
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

      <header className="relative flex flex-col justify-center gap-2">
        <div className="relative flex items-center gap-2">
          <span className="font-unbounded text-lg font-medium">Pragmattic</span>
          <p className="tracking-wider text-white/50">AND</p>
          <span className="font-unbounded text-lg font-medium">Loopspeed</span>
          <p className="tracking-wider text-white/50">PRESENT</p>
        </div>
        <div className="relative h-fit w-3xl max-w-4/5">
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

      {/* TODO: create a compoent for these, wrap them in pointerprovider, load them dynamically. Then update CTA button to move the gradient center (make it radial gradient.) */}
      <LandingControls
        isLoaded={isLoaded}
        canStart={canStart}
        onStartClick={onStartClick}
        startMuted={startMuted}
        setStartMuted={setStartMuted}
        isMobile={isMobile}
        isMobileLandscape={isMobileLandscape}
        setIsMobileLandscape={setIsMobileLandscape}
      />
    </div>
  )
}

export default LandingOverlay
