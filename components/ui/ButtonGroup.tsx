import { type ComponentType } from 'react'
import { twJoin } from 'tailwind-merge'

export type ButtonGroupItem<T> = {
  label: string
  value: T
  Icon?: ComponentType<{ className?: string; strokeWidth?: number }>
}

type ButtonGroupProps<T> = {
  label?: string
  items: ButtonGroupItem<T>[]
  value: T
  onChange: (value: T) => void
}

export const ButtonGroup = <T extends string | number>({
  label,
  items,
  value,
  onChange,
}: ButtonGroupProps<T>) => {
  return (
    <div className="relative flex flex-col items-center gap-3 overflow-hidden rounded-md border text-sm tracking-wide uppercase">
      {label && <p>{label}</p>}
      <div className="flex">
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
                  ? 'border-white bg-white text-black'
                  : 'border-white/40 bg-transparent',
              )}>
              {!!Icon && <Icon className="size-4 lg:size-5" strokeWidth={1.75} />}
              {item.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}
