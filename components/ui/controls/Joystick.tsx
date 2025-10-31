import { ArrowUpIcon } from 'lucide-react'
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { FC, PropsWithChildren, PointerEvent as ReactPointerEvent, RefObject } from 'react'
import { twJoin, twMerge } from 'tailwind-merge'

const BASE_TRANSFORM = 'translate(-50%, 50%)'
const POINTER_MOVE_OPTIONS: AddEventListenerOptions = { passive: false }
type NativePointerEvent = globalThis.PointerEvent

const DEFAULT_OPTIONS = {
  maxRange: 60,
  level: 1,
  radius: 50,
  joystickRadius: 30,
  x: '2rem',
  y: '2rem',
} as const

export interface JoystickOnMove {
  x: number
  y: number
  leveledX: number
  leveledY: number
  angle: number
  distance: number
}

export interface UseJoystickOptions {
  maxRange?: number
  level?: number
  radius?: number
  x?: string
  y?: string
  onMove?: (coordinates: JoystickOnMove) => void
}

export interface JoystickProps extends UseJoystickOptions {
  className?: string
  controllerClassName?: string
  joystickClassName?: string
  joystickRadius?: number
}

export interface UseJoystickResult {
  containerRef: RefObject<HTMLDivElement | null>
  controllerRef: RefObject<HTMLDivElement | null>
  joystickRef: RefObject<HTMLDivElement | null>
  rightOffset: string
  bottomOffset: string
  isGrabbing: boolean
  handlePointerDown: (event: ReactPointerEvent<HTMLDivElement>) => void
  coordinatesRef: RefObject<JoystickOnMove>
}

const createInitialCoordinates = (): JoystickOnMove => ({
  x: 0,
  y: 0,
  leveledX: 0,
  leveledY: 0,
  angle: 0,
  distance: 0,
})

const roundTo = (value: number, precision = 4): number => {
  const factor = 10 ** precision
  return Math.round(value * factor) / factor
}

