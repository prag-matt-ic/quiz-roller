'use client'

import { type FC, useId } from 'react'
import { PlayIcon } from 'lucide-react'
import { twJoin } from 'tailwind-merge'

export type StartExperienceButtonProps = {
  progress: number
  isReady: boolean
  disabled: boolean
  onClick: () => void
  label: string
}

const clampProgress = (value: number) => Math.max(0, Math.min(value, 100))

const StartExperienceButton: FC<StartExperienceButtonProps> = ({
  progress,
  isReady,
  disabled,
  onClick,
  label,
}) => {
  const uniqueId = useId()
  const buttonGradientId = `${uniqueId}-start-button-gradient`
  const clampedProgress = clampProgress(progress)
  const progressRatio = clampedProgress / 100
  const strokeDashoffset = (1 - progressRatio) * 100
  const opacityValue = disabled ? 0.25 : 0.35 + progressRatio * 0.65
  const fillOpacity = 0.4 + progressRatio * 0.6

  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      disabled={disabled}
      className={twJoin(
        'group relative flex items-center justify-center px-10 py-4',
        'text-black transition-opacity duration-500 focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:outline-none',
        disabled ? 'cursor-not-allowed' : 'cursor-pointer',
      )}
      style={{ opacity: opacityValue }}>
      <svg
        className="pointer-events-none absolute inset-0 size-full"
        viewBox="0 0 100 40"
        preserveAspectRatio="none"
        aria-hidden="true">
        <rect
          x="1.5"
          y="1.5"
          width="97"
          height="37"
          rx="18.5"
          fill={`url(#${buttonGradientId})`}
          fillOpacity={fillOpacity}
          stroke={`url(#${buttonGradientId})`}
          strokeWidth="3"
          pathLength={100}
          strokeDasharray={100}
          strokeDashoffset={strokeDashoffset}
          className="transition-[stroke-dashoffset] duration-300 ease-out"
        />
        <defs>
          <linearGradient id={buttonGradientId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#f8e38f" />
            <stop offset="50%" stopColor="#f5b041" />
            <stop offset="100%" stopColor="#f7931e" />
          </linearGradient>
        </defs>
      </svg>
      <span
        className={twJoin(
          'relative z-10 flex items-center gap-3 text-sm font-black tracking-[0.2em] uppercase sm:text-lg',
          'transition-transform duration-500',
          isReady ? 'scale-105' : 'scale-100',
        )}>
        <span
          className={twJoin(
            'flex size-10 items-center justify-center rounded-full bg-black/40 text-white transition-transform duration-500',
            isReady ? 'scale-110' : 'scale-100',
          )}>
          <PlayIcon className="size-5" strokeWidth={1.5} />
        </span>
        Start experience
      </span>
    </button>
  )
}

export default StartExperienceButton
