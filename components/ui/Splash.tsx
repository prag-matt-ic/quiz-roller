import { PlayIcon, VolumeXIcon } from 'lucide-react'
import type { FC } from 'react'
import { TransitionStatus } from 'react-transition-group'

import { Stage, useGameStore } from '@/components/GameProvider'

import Button from './Button'

const SplashUI: FC<{ transitionStatus: TransitionStatus }> = () => {
  const goToStage = useGameStore((s) => s.goToStage)
  const setIsMuted = useGameStore((s) => s.setIsMuted)

  const handleStart = (muted: boolean) => {
    setIsMuted(muted)
    goToStage(Stage.ENTRY)
  }

  return (
    <div className="pointer-events-auto fixed inset-0 z-100 flex justify-center bg-linear-180 from-black/80 from-40% to-transparent to-60% py-24">
      <div className="grid w-full max-w-4xl grid-rows-2 text-center text-white">
        {/* Title */}
        <header className="flex flex-col items-center justify-center">
          <h1 className="heading-xl tracking-wide">Enchanted Marble</h1>
          <p className="paragraph-lg text-white">Lift the Kingdom&apos;s Curse</p>
          {/* CTA Buttons */}
          <div className="mt-10 flex items-center justify-center gap-4">
            <Button
              variant="secondary"
              color="dark"
              aria-label="Start in silence"
              onClick={() => handleStart(true)}>
              <VolumeXIcon className="size-5" strokeWidth={2} />
              ROLL IN SILENCE
            </Button>

            <Button
              variant="primary"
              color="dark"
              aria-label="Start with sounds"
              onClick={() => handleStart(false)}>
              <PlayIcon className="size-5" strokeWidth={2} />
              ROLL WITH SOUNDS
            </Button>
          </div>
        </header>
      </div>
    </div>
  )
}

export default SplashUI
