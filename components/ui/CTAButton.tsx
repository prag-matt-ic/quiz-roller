'use client'

import {
  type ButtonHTMLAttributes,
  type CSSProperties,
  type FC,
  type ReactNode,
  useId,
} from 'react'
import { twJoin } from 'tailwind-merge'

import { PLAYER_PALETTE_INDEX, getPaletteCss } from '../palette'

const CTA_GRADIENT_OFFSETS = [0.25, 0.5, 0.75] as const
const CTA_GRADIENT_MODE = 'oklch'

type GradientStops = readonly [string, string, string]

const createPrimaryStops = (start = 0, end = 1): GradientStops => {
  const [first, second, third] = CTA_GRADIENT_OFFSETS
  const range = end - start

  return [
    getPaletteCss(PLAYER_PALETTE_INDEX, start + range * first, CTA_GRADIENT_MODE),
    getPaletteCss(PLAYER_PALETTE_INDEX, start + range * second, CTA_GRADIENT_MODE),
    getPaletteCss(PLAYER_PALETTE_INDEX, start + range * third, CTA_GRADIENT_MODE),
  ]
}

const PRIMARY_STOPS = createPrimaryStops()
const PRIMARY_HOVER_STOPS = createPrimaryStops(0.05, 0.95)

const SECONDARY_GRADIENT_VARS = {
  '--stop-a': '#FFFFFF00',
  '--stop-b': '#FFFFFFCC',
  '--stop-c': '#FFFFFF00',
  '--stop-a-hover': '#FFFFFF',
  '--stop-b-hover': '#FFFFFF',
  '--stop-c-hover': '#FFFFFF1A',
} as CSSProperties

const PRIMARY_GRADIENT_VARS = {
  '--stop-a': PRIMARY_STOPS[0],
  '--stop-b': PRIMARY_STOPS[1],
  '--stop-c': PRIMARY_STOPS[2],
  '--stop-a-hover': PRIMARY_HOVER_STOPS[0],
  '--stop-b-hover': PRIMARY_HOVER_STOPS[1],
  '--stop-c-hover': PRIMARY_HOVER_STOPS[2],
} as CSSProperties

type CTAButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode
  isSecondary?: boolean
}

const CTAButton: FC<CTAButtonProps> = ({
  children,
  className,
  disabled,
  isSecondary = false,
  type = 'button',
  ...props
}) => {
  const gradientId = useId()
  const gradientVars = isSecondary ? SECONDARY_GRADIENT_VARS : PRIMARY_GRADIENT_VARS

  return (
    <button
      {...props}
      type={type}
      disabled={disabled}
      style={{ width: 256, height: 54, ...gradientVars }}
      className={twJoin(
        'text-unbounded relative flex shrink-0 items-center justify-center rounded-xl transition-all duration-200',
        isSecondary ? 'bg-black/10' : 'bg-black/40 hover:bg-black/60',
        'hover:[--stop-a:var(--stop-a-hover)] hover:[--stop-b:var(--stop-b-hover)] hover:[--stop-c:var(--stop-c-hover)]',
        'focus-visible:[--stop-a:var(--stop-a-hover)] focus-visible:[--stop-b:var(--stop-b-hover)] focus-visible:[--stop-c:var(--stop-c-hover)]',
        disabled
          ? 'cursor-not-allowed opacity-60'
          : 'hover:opacity-90 focus-visible:opacity-90',
        className,
      )}>
      <svg
        width="256"
        height="54"
        viewBox="0 0 256 54"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="absolute inset-0 h-full w-full"
        aria-hidden="true">
        <rect
          x="0.5"
          y="0.5"
          width="255"
          height="53"
          rx="11.5"
          stroke={`url(#${gradientId}-border)`}
        />
        <defs>
          <linearGradient
            id={`${gradientId}-border`}
            x1="0"
            y1="27"
            x2="264.356"
            y2="33.822"
            gradientUnits="userSpaceOnUse">
            <stop
              offset="0"
              stopColor="var(--stop-a)"
              style={{ transition: 'stop-color 200ms ease, stop-opacity 200ms ease' }}
            />
            <stop
              offset="0.6"
              stopColor="var(--stop-b)"
              style={{ transition: 'stop-color 200ms ease, stop-opacity 200ms ease' }}
            />
            <stop
              offset="1"
              stopColor="var(--stop-c)"
              style={{ transition: 'stop-color 200ms ease, stop-opacity 200ms ease' }}
            />
          </linearGradient>
        </defs>
      </svg>
      <span className="relative z-10 flex items-center gap-2.5 px-3 text-base font-bold tracking-wider text-white uppercase">
        {children}
      </span>
    </button>
  )
}

export default CTAButton
