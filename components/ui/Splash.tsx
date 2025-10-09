import { useGSAP } from '@gsap/react'
import gsap from 'gsap'
import { PlayIcon, VolumeXIcon } from 'lucide-react'
import type { FC } from 'react'
import { TransitionStatus } from 'react-transition-group'

import { Stage, useGameStore } from '@/components/GameProvider'
import Button from '@/components/ui/Button'
import { GradientText } from '@/components/ui/GradientText'

const SplashUI: FC<{ transitionStatus: TransitionStatus }> = ({ transitionStatus }) => {
  const goToStage = useGameStore((s) => s.goToStage)
  const setIsMuted = useGameStore((s) => s.setIsMuted)

  const onStartClick = (isMuted: boolean) => {
    setIsMuted(isMuted)
    goToStage(Stage.INTRO)
  }

  useGSAP(
    () => {
      if (transitionStatus === 'exiting') {
        gsap
          .timeline()
          .to('h1', {
            y: -80,
            opacity: 0,
            duration: 0.32,
            scale: 1.2,
            ease: 'power1.out',
          })
          .to(
            '#splash',
            {
              opacity: 0,
              duration: 0.3,
              ease: 'power1.out',
            },
            0.2,
          )
      }
    },
    { dependencies: [transitionStatus] },
  )

  return (
    <div
      id="splash"
      className="pointer-events-auto fixed inset-0 z-100 flex justify-center bg-linear-180 from-black/80 from-35% to-transparent to-60% py-24">
      <div className="grid w-full max-w-4xl grid-rows-2 text-center text-white">
        {/* Title */}
        <header className="flex flex-col items-center justify-center gap-4">
          <h1 className="heading-xl tracking-wide">
            <GradientText>Quizroller</GradientText>
          </h1>
          {/* CTA Buttons */}
          <div className="mt-10 flex items-center justify-center gap-4">
            <Button
              variant="secondary"
              color="dark"
              aria-label="Start in silence"
              onClick={() => onStartClick(true)}>
              <VolumeXIcon className="size-5" strokeWidth={2} />
              ROLL IN SILENCE
            </Button>

            <Button
              variant="primary"
              color="dark"
              aria-label="Start with sounds"
              onClick={() => onStartClick(false)}>
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
