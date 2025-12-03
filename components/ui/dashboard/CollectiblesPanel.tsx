'use client'

import { Gem, Lock } from 'lucide-react'
import { type FC } from 'react'
import { twJoin, twMerge } from 'tailwind-merge'

import { useGameStore } from '@/components/GameProvider'
import Panel from '@/components/ui/dashboard/panel/Panel'
import { PanelHeader } from '@/components/ui/dashboard/panel/PanelHeader'
import { COLLECTIBLE_IDS } from '@/model/schema'
import { GEMS_BY_ID } from '@/resources/content'

type CollectiblesPanelProps = {
  className?: string
}

export const CollectiblesPanel: FC<CollectiblesPanelProps> = ({ className }) => {
  const collectedCollectibles = useGameStore((s) => s.collectedCollectibles)

  return (
    <Panel className={twMerge('flex h-full flex-col justify-between p-4', className)}>
      <PanelHeader icon={Gem} label="Gems">
        {collectedCollectibles.length}/{COLLECTIBLE_IDS.length}
      </PanelHeader>

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
    </Panel>
  )
}
