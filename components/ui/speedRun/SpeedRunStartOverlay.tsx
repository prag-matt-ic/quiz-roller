'use client'
import { Play, Users, X } from 'lucide-react'
import { type FC, type Ref, useEffect, useRef, useState } from 'react'
import { type TransitionStatus } from 'react-transition-group'
import { twJoin } from 'tailwind-merge'

import { useGameStore } from '@/components/GameProvider'
import Button from '@/components/ui/Button'
import MultiplayerButton from '@/components/ui/MultiplayerButton'
import { PointerProvider } from '@/components/ui/PointerProvider'
import SpeedPanel, { RingBoostInfo } from '@/components/ui/dashboard/SpeedPanel'
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
  const startMultiplayerCountdown = useGameStore((s) => s.startMultiplayerCountdown)
  const setOverlay = useGameStore((s) => s.setOverlay)
  const usernameInput = useRef<HTMLInputElement>(null)
  const inputProps = useUsernameInput()

  const [showMultiplayerSetup, setShowMultiplayerSetup] = useState(false)
  const [isPeerConnected, setIsPeerConnected] = useState(false)

  const startSpeedRun = () => {
    if (!inputProps.isValid) return
    startCountdown()
  }

  const handleMultiplayerClick = () => {
    if (!inputProps.isValid) return
    setShowMultiplayerSetup(true)
  }

  const startMultiplayerRace = () => {
    if (!inputProps.isValid || !isPeerConnected) return
    startMultiplayerCountdown()
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
          'fixed inset-0 z-500 flex size-full items-center justify-center transition-opacity ease-out',
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
                startSpeedRun()
              }
            }}
          />

          {!showMultiplayerSetup ? (
            <>
              <div className="flex flex-col gap-2">
                <Button
                  variant="primary"
                  aria-label="Start speedrun"
                  onClick={startSpeedRun}
                  disabled={!inputProps.isValid}
                  className={twJoin(
                    'flex items-center justify-center gap-2',
                    inputProps.isValid
                      ? 'bg-emerald-400/10 text-emerald-300 hover:text-emerald-200'
                      : 'cursor-not-allowed text-neutral-600',
                  )}
                  endIcon={Play}>
                  <span className="relative text-lg tracking-wide uppercase">
                    Solo Speedrun
                  </span>
                </Button>

                <Button
                  variant="primary"
                  aria-label="Setup multiplayer"
                  onClick={handleMultiplayerClick}
                  disabled={!inputProps.isValid}
                  className={twJoin(
                    'flex items-center justify-center gap-2',
                    inputProps.isValid
                      ? 'bg-purple-400/10 text-purple-300 hover:text-purple-200'
                      : 'cursor-not-allowed text-neutral-600',
                  )}
                  endIcon={Users}>
                  <span className="relative text-lg tracking-wide uppercase">
                    Multiplayer Race
                  </span>
                </Button>
              </div>

              <RingBoostInfo />
            </>
          ) : (
            <>
              {/* Multiplayer Setup Section */}
              <div className="rounded-lg border border-purple-500/30 bg-purple-500/5 p-4">
                <h3 className="mb-3 flex items-center gap-2 text-lg font-semibold text-purple-300">
                  <Users className="size-5" />
                  Multiplayer Setup
                </h3>

                {/* Use MultiplayerButton in always-expanded mode */}
                <div className="[&>div]:w-full [&>div]:border-none [&>div]:bg-transparent [&>div]:p-0">
                  <MultiplayerButton
                    alwaysExpanded
                    hideToggle
                    onConnectionChange={setIsPeerConnected}
                  />
                </div>

                {isPeerConnected && (
                  <div className="mt-3 flex gap-2">
                    <Button
                      onClick={() => setShowMultiplayerSetup(false)}
                      variant="secondary"
                      className="flex-1 text-sm">
                      Back
                    </Button>
                    <Button
                      onClick={startMultiplayerRace}
                      disabled={!inputProps.isValid}
                      className="flex-1 bg-emerald-500/20 text-sm text-emerald-300 hover:bg-emerald-500/30">
                      Start Race
                    </Button>
                  </div>
                )}
                {!isPeerConnected && (
                  <Button
                    onClick={() => setShowMultiplayerSetup(false)}
                    variant="secondary"
                    className="mt-3 w-full text-sm">
                    Back
                  </Button>
                )}
              </div>
            </>
          )}

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
