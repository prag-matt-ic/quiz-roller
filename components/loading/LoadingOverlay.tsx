'use client'

import { useProgress } from '@react-three/drei'
import { type FC, type TransitionEvent, useState } from 'react'
import { twJoin } from 'tailwind-merge'
import { useSoundStore } from '@/components/SoundProvider'
import { Check, PlayIcon, VolumeOffIcon } from 'lucide-react'
import dynamic from 'next/dynamic'
import { useGameStore } from '@/components/GameProvider'
import { GradientText } from '../ui/GradientText'

const Button = dynamic(() => import('@/components/ui/Button'))

const LoadingOverlay: FC = () => {
  const { active, progress } = useProgress()
  const [isMounted, setIsMounted] = useState(true)
  const [isExiting, setIsExiting] = useState(false)

  const setIsMuted = useSoundStore((s) => s.setIsMuted)
  const resetPlayer = useGameStore((s) => s.resetPlayer)

  const isReady = !active && progress >= 100

  const onStartClick = (isMuted: boolean) => {
    setIsMuted(isMuted)
    setIsExiting(true)
    resetPlayer()
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
        'fixed inset-0 z-5000 grid grid-cols-1 grid-rows-3 place-items-center gap-4 bg-radial from-[#030b2a] from-25% to-[#000] to-120% py-24 sm:py-[25vh]',
        'transition-opacity delay-50 duration-300 ease-out motion-reduce:duration-0',
        isExiting ? 'opacity-0' : 'opacity-100',
      )}>
      <h1 className="heading-xl relative text-white">
        <GradientText>Quizroller</GradientText>
      </h1>
      {/* Spinner with inner gradient circle (using CSS palette gradients) */}
      <div className="relative flex size-20 items-center justify-center" role="presentation">
        <div
          className={twJoin(
            'absolute inset-0 animate-pulse rounded-full bg-linear-0 from-[#dc9704] to-[#f9ca0e] motion-reduce:animate-none',
          )}
        />
        <div
          className={twJoin(
            'absolute inset-0 animate-spin rounded-full border-4 border-white border-t-transparent transition-opacity duration-150 motion-reduce:animate-none',
            isReady ? 'opacity-0' : 'opacity-100',
          )}
          aria-hidden="true"
        />
        <Check
          size={40}
          strokeWidth={2.5}
          className={twJoin(
            'relative transition-opacity',
            isReady ? 'opacity-100' : 'opacity-0',
          )}
        />
      </div>

      <div
        className={twJoin(
          'relative flex flex-col items-center gap-4 sm:flex-row',
          !isReady && 'opacity-20',
        )}>
        <Button
          onClick={() => onStartClick(false)}
          color="light"
          variant="primary"
          aria-label="Start with audio"
          disabled={!isReady}>
          <PlayIcon className="size-6" strokeWidth={1.5} />
          Start experience
        </Button>
        <Button
          variant="secondary"
          color="light"
          aria-label="Start muted"
          onClick={() => onStartClick(true)}
          disabled={!isReady}>
          <VolumeOffIcon className="size-6" />
          Start muted
        </Button>
      </div>
    </div>
  )
}

export default LoadingOverlay
