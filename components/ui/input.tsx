'use client'

import { type InputHTMLAttributes, type Ref, forwardRef } from 'react'
import { twMerge } from 'tailwind-merge'

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  className?: string
}

const BASE_CLASSES =
  'w-full rounded-xl ring ring-white/30 bg-[#000000] px-4 py-3 text-left text-2xl lg:text-3xl font-bold text-white outline-none placeholder:text-white/60 transition-colors focus:ring-2 focus:ring-amber-500'

export const Input = forwardRef(function Input(
  { className, ...props }: InputProps,
  ref: Ref<HTMLInputElement>,
) {
  return <input ref={ref} className={twMerge(BASE_CLASSES, className)} {...props} />
})
