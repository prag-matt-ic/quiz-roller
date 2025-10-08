import type { ButtonHTMLAttributes, FC, ReactNode } from 'react'
import { twMerge } from 'tailwind-merge'

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary'
  color?: 'light' | 'dark'
  children: ReactNode
  className?: string
}

const baseStyles =
  'flex w-fit cursor-pointer items-center justify-center gap-3 rounded-full px-6 py-3 text-lg font-[600] backdrop-blur-sm transition-all'

const colorStyles = {
  light: {
    primary:
      'border border-white/20 bg-linear-90 from-white/5 to-white/15 text-white shadow-xl shadow-white/5 backdrop-blur-sm hover:from-white/10 hover:to-white/20',
    secondary:
      'border border-white/5 bg-white/3 text-white/70 backdrop-blur-sm hover:bg-white/8 hover:text-white',
  },
  dark: {
    primary:
      'border border-black/20 bg-linear-90 from-black/60 to-black/30 text-white shadow-xl shadow-black/20 backdrop-blur-sm hover:from-black/70 hover:to-black/40',
    secondary:
      'border border-black/5 bg-black/20 text-white/70 backdrop-blur-sm hover:bg-black/30 hover:text-white',
  },
}

const Button: FC<ButtonProps> = ({
  variant = 'primary',
  color = 'light',
  children,
  className,
  ...props
}) => {
  return (
    <button className={twMerge(baseStyles, colorStyles[color][variant], className)} {...props}>
      {children}
    </button>
  )
}

export default Button
