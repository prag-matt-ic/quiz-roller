'use client'
import {
  FloatingPortal,
  offset,
  safePolygon,
  useClick,
  useDismiss,
  useFloating,
  useHover,
  useInteractions,
  useTransitionStatus,
} from '@floating-ui/react'
import { GemIcon, LockIcon } from 'lucide-react'
import { type CSSProperties, type FC, useState } from 'react'
import { twJoin } from 'tailwind-merge'

import { useGameStore } from '@/components/GameProvider'
import { COLLECTIBLE_IDS, CollectibleID } from '@/model/schema'
import { GEMS_COLOURS_BY_ID } from '@/resources/colours'
import { COLLECTIBLES_CONTENT } from '@/resources/content'

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

  const { isMounted, status } = useTransitionStatus(context)
  const hover = useHover(context, { handleClose: safePolygon() })
  const click = useClick(context, { toggle: true })
  const dismiss = useDismiss(context)
  const { getReferenceProps, getFloatingProps } = useInteractions([hover, click, dismiss])

  const collectedColour = GEMS_COLOURS_BY_ID[id]?.colour
  const ContentIcon = COLLECTIBLES_CONTENT[id].Icon

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
        className={twJoin('pointer-events-auto relative cursor-pointer')}>
        <GemIcon
          size={40}
          strokeWidth={0.25}
          className={twJoin(
            'absolute inset-0 size-7 text-transparent transition-opacity xl:size-10',
            isCollected ? 'scale-120 fill-(--icon-colour)/60' : '',
          )}
        />
        <GemIcon
          size={40}
          strokeWidth={0.75}
          className={twJoin(
            'relative size-7 text-white xl:size-10',
            isCollected ? 'scale-120 opacity-80' : 'opacity-30',
          )}
        />
      </div>
      {/* Dropdown Info */}
      {isMounted && (
        <FloatingPortal>
          <div
            // eslint-disable-next-line react-hooks/refs
            ref={refs.setFloating}
            style={{ ...floatingStyles, '--icon-colour': collectedColour } as CSSProperties}
            {...getFloatingProps()}
            className="absolute z-500">
            <div
              data-status={status}
              className={twJoin(
                'flex w-fit max-w-lg origin-top items-center gap-4 overflow-hidden rounded-xl bg-black p-4 xl:p-6',
                // Transition states
                'data-[status=initial]:scale-90 data-[status=initial]:opacity-0',
                'data-[status=open]:scale-100 data-[status=open]:opacity-100 data-[status=open]:duration-240',
                'data-[status=close]:scale-90 data-[status=close]:opacity-0 data-[status=close]:duration-200',
              )}>
              {isCollected ? (
                <ContentIcon
                  strokeWidth={1}
                  className="size-8 shrink-0 text-(--icon-colour) xl:size-10"
                />
              ) : (
                <LockIcon
                  strokeWidth={1}
                  className="size-8 shrink-0 text-neutral-500 xl:size-10"
                />
              )}
              <p className="block flex-1 overflow-hidden">
                <span className="mb-1 text-sm font-medium tracking-wider text-neutral-500 uppercase">
                  Bonus
                </span>
                {isCollected ? (
                  <span className="block">{COLLECTIBLES_CONTENT[id].content}</span>
                ) : (
                  <span className="block text-sm font-semibold lg:text-base">
                    Unlock the gem to learn more
                  </span>
                )}
              </p>
            </div>
          </div>
        </FloatingPortal>
      )}
    </>
  )
}
