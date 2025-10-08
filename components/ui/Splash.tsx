import { PlayIcon } from 'lucide-react'
import type { StaticImageData } from 'next/image'
import type { FC, ReactNode } from 'react'
import { TransitionStatus } from 'react-transition-group'

import { Stage, useGameStore } from '@/components/GameProvider'

type SplashCardProps = {
  stepNumber: number
  imageSrc?: StaticImageData
  imageAlt?: string
  heading: ReactNode
  description: ReactNode
}

const SplashCard: FC<SplashCardProps> = ({
  stepNumber,
  imageSrc,
  imageAlt = '',
  heading,
  description,
}) => {
  return (
    <section className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm">
      <div className="relative mb-3 overflow-hidden rounded-xl">
        {/* {imageSrc && (
          <img
            src={imageSrc}
            alt={imageAlt}
            className="h-28 w-full object-cover"
            draggable={false}
          />
        )} */}
        <span className="absolute top-3 left-3 rounded-full bg-white/90 px-2 py-0.5 text-xs font-bold text-black">
          {stepNumber}
        </span>
      </div>
      <h2 className="text-lg font-medium">{heading}</h2>
      <p className="mt-1 text-sm text-white/80">{description}</p>
    </section>
  )
}

const SplashUI: FC<{ transitionStatus: TransitionStatus }> = () => {
  const goToStage = useGameStore((s) => s.goToStage)

  return (
    <div className="pointer-events-auto fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-6">
      <div className="w-full max-w-5xl text-center text-white">
        {/* Title / Mission */}
        <h1 className="text-2xl font-semibold tracking-wide">
          Enchanted Marble: Lift the Kingdom&apos;s Curse
        </h1>
        <p className="mt-2 text-white/80">
          Collect knowledge gems, rebuild the Great Library, and break the curse.
        </p>

        {/* How it works: 3 columns */}
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <SplashCard
            stepNumber={1}
            heading="A dark curse shrouds the kingdom"
            description="You are the enchanted marble—the last hope to restore the lost library."
          />
          <SplashCard
            stepNumber={2}
            heading="Roll, Answer, Survive"
            description="Touch a knowledge gem to answer. Correct = continue. Wrong or fall off the path = game over."
          />
          <SplashCard
            stepNumber={3}
            heading="Lift the Curse"
            description="Each correct answer restores the library. Beat your personal best and climb the leaderboard."
          />
        </div>

        {/* CTA */}
        <div className="mt-6 flex items-center justify-center">
          <button
            aria-label="Begin your quest"
            className="flex cursor-pointer items-center gap-3 rounded-full border border-white/20 bg-linear-90 from-white/5 to-white/15 px-5 py-2.5 text-xl font-medium text-white shadow-xl shadow-white/5 backdrop-blur-sm hover:from-black/20 hover:to-black/5"
            onClick={() => goToStage(Stage.ENTRY)}>
            <PlayIcon className="size-6" strokeWidth={1.5} />
            START ROLLING
          </button>
        </div>

        {/* Safety tip / reminder (optional, small) */}
        <p className="mt-3 text-xs text-white/60">
          Tip: stay centred on narrow paths and read questions carefully
        </p>
      </div>
    </div>
  )
}

export default SplashUI
