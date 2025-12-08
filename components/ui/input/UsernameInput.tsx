'use client'

import {
  type InputHTMLAttributes,
  type ReactNode,
  type Ref,
  forwardRef,
  startTransition,
  useLayoutEffect,
  useState,
} from 'react'
import { twMerge } from 'tailwind-merge'

import { useGameStore } from '@/components/GameProvider'
import { speedRunSubmissionSchema } from '@/model/schema'

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  className?: string
  endAdornment?: ReactNode
  error?: string | null
  isValid?: boolean
}

const BASE_CLASSES =
  'w-full rounded-xl ring ring-white/30 bg-black px-4 py-3 text-left text-xl xl:text-2xl font-bold text-white outline-none placeholder:text-white/60 transition-colors focus:ring-2'

export const Input = forwardRef(function Input(
  { className, endAdornment, error, isValid, ...inputProps }: InputProps,
  ref: Ref<HTMLInputElement>,
) {
  return (
    <div className="w-full">
      <div className="relative flex items-center">
        <input
          ref={ref}
          {...inputProps}
          className={twMerge(
            BASE_CLASSES,
            isValid ? 'focus:ring-emerald-500' : 'focus:ring-amber-500',
            className,
          )}
        />
        {endAdornment && (
          <div className="absolute right-0 z-10 flex aspect-square h-full items-center justify-center">
            {endAdornment}
          </div>
        )}
      </div>
      {!!error && <p className="mt-2 px-1 text-xs text-amber-500 xl:text-sm">{error}</p>}
    </div>
  )
})

const usernameSchema = speedRunSubmissionSchema.shape.username
const errorMessage = 'Username must be 6-12 characters long'

export function useUsernameInput(): InputProps & { isValid: boolean } {
  const username = useGameStore((s) => s.username)
  const setUsername = useGameStore((s) => s.setUsername)

  const [value, setValue] = useState(username ?? '')
  const [error, setError] = useState<string | null>(null)
  const [isValid, setIsValid] = useState<boolean>(false)

  useLayoutEffect(() => {
    const validValue = usernameSchema.safeParse(username ?? '')
    const isValid = validValue.success
    const error = !isValid ? errorMessage : null
    setError(error)
    setIsValid(isValid)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const trimmedUsername = e.target.value.trim()
    setValue(trimmedUsername)

    startTransition(() => {
      const validValue = usernameSchema.safeParse(trimmedUsername)
      const isValid = validValue.success
      const error = !isValid ? errorMessage : null
      setError(error)
      setIsValid(isValid)
      if (isValid) setUsername(trimmedUsername)
    })
  }

  return {
    value,
    onChange,
    error,
    isValid,
    placeholder: 'Enter a username...',
    maxLength: 12,
  }
}
