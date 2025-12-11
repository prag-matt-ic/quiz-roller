'use client'

import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, type LucideIcon, Move } from 'lucide-react'
import { type FC, useCallback, useEffect, useRef, useState } from 'react'
import { twJoin } from 'tailwind-merge'

import { type PlayerInput, useGameStore } from '@/components/GameProvider'
import Joystick, { type OnJoystickMove } from '@/components/ui/controls/Joystick'
import { GameMode, InputType, Overlay, SpeedRunStage } from '@/stores/types'

function useControls() {
  const mode = useGameStore((s) => s.mode)
  const isSpeedRunMode = mode === GameMode.SPEEDRUN
  const speedRunStage = useGameStore((s) => s.speedRunStage)
  const DISABLED_STAGES: SpeedRunStage[] = [
    SpeedRunStage.START,
    SpeedRunStage.COUNTDOWN,
    SpeedRunStage.END,
  ]
  const isDisabledStage = DISABLED_STAGES.includes(speedRunStage || '')
  const isPlayerLocked = useGameStore((s) => s.playerStatus !== 'safe')

  const disableInput = isPlayerLocked || (isSpeedRunMode && isDisabledStage)

  const setPlayerInput = useGameStore((s) => s.setPlayerInput)
  const setPlayerInputIntent = useGameStore((s) => s.setPlayerInputIntent)

  return {
    disableInput,
    setPlayerInput,
    setPlayerInputIntent,
  }
}

type KeyProps = {
  isActive: boolean
  Icon: LucideIcon
}

const Key: FC<KeyProps> = ({ Icon, isActive }) => {
  return (
    <div
      className={twJoin(
        'flex h-7 w-10 items-center justify-center rounded-md text-teal-100',
        isActive ? 'bg-black' : 'bg-black/40',
      )}>
      <Icon size={20} strokeWidth={3} />
    </div>
  )
}

const Keys: FC = () => {
  const { disableInput, setPlayerInput, setPlayerInputIntent } = useControls()
  const playerInputIntent = useGameStore((s) => s.playerInputIntent)
  const input = useRef<PlayerInput>(playerInputIntent)

  useEffect(() => {
    if (disableInput) {
      const zeroInput = { up: 0, down: 0, left: 0, right: 0 }
      setPlayerInputIntent(zeroInput)
      setPlayerInput(zeroInput)
      input.current = zeroInput
      return
    }

    const updateInput = (key: keyof PlayerInput, value: number) => {
      if (input.current[key] === value) return
      const nextInput = { ...input.current, [key]: value }
      input.current = nextInput
      setPlayerInputIntent(nextInput)
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
  }, [disableInput, setPlayerInput, setPlayerInputIntent])

  return (
    <aside className="pointer-events-none fixed right-4 bottom-4 z-50 grid h-fit w-fit grid-cols-3 gap-1 place-self-end">
      <div />
      <Key Icon={ArrowUp} isActive={playerInputIntent.up > 0} />
      <div />
      <Key Icon={ArrowLeft} isActive={playerInputIntent.left > 0} />
      <Key Icon={ArrowDown} isActive={playerInputIntent.down > 0} />
      <Key Icon={ArrowRight} isActive={playerInputIntent.right > 0} />
    </aside>
  )
}

const MovementControls: FC = () => {
  const inputType = useGameStore((s) => s.inputType)
  const isShowingLandingOverlay = useGameStore((s) => s.overlay === Overlay.LANDING)
  if (isShowingLandingOverlay) return null

  if (inputType === InputType.JOYSTICK) return <Stick />
  return <Keys />
}

const Stick: FC = () => {
  const { disableInput, setPlayerInputIntent } = useControls()
  const JOYSTICK_LEVELS = 10
  const joystickPosition = useGameStore((s) => s.joystickPosition)
  const [hasMoved, setHasMoved] = useState(false)

  const onJoystickMove = useCallback(
    (e: OnJoystickMove) => {
      if (disableInput) return
      setHasMoved(true)
      setPlayerInputIntent({
        up: e.leveledY > 0 ? Math.min(e.leveledY / JOYSTICK_LEVELS, 1) : 0,
        down: e.leveledY < 0 ? Math.min(-e.leveledY / JOYSTICK_LEVELS, 1) : 0,
        left: e.leveledX < 0 ? Math.min(-e.leveledX / JOYSTICK_LEVELS, 1) : 0,
        right: e.leveledX > 0 ? Math.min(e.leveledX / JOYSTICK_LEVELS, 1) : 0,
      })
    },
    [disableInput, setPlayerInputIntent],
  )

  return (
    <Joystick
      level={JOYSTICK_LEVELS}
      className={twJoin(
        'pointer-events-auto bottom-12 z-200',
        joystickPosition === 'left' ? 'left-12' : 'right-12',
      )}
      onMove={onJoystickMove}>
      <div
        className={twJoin(
          'flex size-full items-center justify-center text-neutral-600',
          hasMoved ? 'hidden' : 'animate-pulse',
        )}>
        <Move size={28} strokeWidth={1.5} />
      </div>
    </Joystick>
  )
}
export default MovementControls
