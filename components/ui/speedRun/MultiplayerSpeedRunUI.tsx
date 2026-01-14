'use client'
import { PauseIcon } from 'lucide-react'
import { type FC } from 'react'

import { useGameStore } from '@/components/GameProvider'
import { useWebRTC } from '@/components/WebRTCProvider'
import Button from '@/components/ui/Button'
import { Overlay } from '@/stores/types'
import { MultiplayerMessage } from '@/utils/multiplayer/messages'

import { SpeedRunTimer } from './SpeedRunUI'

export const MultiplayerSpeedRunControls: FC = () => {
  const setOverlay = useGameStore((s) => s.setOverlay)
  const setRacePaused = useGameStore((s) => s.setRacePaused)

  const { state: webrtcState, actions: webrtcActions } = useWebRTC()
  const { localPeerId, peers } = webrtcState

  const handlePauseRace = () => {
    // Send RACE_PAUSED message to opponent
    peers.forEach((_, peerId) => {
      webrtcActions.sendMessage(peerId, {
        type: MultiplayerMessage.RACE_PAUSED,
        data: { peerId: localPeerId || '' },
      })
    })

    // Mark that race is paused
    setRacePaused(true, localPeerId)

    // Show multiplayer game paused overlay
    setOverlay(Overlay.MULTIPLAYER_GAME_PAUSED)
  }

  return (
    <div className="pointer-events-auto flex size-fit items-center justify-center gap-2.5">
      <Button
        size="sm"
        variant="secondary"
        title="Pause Race"
        className="aspect-square!"
        onClick={handlePauseRace}>
        <PauseIcon size={20} strokeWidth={2} />
      </Button>

      <SpeedRunTimer />
    </div>
  )
}
