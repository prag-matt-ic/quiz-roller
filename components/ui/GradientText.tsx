import type { FC, PropsWithChildren } from 'react'
import { twMerge } from 'tailwind-merge'

type Props = PropsWithChildren<{
  className?: string
  spanClassName?: string
}>

export const GradientText: FC<Props> = ({ children, className, spanClassName }) => {
  return (
    <div
      className={twMerge(
        'pointer-events-none relative isolate inline size-fit max-w-4xl bg-linear-70/oklch from-white to-(--palette-3) to-140% bg-clip-text text-center',
        className,
      )}>
      <span
        style={{
          WebkitTextFillColor: 'transparent',
        }}
        className={spanClassName}>
        {children}
      </span>
    </div>
  )
}
