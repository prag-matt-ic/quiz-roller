import type { FC, PropsWithChildren } from 'react'
import { twMerge } from 'tailwind-merge'

import { createPaletteGradient } from '@/components/palette'

type CardProps = PropsWithChildren<{
  className?: string
  childrenClassName?: string
}>

// TODO: new deisgn for this in-keeping with the grid and use a cool masked reveal effect.
const Card: FC<CardProps> = ({ className, children, childrenClassName }) => {
  const oklchGradient = createPaletteGradient(1, {
    mode: 'oklch',
    angle: 35,
  })

  return (
    <div className={twMerge('card relative origin-bottom', className)}>
      <div
        className="absolute -top-1.5 -left-1.5 size-full opacity-80"
        style={{
          background: oklchGradient,
        }}
      />
      <div
        className={twMerge(
          'relative flex flex-col gap-2.5 bg-linear-160 from-white from-40% to-white/80 p-4 text-black sm:p-7',
          childrenClassName,
        )}
        style={{
          boxShadow: 'inset -6px -6px white',
        }}>
        {children}
      </div>
    </div>
  )
}

export default Card
