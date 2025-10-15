import { type FC } from 'react'
import { twJoin } from 'tailwind-merge'

import { useGameStore } from '@/components/GameProvider'
import { COLOUR_RANGES, GRADIENT_STOPS } from '@/components/palette'

const MarbleColourSelect: FC = () => {
  const playerColourIndex = useGameStore((s) => s.playerColourIndex)
  const setPlayerColourIndex = useGameStore((s) => s.setPlayerColourIndex)

  return (
    <div
      id="colour-select"
      className="flex w-fit items-center gap-4 rounded-full bg-black/25 px-4 py-3">
      {COLOUR_RANGES.map((_, index) => {
        const isActive = index === playerColourIndex
        return (
          <button
            key={index}
            aria-label={`Select colour range ${index + 1}`}
            onClick={() => setPlayerColourIndex(index)}
            style={{
              background: `linear-gradient(to right, ${GRADIENT_STOPS[index]})`,
            }}
            className={twJoin(
              'size-12 rounded-full focus:outline-none xl:size-15',
              isActive && 'shadow-lg ring-3 shadow-white/25 ring-white',
            )}
          />
        )
      })}
    </div>
  )
}

export default MarbleColourSelect
