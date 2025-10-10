import { type FC } from 'react'

import { useGameStore } from '@/components/GameProvider'
import { getPaletteHex } from '@/components/palette'

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

  // Generate gradient stops for the full palette showing all ranges
  const gradientStops = COLOUR_RANGES.flatMap((range) => {
    return Array.from({ length: GRADIENT_STEPS }, (_, i) => {
      const t = range.min + (i / (GRADIENT_STEPS - 1)) * (range.max - range.min)
      const position = (t * 100).toFixed(1)
      return `${getPaletteHex(t)} ${position}%`
    })
  }).join(', ')

  const handleSliderChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const sliderValue = parseFloat(event.target.value)
    const rangeIndex = Math.floor(sliderValue)
    const clampedIndex = Math.min(rangeIndex, COLOUR_RANGES.length - 1)

    // Set to center of the selected range
    setPlayerColour(COLOUR_RANGES[clampedIndex].center)
  }

  const sliderValue = currentRangeIndex !== -1 ? currentRangeIndex : 0

  // Calculate thumb positions based on range centers
  const getThumbPosition = (rangeIndex: number): number => {
    return COLOUR_RANGES[rangeIndex].center * 100
  }

  return (
    <section className="my-4 flex flex-col items-center">
      <div className="mb-1 text-sm text-white/70">Choose your Marble Colour</div>

      <div className="relative w-48">
        <div
          className="absolute inset-0 h-6 rounded-full"
          style={{
            background: `linear-gradient(to right, ${gradientStops})`,
          }}
        />

        <input
          type="range"
          min="0"
          max={COLOUR_RANGES.length - 1}
          step="1"
          value={sliderValue}
          onChange={handleSliderChange}
          className="custom-range-slider relative z-10 h-3 w-full cursor-pointer appearance-none bg-transparent"
        />

        <div
          className="pointer-events-none absolute top-1/2 h-5 w-5 -translate-y-1/2 rounded-full border-2 border-white transition-all duration-200"
          style={{
            left: `calc(${getThumbPosition(sliderValue)}% - 10px)`,
          }}
        />
      </div>
    </section>
  )
}

export default ColourSlider
