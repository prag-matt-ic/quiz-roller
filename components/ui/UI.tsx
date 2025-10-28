'use client'
import { useGSAP } from '@gsap/react'
import gsap from 'gsap'
import { type FC, useRef } from 'react'
import { SwitchTransition, Transition } from 'react-transition-group'

import { Stage, useGameStore } from '@/components/GameProvider'
import AudioToggle from '@/components/ui/AudioToggle'
import Controls from '@/components/ui/Controls'
import GameOverUI from '@/components/ui/GameOver'
import PlayingUI from '@/components/ui/PlayingUI'

gsap.registerPlugin(useGSAP)
// gsap.ticker.fps(60) // Cap GSAP animations at 60fps

type Props = {
  isMobile: boolean
}

const UI: FC<Props> = () => {
  const wrapper = useRef<HTMLDivElement>(null)
  const stage = useGameStore((s) => s.stage)
  const hasSelectedTopic = useGameStore((s) => !!s.topic)

  const isPlaying = hasSelectedTopic && (stage === Stage.QUESTION || stage === Stage.TERRAIN)
  const isGameOver = stage === Stage.GAME_OVER

  const switchKey = `${isPlaying}-${isGameOver}`

  return (
    <>
      <SwitchTransition>
        <Transition
          key={switchKey}
          timeout={{ enter: 0, exit: 600 }}
          nodeRef={wrapper}
          appear={true}>
          {(transitionStatus) => {
            if (isPlaying)
              return <PlayingUI ref={wrapper} transitionStatus={transitionStatus} />

            if (stage === Stage.GAME_OVER)
              return <GameOverUI ref={wrapper} transitionStatus={transitionStatus} />

            return <div ref={wrapper} className="hidden" />
          }}
        </Transition>
      </SwitchTransition>
      <AudioToggle />
      <Controls />
    </>
  )
}

export default UI
