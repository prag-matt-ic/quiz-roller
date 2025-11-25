import type { FC } from 'react'

export type SliderControlProps = {
  label: string
  value: number
  min: number
  max: number
  step: number
  onChange: (val: number) => void
}

export const SliderControl: FC<SliderControlProps> = ({
  label,
  value,
  min,
  max,
  step,
  onChange,
}) => (
  <label className="flex items-center gap-3 text-xs tracking-wide text-neutral-400 uppercase">
    <span className="w-24 text-neutral-500">{label}</span>
    <input
      type="range"
      min={min}
      max={max}
      step={step}
      value={value}
      onChange={(event) => onChange(Number(event.target.value))}
      className="h-2 flex-1 cursor-pointer appearance-none rounded-full bg-neutral-800 accent-white"
    />
    <span className="w-12 text-right font-mono text-[0.7rem] text-white">
      {(value ?? 0).toFixed(2)}
    </span>
  </label>
)
