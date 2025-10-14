import { type FC } from 'react'

import { useGameStore } from '@/components/GameProvider'
import { getPaletteHex } from '@/components/palette'
import { twJoin } from 'tailwind-merge'

const GRADIENT_STEPS = 8
const COLOUR_RANGES = [
  { min: 0, max: 0.32, center: 0.16 },
  { min: 0.33, max: 0.66, center: 0.495 },
  { min: 0.67, max: 1, center: 0.835 },
] as const

const ColourSlider: FC = () => {
  const playerColour = useGameStore((s) => s.playerColour)
  const setPlayerColour = useGameStore((s) => s.setPlayerColour)

  // Find current range index
  const currentRangeIndex = COLOUR_RANGES.findIndex(
    (range) => playerColour >= range.min && playerColour <= range.max,
  )

  const sliderValue = currentRangeIndex !== -1 ? currentRangeIndex : 0

  return (
    <section className="my-4 flex flex-col items-center">
      <div className="mb-1 text-sm text-white/70">Choose your Marble Colour</div>

      <div className="mt-2 flex gap-4">
        {COLOUR_RANGES.map((range, idx) => {
          // Generate gradient for this button
          const stops = Array.from({ length: GRADIENT_STEPS }, (_, i) => {
            const t = range.min + (i / (GRADIENT_STEPS - 1)) * (range.max - range.min)
            const pos = (i / (GRADIENT_STEPS - 1)) * 100
            return `${getPaletteHex(t)} ${pos.toFixed(1)}%`
          }).join(', ')
          const isActive = idx === sliderValue
          return (
            <button
              key={idx}
              type="button"
              aria-label={`Select colour range ${idx + 1}`}
              onClick={() => setPlayerColour(range.center)}
              className={twJoin(
                `size-14 rounded-full border border-white transition-all duration-200 focus:outline-none`,
                isActive && 'ring-2 ring-white',
              )}
              style={{
                background: `linear-gradient(to right, ${stops})`,
              }}
            />
          )
        })}
      </div>
    </section>
  )
}

export default ColourSlider
