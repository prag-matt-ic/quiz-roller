'use client'

import { type FC } from 'react'
import { Gem, Lock } from 'lucide-react'
import { twJoin, twMerge } from 'tailwind-merge'

import { useGameStore } from '@/components/GameProvider'
import Surface from '@/components/ui/surface/Surface'
import { COLLECTIBLE_IDS } from '@/model/schema'
import { GEMS_BY_ID } from '@/resources/content'

import { PANEL_BASE_CLASSES, PANEL_VARIANTS } from './panelStyles'

type CollectiblesPanelProps = {
  className?: string
}

export const CollectiblesPanel: FC<CollectiblesPanelProps> = ({ className }) => {
  const collectedCollectibles = useGameStore((s) => s.collectedCollectibles)

  return (
    <Surface
      className={twMerge(PANEL_BASE_CLASSES, PANEL_VARIANTS.dark, className)}>
      <div className="flex h-full flex-col justify-between">
        <div className="flex items-center gap-2">
          <Gem className="size-4 text-white/50" />
          <span className="text-xs font-medium uppercase tracking-widest text-white/50">
            Gems
          </span>
          <span className="ml-auto text-xs text-white/40">
            {collectedCollectibles.length}/{COLLECTIBLE_IDS.length}
          </span>
        </div>

        <div className="flex justify-center gap-3">
          {COLLECTIBLE_IDS.map((id) => {
            const collected = collectedCollectibles.includes(id)
            const colour = GEMS_BY_ID[id]?.colour
            return (
              <div
                key={id}
                className={twJoin(
                  'flex size-11 items-center justify-center rounded-xl transition-all',
                  collected ? 'bg-white/15' : 'bg-black/30',
                )}>
                {collected ? (
                  <Gem className="size-5" style={{ color: colour }} />
                ) : (
                  <Lock className="size-4 text-white/20" />
                )}
              </div>
            )
          })}
        </div>
      </div>
    </Surface>
  )
}
