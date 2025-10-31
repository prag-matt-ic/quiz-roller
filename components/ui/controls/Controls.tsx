'use client'

import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Move, type LucideIcon } from 'lucide-react'
import { useCallback, useEffect, useRef, type FC } from 'react'
import { twJoin } from 'tailwind-merge'

import { PlayerInput, useGameStore } from '@/components/GameProvider'
import Joystick, { type OnJoystickMove } from '@/components/ui/controls/Joystick'

type KeyProps = {
  isActive: boolean
  Icon: LucideIcon
  ariaLabel: string
}

const Key: FC<KeyProps> = ({ Icon, ariaLabel, isActive }) => {
  return (
    <div
      aria-label={ariaLabel}
      className={twJoin(
        'flex h-10 w-12 items-center justify-center rounded-lg border border-black/50 bg-black/40 text-white',
        isActive && 'bg-black/60',
      )}>
      <Icon
        className={twJoin('size-6 transition-transform duration-200', isActive && 'scale-110')}
        strokeWidth={2.5}
      />
    </div>
  )
}

const Keys: FC = () => {
  const playerInput = useGameStore((s) => s.playerInput)
  const setPlayerInput = useGameStore((s) => s.setPlayerInput)

  const input = useRef<PlayerInput>(playerInput)

  useEffect(() => {
    const updateInput = (key: keyof PlayerInput, value: number) => {
      if (input.current[key] === value) return
      const nextInput = { ...input.current, [key]: value }
      input.current = nextInput
      setPlayerInput(nextInput)
    }

    const handleKeyDown = (key: keyof PlayerInput) => {
      if (input.current[key] === 1) return
      updateInput(key, 1)
    }

    const handleKeyUp = (key: keyof PlayerInput) => {
      if (input.current[key] === 0) return
      updateInput(key, 0)
    }

    const onKeyDown = (e: KeyboardEvent) => {
      switch (e.code) {
        case 'ArrowUp':
        case 'KeyW':
          handleKeyDown('up')
          break
        case 'ArrowDown':
        case 'KeyS':
          handleKeyDown('down')
          break
        case 'ArrowLeft':
        case 'KeyA':
          handleKeyDown('left')
          break
        case 'ArrowRight':
        case 'KeyD':
          handleKeyDown('right')
          break
      }
    }

    const onKeyUp = (e: KeyboardEvent) => {
      switch (e.code) {
        case 'ArrowUp':
        case 'KeyW':
          handleKeyUp('up')
          break
        case 'ArrowDown':
        case 'KeyS':
          handleKeyUp('down')
          break
        case 'ArrowLeft':
        case 'KeyA':
          handleKeyUp('left')
          break
        case 'ArrowRight':
        case 'KeyD':
          handleKeyUp('right')
          break
      }
    }

    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
    }
  }, [])

  return (
    <aside className="pointer-events-none fixed right-4 bottom-4 z-1000 grid w-fit grid-cols-3 gap-1">
      <div />
      <Key ariaLabel="Forward" Icon={ArrowUp} isActive={playerInput.up > 0} />
      <div />
      <Key ariaLabel="Left" Icon={ArrowLeft} isActive={playerInput.left > 0} />
      <Key ariaLabel="Backward" Icon={ArrowDown} isActive={playerInput.down > 0} />
      <Key ariaLabel="Right" Icon={ArrowRight} isActive={playerInput.right > 0} />
    </aside>
  )
}

type Props = {
  isMobile: boolean
}

const Controls: FC<Props> = ({ isMobile }) => {
  if (isMobile) return <Stick />
  return <Keys />
}

const Stick: FC = () => {
  const setPlayerInput = useGameStore((s) => s.setPlayerInput)
  const JOYSTICK_LEVELS = 10

  const onJoystickMove = useCallback(
    (e: OnJoystickMove) => {
      setPlayerInput({
        up: e.leveledY > 0 ? Math.min(e.leveledY / JOYSTICK_LEVELS, 1) : 0,
        down: e.leveledY < 0 ? Math.min(-e.leveledY / JOYSTICK_LEVELS, 1) : 0,
        left: e.leveledX < 0 ? Math.min(-e.leveledX / JOYSTICK_LEVELS, 1) : 0,
        right: e.leveledX > 0 ? Math.min(e.leveledX / JOYSTICK_LEVELS, 1) : 0,
      })
    },
    [setPlayerInput],
  )

  return (
    <Joystick level={JOYSTICK_LEVELS} className="right-6 bottom-6" onMove={onJoystickMove}>
      <div className="flex size-full items-center justify-center text-black">
        <Move size={24} strokeWidth={1.5} />
      </div>
    </Joystick>
  )
}
export default Controls
