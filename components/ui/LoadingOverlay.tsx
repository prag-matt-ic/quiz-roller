'use client'

import dynamic from 'next/dynamic'
import Image from 'next/image'
import { type FC, type TransitionEvent, useEffect, useState } from 'react'
import { twJoin } from 'tailwind-merge'

import speedroller from '@/assets/brand/SPEEDROLLER.svg'
import speedrollerFaint from '@/assets/brand/speedroller-faint.svg'
import { PLAYER_INITIAL_POSITION, useGameStore } from '@/components/GameProvider'
import { useSoundStore } from '@/components/SoundProvider'
import CTAButton from '@/components/ui/CTAButton'
import { InputConfig } from '@/components/ui/menu/InputConfig'
import { MOVE_HUD_CONFIG } from '@/resources/content'

import RotateDevice from './RotateDevice'

type Props = {
  isMobile: boolean
}

const LoadingOverlay: FC<Props> = ({ isMobile }) => {
  const setIsMuted = useSoundStore((s) => s.setIsMuted)

  const isShowingLoadingOverlay = useGameStore((s) => s.isShowingLoadingOverlay)
  const setIsShowingLoadingOverlay = useGameStore((s) => s.setIsShowingLoadingOverlay)
  const isHydrated = useGameStore((s) => s._isHydrated)
  const isPlatformReady = useGameStore((s) => s.isPlatformReady)
  const respawnPlayer = useGameStore((s) => s.respawnPlayer)
  const inputType = useGameStore((s) => s.inputType)

  const [isExiting, setIsExiting] = useState(false)
  const [isMobileLandscape, setIsMobileLandscape] = useState(!isMobile)
  const [isLogoRevealed, setIsLogoRevealed] = useState(false)

  const isReady = isHydrated && isPlatformReady && (!isMobile || isMobileLandscape)
  const logoClipPath = isLogoRevealed ? 'inset(0 0% 0 0)' : 'inset(0 100% 0 0)'

  const onStartClick = (isMuted: boolean) => {
    setIsMuted(isMuted)
    setIsExiting(true)
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (isShowingLoadingOverlay) setIsExiting(false)
  }, [isShowingLoadingOverlay])

  useEffect(() => {
    setIsLogoRevealed(true)
  }, [])

  const onTransitionEnd = (e: TransitionEvent<HTMLDivElement>) => {
    if (!isExiting) return
    if (e.target !== e.currentTarget) return
    setIsShowingLoadingOverlay(false)
    const hud = MOVE_HUD_CONFIG[inputType]
    respawnPlayer(PLAYER_INITIAL_POSITION, hud)
  }

  if (!isShowingLoadingOverlay) return null

  return (
    <div
      id="loading-overlay"
      onTransitionEnd={onTransitionEnd}
      className={twJoin(
        'fixed inset-0 z-5000 flex flex-col items-center justify-center gap-10 px-8 py-4',
        'transition-opacity delay-50 duration-300 ease-out motion-reduce:duration-0',
        'bg-linear-0 from-black/20 via-black/90 to-black/20 backdrop-blur-sm',
        isExiting ? 'opacity-0' : 'opacity-100',
      )}>
      <div
        className={twJoin(
          'absolute inset-0 bg-black transition-opacity delay-400 duration-500',
          isReady ? 'opacity-0' : 'opacity-100',
        )}
      />

      <header className="relative flex flex-col justify-center gap-3">
        <div className="relative flex items-center gap-2">
          <span className="font-unbounded text-lg font-medium">Pragmattic</span>
          <p className="tracking-wider text-white/50">AND</p>
          <span className="font-unbounded text-lg font-medium">Loopspeed</span>
          <p className="tracking-wider text-white/50">PRESENT</p>
        </div>
        <div className="relative h-28 max-w-full">
          <Image
            src={speedrollerFaint}
            alt=""
            className="relative h-28 w-fit max-w-full object-contain"
            priority
          />
          <Image
            src={speedroller}
            alt="Speedroller"
            style={{
              clipPath: logoClipPath,
              transition: 'clip-path 2.2s cubic-bezier(0.33, 1, 0.68, 1)',
            }}
            className="absolute inset-0 h-28 w-fit object-contain motion-reduce:transition-none motion-reduce:[clip-path:inset(0)]"
            priority
          />
        </div>
      </header>

      {/* TODO: create a compoent for these, wrap them in pointerprovider, load them dynamically. Then update CTA button to move the gradient center (make it radial gradient.) */}
      <div
        id="landing-controls"
        className={twJoin(
          'relative flex flex-col flex-wrap items-center gap-5 transition-opacity duration-500 ease-out motion-reduce:transition-none sm:flex-row',
          isReady ? 'opacity-100 delay-150' : 'opacity-0',
        )}>
        <CTAButton
          aria-label="Start experience"
          disabled={!isReady}
          onClick={() => onStartClick(false)}>
          Start experience
        </CTAButton>
        <CTAButton
          aria-label="Start muted"
          onClick={() => onStartClick(true)}
          disabled={!isReady}
          isSecondary>
          Enter in silence
        </CTAButton>

        <InputConfig />
      </div>

      <RotateDevice
        isMobile={isMobile}
        isLandscape={isMobileLandscape}
        setIsLandscape={setIsMobileLandscape}
      />
    </div>
  )
}

export default LoadingOverlay