export const useJoystick = ({
  maxRange = DEFAULT_OPTIONS.maxRange,
  level = DEFAULT_OPTIONS.level,
  radius = DEFAULT_OPTIONS.radius,
  x = DEFAULT_OPTIONS.x,
  y = DEFAULT_OPTIONS.y,
  onMove,
}: UseJoystickOptions = {}): UseJoystickResult => {
  const containerRef = useRef<HTMLDivElement>(null)
  const controllerRef = useRef<HTMLDivElement>(null)
  const joystickRef = useRef<HTMLDivElement>(null)
  const coordinatesRef = useRef<JoystickOnMove>(createInitialCoordinates())
  const pointerIdRef = useRef<number | null>(null)
  const centerRef = useRef({ x: 0, y: 0 })
  const centerReadyRef = useRef(false)
  const rafRef = useRef<number | null>(null)
  const hasPointerCaptureRef = useRef(false)

  const [isGrabbing, setIsGrabbing] = useState(false)

  const onMoveRef = useRef(onMove)
  useEffect(() => {
    onMoveRef.current = onMove
  }, [onMove])

  const cancelRaf = useCallback(() => {
    if (rafRef.current === null) return
    cancelAnimationFrame(rafRef.current)
    rafRef.current = null
  }, [])

  const resetCoordinates = useCallback(() => {
    const coordinates = coordinatesRef.current
    coordinates.x = 0
    coordinates.y = 0
    coordinates.leveledX = 0
    coordinates.leveledY = 0
    coordinates.angle = 0
    coordinates.distance = 0

    const joystick = joystickRef.current
    if (joystick) {
      joystick.style.transform = BASE_TRANSFORM
    }

    onMoveRef.current?.(coordinates)
  }, [])

  const updateCenter = useCallback(() => {
    const controller = controllerRef.current
    if (!controller) return
    const rect = controller.getBoundingClientRect()
    centerRef.current.x = rect.left + radius
    centerRef.current.y = rect.top + radius
    centerReadyRef.current = true
  }, [radius])

  const updateCoordinates = useCallback(
    (clientX: number, clientY: number) => {
      if (!centerReadyRef.current) return

      const center = centerRef.current
      const dx = clientX - center.x
      const dy = clientY - center.y
      const distance = Math.hypot(dx, dy)
      const clampedDistance = Math.min(distance, maxRange)
      const angle = Math.atan2(dy, dx)
      const offsetX = Math.round(Math.cos(angle) * clampedDistance)
      const offsetY = -Math.round(Math.sin(angle) * clampedDistance)
      const effectiveRange = Math.max(maxRange, 1)

      const coordinates = coordinatesRef.current
      coordinates.x = offsetX
      coordinates.y = offsetY
      coordinates.leveledX = Math.round((offsetX / effectiveRange) * level)
      coordinates.leveledY = Math.round((offsetY / effectiveRange) * level)
      coordinates.distance = roundTo(distance)
      coordinates.angle = roundTo(angle)

      const joystick = joystickRef.current
      if (joystick) {
        joystick.style.transform = `${BASE_TRANSFORM} translate(${offsetX}px, ${-offsetY}px)`
      }

      onMoveRef.current?.(coordinates)
    },
    [level, maxRange],
  )

  const handlePointerMove = useCallback(
    (event: NativePointerEvent) => {
      if (pointerIdRef.current !== event.pointerId) return
      event.preventDefault()
      updateCoordinates(event.clientX, event.clientY)
    },
    [updateCoordinates],
  )

  const handlePointerUp = useCallback(
    (event: NativePointerEvent) => {
      if (pointerIdRef.current !== event.pointerId) return
      pointerIdRef.current = null

      cancelRaf()
      window.removeEventListener('pointermove', handlePointerMove)
      window.removeEventListener('pointerup', handlePointerUp)
      window.removeEventListener('pointercancel', handlePointerUp)

      if (hasPointerCaptureRef.current && joystickRef.current) {
        try {
          joystickRef.current.releasePointerCapture(event.pointerId)
        } catch {
          // ignore release failures
        }
      }
      hasPointerCaptureRef.current = false

      setIsGrabbing(false)
      resetCoordinates()
    },
    [cancelRaf, handlePointerMove, resetCoordinates],
  )

  const startTracking = useCallback(
    (event: NativePointerEvent, allowPointerCapture: boolean) => {
      if (pointerIdRef.current !== null) return
      pointerIdRef.current = event.pointerId
      setIsGrabbing(true)

      updateCenter()
      updateCoordinates(event.clientX, event.clientY)

      window.addEventListener('pointermove', handlePointerMove, POINTER_MOVE_OPTIONS)
      window.addEventListener('pointerup', handlePointerUp)
      window.addEventListener('pointercancel', handlePointerUp)

      cancelRaf()
      rafRef.current = window.requestAnimationFrame(() => {
        updateCenter()
        updateCoordinates(event.clientX, event.clientY)
      })

      if (allowPointerCapture && joystickRef.current) {
        try {
          joystickRef.current.setPointerCapture(event.pointerId)
          hasPointerCaptureRef.current = true
        } catch {
          hasPointerCaptureRef.current = false
        }
      } else {
        hasPointerCaptureRef.current = false
      }
    },
    [cancelRaf, handlePointerMove, handlePointerUp, updateCenter, updateCoordinates],
  )

  const handlePointerDown = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (event.pointerType === 'mouse' && event.button !== 0) return
      event.preventDefault()
      startTracking(event.nativeEvent as NativePointerEvent, true)
    },
    [startTracking],
  )

  useEffect(() => {
    return () => {
      window.removeEventListener('pointermove', handlePointerMove)
      window.removeEventListener('pointerup', handlePointerUp)
      window.removeEventListener('pointercancel', handlePointerUp)
      cancelRaf()
    }
  }, [cancelRaf, handlePointerMove, handlePointerUp])

  useEffect(() => {
    window.addEventListener('resize', updateCenter)
    return () => {
      window.removeEventListener('resize', updateCenter)
    }
  }, [updateCenter])

  useLayoutEffect(() => {
    updateCenter()
    resetCoordinates()
  }, [updateCenter, resetCoordinates, x, y])

  return {
    containerRef,
    controllerRef,
    joystickRef,
    rightOffset: x,
    bottomOffset: y,
    isGrabbing,
    handlePointerDown,
    coordinatesRef,
  }
}

const Joystick: FC<PropsWithChildren<JoystickProps>> = ({
  children,
  className,
  controllerClassName,
  joystickClassName,
  maxRange,
  level,
  radius = DEFAULT_OPTIONS.radius,
  joystickRadius = DEFAULT_OPTIONS.joystickRadius,
  x,
  y,
  onMove,
}) => {
  const {
    containerRef,
    controllerRef,
    joystickRef,
    rightOffset,
    bottomOffset,
    isGrabbing,
    handlePointerDown,
  } = useJoystick({
    maxRange,
    level,
    radius,
    x,
    y,
    onMove,
  })

  const containerClasses = twMerge('fixed select-none', className)

  const controllerClasses = twMerge('relative rounded-full bg-black/20', controllerClassName)

  const joystickClasses = twMerge(
    twJoin(
      'absolute left-1/2 bottom-1/2 rounded-full bg-white border border-black shadow-lg shadow-black/40',
      'transition-transform duration-100 ease-out',
      'touch-none select-none',
      isGrabbing ? 'cursor-grabbing' : 'cursor-grab',
    ),
    joystickClassName,
  )

  return (
    <div
      ref={containerRef}
      style={{ right: rightOffset, bottom: bottomOffset }}
      className={containerClasses}
      role="presentation"
      aria-hidden="true">
      <div
        ref={controllerRef}
        className={controllerClasses}
        style={{ width: radius * 2, height: radius * 2 }}>
        <div
          ref={joystickRef}
          className={joystickClasses}
          style={{
            width: joystickRadius * 2,
            height: joystickRadius * 2,
          }}
          onPointerDown={handlePointerDown}>
          {children}
        </div>
      </div>
    </div>
  )
}

export default Joystick
