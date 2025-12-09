'use client'
import { useEffect } from 'react'

import { useGameStore } from '@/components/GameProvider'
import { SoundFX, useSoundStore } from '@/components/SoundProvider'
import { GameMode } from '@/stores/types'

export const BackgroundMusicController = () => {
  const mode = useGameStore((s) => s.mode)
  const isMuted = useSoundStore((s) => s.isMuted)
  const switchBackgroundMusic = useSoundStore((s) => s.switchBackgroundMusic)

  useEffect(() => {
    if (isMuted) return

    if (mode === GameMode.SPEEDRUN) {
      switchBackgroundMusic(SoundFX.BACKGROUND_SPEEDRUN)
    } else {
      switchBackgroundMusic(SoundFX.BACKGROUND_EXPLORE)
    }
  }, [mode, isMuted, switchBackgroundMusic])

  return null
}

