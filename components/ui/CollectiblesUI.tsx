'use client'
import { GemIcon } from 'lucide-react'
import { useState, type FC } from 'react'
import { twJoin } from 'tailwind-merge'
import {
  offset,
  safePolygon,
  useClick,
  useFloating,
  useHover,
  useInteractions,
  useTransitionStatus,
} from '@floating-ui/react'

import { useGameStore } from '@/components/GameProvider'
import { COLLECTIBLE_IDS, CollectibleID } from '@/model/schema'
import { COLLECTIBLES_CONTENT, GEMS_BY_ID } from '@/resources/content'

export const RingsUI: FC = () => {
  const collectedRings = useGameStore((s) => s.collectedRings)
  const totalRingsCount = useGameStore((s) => s.totalRingsCount)
  const collectedRingCount = Object.keys(collectedRings).length

  return (
    <div className="flex h-fit items-center gap-1 text-sm select-none">
      <div className="relative flex aspect-square size-8 items-center justify-center rounded-full border-[1.5px] border-amber-400 font-mono leading-none font-semibold">
        {collectedRingCount}
      </div>
      <span className="font-mono font-medium">/{totalRingsCount}</span>

      {/* TODO: Ring based speed boost indicator would go here... */}
    </div>
  )
}

const CollectiblesUI: FC = () => {
  const collectedCollectibles = useGameStore((s) => s.collectedCollectibles)

  return (
    <>
      {/* Collectibles */}
      {COLLECTIBLE_IDS.map((id) => {
        return (
          <CollectibleIcon key={id} id={id} isCollected={collectedCollectibles.includes(id)} />
        )
      })}
    </>
  )
}

export default CollectiblesUI

const CollectibleIcon: FC<{ id: CollectibleID; isCollected: boolean }> = ({
  id,
  isCollected,
}) => {
  const [show, setShow] = useState(false)
  const { refs, floatingStyles, context } = useFloating({
    open: show,
    transform: true,
    placement: 'bottom',
    onOpenChange: setShow,
    middleware: [offset(12)],
  })

  const collectedColour = GEMS_BY_ID[id]?.colour

  const { isMounted, status } = useTransitionStatus(context)
  const hover = useHover(context, { handleClose: safePolygon() })
  const click = useClick(context, { toggle: true })

  const Icon = COLLECTIBLES_CONTENT[id].Icon

  const { getReferenceProps, getFloatingProps } = useInteractions([hover, click])

  return (
    <>
      <div
        style={
          {
            '--icon-colour': collectedColour,
          } as React.CSSProperties
        }
        ref={refs.setReference}
        {...getReferenceProps()}
        className="pointer-events-auto relative">
        <GemIcon
          size={40}
          strokeWidth={0.25}
          className={twJoin(
            'absolute inset-0 size-8 text-transparent transition-opacity md:size-10',
            isCollected ? 'fill-(--icon-colour)/50' : 'fill-(--icon-colour)/10',
          )}
        />
        <GemIcon
          size={40}
          strokeWidth={0.75}
          className={twJoin(
            'relative size-8 text-white md:size-10',
            isCollected ? 'opacity-80' : 'opacity-30',
          )}
          // style={isCollected ? { color: collectedColour } : undefined}
        />
      </div>
      {/* Dropdown Info */}
      {isMounted && (
        <div
          // eslint-disable-next-line react-hooks/refs
          ref={refs.setFloating}
          style={floatingStyles}
          {...getFloatingProps()}
          className="absolute z-50">
          <div
            data-status={status}
            className={twJoin(
              'flex max-w-sm origin-top flex-col gap-5 overflow-hidden rounded-xl bg-black p-6 whitespace-nowrap',
              // Transition states
              'data-[status=initial]:scale-90 data-[status=initial]:opacity-0',
              'data-[status=open]:scale-100 data-[status=open]:opacity-100 data-[status=open]:duration-240',
              'data-[status=close]:scale-90 data-[status=close]:opacity-0 data-[status=close]:duration-200',
            )}>
            <div className="flex max-w-full items-center gap-2 pr-2">
              <Icon strokeWidth={1.5} size={32} />
              <p className="block text-sm font-medium">
                <span className="block tracking-wide text-white/80 uppercase">Bonus</span>
                {isCollected ? (
                  <span className="block text-base font-bold sm:text-lg">
                    {COLLECTIBLES_CONTENT[id].content}
                  </span>
                ) : (
                  <span className="block">Unlock this to learn more</span>
                )}
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
