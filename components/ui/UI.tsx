'use client'
import { useGSAP } from '@gsap/react'
import gsap from 'gsap'
import { SplitText } from 'gsap/SplitText'
import { Check as CheckIcon, CheckCircle2Icon, PlayIcon, SkullIcon } from 'lucide-react'
import { type FC, ReactNode, useRef } from 'react'
import { SwitchTransition, Transition, type TransitionStatus } from 'react-transition-group'
import { twMerge } from 'tailwind-merge'

import { Stage, useGameStore } from '@/components/GameProvider'
import { getDifficultyLabel } from '@/model/difficulty'
// import useAudio from '@/hooks/useAudio' // TODO: add sound effects

// Register plugins
gsap.registerPlugin(useGSAP, SplitText)
gsap.ticker.fps(60) // Cap GSAP animations at 60fps

type Props = {
  isMobile: boolean
}

const UI: FC<Props> = ({ isMobile }) => {
  const wrapper = useRef<HTMLDivElement>(null)

  const stage = useGameStore((s) => s.stage)
  const isSplash = stage === Stage.SPLASH
  const isEntry = stage === Stage.ENTRY
  const isPlaying = stage === Stage.QUESTION || stage === Stage.TERRAIN
  const isGameOver = stage === Stage.GAME_OVER

  const switchKey = `${isSplash}-${isEntry}-${isPlaying}-${isGameOver}`

  // const { playAudio: playBackgroundAudio } = useAudio({
  //   src: '/sounds/background.aac',
  //   loop: true,
  //   volume: 0.45,
  // })

  // const { playAudio: playTransitionAudio } = useAudio({
  //   src: '/sounds/transition.aac',
  //   loop: false,
  //   volume: 0.66,
  // })

  // const { playAudio: playCenterAudio, pauseAudio: pauseCenterAudio } = useAudio({
  //   src: '/sounds/center.aac',
  //   loop: true,
  //   volume: 1,
  // })

  return (
    <SwitchTransition>
      <Transition
        key={switchKey}
        timeout={{ enter: 0, exit: 500 }}
        nodeRef={wrapper}
        appear={true}>
        {(transitionStatus) => {
          if (isSplash)
            return (
              <div ref={wrapper} className="">
                <SplashUI transitionStatus={transitionStatus} />
              </div>
            )
          if (isPlaying)
            return (
              <div ref={wrapper} className="">
                <PlayingUI transitionStatus={transitionStatus} />
              </div>
            )

          if (stage === Stage.GAME_OVER)
            return (
              <div ref={wrapper} className="">
                {isGameOver && (
                  <GameOverUI transitionStatus={transitionStatus} isMobile={isMobile} />
                )}
              </div>
            )

          return <div ref={wrapper} className="hidden" />
        }}
      </Transition>
    </SwitchTransition>
  )
}

export default UI

