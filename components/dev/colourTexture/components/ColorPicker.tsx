import { type ChangeEvent, type FC, useCallback, useEffect, useRef, useState } from 'react'
import { ChromePicker, type ColorResult } from 'react-color'

interface ColorPickerProps {
  color: string
  onChange: (color: string) => void
  label?: string
  placeholder?: string
}

export const ColorPicker: FC<ColorPickerProps> = ({
  color,
  onChange,
  label,
  placeholder = '#FFFFFF',
}) => {
  const [displayColorPicker, setDisplayColorPicker] = useState(false)
  const popoverRef = useRef<HTMLDivElement>(null)

  const handleClick = useCallback(() => {
    setDisplayColorPicker((prev) => !prev)
  }, [])

  const handleClose = useCallback(() => {
    setDisplayColorPicker(false)
  }, [])

  const handleChange = useCallback(
    (colorResult: ColorResult) => {
      onChange(colorResult.hex)
    },
    [onChange],
  )

  const handleInputChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      onChange(e.target.value)
    },
    [onChange],
  )

  // Close popover when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        setDisplayColorPicker(false)
      }
    }

    if (displayColorPicker) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [displayColorPicker])

  return (
    <div className="relative">
      <label className="text-xs font-semibold tracking-widest text-neutral-400 uppercase">
        {label}
        <div className="mt-2 flex items-center gap-3">
          <input
            type="text"
            value={color}
            onChange={handleInputChange}
            className="flex-1 rounded-lg border border-white/10 bg-neutral-950/60 px-3 py-2 font-mono text-sm text-white transition outline-none focus:border-white/40"
            placeholder={placeholder}
          />
          <button
            onClick={handleClick}
            className="size-8 rounded-lg border border-white/10 shadow-sm transition hover:scale-105 active:scale-95"
            style={{ backgroundColor: color }}
            aria-label="Open color picker"
          />
        </div>
      </label>
      {displayColorPicker && (
        <div className="absolute right-0 top-full z-50 mt-2" ref={popoverRef}>
          <div className="rounded-xl bg-neutral-900 p-2 shadow-2xl ring-1 ring-white/10">
            <ChromePicker color={color} onChange={handleChange} disableAlpha />
          </div>
        </div>
      )}
    </div>
  )
}
