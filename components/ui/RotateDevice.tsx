'use client'

import { RotateCw } from 'lucide-react'
import { type FC, useEffect, useState } from 'react'
import { twJoin } from 'tailwind-merge'

type Props = {
  isMobile: boolean
}

const RotateDevice: FC<Props> = ({ isMobile }) => {
  const [isLandscape, setIsLandscape] = useState(() => {
    if (!isMobile) return true
    if (typeof window === 'undefined') return false
    return window.matchMedia('(orientation: landscape)').matches
  })

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

  if (!isMobile || isLandscape) return null

  return (
    <div
      className={twJoin(
        'fixed inset-0 z-6000 flex flex-col items-center justify-center gap-4 bg-black text-white',
        'animate-in fade-in duration-300',
      )}>
      <RotateCw className="animate-spin-slow size-12 text-white/80" />
      <p className="text-lg font-medium tracking-wide text-white uppercase">
        Rotate device to play
      </p>
    </div>
  )
}

export default RotateDevice
