/* eslint-disable react-hooks/refs */
'use client'

import { useGSAP } from '@gsap/react'
import { useInViewport, useMergedRef } from '@mantine/hooks'
import gsap from 'gsap'
import { type FC, type PropsWithChildren, type RefObject, useRef } from 'react'
import { twMerge } from 'tailwind-merge'

import { type PointerPosition, usePointerPosition } from '@/components/ui/PointerProvider'

type Strength = 1 | 2 | 3

export type PanelProps = PropsWithChildren<{
  strength?: Strength
  className?: string
  enableAttractor?: boolean
  attractorClassName?: string
}>

const CONTAINER_STRENGTH_CLASSES: Record<Strength, string> = {
  1: 'border-black/10 bg-black/5',
  2: 'border-black/20 bg-black/15',
  3: 'border-black/40 bg-black/35',
}

const Panel: FC<PanelProps> = ({
  strength = 2,
  className,
  children,
  enableAttractor = true,
  attractorClassName = 'bg-teal-500/15',
}) => {
  const { ref, inViewport } = useInViewport()
  const container = useRef<HTMLDivElement>(null)
  const mergedRef = useMergedRef(ref, container)
  const attractor = useRef<HTMLDivElement>(null)

  const { containerHandlers } = useSurfaceAttractor({
    isEnabled: inViewport && enableAttractor,
    container,
    attractor,
  })

  return (
    <div
      ref={mergedRef}
      {...containerHandlers}
      className={twMerge(
        'relative overflow-hidden rounded-2xl border p-4 backdrop-blur-sm lg:p-6',
        CONTAINER_STRENGTH_CLASSES[strength],
        className,
      )}>
      {enableAttractor && (
        <div className="pointer-events-none absolute inset-0 -z-10 hidden items-center justify-center sm:flex">
          <div
            ref={attractor}
            data-surface-glow="true"
            className={twMerge(
              'relative size-56 rounded-full opacity-0 blur-[56px]',
              attractorClassName,
            )}
          />
        </div>
      )}
      {children}
    </div>
  )
}

export default Panel

const ACTIVE_PROXIMITY = 128
const INACTIVE_PROXIMITY = 160

function useSurfaceAttractor({
  isEnabled,
  container,
  attractor,
}: {
  isEnabled: boolean
  container: RefObject<HTMLDivElement | null>
  attractor: RefObject<HTMLDivElement | null>
}) {
  const quickSetX = gsap.quickSetter(attractor.current, 'x', 'px')
  const quickSetY = gsap.quickSetter(attractor.current, 'y', 'px')
  const quickToOpacity = gsap.quickTo(attractor.current, 'opacity', {
    duration: 0.5,
    ease: 'power2.out',
  })
  const isPointerInside = useRef(false)

  const { contextSafe } = useGSAP({
    dependencies: [isEnabled],
  })

  const onPointerPositionChange = contextSafe((position: PointerPosition) => {
    if (!isEnabled) return
    if (!attractor.current || !container.current) return

    const containerRect = container.current.getBoundingClientRect()
    const activeZone = calculateProximityZone(containerRect, ACTIVE_PROXIMITY)

    const isInActiveZone = isWithinZone(position, activeZone)

    if (!isInActiveZone) {
      const inactiveZone = calculateProximityZone(containerRect, INACTIVE_PROXIMITY)
      if (isWithinZone(position, inactiveZone)) quickToOpacity(0)
      return
    }

    const { x: targetX, y: targetY } = calculateAttractorPosition(position, containerRect)
    quickSetX(targetX)
    quickSetY(targetY)
    quickToOpacity(isPointerInside.current ? 1 : 0.7)
  })

  usePointerPosition(onPointerPositionChange)

  return {
    containerHandlers: {
      onPointerEnter: () => {
        isPointerInside.current = true
      },
      onPointerLeave: () => {
        isPointerInside.current = false
      },
    },
  }
}

type ProximityZone = {
  left: number
  right: number
  top: number
  bottom: number
}

function calculateProximityZone(rect: DOMRect, proximity: number): ProximityZone {
  return {
    left: rect.left - proximity,
    right: rect.right + proximity,
    top: rect.top - proximity,
    bottom: rect.bottom + proximity,
  }
}

function isWithinZone(position: PointerPosition, zone: ProximityZone): boolean {
  return (
    position.x >= zone.left &&
    position.x <= zone.right &&
    position.y >= zone.top &&
    position.y <= zone.bottom
  )
}

function calculateAttractorPosition(
  cursorPosition: PointerPosition,
  containerRect: DOMRect,
): { x: number; y: number } {
  const localX = cursorPosition.x - containerRect.left
  const localY = cursorPosition.y - containerRect.top

  // Calculate offset from center since attractor is centered in container
  const centerX = containerRect.width / 2
  const centerY = containerRect.height / 2

  const targetX = localX - centerX
  const targetY = localY - centerY

  return { x: targetX, y: targetY }
}
