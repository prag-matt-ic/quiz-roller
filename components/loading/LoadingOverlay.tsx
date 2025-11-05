'use client'

import { useProgress } from '@react-three/drei'
import { type FC, type TransitionEvent, useEffect, useState } from 'react'
import { twJoin } from 'tailwind-merge'

const LoadingOverlay: FC = () => {
  const { active, progress } = useProgress()

  const [isMounted, setIsMounted] = useState(true)
  const [isExiting, setIsExiting] = useState(false)

  const isReady = !active && progress >= 100

  useEffect(() => {
    if (!isMounted || isExiting || !isReady) return
    setIsExiting(true)
  }, [isExiting, isMounted, isReady])

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
        'fixed inset-0 z-5000 flex flex-col items-center justify-center gap-6 bg-radial from-[#041A2A] from-20% to-[#0B0A19]',
        'transition-opacity delay-500 duration-500 ease-out motion-reduce:duration-0',
        isExiting ? 'opacity-0' : 'opacity-100',
      )}>
      <h1 className="heading-md -mt-6 text-white">Quizroller</h1>
      {/* Spinner with inner gradient circle (using CSS palette gradients) */}
      <div className="relative size-20" aria-label="Loading">
        <div
          className="absolute inset-0 animate-pulse rounded-full bg-linear-0 from-[#dc9704] to-[#f9ca0e] motion-reduce:animate-none"
          aria-hidden="true"
        />
        <div
          className="absolute inset-0 animate-spin rounded-full border-4 border-white/60 border-t-transparent motion-reduce:animate-none"
          aria-hidden="true"
        />
      </div>
    </div>
  )
}

export default LoadingOverlay
