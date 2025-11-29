'use client'

import { useProgress } from '@react-three/drei'
import { VolumeOffIcon } from 'lucide-react'
import dynamic from 'next/dynamic'
import { type FC, type TransitionEvent, useState } from 'react'
import { twJoin } from 'tailwind-merge'

import { useSoundStore } from '@/components/SoundProvider'
import type { ButtonProps } from '@/components/ui/Button'
import PWAInstall from '@/components/ui/PWAInstall'
import StartExperienceButton from '@/components/ui/StartExperienceButton'

import { useGameStore } from '../GameProvider'
import { GradientText } from '../ui/GradientText'

const Button = dynamic<ButtonProps>(() => import('@/components/ui/Button'))

type Props = {
  isMobile: boolean
}

// TODO: add rotate device if mobile and in landscape mode

const LoadingOverlay: FC<Props> = ({ isMobile }) => {
  const { active, progress } = useProgress()
  const [isMounted, setIsMounted] = useState(true)
  const [isExiting, setIsExiting] = useState(false)

  const setIsMuted = useSoundStore((s) => s.setIsMuted)
  const isPlatformReady = useGameStore((s) => s.isPlatformReady)

  const isReady = !active && progress >= 100 && isPlatformReady
  const canStart = isReady

  const onStartClick = (isMuted: boolean) => {
    setIsMuted(isMuted)
    setIsExiting(true)
  }

  const onTransitionEnd = (e: TransitionEvent<HTMLDivElement>) => {
    if (!isExiting) return
    if (e.target !== e.currentTarget) return
    setIsMounted(false)
  }

  if (!isMounted) return null

  return (
    <div
      id="loading-overlay"
      role="status"
      aria-busy={!isReady}
      aria-live="polite"
      onTransitionEnd={onTransitionEnd}
      className={twJoin(
        'fixed inset-0 z-5000 grid grid-cols-1 grid-rows-3 place-items-center gap-4 bg-radial from-[#030b2a] from-25% to-[#000] to-120% py-4 sm:py-[25vh]',
        'transition-opacity delay-50 duration-300 ease-out motion-reduce:duration-0',
        isExiting ? 'opacity-0' : 'opacity-100',
      )}>
      <header>
        <h1 className="heading-xl relative text-white">
          <GradientText>Speedroller</GradientText>
        </h1>
        <p className="paragraph-lg text-white/80">A three.js showcase by Loopspeed</p>
      </header>
      <div className="flex flex-col items-center gap-3">
        <div
          className={twJoin(
            'relative flex flex-col items-center gap-4 sm:flex-row',
            !canStart && 'opacity-20',
          )}>
          <StartExperienceButton
            progress={progress}
            isReady={isReady}
            disabled={!canStart}
            onClick={() => onStartClick(false)}
            label="Start with audio"
          />
          <Button
            variant="secondary"
            color="light"
            aria-label="Start muted"
            onClick={() => onStartClick(true)}
            disabled={!canStart}>
            <VolumeOffIcon className="size-6" />
            Start muted
          </Button>
        </div>

        <PWAInstall isMobile={isMobile} />
      </div>
    </div>
  )
}

export default LoadingOverlay
