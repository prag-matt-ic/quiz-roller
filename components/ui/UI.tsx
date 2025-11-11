'use client'
import { useGSAP } from '@gsap/react'
import gsap from 'gsap'
import { type FC, useRef } from 'react'
import { SwitchTransition, Transition } from 'react-transition-group'

import { Stage, useGameStore } from '@/components/GameProvider'
import AudioToggle from '@/components/ui/AudioToggle'
import Controls from '@/components/ui/controls/Controls'
import GameOverUI from '@/components/ui/GameOver'
import PlayingUI from '@/components/ui/PlayingUI'

gsap.registerPlugin(useGSAP)

type Props = {
  isMobile: boolean
}

const UI: FC<Props> = ({ isMobile }) => {
  const wrapper = useRef<HTMLDivElement>(null)
  const stage = useGameStore((s) => s.stage)
  const hasStarted = useGameStore((s) => s.hasStarted)

  const isGameOver = stage === Stage.GAME_OVER
  const isPlaying = hasStarted && !isGameOver
  const switchKey = `${isPlaying}-${isGameOver}`

  return (
    <>
      <SwitchTransition>
        <Transition key={switchKey} timeout={{ enter: 0, exit: 500 }} nodeRef={wrapper}>
          {(transitionStatus) => {
            if (isPlaying)
              return <PlayingUI ref={wrapper} transitionStatus={transitionStatus} />

            if (isGameOver)
              return <GameOverUI ref={wrapper} transitionStatus={transitionStatus} />

            return <div ref={wrapper} className="hidden" />
          }}
        </Transition>
      </SwitchTransition>
      {!isGameOver && <Controls isMobile={isMobile} />}
      <AudioToggle />
    </>
  )
}

export default UI