export const SplashUI: FC<{ transitionStatus: TransitionStatus }> = () => {
  const goToStage = useGameStore((s) => s.goToStage)

  return (
    <div className="pointer-events-auto fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-6">
      <div className="w-full max-w-5xl text-center text-white">
        {/* Title / Mission */}
        <h1 className="text-2xl font-semibold tracking-wide">
          Enchanted Marble: Lift the Kingdom’s Curse
        </h1>
        <p className="mt-2 text-white/80">
          Collect knowledge gems, rebuild the Great Library, and break the curse.
        </p>

        {/* How it works: 3 columns */}
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
          {/* Step 1 */}
          <section className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm">
            <div className="relative mb-3 overflow-hidden rounded-xl">
              {/* <img
                src="/images/splash/quest.jpg"
                alt="Ancient library and a glowing marble at the path’s start"
                className="h-28 w-full object-cover"
                draggable={false}
              /> */}
              <span className="absolute top-3 left-3 rounded-full bg-white/90 px-2 py-0.5 text-xs font-bold text-black">
                1
              </span>
            </div>
            <h2 className="text-lg font-medium"> A dark curse shrouds the kingdom</h2>
            <p className="mt-1 text-sm text-white/80">
              You are the enchanted marble—the last hope to restore the lost library.
            </p>
          </section>

          {/* Step 2 */}
          <section className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm">
            <div className="relative mb-3 overflow-hidden rounded-xl">
              {/* <img
                src="/images/splash/roll.jpg"
                alt="Marble racing along a perilous path collecting glowing gems"
                className="h-28 w-full object-cover"
                draggable={false}
              /> */}
              <span className="absolute top-3 left-3 rounded-full bg-white/90 px-2 py-0.5 text-xs font-bold text-black">
                2
              </span>
            </div>
            <h2 className="text-lg font-medium">Roll, Answer, Survive</h2>
            <p className="mt-1 text-sm text-white/80">
              Touch a knowledge gem to answer. Correct = continue. Wrong or fall off the path ={' '}
              <span className="font-semibold text-white">game over</span>.
            </p>
          </section>

          {/* Step 3 */}
          <section className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm">
            <div className="relative mb-3 overflow-hidden rounded-xl">
              {/* <img
                src="/images/splash/restore.jpg"
                alt="Ruined library transforming into a luminous hall"
                className="h-28 w-full object-cover"
                draggable={false}
              /> */}
              <span className="absolute top-3 left-3 rounded-full bg-white/90 px-2 py-0.5 text-xs font-bold text-black">
                3
              </span>
            </div>
            <h2 className="text-lg font-medium">Lift the Curse</h2>
            <p className="mt-1 text-sm text-white/80">
              Each correct answer restores the library. Beat your personal best and climb the
              leaderboard.
            </p>
          </section>
        </div>

        {/* CTA */}
        <div className="mt-6 flex items-center justify-center">
          <button
            aria-label="Begin your quest"
            className="flex cursor-pointer items-center gap-3 rounded-full border border-white/20 bg-linear-90 from-white/5 to-white/15 px-5 py-2.5 text-xl font-medium text-white shadow-xl shadow-white/5 backdrop-blur-sm hover:from-black/20 hover:to-black/5"
            onClick={() => goToStage(Stage.ENTRY)}>
            <PlayIcon className="size-6" strokeWidth={1.5} />
            BEGIN
          </button>
        </div>

        {/* Safety tip / reminder (optional, small) */}
        <p className="mt-3 text-xs text-white/60">
          Tip: stay centred on narrow paths and read gem questions carefully.
        </p>
      </div>
    </div>
  )
}

const PlayingUI: FC<{ transitionStatus: TransitionStatus }> = () => {
  const confirmedAnswers = useGameStore((s) => s.confirmedAnswers)
  const difficulty = useGameStore((s) => s.currentDifficulty)
  const distanceRows = useGameStore((s) => s.distanceRows)

  const correctCount = confirmedAnswers.reduce(
    (acc, a) => acc + (a.answer.isCorrect ? 1 : 0),
    -1, // First question is the topic, not counted
  )

  const difficultyLabel = getDifficultyLabel(difficulty)

  const renderBlock = ({
    className,
    heading,
    content,
  }: {
    className?: string
    heading: string
    content: ReactNode
  }): ReactNode => {
    return (
      <div className={twMerge('flex flex-col bg-black/30', className)}>
        <div className="block px-4 py-2 text-center text-sm leading-none font-medium text-white/80 uppercase">
          {heading}
        </div>
        <div className="flex-1 bg-black/35 p-2 text-center">{content}</div>
      </div>
    )
  }

  return (
    <section className="pointer-events-none fixed inset-x-0 top-3 flex justify-center gap-0.5">
      {renderBlock({
        heading: 'Difficulty',
        content: <span className="text-lg font-extrabold">{difficultyLabel}</span>,
      })}
      {renderBlock({
        heading: 'Gems',
        content: (
          <div className="flex items-center gap-1">
            {Array.from({ length: correctCount }).map((_, i) => (
              <CheckCircle2Icon key={i} className="size-4 text-green-400" strokeWidth={2} />
            ))}
          </div>
        ),
      })}
      {renderBlock({
        heading: 'Distance',
        content: <span className="text-xl font-extrabold">{distanceRows}</span>,
      })}
    </section>
  )
}

