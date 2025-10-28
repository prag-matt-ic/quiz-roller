'use client'

import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, type LucideIcon } from 'lucide-react'
import type { FC } from 'react'
import { twJoin } from 'tailwind-merge'

import { useGameStore } from '@/components/GameProvider'

type KeyProps = {
  isActive: boolean
  Icon: LucideIcon
  ariaLabel: string
}

const Key: FC<KeyProps> = ({ Icon, ariaLabel, isActive }) => {
  return (
    <div
      role="img"
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

const Controls: FC = () => {
  const playerInput = useGameStore((s) => s.playerInput)
  return (
    <aside className="pointer-events-none fixed bottom-4 left-4 z-1000 space-y-3">
      <div className="grid w-fit grid-cols-3 gap-1">
        <div />
        <Key ariaLabel="Forward" Icon={ArrowUp} isActive={playerInput.up} />
        <div />
        <Key ariaLabel="Left" Icon={ArrowLeft} isActive={playerInput.left} />
        <Key ariaLabel="Backward" Icon={ArrowDown} isActive={playerInput.down} />
        <Key ariaLabel="Right" Icon={ArrowRight} isActive={playerInput.right} />
      </div>
    </aside>
  )
}

export default Controls

// <div className="flex items-center rounded-full border border-white/10 bg-white/5 p-1">
//         <button
//           type="button"
//           aria-pressed={true}
//           className={twJoin(
//             'rounded-full bg-white/20 px-3 py-1 text-xs font-semibold tracking-wide text-white uppercase shadow-lg shadow-white/10',
//           )}>
//           Keyboard
//         </button>
//         <button
//           type="button"
//           disabled={true}
//           aria-disabled={true}
//           className={twJoin(
//             'rounded-full px-3 py-1 text-xs font-semibold tracking-wide text-white/40 uppercase',
//           )}>
//           Touch
//         </button>
//       </div>
