'use client'
import { MessageCircle, SendHorizonal } from 'lucide-react'
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
    if (!speedrunId || !username) return
    setIsSubmitting(true)

    try {
      const data: FeedbackSubmission = {
        message: message.trim(),
        speedrun_id: speedrunId,
        username,
      }
      const result = await submitFeedback(data)

      if (result) {
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
      <div className="flex flex-col gap-4">
        {hasSubmitted ? (
          <p className="text-sm text-white/90">Thanks for submitting feedback!</p>
        ) : (
          <div className="flex gap-2">
            <input
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Share your thoughts, report issues, or suggest improvements."
              className="w-full rounded-lg border border-white/20 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-white/40 focus:border-white/40 focus:outline-none"
              maxLength={500}
              disabled={isSubmitting}
            />
            <Button
              variant="primary"
              onClick={onSubmit}
              disabled={!canSubmit}
              className="min-w-24">
              {isSubmitting ? 'Sending...' : 'Send'}
              <SendHorizonal className="ml-1 size-10" />
            </Button>
          </div>
        )}
      </div>
    </Panel>
  )
}
