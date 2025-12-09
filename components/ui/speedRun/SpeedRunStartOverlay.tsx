'use client'
import { Play, X } from 'lucide-react'
import { type FC, type Ref, useEffect, useRef } from 'react'
import { type TransitionStatus } from 'react-transition-group'
import { twJoin } from 'tailwind-merge'

import { useGameStore } from '@/components/GameProvider'
import Button from '@/components/ui/Button'
import { RingBoostInfo } from '@/components/ui/dashboard/SpeedPanel'
import { Input, useUsernameInput } from '@/components/ui/input/UsernameInput'
import { Overlay } from '@/stores/types'

type Props = {
  ref: Ref<HTMLDivElement>
  transitionStatus: TransitionStatus
}

// Start overlay handles the username input if needed and countdown
export const SpeedRunStartOverlay: FC<Props> = ({ ref, transitionStatus }) => {
  const startCountdown = useGameStore((s) => s.startCountdown)
  const setOverlay = useGameStore((s) => s.setOverlay)
  const usernameInput = useRef<HTMLInputElement>(null)
  const inputProps = useUsernameInput()

  const start = () => {
    if (!inputProps.isValid) return
    startCountdown()
  }

  useEffect(() => {
    const timeout = setTimeout(() => {
      usernameInput.current?.focus()
    }, 50)
    return () => clearTimeout(timeout)
  }, [])

  return (
    <div
      ref={ref}
      className={twJoin(
        'fixed inset-0 z-500 flex size-full items-center justify-center bg-radial from-black/90 from-20% to-black/20 backdrop-blur-sm transition-opacity',
        transitionStatus === 'entering' && 'opacity-100 duration-300',
        transitionStatus === 'entered' && 'opacity-100',
        transitionStatus === 'exiting' && 'opacity-0 duration-500',
        transitionStatus === 'exited' && 'opacity-0',
      )}>
      <section className="flex max-h-full max-w-xl flex-col gap-4 overflow-y-auto px-2 py-4 xl:gap-6">
        <h2 className="font-unbounded text-center text-2xl font-semibold lg:text-3xl">
          Race to the finish line
        </h2>

        <Input
          ref={usernameInput}
          {...inputProps}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === 'NumpadEnter') {
              e.preventDefault()
              start()
            }
          }}
          endAdornment={
            <button
              type="button"
              aria-label="Start countdown"
              onClick={start}
              disabled={!inputProps.isValid}
              className={twJoin(
                'flex h-full items-center justify-center gap-2 px-3',
                inputProps.isValid
                  ? 'animate-pulse text-emerald-400 hover:text-emerald-200'
                  : 'cursor-not-allowed! text-neutral-600',
              )}>
              <span className="text-lg font-medium tracking-wide uppercase">Play</span>
              <Play size={32} strokeWidth={2} className="" />
            </button>
          }
        />

        <RingBoostInfo />

        <Button
          type="button"
          variant="primary"
          onClick={() => setOverlay(Overlay.NONE)}
          className=""
          size="sm"
          aria-label="Cancel"
          endIcon={X}>
          Cancel
        </Button>
      </section>
    </div>
  )
}
