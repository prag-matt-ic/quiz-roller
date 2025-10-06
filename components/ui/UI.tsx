'use client'
import { useGSAP } from '@gsap/react'
import gsap from 'gsap'
import { SplitText } from 'gsap/SplitText'
import { PlayIcon, SkullIcon } from 'lucide-react'
import { type FC, useRef } from 'react'
import { SwitchTransition, Transition, type TransitionStatus } from 'react-transition-group'

import { Stage, useGameStore } from '@/components/GameProvider'
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
  const goToStage = useGameStore((s) => s.goToStage)
  const confirmedAnswers = useGameStore((s) => s.confirmedAnswers)
  const currentDifficulty = useGameStore((s) => s.currentDifficulty)

  const isSplash = stage === Stage.SPLASH
  const isEntry = stage === Stage.ENTRY
  const isQuestion = stage === Stage.QUESTION
  const isObstacleCourse = stage === Stage.TERRAIN
  const isGameOver = stage === Stage.GAME_OVER
  const key = `${isSplash}-${isEntry}-${isQuestion}-${isObstacleCourse}-${isGameOver}`

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
      <Transition key={key} timeout={{ enter: 0, exit: 500 }} nodeRef={wrapper} appear={true}>
        {(transitionStatus) => {
          if (!isGameOver)
            return (
              <div ref={wrapper} className="">
                UI
                <button
                  className="ui-fade-in flex cursor-pointer items-center gap-3 rounded-full border border-white/20 bg-linear-90 from-white/5 to-white/15 px-5 py-2.5 text-xl font-medium text-white opacity-0 shadow-xl shadow-white/5 backdrop-blur-sm hover:from-black/20 hover:to-black/5"
                  onClick={() => goToStage(Stage.ENTRY)}>
                  <PlayIcon className="size-6" strokeWidth={1.5} />
                  BEGIN
                </button>
              </div>
            )

          return (
            <div ref={wrapper} className="">
              {isGameOver && (
                <GameOverUI transitionStatus={transitionStatus} isMobile={isMobile} />
              )}
            </div>
          )
        }}
      </Transition>
    </SwitchTransition>
  )
}

export default UI

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
