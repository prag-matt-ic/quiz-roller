import { ArrowUpRight } from 'lucide-react'
import type { FC, PropsWithChildren } from 'react'
import { twMerge } from 'tailwind-merge'

import { COLOUR_RANGES, createPaletteGradient } from '@/components/palette'

type CardProps = PropsWithChildren<{
  playerColourIndex: number
  className?: string
}>

export const Card: FC<CardProps> = ({ playerColourIndex = 1, className, children }) => {
  const range = COLOUR_RANGES[playerColourIndex]
  const oklchGradient = createPaletteGradient(range.min, range.max, {
    mode: 'oklch',
    angle: 35,
  })

  return (
    <div className={twMerge('card relative origin-bottom', className)}>
      <div
        className="absolute -top-1.5 -left-1.5 size-full opacity-50"
        style={{
          background: oklchGradient,
        }}
      />
      <div
        className="relative flex h-full flex-col gap-2.5 bg-linear-160 from-white from-30% to-white/80 p-4 text-black sm:p-8"
        style={{
          boxShadow: 'inset -6px -6px white',
        }}>
        {children}
      </div>
    </div>
  )
}

type CreditProps = {
  role: string
  name: string
  url?: string
}

export const Credit: FC<CreditProps> = ({ role, name, url }) => {
  return (
    <div className="py-1">
      <span className="mb-1 block text-xs leading-none text-black/70 uppercase">{role}</span>
      {!!url ? (
        <a
          href={url}
          className="paragraph-sm flex items-center gap-1 font-semibold"
          target="_blank"
          rel="noopener noreferrer">
          {name}
          <ArrowUpRight size={16} strokeWidth={2.5} />
        </a>
      ) : (
        <span className="paragraph-sm font-semibold">{name}</span>
      )}
    </div>
  )
}
