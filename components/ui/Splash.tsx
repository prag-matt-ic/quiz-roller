import { useGSAP } from '@gsap/react'
import gsap from 'gsap'
import { PlayIcon, VolumeXIcon } from 'lucide-react'
import type { FC } from 'react'
import type { TransitionStatus } from 'react-transition-group'

import { Stage, useGameStore } from '@/components/GameProvider'
import MarbleColourSelect from '@/components/player/marble/MarbleColourSelect'
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
      if (transitionStatus === 'entering') {
        gsap
          .timeline({ delay: 0.6 })
          .fromTo(
            'h1',
            { y: -40, opacity: 0, scale: 1.2 },
            { y: 0, opacity: 1, duration: 0.32, scale: 1.0, ease: 'power1.out' },
          )
          .fromTo('#colour-select', { opacity: 0 }, { opacity: 1, duration: 0.4 })
          .fromTo(
            '.splash-button',
            { y: 32, opacity: 0 },
            { y: 0, opacity: 1, stagger: 0.1, duration: 0.5, ease: 'power1.out' },
            '-=0.3',
          )
      }

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
      className="pointer-events-auto fixed inset-0 z-100 flex justify-center bg-linear-180 from-black/40 from-35% to-transparent to-60% pt-16 pb-24">
      <div className="grid w-full max-w-4xl grid-rows-3 text-center text-white">
        {/* Title */}
        <header className="flex h-full flex-col items-center justify-center gap-4">
          <h1 className="heading-xl mb-10 tracking-wide opacity-0">
            <GradientText>Quizroller</GradientText>
          </h1>
        </header>

        <div />

        <div className="mx-auto flex flex-col items-center gap-3 self-end py-6">
          <MarbleColourSelect />
          {/* CTA Buttons */}
          <div className="flex flex-col items-center justify-center gap-2 sm:flex-row sm:gap-3">
            <Button
              variant="secondary"
              color="dark"
              className="splash-button"
              aria-label="Start in silence"
              onClick={() => onStartClick(true)}>
              <VolumeXIcon className="size-5" strokeWidth={2} />
              ROLL IN SILENCE
            </Button>

            <Button
              variant="primary"
              color="dark"
              className="splash-button"
              aria-label="Start with sounds"
              onClick={() => onStartClick(false)}>
              <PlayIcon className="size-5" strokeWidth={2} />
              ROLL WITH SOUNDS
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default SplashUI
