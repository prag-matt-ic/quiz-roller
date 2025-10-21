import { useGSAP } from '@gsap/react'
import gsap from 'gsap'
import { PlayIcon, VolumeXIcon } from 'lucide-react'
import { type FC, useRef } from 'react'
import type { TransitionStatus } from 'react-transition-group'

import { Stage, useGameStore } from '@/components/GameProvider'
import MarbleColourSelect from '@/components/player/marble/MarbleColourSelect'
import Button from '@/components/ui/Button'
import { GradientText } from '@/components/ui/GradientText'

type Props = {
  transitionStatus: TransitionStatus
}

const SplashUI: FC<Props> = ({ transitionStatus }) => {
  const goToStage = useGameStore((s) => s.goToStage)
  const setIsMuted = useGameStore((s) => s.setIsMuted)

  const onStartClick = (isMuted: boolean) => {
    setIsMuted(isMuted)
    goToStage(Stage.INTRO)
  }

  const container = useRef<HTMLDivElement>(null)

  useGSAP(
    () => {
      if (transitionStatus === 'entering') {
        gsap
          .timeline({ delay: 0.6 })
          .to(container.current, { opacity: 1, duration: 0.2 })
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
            duration: 0.3,
            scale: 1.2,
            ease: 'power1.out',
          })
          .to(container.current, {
            opacity: 0,
            duration: 0.3,
            ease: 'power1.out',
          })
      }
    },
    { scope: container, dependencies: [transitionStatus] },
  )

  return (
    <div
      id="splash"
      ref={container}
      className="pointer-events-auto fixed inset-0 z-100 flex justify-center bg-linear-180 from-black/30 from-30% to-transparent to-60% pt-16 pb-24 opacity-0">
      <div className="grid w-full max-w-4xl grid-rows-3 text-center text-white">
        {/* Title */}
        <header className="flex h-full flex-col items-center justify-center gap-4">
          <h1 className="heading-xl mb-10 tracking-wide opacity-0">
            <GradientText>Quizroller</GradientText>
          </h1>
        </header>
        {/* middle section filler */}
        <div />
        {/* Colour Select + CTA Buttons */}
        <div className="mx-auto flex flex-col items-center gap-6 self-end py-6">
          <MarbleColourSelect />

          <div className="flex flex-col items-center justify-center gap-2 sm:flex-row sm:gap-3">
            <Button
              variant="secondary"
              color="dark"
              className="splash-button"
              aria-label="Start in silence"
              onClick={() => onStartClick(true)}>
              <VolumeXIcon className="size-6" strokeWidth={1.75} />
              ROLL IN SILENCE
            </Button>
            <Button
              variant="primary"
              color="dark"
              className="splash-button"
              aria-label="Start with sounds"
              onClick={() => onStartClick(false)}>
              <PlayIcon className="size-6" strokeWidth={1.75} />
              ROLL WITH SOUNDS
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default SplashUI
