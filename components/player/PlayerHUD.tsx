'use client'

import { Html } from '@react-three/drei'
import gsap from 'gsap'
import {
  type CSSProperties,
  type FC,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { SwitchTransition, Transition } from 'react-transition-group'

import { useGameStore } from '@/components/GameProvider'
import { useConfirmationProgress } from '@/hooks/useConfirmationProgress'
import { CollectibleID } from '@/model/schema'
import { GEMS_COLOURS_BY_ID } from '@/resources/colours'

export const PLAYER_RADIUS = 0.45

const defaultGemColour = GEMS_COLOURS_BY_ID[CollectibleID.DesignTools].colour

const PlayerHUD: FC = () => {
  const confirmingCollectible = useGameStore((s) => s.confirmingCollectible)
  const hudIndicator = useGameStore((s) => s.hudIndicator)
  const setHudIndicator = useGameStore((s) => s.setHudIndicator)

  const showBar = confirmingCollectible !== null
  const showContent = !!hudIndicator?.id
  const show = showBar || showContent

  const [isMounted, setIsMounted] = useState(show)
  const showRef = useRef(show)

  const currentGemColour = confirmingCollectible
    ? (GEMS_COLOURS_BY_ID[confirmingCollectible]?.colour ?? defaultGemColour)
    : defaultGemColour

  const progressBarStyle = useMemo(
    () =>
      ({
        '--collectible-color': currentGemColour,
      }) as CSSProperties,
    [currentGemColour],
  )

  if (show && !isMounted) {
    setIsMounted(true)
  }

  useEffect(() => {
    showRef.current = show
  }, [show])

  const setter = useCallback(
    (value: number) => gsap.quickSetter('#progress-bar', 'x', '%')(value),
    [],
  )

  const onConfirmationProgressChange = (progress: number) => {
    const xValue = -100 + progress * 100
    setter(xValue)
  }

  useConfirmationProgress(onConfirmationProgressChange)

  const containerTween = useRef<GSAPTween>(null)
  const container = useRef<HTMLDivElement>(null)
  const delayedCall = useRef<GSAPTween>(null)

  const onEnter = () => {
    delayedCall.current?.kill()
    containerTween.current?.kill()
    containerTween.current = gsap.fromTo(
      container.current,
      { opacity: 0, scale: 1.2 },
      {
        opacity: 1,
        scale: 1,
        duration: 0.24,
        ease: 'power1.out',
        onComplete: () => {
          if (!!hudIndicator?.autoDismissS) {
            delayedCall.current = gsap.delayedCall(hudIndicator.autoDismissS, () => {
              setHudIndicator(null)
            })
          }
        },
      },
    )
  }

  const onExit = () => {
    containerTween.current?.kill()
    containerTween.current = gsap.to(container.current, {
      opacity: 0,
      duration: 0.2,
      ease: 'power1.out',
    })
  }

  const switchKey = `${showBar}-${hudIndicator?.id ?? ''}`

  if (!isMounted) return null

  return (
    <Html
      sprite={true}
      pointerEvents="none"
      position={[0, PLAYER_RADIUS * 2.5, PLAYER_RADIUS]}
      center={true}
      renderOrder={2}
      className="relative select-none">
      <SwitchTransition mode="out-in">
        <Transition
          key={switchKey}
          timeout={{ enter: 0, exit: 220 }}
          onEnter={onEnter}
          onExit={onExit}
          onExited={() => {
            if (showRef.current) return
            setIsMounted(false)
          }}
          appear={true}
          nodeRef={container}>
          {() => {
            if (showBar)
              return (
                <div
                  ref={container}
                  className="flex flex-col items-center rounded-full bg-black p-2 opacity-0">
                  <div
                    className="relative h-4 w-26 overflow-hidden rounded-full border border-white bg-white"
                    style={progressBarStyle}>
                    <div
                      id="progress-bar"
                      className="absolute h-full w-full -translate-x-full rounded-full bg-linear-0 from-(--collectible-color) to-[color-mix(in_srgb,var(--collectible-color)_80%,#000)]"
                    />
                  </div>
                </div>
              )
            if (showContent)
              return (
                <div
                  ref={container}
                  key={hudIndicator.id}
                  className="flex items-center gap-2 overflow-hidden rounded-full bg-black/90 p-3 text-sm font-semibold whitespace-nowrap text-white uppercase opacity-0 lg:text-base xl:p-4">
                  {!!hudIndicator.Icon && <hudIndicator.Icon className="size-4.5 xl:size-6" />}
                  {hudIndicator.label}
                </div>
              )
            return <div ref={container} className="hidden" />
          }}
        </Transition>
      </SwitchTransition>
    </Html>
  )
}

export default PlayerHUD
