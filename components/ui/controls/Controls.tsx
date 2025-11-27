'use client'

import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Move, type LucideIcon } from 'lucide-react'
import { useCallback, useEffect, useRef, type FC } from 'react'
import { twJoin } from 'tailwind-merge'

import { type PlayerInput, useGameStore } from '@/components/GameProvider'
import Joystick, { type OnJoystickMove } from '@/components/ui/controls/Joystick'
import { GameMode, SpeedRunStage } from '@/stores/types'

type KeyProps = {
  isActive: boolean
  Icon: LucideIcon
}

const Key: FC<KeyProps> = ({ Icon, isActive }) => {
  return (
    <div
      className={twJoin(
        'flex h-8 w-10 items-center justify-center rounded-md text-white',
        isActive ? 'bg-black/50' : 'bg-black',
      )}>
      <Icon
        className={twJoin('size-4 transition-transform duration-200', isActive && 'scale-110')}
        strokeWidth={2.5}
      />
    </div>
  )
}

function useControls() {
  const mode = useGameStore((s) => s.mode)
  const isSpeedRunMode = mode === GameMode.SPEEDRUN
  const speedRunStage = useGameStore((s) => s.speedRunStage)
  const DISABLED_STAGES: SpeedRunStage[] = ['username', 'countdown', 'leaderboard']
  const isDisabledStage = DISABLED_STAGES.includes(speedRunStage || '')
  const isRespawningPlayer = useGameStore((s) => s.isRespawning)

  const disableInput = isRespawningPlayer || (isSpeedRunMode && isDisabledStage)

  const setPlayerInput = useGameStore((s) => s.setPlayerInput)

  return {
    disableInput,
    setPlayerInput,
  }
}

const Keys: FC = () => {
  const { disableInput, setPlayerInput } = useControls()
  const playerInput = useGameStore((s) => s.playerInput)
  const input = useRef<PlayerInput>(playerInput)

  useEffect(() => {
    if (disableInput) {
      setPlayerInput({ up: 0, down: 0, left: 0, right: 0 })
      input.current = { up: 0, down: 0, left: 0, right: 0 }
      return
    }

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
  }, [disableInput, setPlayerInput])

  return (
    <aside className="pointer-events-none grid h-fit w-fit grid-cols-3 gap-0.5 place-self-end">
      <div />
      <Key Icon={ArrowUp} isActive={playerInput.up > 0} />
      <div />
      <Key Icon={ArrowLeft} isActive={playerInput.left > 0} />
      <Key Icon={ArrowDown} isActive={playerInput.down > 0} />
      <Key Icon={ArrowRight} isActive={playerInput.right > 0} />
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
  const { disableInput, setPlayerInput } = useControls()
  const JOYSTICK_LEVELS = 10

  const onJoystickMove = useCallback(
    (e: OnJoystickMove) => {
      if (disableInput) return
      setPlayerInput({
        up: e.leveledY > 0 ? Math.min(e.leveledY / JOYSTICK_LEVELS, 1) : 0,
        down: e.leveledY < 0 ? Math.min(-e.leveledY / JOYSTICK_LEVELS, 1) : 0,
        left: e.leveledX < 0 ? Math.min(-e.leveledX / JOYSTICK_LEVELS, 1) : 0,
        right: e.leveledX > 0 ? Math.min(e.leveledX / JOYSTICK_LEVELS, 1) : 0,
      })
    },
    [disableInput, setPlayerInput],
  )

  return (
    <Joystick
      level={JOYSTICK_LEVELS}
      className="pointer-events-auto right-8 bottom-8 z-200"
      onMove={onJoystickMove}>
      <div className="flex size-full items-center justify-center text-black">
        <Move size={24} strokeWidth={2} />
      </div>
    </Joystick>
  )
}
export default Controls
