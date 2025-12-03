'use client'
import {
  offset,
  safePolygon,
  useClick,
  useDismiss,
  useFloating,
  useHover,
  useInteractions,
  useTransitionStatus,
} from '@floating-ui/react'
import { GemIcon } from 'lucide-react'
import { type CSSProperties, type FC, useEffect, useState } from 'react'
import { twJoin } from 'tailwind-merge'

import { useGameStore } from '@/components/GameProvider'
import { COLLECTIBLE_IDS, CollectibleID } from '@/model/schema'
import { COLLECTIBLES_CONTENT, GEMS_BY_ID } from '@/resources/content'

export const RingsUI: FC = () => {
  const collectedRings = useGameStore((s) => s.collectedRings)
  const totalRingsCount = useGameStore((s) => s.totalCounts.rings)
  const collectedRingCount = Object.keys(collectedRings).length

  return (
    <div className="flex h-fit items-center gap-1 p-2 text-sm lg:p-4">
      <div
        className={twJoin(
          'relative flex aspect-square size-8 items-center justify-center rounded-full border-[1.5px] border-amber-400 font-mono leading-none font-bold',
          collectedRingCount > 0 && 'text-amber-300',
        )}>
        {collectedRingCount}
      </div>
      <span className="font-mono font-medium tracking-wide">
        <span className="text-white/70">/</span>
        {totalRingsCount}
      </span>

      {/* TODO: Ring based speed boost indicator would go here... */}
    </div>
  )
}

const CollectiblesUI: FC = () => {
  const collectedCollectibles = useGameStore((s) => s.collectedCollectibles)
  return (
    <>
      {COLLECTIBLE_IDS.map((id) => {
        return (
          <CollectibleIcon key={id} id={id} isCollected={collectedCollectibles.includes(id)} />
        )
      })}
    </>
  )
}

export default CollectiblesUI

export const CollectibleIcon: FC<{ id: CollectibleID; isCollected: boolean }> = ({
  id,
  isCollected,
}) => {
  const [show, setShow] = useState(false)

  const { refs, floatingStyles, context } = useFloating({
    open: show,
    transform: true,
    placement: 'bottom',
    onOpenChange: (open) => {
      setShow(open)
    },
    middleware: [offset(12)],
  })

  const collectedColour = GEMS_BY_ID[id]?.colour

  const { isMounted, status } = useTransitionStatus(context)
  const hover = useHover(context, { handleClose: safePolygon() })
  const click = useClick(context, { toggle: true })
  const dismiss = useDismiss(context)

  useEffect(() => {
    let timeot: NodeJS.Timeout
    if (isCollected) {
      setShow(true)
      timeot = setTimeout(() => {
        setShow(false)
      }, 6000)
    }
    return () => clearTimeout(timeot)
  }, [isCollected])

  const ContentIcon = COLLECTIBLES_CONTENT[id].Icon

  const { getReferenceProps, getFloatingProps } = useInteractions([hover, click, dismiss])

  const shouldPulse = isCollected

  return (
    <>
      <div
        style={
          {
            '--icon-colour': collectedColour,
          } as CSSProperties
        }
        ref={refs.setReference}
        {...getReferenceProps()}
        className={twJoin(
          'pointer-events-auto relative cursor-pointer',
          shouldPulse && 'animate-pulse',
        )}>
        <GemIcon
          size={40}
          strokeWidth={0.25}
          className={twJoin(
            'absolute inset-0 size-8 text-transparent transition-opacity lg:size-10',
            isCollected ? 'scale-120 fill-(--icon-colour)/60' : 'fill-(--icon-colour)/10',
          )}
        />
        <GemIcon
          size={40}
          strokeWidth={0.75}
          className={twJoin(
            'relative size-8 text-white lg:size-10',
            isCollected ? 'scale-120 opacity-80' : 'opacity-30',
          )}
        />
      </div>
      {/* Dropdown Info */}
      {isMounted && (
        <div
          // eslint-disable-next-line react-hooks/refs
          ref={refs.setFloating}
          style={{ ...floatingStyles, '--icon-colour': collectedColour } as CSSProperties}
          {...getFloatingProps()}
          className="absolute z-50">
          <div
            data-status={status}
            className={twJoin(
              'flex max-w-full origin-top items-center gap-4 overflow-hidden rounded-xl bg-black p-6',
              // Transition states
              'data-[status=initial]:scale-90 data-[status=initial]:opacity-0',
              'data-[status=open]:scale-100 data-[status=open]:opacity-100 data-[status=open]:duration-240',
              'data-[status=close]:scale-90 data-[status=close]:opacity-0 data-[status=close]:duration-200',
            )}>
            <ContentIcon strokeWidth={1} size={40} className="shrink-0 text-(--icon-colour)" />
            <p className="block overflow-hidden">
              <span className="mb-1 text-sm font-medium tracking-wide text-white/80 uppercase">
                Bonus
              </span>
              {isCollected ? (
                <span className="block text-base font-bold sm:text-lg">
                  {COLLECTIBLES_CONTENT[id].content}
                </span>
              ) : (
                <span className="block text-base font-semibold">
                  Discover the gem to learn more
                </span>
              )}
            </p>
          </div>
        </div>
      )}
    </>
  )
}
