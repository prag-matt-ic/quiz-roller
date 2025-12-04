'use client'

import {
  type ButtonHTMLAttributes,
  type CSSProperties,
  type FC,
  type ReactNode,
  useId,
} from 'react'
import { twJoin } from 'tailwind-merge'

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
  const gradientVars = isSecondary
    ? {
        '--stop-a': '#FFFFFF00',
        '--stop-b': '#FFFFFFCC',
        '--stop-c': '#FFFFFF00',
        '--stop-a-hover': '#FFFFFF',
        '--stop-b-hover': '#FFFFFF',
        '--stop-c-hover': '#FFFFFF1A',
      }
    : ({
        '--stop-a': '#FFBB43',
        '--stop-b': '#D34D0D',
        '--stop-c': '#331A36',
        '--stop-a-hover': '#FFD06F',
        '--stop-b-hover': '#E76B2B',
        '--stop-c-hover': '#4A234F',
      } as CSSProperties)

  return (
    <button
      {...props}
      type={type}
      disabled={disabled}
      style={{ width: 256, height: 54, ...gradientVars }}
      className={twJoin(
        'relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-xl transition-opacity',
        isSecondary ? 'bg-black/10' : 'bg-black/50',
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
      <span className="text-unbounded relative z-10 px-4 text-base font-bold tracking-wide text-white uppercase">
        {children}
      </span>
    </button>
  )
}

export default CTAButton
