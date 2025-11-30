'use client'

import { CheckCircle2, RotateCw } from 'lucide-react'
import { type Dispatch, type FC, type SetStateAction, useEffect } from 'react'
import { twJoin } from 'tailwind-merge'

type Props = {
  isMobile: boolean
  isLandscape: boolean
  setIsLandscape: Dispatch<SetStateAction<boolean>>
}

const RotateDevice: FC<Props> = ({ isMobile, isLandscape, setIsLandscape }) => {
  useEffect(() => {
    if (!isMobile) return

    const mediaQuery = window.matchMedia('(orientation: landscape)')

    const handleOrientationChange = (event: MediaQueryList | MediaQueryListEvent) => {
      setIsLandscape(event.matches)
    }

    handleOrientationChange(mediaQuery)

    mediaQuery.addEventListener('change', handleOrientationChange)
    return () => {
      mediaQuery.removeEventListener('change', handleOrientationChange)
    }
  }, [isMobile, setIsLandscape])

  if (!isMobile) return null

  return (
    <div
      className={twJoin(
        'flex items-center gap-3 text-white',
        'animate-in fade-in duration-300',
      )}>
      {isLandscape ? (
        <CheckCircle2 className="size-9 text-white/80" />
      ) : (
        <RotateCw className="size-9 text-white/80" />
      )}
      <p className="text-sm font-medium tracking-wide text-white uppercase">
        {isLandscape ? 'Ready to start' : 'Rotate your device to start'}
      </p>
    </div>
  )
}

export default RotateDevice
