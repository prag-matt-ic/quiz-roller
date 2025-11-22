'use client'
import { GemIcon } from 'lucide-react'
import { useState, type FC, type RefObject } from 'react'
import { twJoin } from 'tailwind-merge'
import {
  offset,
  safePolygon,
  useFloating,
  useHover,
  useInteractions,
  useTransitionStatus,
} from '@floating-ui/react'
import { useGameStore } from '@/components/GameProvider'
import { COLLECTIBLE_TYPES } from '@/model/schema'

const Collectibles: FC = () => {
  const collectedCollectibles = useGameStore((s) => s.collectedCollectibles)
  const collectedRings = useGameStore((s) => s.collectedRings)
  const collectedRingCount = Object.keys(collectedRings).length

  return (
    <>
      {/* Rings/Coins */}
      <div
        className={twJoin(
          'relative mr-2 flex aspect-square size-10 items-center justify-center rounded-full border text-center font-semibold',
          collectedRingCount > 0 ? 'border-amber-400' : 'border-white/40',
        )}>
        {collectedRingCount}
      </div>
      {/* Collectibles */}
      {COLLECTIBLE_TYPES.map((type, index) => {
        return (
          <CollectibleIcon key={index} isCollected={collectedCollectibles.includes(type)} />
        )
      })}
    </>
  )
}

export default Collectibles

const CollectibleIcon: FC<{ isCollected: boolean }> = ({ isCollected }) => {
  const [show, setShow] = useState(false)
  const { refs, floatingStyles, context } = useFloating({
    open: show,
    onOpenChange: setShow,
    middleware: [offset(12)],
  })
  // TODO: disable unless collected is true.
  const { isMounted, status } = useTransitionStatus(context)
  const hover = useHover(context, { handleClose: safePolygon() })
  const { getReferenceProps, getFloatingProps } = useInteractions([hover])

  return (
    <>
      <div
        ref={refs.setReference}
        {...getReferenceProps()}
        className="pointer-events-auto border">
        <GemIcon
          size={40}
          strokeWidth={1}
          className={twJoin(
            isCollected ? 'text-amber-400 opacity-100' : 'text-white opacity-30',
          )}
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
            'absolute z-50 flex w-sm flex-col gap-5 overflow-hidden rounded-xl border bg-black p-6 whitespace-nowrap',
            // Transition states
            'data-[status=initial]:scale-90 data-[status=initial]:opacity-0',
            'data-[status=open]:scale-100 data-[status=open]:opacity-100 data-[status=open]:duration-240',
            'data-[status=close]:scale-90 data-[status=close]:opacity-0 data-[status=close]:duration-200',
          )}>
          <div>TODO: PLACEHOLDER CONTENT</div>
        </div>
      )}
    </>
  )
}
