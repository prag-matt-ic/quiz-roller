import { type LucideIcon } from 'lucide-react'
import { twJoin } from 'tailwind-merge'

export type ButtonGroupItem<T> = {
  label: string | null
  value: T
  ariaLabel?: string
  Icon?: LucideIcon
}

type ButtonGroupProps<T> = {
  items: ButtonGroupItem<T>[]
  value: T
  onChange: (value: T) => void
  disabled?: boolean
}

export const ButtonGroup = <T extends string | number>({
  items,
  value,
  onChange,
  disabled = false,
}: ButtonGroupProps<T>) => {
  return (
    <div
      className={twJoin(
        'relative flex items-center gap-2 rounded-xl border border-white/20 p-2 text-white',
        disabled && 'pointer-events-none opacity-30',
      )}>
      {items.map((item) => {
        const isActive = value === item.value
        const Icon = item.Icon

        return (
          <button
            key={String(item.value)}
            type="button"
            aria-pressed={isActive}
            aria-label={item.ariaLabel ?? item.label ?? undefined}
            disabled={disabled}
            onClick={() => onChange(item.value)}
            className={twJoin(
              'pointer-events-auto flex items-center gap-2 rounded-lg bg-transparent px-3 py-2 text-sm font-semibold normal-case transition-colors',
              'hover:bg-white/10 hover:text-white',
              isActive
                ? 'bg-white/10 text-white ring-1 ring-white/20 ring-inset'
                : 'text-white/70',
            )}>
            {!!Icon && (
              <Icon
                className={twJoin(
                  'size-4 lg:size-5',
                  isActive ? 'text-white' : 'text-white/60',
                )}
                strokeWidth={1.75}
              />
            )}
            {item.label}
          </button>
        )
      })}
    </div>
  )
}
