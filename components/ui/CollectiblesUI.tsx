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
import { COLLECTIBLE_IDS, type CollectibleID } from '@/model/schema'
import { GEMS_BY_ID } from '@/resources/content'

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
    onOpenChange: setShow,
    middleware: [offset(12)],
  })

  const collectedColour = GEMS_BY_ID[id]?.colour

  const { isMounted, status } = useTransitionStatus(context)
  const hover = useHover(context, { handleClose: safePolygon() })
  const click = useClick(context, { toggle: true })

  const { getReferenceProps, getFloatingProps } = useInteractions([hover, click])

  return (
    <>
      <div ref={refs.setReference} {...getReferenceProps()} className="pointer-events-auto">
        <GemIcon
          size={40}
          strokeWidth={1}
          className={twJoin(
            'size-8 md:size-10',
            isCollected ? 'opacity-100' : 'text-white opacity-30',
          )}
          style={isCollected ? { color: collectedColour } : undefined}
        />
      </div>
      {/* Dropdown Info */}
      {isMounted && (
        <div
          // eslint-disable-next-line react-hooks/refs
          ref={refs.setFloating}
          style={floatingStyles}
          data-status={status}
          {...getFloatingProps()}
          className={twJoin(
            'absolute z-50 flex w-sm flex-col gap-5 overflow-hidden rounded-xl bg-black p-6 whitespace-nowrap',
            // Transition states
            'data-[status=initial]:scale-90 data-[status=initial]:opacity-0',
            'data-[status=open]:scale-100 data-[status=open]:opacity-100 data-[status=open]:duration-240',
            'data-[status=close]:scale-90 data-[status=close]:opacity-0 data-[status=close]:duration-200',
          )}>
          <div>{isCollected ? 'Collected TODO: CONTENT' : 'Collect this to learn more'}</div>
        </div>
      )}
    </>
  )
}
