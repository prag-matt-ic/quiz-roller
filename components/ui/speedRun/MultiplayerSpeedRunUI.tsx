'use client'
import { XIcon } from 'lucide-react'
import { type FC } from 'react'

import { useGameStore } from '@/components/GameProvider'
import { useWebRTC } from '@/components/WebRTCProvider'
import Button from '@/components/ui/Button'
import { Overlay } from '@/stores/types'
import { MultiplayerMessage } from '@/utils/multiplayer/messages'

import { SpeedRunTimer } from './SpeedRunUI'

export const MultiplayerSpeedRunControls: FC = () => {
  const setOverlay = useGameStore((s) => s.setOverlay)
  const setRaceEndedEarly = useGameStore((s) => s.setRaceEndedEarly)

  const { state: webrtcState, actions: webrtcActions } = useWebRTC()
  const { peers } = webrtcState

  const handleEndRace = () => {
    // Send RACE_ENDED message to opponent
    const localPeerId = webrtcState.localPeerId
    peers.forEach((_, peerId) => {
      webrtcActions.sendMessage(peerId, {
        type: MultiplayerMessage.RACE_ENDED,
        data: { peerId: localPeerId || '' },
      })
    })

    // Mark that race was ended early
    setRaceEndedEarly(true)

    // Show multiplayer race end overlay
    setOverlay(Overlay.MULTIPLAYER_RACE_END)
  }

  return (
    <div className="pointer-events-auto flex size-fit items-center justify-center gap-2.5">
      <Button
        size="sm"
        variant="secondary"
        title="End Race"
        className="aspect-square!"
        onClick={handleEndRace}>
        <XIcon size={20} strokeWidth={2} />
      </Button>

      <SpeedRunTimer />
    </div>
  )
}
