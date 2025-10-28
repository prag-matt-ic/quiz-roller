'use client'

import { useProgress } from '@react-three/drei'
import { type FC, useEffect, useMemo, useRef, useState } from 'react'
import { twJoin } from 'tailwind-merge'

type Props = {
  className?: string
  minVisibleMs?: number // minimum time overlay stays visible
  fadeDurationMs?: number // fade-out duration
}

const LoadingOverlay: FC<Props> = ({
  className,
  minVisibleMs = 1000,
  fadeDurationMs = 400,
}) => {
  const { active } = useProgress()

  const [hasMinTime, setHasMinTime] = useState(minVisibleMs === 0)
  const [isFading, setIsFading] = useState(false)
  const [isMounted, setIsMounted] = useState(true)

  // Ensure we never "flash" the overlay for ultra-fast loads
  useEffect(() => {
    if (hasMinTime || minVisibleMs <= 0) return
    console.warn('[LoadingOverlay] scheduling minVisible timer', { minVisibleMs })
    const t = window.setTimeout(() => {
      console.warn('[LoadingOverlay] minVisible timer elapsed')
      setHasMinTime(true)
    }, minVisibleMs)
    return () => {
      console.warn('[LoadingOverlay] clearing minVisible timer')
      window.clearTimeout(t)
    }
  }, [hasMinTime, minVisibleMs])

  // Consider ready when loaders are idle and min visible time has elapsed
  const isReady = useMemo(() => {
    // Ready once loaders are idle and min time elapsed
    return !active && hasMinTime
  }, [active, hasMinTime])

  useEffect(() => {
    console.warn('[LoadingOverlay] isReady updated', { isReady, active, hasMinTime })
  }, [isReady, active, hasMinTime])

  // Trigger fade-out once ready, then unmount after the transition
  const hideTimer = useRef<number | null>(null)
  useEffect(() => {
    if (!isMounted || isFading) return
    if (!isReady) return
    console.warn('[LoadingOverlay] triggering fade-out', { fadeDurationMs })
    setIsFading(true)
    hideTimer.current = window.setTimeout(() => {
      console.warn('[LoadingOverlay] fade-out complete; unmounting overlay')
      setIsMounted(false)
    }, fadeDurationMs)

    return () => {
      if (hideTimer.current !== null) {
        console.warn('[LoadingOverlay] clearing hide timer')
        window.clearTimeout(hideTimer.current)
      }
    }
  }, [fadeDurationMs, isFading, isMounted, isReady])

  useEffect(() => {
    console.warn('[LoadingOverlay] mount')
    return () => console.warn('[LoadingOverlay] unmount')
  }, [])

  if (!isMounted) return null

  return (
    <div
      role="status"
      aria-busy={!isReady}
      aria-live="polite"
      className={twJoin(
        'fixed inset-0 z-5000 flex items-center justify-center bg-radial from-[#041A2A] from-20% to-[#0B0A19]',
        'transition-opacity duration-400 ease-out',
        isFading ? 'opacity-0' : 'opacity-100',
        className,
      )}>
      {/* Spinner with inner gradient circle (using CSS palette gradients) */}
      <div className="relative size-20" aria-label="Loading">
        <div
          className="absolute inset-0 animate-pulse rounded-full bg-linear-0 from-[#dc9704] to-[#f9ca0e]"
          aria-hidden="true"
        />
        <div className="absolute inset-0 animate-spin rounded-full border-4 border-white/70 border-t-transparent" />
      </div>
    </div>
  )
}

export default LoadingOverlay
