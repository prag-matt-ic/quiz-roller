'use client'
import { Play, Users, X } from 'lucide-react'
import { type FC, type Ref, useEffect, useRef, useState } from 'react'
import { SwitchTransition, Transition, type TransitionStatus } from 'react-transition-group'
import { twJoin } from 'tailwind-merge'

import { useGameStore } from '@/components/GameProvider'
import Button from '@/components/ui/Button'
import { PointerProvider } from '@/components/ui/PointerProvider'
import { RingBoostInfo } from '@/components/ui/dashboard/SpeedPanel'
import { Input } from '@/components/ui/input/Input'
import { useUsernameInput } from '@/components/ui/input/useUsernameInput'
import MultiplayerSetup from '@/components/ui/speedRun/MultiplayerSetup'
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

  const [showMultiplayerSetup, setShowMultiplayerSetup] = useState(false)

  const modeButtonsRef = useRef<HTMLDivElement>(null)
  const multiplayerSetupRef = useRef<HTMLDivElement>(null)
  const activeBodyRef = showMultiplayerSetup ? multiplayerSetupRef : modeButtonsRef

  const startSpeedRun = () => {
    if (!inputProps.isValid) return
    startCountdown()
  }

  const handleMultiplayerClick = () => {
    if (!inputProps.isValid) return
    setShowMultiplayerSetup(true)
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
          'fixed inset-0 z-500 flex size-full items-center justify-center opacity-0 transition-opacity ease-out motion-reduce:transition-none',
          (transitionStatus === 'entering' || transitionStatus === 'entered') &&
            'opacity-100 duration-300',
          (transitionStatus === 'exiting' || transitionStatus === 'exited') &&
            'opacity-0 duration-500',
        )}>
        <section
          className={twJoin(
            'flex max-h-full max-w-xl flex-col gap-4 overflow-y-auto px-2 py-4 xl:gap-6',
            // Panel slide (Y) when opening/closing the overlay
            'transform-gpu transition-transform ease-out motion-reduce:transition-none',
            (transitionStatus === 'entering' || transitionStatus === 'entered') &&
              'translate-y-0 duration-300',
            (transitionStatus === 'exiting' || transitionStatus === 'exited') &&
              'translate-y-6 duration-500',
          )}>
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

          <div className="min-h-[22rem] w-full">
            <SwitchTransition mode="out-in">
              <Transition
                key={showMultiplayerSetup ? 'multiplayer-setup' : 'mode-buttons'}
                nodeRef={activeBodyRef}
                timeout={{ enter: 200, exit: 200 }}
                mountOnEnter={true}
                unmountOnExit={true}
                appear={true}>
                {(status) =>
                  !showMultiplayerSetup ? (
                    <div
                      ref={modeButtonsRef}
                      className={twJoin(
                        'flex w-full flex-col gap-4 opacity-0 transition-[opacity,transform] duration-200 ease-out motion-reduce:transform-none motion-reduce:transition-none',
                        (status === 'entering' || status === 'entered') &&
                          'translate-y-0 opacity-100',
                        (status === 'exiting' || status === 'exited') &&
                          'translate-y-2 opacity-0',
                      )}>
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

                      <Button
                        type="button"
                        variant="secondary"
                        onClick={() => setOverlay(Overlay.NONE)}
                        size="sm"
                        aria-label="Cancel"
                        endIcon={X}>
                        Cancel
                      </Button>
                    </div>
                  ) : (
                    <div
                      ref={multiplayerSetupRef}
                      className={twJoin(
                        'w-full rounded-lg border border-purple-500/30 bg-purple-500/5 p-4 opacity-0 transition-[opacity,transform] duration-200 ease-out motion-reduce:transform-none motion-reduce:transition-none',
                        (status === 'entering' || status === 'entered') &&
                          'translate-y-0 opacity-100',
                        (status === 'exiting' || status === 'exited') &&
                          'translate-y-2 opacity-0',
                      )}>
                      <MultiplayerSetup onBack={() => setShowMultiplayerSetup(false)} />
                    </div>
                  )
                }
              </Transition>
            </SwitchTransition>
          </div>
        </section>
      </div>
    </PointerProvider>
  )
}
