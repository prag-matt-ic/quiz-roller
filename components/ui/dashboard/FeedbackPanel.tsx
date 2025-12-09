'use client'
import { LoaderIcon, MessageCircle, SendHorizonal } from 'lucide-react'
import { type FC, useState } from 'react'
import { twJoin } from 'tailwind-merge'

import { submitFeedback } from '@/app/actions'
import { useGameStore } from '@/components/GameProvider'
import Button from '@/components/ui/Button'
import Panel from '@/components/ui/panel/Panel'
import { PanelHeader } from '@/components/ui/panel/PanelHeader'
import type { FeedbackSubmission } from '@/model/schema'

type Props = {
  className?: string
  speedrunId: number | null
}

export const FeedbackPanel: FC<Props> = ({ className, speedrunId }) => {
  const [message, setMessage] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [hasSubmitted, setHasSubmitted] = useState(false)
  const username = useGameStore((s) => s.username)

  const canSubmit = message.trim().length >= 10 && message.trim().length <= 500 && !isSubmitting

  const onSubmit = async () => {
    if (!username) return
    setIsSubmitting(true)

    try {
      // TODO: linking it to the speed run means you can only send 1 feedback per run and we can't accept general feedback.
      // K.I.S.S!
      const data: FeedbackSubmission = {
        message: message.trim(),
        speedrun_id: speedrunId || 1,
        username,
      }
      const result = await submitFeedback(data)
      if (!!result) {
        setHasSubmitted(true)
        setMessage('')
      }
    } catch (error) {
      console.error('Error submitting feedback:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Panel
      className={twJoin('flex flex-col justify-between gap-3', className)}
      attractorClassName="bg-amber-600/20">
      <PanelHeader icon={MessageCircle} iconClassName="text-white" label="Feedback" />

      {hasSubmitted ? (
        <p className="text-sm xl:text-base">Thanks for your feedback!</p>
      ) : (
        <p className="text-sm xl:text-base">
          Share your thoughts and ideas, or report a bug.
          <br />
          <span className="text-white/60">We appreciate your feedback!</span>
        </p>
      )}

      <div className="flex gap-2">
        <input
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder=""
          className="w-full rounded-lg border border-white/20 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-white/40 focus:border-white/40 focus:outline-none"
          maxLength={500}
          disabled={isSubmitting}
        />
        <Button
          variant="primary"
          size="md"
          onClick={onSubmit}
          disabled={!canSubmit}
          iconClassName={twJoin(isSubmitting && 'animate-spin')}
          endIcon={isSubmitting ? LoaderIcon : SendHorizonal}>
          Send
        </Button>
      </div>
    </Panel>
  )
}
