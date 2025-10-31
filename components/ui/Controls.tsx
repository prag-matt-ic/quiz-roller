'use client'

import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Move, type LucideIcon } from 'lucide-react'
import { useEffect, useRef, type FC } from 'react'
import { twJoin } from 'tailwind-merge'

import { PlayerInput, useGameStore } from '@/components/GameProvider'
import Joystick, { JoystickOnMove } from './controls/Joystick'

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

  const input = useRef(playerInput)

  useEffect(() => {
    const updateInput = (key: keyof PlayerInput, value: boolean) => {
      if (input.current[key] === value) return
      const nextInput = { ...input.current, [key]: value }
      input.current = nextInput
      setPlayerInput(nextInput)
    }

    const onKeyDown = (e: KeyboardEvent) => {
      switch (e.code) {
        case 'ArrowUp':
        case 'KeyW':
          updateInput('up', true)
          break
        case 'ArrowDown':
        case 'KeyS':
          updateInput('down', true)
          break
        case 'ArrowLeft':
        case 'KeyA':
          updateInput('left', true)
          break
        case 'ArrowRight':
        case 'KeyD':
          updateInput('right', true)
          break
      }
    }

    const onKeyUp = (e: KeyboardEvent) => {
      switch (e.code) {
        case 'ArrowUp':
        case 'KeyW':
          updateInput('up', false)
          break
        case 'ArrowDown':
        case 'KeyS':
          updateInput('down', false)
          break
        case 'ArrowLeft':
        case 'KeyA':
          updateInput('left', false)
          break
        case 'ArrowRight':
        case 'KeyD':
          updateInput('right', false)
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
      <Key ariaLabel="Forward" Icon={ArrowUp} isActive={playerInput.up} />
      <div />
      <Key ariaLabel="Left" Icon={ArrowLeft} isActive={playerInput.left} />
      <Key ariaLabel="Backward" Icon={ArrowDown} isActive={playerInput.down} />
      <Key ariaLabel="Right" Icon={ArrowRight} isActive={playerInput.right} />
    </aside>
  )
}

type Props = {
  isMobile: boolean
}

const Controls: FC<Props> = ({ isMobile }) => {
  const playerInput = useGameStore((s) => s.playerInput)
  const setPlayerInput = useGameStore((s) => s.setPlayerInput)

  const input = useRef<PlayerInput>(playerInput)

  const onJoystickMove = (e: JoystickOnMove) => {
    console.log(e)
    setPlayerInput({
      up: e.leveledY === 1,
      down: e.leveledY === -1,
      left: e.leveledX === -1,
      right: e.leveledX === 1,
    })
  }
  return (
    <>
      {/* <Keys /> */}
      <Joystick className="right-6 bottom-6" onMove={onJoystickMove}>
        <div className="flex size-full items-center justify-center text-black">
          <Move />
        </div>
      </Joystick>
    </>
  )
}

export default Controls
