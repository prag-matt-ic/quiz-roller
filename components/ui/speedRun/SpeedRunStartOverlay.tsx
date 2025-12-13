'use client'
import { Play, X } from 'lucide-react'
import { type FC, type Ref, useEffect, useRef } from 'react'
import { type TransitionStatus } from 'react-transition-group'
import { twJoin } from 'tailwind-merge'

import { useGameStore } from '@/components/GameProvider'
import Button from '@/components/ui/Button'
import { PointerProvider } from '@/components/ui/PointerProvider'
import SpeedPanel from '@/components/ui/dashboard/SpeedPanel'
import { Input } from '@/components/ui/input/Input'
import { useUsernameInput } from '@/components/ui/input/useUsernameInput'
import { Overlay } from '@/stores/types'

type Props = {
  ref: Ref<HTMLDivElement>
  transitionStatus: TransitionStatus
}

// Start overlay handles the username input if needed and countdown
export const SpeedRunStartOverlay: FC<Props> = ({ ref, transitionStatus }) => {
  const isMobile = useGameStore((s) => s.isMobile)
  const username = useGameStore((s) => s.username)
  const startCountdown = useGameStore((s) => s.startCountdown)
  const setOverlay = useGameStore((s) => s.setOverlay)
  const usernameInput = useRef<HTMLInputElement>(null)
  const inputProps = useUsernameInput()

  const start = () => {
    if (!inputProps.isValid) return
    startCountdown()
  }

  useEffect(() => {
    if (!!username) return

    const timeout = setTimeout(() => {
      usernameInput.current?.focus()
    }, 50)
    return () => clearTimeout(timeout)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <PointerProvider isMobile={isMobile}>
      <div
        ref={ref}
        className={twJoin(
          'fixed inset-0 z-500 flex size-full items-center justify-center bg-radial from-black/90 from-20% to-black/20 backdrop-blur-md transition-opacity ease-out xl:backdrop-blur-lg',
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
            autoCapitalize="off"
            autoComplete="off"
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === 'NumpadEnter') {
                e.preventDefault()
                start()
              }
            }}
            endAdornment={
              <Button
                variant="primary"
                aria-label="Start countdown"
                onClick={start}
                disabled={!inputProps.isValid}
                className={twJoin(
                  'flex h-full items-center justify-center gap-2 overflow-hidden rounded-none! border-none',

                  inputProps.isValid
                    ? 'bg-emerald-400/10 text-emerald-300 hover:text-emerald-200'
                    : 'cursor-not-allowed! text-neutral-600 before:opacity-20',
                )}
                endIcon={Play}>
                <span className="relative animate-pulse text-lg tracking-wide uppercase">
                  Start
                </span>
              </Button>
            }
          />

          <SpeedPanel />

          <Button
            type="button"
            variant="secondary"
            onClick={() => setOverlay(Overlay.NONE)}
            className=""
            size="sm"
            aria-label="Cancel"
            endIcon={X}>
            Cancel
          </Button>
        </section>
      </div>
    </PointerProvider>
  )
}
