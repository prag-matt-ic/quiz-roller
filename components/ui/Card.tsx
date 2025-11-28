import type { FC, PropsWithChildren } from 'react'
import { twMerge } from 'tailwind-merge'

type CardProps = PropsWithChildren<{
  className?: string
  childrenClassName?: string
}>

// TODO: new design for this in-keeping with the grid and use a cool masked reveal effect.
const Card: FC<CardProps> = ({ className, children, childrenClassName }) => {
  return (
    <div className={twMerge('card relative origin-bottom', className)}>
      <div
        className={twMerge(
          'relative flex flex-col gap-2.5 rounded-xl bg-linear-160 from-white from-40% to-white/80 p-4 text-black sm:p-7',
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
