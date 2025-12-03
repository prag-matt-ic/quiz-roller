'use client'

import { GemIcon } from 'lucide-react'
import { type FC } from 'react'
import { twMerge } from 'tailwind-merge'

import { useGameStore } from '@/components/GameProvider'
import Panel from '@/components/ui/dashboard/panel/Panel'
import { PanelHeader } from '@/components/ui/dashboard/panel/PanelHeader'
import { COLLECTIBLE_IDS } from '@/model/schema'

import { CollectibleIcon } from '../CollectiblesUI'

type CollectiblesPanelProps = {
  className?: string
}

export const CollectiblesPanel: FC<CollectiblesPanelProps> = ({ className }) => {
  const collectedCollectibles = useGameStore((s) => s.collectedCollectibles)

  return (
    <Panel className={twMerge('flex h-full flex-col justify-between p-4', className)}>
      <PanelHeader icon={GemIcon} label="Bonuses" />

      <div className="pointer-events-auto flex items-center gap-3">
        {COLLECTIBLE_IDS.map((id) => {
          return (
            <CollectibleIcon
              key={id}
              id={id}
              isCollected={collectedCollectibles.includes(id)}
            />
          )
        })}
      </div>
    </Panel>
  )
}
