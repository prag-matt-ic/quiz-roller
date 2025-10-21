'use client'
import { useGSAP } from '@gsap/react'
import gsap from 'gsap'
import { SplitText } from 'gsap/SplitText'
import { type FC, useRef } from 'react'
import { SwitchTransition, Transition } from 'react-transition-group'

import { Stage, useGameStore } from '@/components/GameProvider'
import GameOverUI from '@/components/ui/GameOver'
import PlayingUI from '@/components/ui/PlayingUI'
import SplashUI from '@/components/ui/Splash'
// import useAudio from '@/hooks/useAudio' // TODO: add sound effects

// Register plugins
gsap.registerPlugin(useGSAP, SplitText)
gsap.ticker.fps(60) // Cap GSAP animations at 60fps

type Props = {
  isMobile: boolean
}

const UI: FC<Props> = () => {
  const wrapper = useRef<HTMLDivElement>(null)

  const stage = useGameStore((s) => s.stage)
  const hasSelectedTopic = useGameStore((s) => !!s.topic)
  const isSplash = stage === Stage.SPLASH
  const isIntro = stage === Stage.INTRO
  const isPlaying = hasSelectedTopic && (stage === Stage.QUESTION || stage === Stage.TERRAIN)
  const isGameOver = stage === Stage.GAME_OVER

  const switchKey = `${isSplash}-${isIntro}-${isPlaying}-${isGameOver}`

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
        timeout={{ enter: 0, exit: 600 }}
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
                <GameOverUI transitionStatus={transitionStatus} />
              </div>
            )

          return <div ref={wrapper} className="hidden" />
        }}
      </Transition>
    </SwitchTransition>
  )
}

export default UI
