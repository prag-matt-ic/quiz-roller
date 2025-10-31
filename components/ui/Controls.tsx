'use client'

import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, type LucideIcon } from 'lucide-react'
import type { FC } from 'react'
import { twJoin } from 'tailwind-merge'

import { useGameStore } from '@/components/GameProvider'
import Joystick from './controls/Joystick'

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
  return (
    <div className="grid w-fit grid-cols-3 gap-1">
      <div />
      <Key ariaLabel="Forward" Icon={ArrowUp} isActive={playerInput.up} />
      <div />
      <Key ariaLabel="Left" Icon={ArrowLeft} isActive={playerInput.left} />
      <Key ariaLabel="Backward" Icon={ArrowDown} isActive={playerInput.down} />
      <Key ariaLabel="Right" Icon={ArrowRight} isActive={playerInput.right} />
    </div>
  )
}

type Props = {
  isMobile: boolean
}

const Controls: FC<Props> = ({ isMobile }) => {
  const onJoystickMove = () => {}
  return (
    <>
      <aside className="pointer-events-auto fixed right-4 bottom-4 z-1000 space-y-3">
        <Keys />
      </aside>
      {/* <Joystick className="right-6 bottom-6" onMove={onJoystickMove} /> */}
    </>
  )
}

export default Controls
