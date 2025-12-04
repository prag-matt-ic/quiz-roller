import { FlagIcon, Gamepad2Icon, Volume2Icon, VolumeXIcon } from 'lucide-react'
import { type FC, type RefObject } from 'react'
import { type TransitionStatus } from 'react-transition-group'
import { twJoin } from 'tailwind-merge'

import { useGameStore } from '@/components/GameProvider'
import { useSoundStore } from '@/components/SoundProvider'
import { ButtonGroup } from '@/components/ui/ButtonGroup'
import { InputConfig } from '@/components/ui/menu/InputConfig'
import { GameMode } from '@/stores/types'

type MenuProps = {
  ref: RefObject<HTMLElement | null>
  transitionStatus: TransitionStatus
  closeMenu: () => void
}

const Menu: FC<MenuProps> = ({ ref, transitionStatus, closeMenu }) => {
  const isMuted = useSoundStore((s) => s.isMuted)
  const setIsMuted = useSoundStore((s) => s.setIsMuted)
  const mode = useGameStore((s) => s.mode)
  const resetGame = useGameStore((s) => s.resetGame)

  const handleModeChange = (nextMode: GameMode) => {
    if (nextMode !== mode) {
      resetGame({ mode: nextMode })
    }
    closeMenu()
  }

  return (
    <aside
      ref={ref}
      className={twJoin(
        'fixed inset-0 z-200 flex size-full flex-col items-center justify-center gap-6 p-6 transition-opacity duration-200',
        'bg-radial from-black/90 from-25% to-black/0 to-100% backdrop-blur-sm',
        transitionStatus === 'entered' && 'opacity-100',
        transitionStatus === 'exiting' && 'opacity-0',
        transitionStatus === 'exited' && 'opacity-0',
      )}>
      {/* TODO: add logo. */}

      <section className="w-fit rounded-2xl bg-black/40 p-4">
        <h3>Settings</h3>
        <ButtonGroup
          value={isMuted ? 'off' : 'on'}
          onChange={(val) => setIsMuted(val === 'off')}
          items={[
            { label: 'On', value: 'on', Icon: Volume2Icon },
            { label: 'Off', value: 'off', Icon: VolumeXIcon },
          ]}
        />

        <InputConfig />

        {/* TODO: add quality button group */}
      </section>

      <ButtonGroup
        value={mode}
        onChange={handleModeChange}
        items={[
          { label: 'Regular', value: GameMode.LEARN, Icon: Gamepad2Icon },
          { label: 'Speedroll', value: GameMode.SPEEDRUN, Icon: FlagIcon },
        ]}
      />

      <button onClick={closeMenu} className="p-4">
        Close
      </button>
    </aside>
  )
}

export default Menu
