'use client'

import {
  forwardRef,
  type InputHTMLAttributes,
  type Ref,
} from 'react'
import { twMerge } from 'tailwind-merge'

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  className?: string
}

const BASE_CLASSES =
  'w-full rounded-xl border border-white/10 bg-black px-4 py-3 text-left text-3xl font-bold text-white outline-none placeholder:text-white/60 transition-colors focus:ring focus:ring-amber-400'

export const Input = forwardRef(function Input(
  { className, ...props }: InputProps,
  ref: Ref<HTMLInputElement>,
) {
  return <input ref={ref} className={twMerge(BASE_CLASSES, className)} {...props} />
})
