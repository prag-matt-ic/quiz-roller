/* eslint-disable react-hooks/set-state-in-effect */
'use client'

import { useProgress } from '@react-three/drei'
import { DownloadIcon, PlusIcon, RotateCw, Share2Icon, VolumeOffIcon } from 'lucide-react'
import dynamic from 'next/dynamic'
import { type FC, type TransitionEvent, useEffect, useState } from 'react'
import { twJoin } from 'tailwind-merge'

import { useGameStore } from '@/components/GameProvider'
import { useSoundStore } from '@/components/SoundProvider'
import type { ButtonProps } from '@/components/ui/Button'
import StartExperienceButton from '@/components/ui/StartExperienceButton'
import { usePWA } from '@/hooks/usePWA'

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
  const [isLandscape, setIsLandscape] = useState(() => {
    if (!isMobile) return true
    if (typeof window === 'undefined') return false
    return window.matchMedia('(orientation: landscape)').matches
  })

  const setIsMuted = useSoundStore((s) => s.setIsMuted)
  const onOutOfBounds = useGameStore((s) => s.onOutOfBounds)
  const { canInstall, isInstalled, isPrompting, isPromptSupported, promptInstall } = usePWA()
  const [isIOSDevice, setIsIOSDevice] = useState(false)

  useEffect(() => {
    if (!isMobile) return

    const mediaQuery = window.matchMedia('(orientation: landscape)')

    const handleOrientationChange = (event: MediaQueryList | MediaQueryListEvent) => {
      setIsLandscape(event.matches)
    }

    handleOrientationChange(mediaQuery)

    if (typeof mediaQuery.addEventListener === 'function') {
      mediaQuery.addEventListener('change', handleOrientationChange)
      return () => mediaQuery.removeEventListener('change', handleOrientationChange)
    }

    mediaQuery.addListener(handleOrientationChange)
    return () => mediaQuery.removeListener(handleOrientationChange)
  }, [isMobile])

  useEffect(() => {
    if (!isMobile) {
      setIsIOSDevice(false)
      return
    }
    if (typeof navigator === 'undefined') return
    const ua = navigator.userAgent.toLowerCase()
    setIsIOSDevice(/iphone|ipad|ipod/.test(ua))
  }, [isMobile])

  const isReady = !active && progress >= 100
  const meetsOrientationRequirement = !isMobile || isLandscape
  const canStart = isReady && meetsOrientationRequirement
  const showRotateMessage = isMobile && !isLandscape
  const showInstallButton = isMobile && canInstall
  const showIOSInstallHint =
    isMobile && isIOSDevice && !isInstalled && !canInstall && !isPromptSupported

  const onStartClick = (isMuted: boolean) => {
    setIsMuted(isMuted)
    setIsExiting(true)
    onOutOfBounds({ silent: true })
  }

  const onInstallClick = () => {
    void promptInstall()
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

        {showInstallButton && (
          <Button
            variant="secondary"
            color="light"
            aria-label="Install Quizroller"
            onClick={onInstallClick}
            disabled={isPrompting}
            className="px-6 py-2 text-base"
            leadingNode={<DownloadIcon className="size-5" />}>
            {isPrompting ? 'Requesting install…' : 'Install app'}
          </Button>
        )}

        {showIOSInstallHint && (
          <div className="flex max-w-sm items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-2 text-center text-sm text-white/80">
            <Share2Icon className="size-4 shrink-0 text-white" aria-hidden="true" />
            <span>
              On iOS, tap
              <span className="inline-flex items-center gap-1 px-1">
                <Share2Icon className="size-3" aria-hidden="true" />
                Share
              </span>
              then
              <span className="inline-flex items-center gap-1 px-1">
                <PlusIcon className="size-3" aria-hidden="true" />
                Add to Home Screen
              </span>
            </span>
          </div>
        )}
      </div>

      {showRotateMessage && (
        <div className="flex items-center gap-2 text-center text-sm font-medium tracking-wide text-white uppercase">
          <RotateCw className="size-5" aria-hidden="true" />
          Rotate your device to landscape to start
        </div>
      )}
    </div>
  )
}

export default LoadingOverlay
