import { type FC } from 'react'
import { twJoin } from 'tailwind-merge'

import { useGameStore } from '@/components/GameProvider'
import { COLOUR_RANGES, GRADIENT_STOPS } from '@/components/palette'

const MarbleColourSelect: FC = () => {
  const playerColourIndex = useGameStore((s) => s.playerColourIndex)
  const setPlayerColourIndex = useGameStore((s) => s.setPlayerColourIndex)

  const value = Math.max(0, Math.min(2, Math.round(playerColourIndex)))

  return (
    <div
      id="colour-select"
      className="flex w-fit items-center gap-6 rounded-full bg-black/20 p-5">
      {COLOUR_RANGES.map((_, idx) => {
        const isActive = idx === value
        return (
          <button
            key={idx}
            aria-label={`Select colour range ${idx + 1}`}
            onClick={() => setPlayerColourIndex(idx)}
            className={twJoin(
              'size-12 rounded-full focus:outline-none xl:size-15',
              isActive && 'shadow-lg ring-3 shadow-white/25 ring-white',
            )}
            style={{
              background: `linear-gradient(to right, ${GRADIENT_STOPS[idx]})`,
            }}
          />
        )
      })}
    </div>
  )
}

export default MarbleColourSelect