const GameOverUI: FC<{ transitionStatus: TransitionStatus; isMobile: boolean }> = ({
  transitionStatus,
  isMobile,
}) => {
  const container = useRef<HTMLDivElement>(null)
  const goToStage = useGameStore((s) => s.goToStage)

  useGSAP(
    () => {
      if (transitionStatus === 'entered') {
        gsap.fromTo(
          '.game-over-fade-in',
          {
            opacity: 0,
            scale: 1.2,
          },
          {
            opacity: 1,
            scale: 1,
            duration: 0.5,
            ease: 'power1.out',
            stagger: 0.08,
            delay: 0.5,
          },
        )
      }
      if (transitionStatus === 'exiting') {
        gsap.to(container.current, {
          opacity: 0,
          duration: 0.4,
          ease: 'power1.out',
        })
      }
    },
    { dependencies: [transitionStatus], scope: container },
  )

  return (
    <div ref={container} className="">
      {isMobile ? (
        <p className="preference-fade-in max-w-sm p-3 text-center text-white">USE A COMPUTER</p>
      ) : (
        <section>
          <h2 className="text-2xl font-bold">GAME OVER MAN, GAME OVER</h2>
          <button
            className="game-over-fade-in flex cursor-pointer items-center gap-3 rounded-full border border-white/20 bg-linear-90 from-white/5 to-white/15 px-5 py-2.5 text-xl font-medium text-white opacity-0 shadow-xl shadow-white/5 backdrop-blur-sm hover:from-black/20 hover:to-black/5"
            onClick={() => goToStage(Stage.ENTRY)}>
            <PlayIcon className="size-6" strokeWidth={1.5} />
            TRY AGAIN
          </button>
          <button
            className="game-over-fade-in flex cursor-pointer items-center gap-3 rounded-full border border-white/20 bg-linear-90 from-white/5 to-white/15 px-5 py-2.5 text-xl font-medium text-white opacity-0 shadow-xl shadow-white/5 backdrop-blur-sm hover:from-black/20 hover:to-black/5"
            onClick={() => goToStage(Stage.SPLASH)}>
            <SkullIcon className="size-6" strokeWidth={1.5} />
            GIVE UP
          </button>
        </section>
      )}
    </div>
  )
}

//   <div
//     ref={wrapper}
//     className="w-full max-w-2xl">
//     {stage === Stage.SPLASH && (
//       <div className="pointer-events-auto rounded-2xl border border-white/10 bg-black/60 p-6 shadow-xl backdrop-blur">
//         <h1 className="text-2xl font-semibold">Welcome</h1>
//         <p className="mt-2 text-sm text-white/80">
//           Roll onto a topic tile to begin, then answer questions by rolling into the
//           correct answer. Avoid wrong answers!
//         </p>
//         <button
//           onClick={() => goToStage(Stage.ENTRY)}
//           className="mt-4 rounded-xl bg-white/10 px-4 py-2 text-sm hover:bg-white/20">
//           Start
//         </button>
//       </div>
//     )}

//     {stage !== Stage.SPLASH && stage !== Stage.GAME_OVER && (
//       <div className="ml-auto w-fit rounded-xl bg-black/40 px-3 py-2 text-xs leading-none">
//         <div className="flex items-center gap-3">
//           <span className="opacity-80">Difficulty:</span>
//           <span className="font-mono">{currentDifficulty}</span>
//           <span className="opacity-80">Score:</span>
//           <span className="font-mono">{confirmedAnswers.length}</span>
//         </div>
//       </div>
//     )}

//     {stage === Stage.GAME_OVER && (
//       <div className="pointer-events-auto mx-auto max-w-md rounded-2xl border border-red-500/30 bg-red-500/10 p-6 text-center shadow-xl backdrop-blur">
//         <h2 className="text-xl font-semibold">Game Over</h2>
//         <p className="mt-2 text-sm opacity-80">You fell off the course.</p>
//         <button
//           onClick={() => window.location.reload()}
//           className="mt-4 rounded-xl bg-white/10 px-4 py-2 text-sm hover:bg-white/20">
//           Restart
//         </button>
//       </div>
//     )}
//   </div>
// )}
