import { type LucideIcon } from 'lucide-react'
import type { ButtonHTMLAttributes, FC, ReactNode } from 'react'
import { twMerge } from 'tailwind-merge'

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant: 'primary' | 'secondary'
  size?: 'sm' | 'md' | 'lg'
  children: ReactNode
  className?: string
  startIcon?: LucideIcon
  endIcon?: LucideIcon
  iconClassName?: string
}

const BASE_CLASSES =
  'relative flex size-fit cursor-pointer leading-none disabled:opacity-70 uppercase items-center disabled:cursor-not-allowed justify-center rounded-full font-semibold'

const SIZE_CLASSES = {
  sm: 'gap-1.5 px-3 py-1.5 text-xs lg:px-4 lg:py-2 lg:text-sm',
  md: 'gap-2 px-4 py-2 text-sm lg:px-6 lg:py-2.5 lg:text-base',
  lg: 'gap-3 px-6 py-2 text-base lg:px-8 lg:py-3 lg:text-lg',
}

const ICON_SIZE_CLASSES = {
  sm: 'size-3.5 xl:size-4',
  md: 'size-4 xl:size-5',
  lg: 'size-5 xl:size-6',
}

const VARIANT_CLASSES: Record<ButtonProps['variant'], string> = {
  primary:
    'border border-white/15 bg-radial from-white/5 to-white/10 text-white hover:from-white/10 hover:to-white/20',
  secondary:
    'border border-white/5 bg-radial from-white/3 to-white/6 text-white/70 hover:from-white/6 hover:to-white/12 hover:text-white',
}

const Button: FC<ButtonProps> = ({
  variant = 'primary',
  size = 'lg',
  children,
  className,
  startIcon: StartIcon,
  endIcon: EndIcon,
  iconClassName,
  ...props
}) => {
  return (
    <button
      className={twMerge(BASE_CLASSES, SIZE_CLASSES[size], VARIANT_CLASSES[variant], className)}
      {...props}>
      {!!StartIcon ? (
        <StartIcon className={twMerge(ICON_SIZE_CLASSES[size], iconClassName)} />
      ) : null}
      {children}
      {!!EndIcon ? (
        <EndIcon className={twMerge(ICON_SIZE_CLASSES[size], iconClassName)} />
      ) : null}
    </button>
  )
}

export default Button
