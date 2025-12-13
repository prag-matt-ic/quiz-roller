'use client'

import { Check, Send, X } from 'lucide-react'
import { type FC, type FormEvent, type Ref, useMemo, useState } from 'react'
import { type TransitionStatus } from 'react-transition-group'
import { twJoin } from 'tailwind-merge'

import { useGameStore } from '@/components/GameProvider'
import Button from '@/components/ui/Button'
import { PointerProvider } from '@/components/ui/PointerProvider'
import { Input } from '@/components/ui/input/Input'
import { Overlay } from '@/stores/types'

type Props = {
  ref: Ref<HTMLDivElement>
  transitionStatus: TransitionStatus
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export const SubscribeOverlay: FC<Props> = ({ ref, transitionStatus }) => {
  const isMobile = useGameStore((s) => s.isMobile)
  const setOverlay = useGameStore((s) => s.setOverlay)

  const [firstName, setFirstName] = useState('')
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle')
  const [error, setError] = useState<string | null>(null)

  const trimmedFirstName = useMemo(() => firstName.trim(), [firstName])
  const trimmedEmail = useMemo(() => email.trim(), [email])

  const isEmailValid = useMemo(() => EMAIL_REGEX.test(trimmedEmail), [trimmedEmail])
  const isFormValid = trimmedFirstName.length > 0 && isEmailValid
  const isSubmitting = status === 'submitting'
  const isSuccess = status === 'success'

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!isFormValid || isSubmitting) return

    setStatus('submitting')
    setError(null)

    try {
      const response = await fetch('/api/contacts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ firstName: trimmedFirstName, email: trimmedEmail }),
      })

      if (!response.ok) {
        const result = (await response.json().catch(() => null)) as { error?: string } | null
        const message = result?.error ?? 'Failed to subscribe. Please try again.'
        setError(message)
        setStatus('error')
        return
      }

      setStatus('success')
    } catch (err) {
      console.error('[SubscribeOverlay]: failed to submit contact', err)
      setError('Network error. Please try again.')
      setStatus('error')
    }
  }

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
        <section className="flex max-h-full max-w-xl flex-col gap-5 overflow-y-auto px-4 py-5 xl:gap-6">
          <header className="space-y-2 text-center">
            <h2 className="font-unbounded text-2xl font-semibold lg:text-3xl">
              Stay in the loop
            </h2>
            <p className="text-base text-white xl:text-lg">
              Get updates on multiplayer, new levels, and other fresh developments.
            </p>
          </header>

          <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
            <Input
              required={true}
              name="firstName"
              autoComplete="given-name"
              value={firstName}
              onChange={(event) => setFirstName(event.target.value)}
              placeholder="First name"
              isValid={trimmedFirstName.length > 0}
            />
            <Input
              required={true}
              type="email"
              name="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
              isValid={isEmailValid}
            />

            {!!error && <p className="text-sm text-amber-400">{error}</p>}
            {isSuccess && (
              <p className="flex items-center gap-2 text-sm text-emerald-300">
                <Check className="size-5" strokeWidth={1.5} />
                You are subscribed!
              </p>
            )}

            <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:items-center sm:justify-between">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="w-full justify-center sm:w-auto"
                onClick={() => setOverlay(Overlay.NONE)}
                endIcon={X}>
                Close
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="md"
                className="w-full justify-center sm:w-auto"
                disabled={!isFormValid || isSubmitting}
                endIcon={isSuccess ? Check : Send}>
                {isSubmitting ? 'Submitting…' : isSuccess ? 'Subscribed' : 'Subscribe'}
              </Button>
            </div>
          </form>
        </section>
      </div>
    </PointerProvider>
  )
}
