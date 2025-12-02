import { type ComponentType } from 'react'
import { twJoin } from 'tailwind-merge'

export type ButtonGroupItem<T> = {
  label: string
  value: T
  Icon?: ComponentType<{ className?: string; strokeWidth?: number }>
}

type ButtonGroupProps<T> = {
  items: ButtonGroupItem<T>[]
  value: T
  onChange: (value: T) => void
}

export const ButtonGroup = <T extends string | number>({
  items,
  value,
  onChange,
}: ButtonGroupProps<T>) => {
  return (
    <div className="relative flex items-center overflow-hidden rounded-md border border-white/15 text-sm tracking-wide uppercase lg:text-base">
      {items.map((item) => {
        const isActive = value === item.value
        const Icon = item.Icon

        return (
          <button
            key={String(item.value)}
            type="button"
            aria-pressed={isActive}
            onClick={() => onChange(item.value)}
            className={twJoin(
              'pointer-events-auto flex items-center gap-2 px-4 py-2 text-sm font-semibold transition-colors',
              isActive
                ? 'border-white bg-white/10 text-white'
                : 'border-white/20 bg-transparent text-white/50',
            )}>
            {!!Icon && <Icon className="size-4 lg:size-6" strokeWidth={1.75} />}
            {item.label}
          </button>
        )
      })}
    </div>
  )
}
