'use client'

import { type InputHTMLAttributes, type ReactNode, type Ref, forwardRef } from 'react'
import { twMerge } from 'tailwind-merge'

export type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  className?: string
  endAdornment?: ReactNode
  error?: string | null
  isValid?: boolean
}

const BASE_CLASSES =
  'w-full rounded-xl ring ring-teal-200/30 bg-black/80 px-4 py-2.5 xl:py-3 text-left text-lg xl:text-2xl font-bold text-white outline-none placeholder:text-white/60 transition-colors focus:ring-2'

export const Input = forwardRef(function Input(
  { className, endAdornment, error, isValid, ...inputProps }: InputProps,
  ref: Ref<HTMLInputElement>,
) {
  const hasEndAdornment = !!endAdornment

  return (
    <div className="w-full">
      <div className="relative flex items-center">
        <input
          ref={ref}
          {...inputProps}
          className={twMerge(
            BASE_CLASSES,
            hasEndAdornment && 'pr-36',
            isValid ? 'focus:ring-emerald-500' : 'focus:ring-amber-500',
            className,
          )}
        />
        {hasEndAdornment && (
          <div className="absolute right-0 z-10 h-full overflow-hidden rounded-r-lg">
            {endAdornment}
          </div>
        )}
      </div>
      {!!error && <p className="mt-2 px-1 text-xs text-amber-500 xl:text-sm">{error}</p>}
    </div>
  )
})
