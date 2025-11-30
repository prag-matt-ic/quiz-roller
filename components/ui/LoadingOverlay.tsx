'use client'

import { PlayCircleIcon, VolumeOffIcon } from 'lucide-react'
import dynamic from 'next/dynamic'
import { type FC, type TransitionEvent, useState } from 'react'
import { twJoin } from 'tailwind-merge'

import { PLAYER_INITIAL_POSITION, useGameStore } from '@/components/GameProvider'
import { useSoundStore } from '@/components/SoundProvider'
import type { ButtonProps } from '@/components/ui/Button'
import { GradientText } from '@/components/ui/GradientText'
import { InputConfig } from '@/components/ui/menu/InputConfig'
import { MOVE_HUD_CONFIG } from '@/resources/content'

import RotateDevice from './RotateDevice'

const Button = dynamic<ButtonProps>(() => import('@/components/ui/Button'))

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

  const isReady = isHydrated && isPlatformReady && (!isMobile || isMobileLandscape)

  const onStartClick = (isMuted: boolean) => {
    setIsMuted(isMuted)
    setIsExiting(true)
  }

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
        'fixed inset-0 z-5000 flex flex-col items-center justify-center gap-4 to-120% px-4 py-4',
        'transition-opacity delay-50 duration-300 ease-out motion-reduce:duration-0',
        'bg-radial from-[#000]/90 from-25% to-[#000]/0 to-100% backdrop-blur-sm',
        isExiting ? 'opacity-0' : 'opacity-100',
      )}>
      <div
        className={twJoin(
          'absolute inset-0 bg-[#000] transition-opacity delay-400 duration-600',
          isReady ? 'opacity-0' : 'opacity-100',
        )}
      />

      <header className="relative">
        <h1 className="heading-md lg:heading-xl text-white">
          <GradientText>Speedroller</GradientText>
        </h1>
      </header>

      <InputConfig />

      <RotateDevice
        isMobile={isMobile}
        isLandscape={isMobileLandscape}
        setIsLandscape={setIsMobileLandscape}
      />

      <div className={twJoin('relative flex flex-col items-center gap-4 sm:flex-row')}>
        <Button
          variant="primary"
          color="light"
          aria-label="Start experience"
          disabled={!isReady}
          onClick={() => onStartClick(false)}>
          <PlayCircleIcon className="size-6" />
          Enter experience
        </Button>
        <Button
          variant="secondary"
          color="light"
          aria-label="Start muted"
          onClick={() => onStartClick(true)}
          disabled={!isReady}>
          <VolumeOffIcon className="size-6" />
          Enter in silence
        </Button>
      </div>
    </div>
  )
}

export default LoadingOverlay
