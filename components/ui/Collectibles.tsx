'use client'
import { useGSAP } from '@gsap/react'
import gsap from 'gsap'
import { GemIcon, type LucideIcon } from 'lucide-react'
import type { FC, ReactNode, RefObject } from 'react'
import { twJoin } from 'tailwind-merge'

import { useGameStore } from '@/components/GameProvider'
import { COLLECTIBLE_HUD_CONTENT } from '@/resources/content'

type Props = {
  ref: RefObject<HTMLDivElement | null>
}

const Collectibles: FC<Props> = ({ ref }) => {
  const collectedCollectibles = useGameStore((s) => s.collectedCollectibles)

  // TODO: add rings collected count (ring x number)
  // TODO: add a floating UI tooltip to each collectible icon - use Loopspeed nav for reference

  return (
    <section
      ref={ref}
      className="pointer-events-none fixed inset-0 z-100 flex flex-col items-center justify-center">
      <div className="absolute top-6 flex items-center gap-3">
        {COLLECTIBLE_HUD_CONTENT.map((_, index) => {
          const isCollected = collectedCollectibles.length > index

          return (
            <div key={`collectible-hud-${index}`}>
              <GemIcon
                size={40}
                strokeWidth={1}
                className={twJoin(
                  '',
                  isCollected ? 'text-amber-400 opacity-100' : 'text-white opacity-40',
                )}
              />
            </div>
          )
        })}
      </div>
    </section>
  )
}

export default Collectibles
