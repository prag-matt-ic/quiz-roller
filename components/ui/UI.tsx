'use client'
import { useGSAP } from '@gsap/react'
import gsap from 'gsap'
import { type FC, useRef } from 'react'
import { SwitchTransition, Transition } from 'react-transition-group'

import { Stage, useGameStore } from '@/components/GameProvider'
import AudioToggle from '@/components/ui/AudioToggle'
import Controls from '@/components/ui/controls/Controls'
import PlayingUI from '@/components/ui/PlayingUI'

gsap.registerPlugin(useGSAP)

type Props = {
  isMobile: boolean
}

const UI: FC<Props> = ({ isMobile }) => {
  const wrapper = useRef<HTMLDivElement>(null)
  const stage = useGameStore((s) => s.stage)
  const infoContentIndex = useGameStore((s) => s.infoContentIndex)

  // TODO: add rings collected count (ring x number)
  // TODO: add collectibles (x/3) gem icons fade in when collected

  // const isPlaying = hasStarted && !isGameOver
  // const switchKey = `${isPlaying}-${isGameOver}`

  return (
    <>
      {/* <SwitchTransition>
        <Transition key={switchKey} timeout={{ enter: 0, exit: 500 }} nodeRef={wrapper}>
          {(transitionStatus) => {
            if (isPlaying)
              // return <PlayingUI ref={wrapper} transitionStatus={transitionStatus} />

              return <div ref={wrapper} className="hidden" />
          }}
        </Transition>
      </SwitchTransition> */}
      <div className="fixed bottom-0 bg-white p-2 font-black text-black">
        Stage: {stage}
        <br />
        Info content index: {infoContentIndex}
      </div>
      <Controls isMobile={isMobile} />
      <AudioToggle />
    </>
  )
}

export default UI
