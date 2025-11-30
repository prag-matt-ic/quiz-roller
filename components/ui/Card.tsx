import type { FC, PropsWithChildren } from 'react'
import { twMerge } from 'tailwind-merge'

type CardProps = PropsWithChildren<{
  className?: string
  childrenClassName?: string
}>

const Card: FC<CardProps> = ({ className, children, childrenClassName }) => {
  return (
    <div className={twMerge('card relative origin-bottom', className)}>
      <div
        className={twMerge(
          'relative flex flex-col gap-2.5 rounded-lg bg-linear-160 from-white from-50% to-white/90 p-5 text-black lg:p-7',
          childrenClassName,
        )}
        style={{
          boxShadow: 'inset -5px -5px white',
        }}>
        {children}
      </div>
    </div>
  )
}

export default Card
