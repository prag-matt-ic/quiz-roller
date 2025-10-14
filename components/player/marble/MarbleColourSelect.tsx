import { type FC } from 'react'
import { twJoin } from 'tailwind-merge'

import { useGameStore } from '@/components/GameProvider'
import { getPaletteHex } from '@/components/palette'

const GRADIENT_STEPS = 8
const COLOUR_RANGES = [
  { min: 0, max: 0.4, center: 0.2 },
  { min: 0.3, max: 0.7, center: 0.5 },
  { min: 0.6, max: 1, center: 0.8 },
] as const

// Pre-compute gradient stops for each range
const GRADIENT_STOPS = COLOUR_RANGES.map((range) => {
  return Array.from({ length: GRADIENT_STEPS }, (_, i) => {
    const t = range.min + (i / (GRADIENT_STEPS - 1)) * (range.max - range.min)
    const pos = (i / (GRADIENT_STEPS - 1)) * 100
    return `${getPaletteHex(t)} ${pos.toFixed(1)}%`
  }).join(', ')
})

const MarbleColourSelect: FC = () => {
  const playerColour = useGameStore((s) => s.playerColour)
  const setPlayerColour = useGameStore((s) => s.setPlayerColour)

  // Find current range index
  const currentRangeIndex = COLOUR_RANGES.findIndex(
    (range) => playerColour >= range.min && playerColour <= range.max,
  )

  const value = currentRangeIndex !== -1 ? currentRangeIndex : 0

  return (
    <section className="my-4 flex w-fit flex-col items-center rounded-full bg-black/10 px-8 py-4 backdrop-blur-sm">
      <span className="mb-1 block font-semibold text-white">Choose your Marble Colour</span>

      <div className="mt-2 flex gap-5">
        {COLOUR_RANGES.map((range, idx) => {
          const isActive = idx === value
          return (
            <button
              key={idx}
              type="button"
              aria-label={`Select colour range ${idx + 1}`}
              onClick={() => setPlayerColour(range.center)}
              className={twJoin(
                'size-14 rounded-full focus:outline-none',
                isActive && 'ring-2 ring-white',
              )}
              style={{
                background: `linear-gradient(to right, ${GRADIENT_STOPS[idx]})`,
              }}
            />
          )
        })}
      </div>
    </section>
  )
}

export default MarbleColourSelect
