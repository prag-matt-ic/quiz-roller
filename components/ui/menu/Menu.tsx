import { FlagIcon, Volume2Icon, VolumeXIcon } from 'lucide-react'
import { type FC, type RefObject } from 'react'
import { type TransitionStatus } from 'react-transition-group'
import { twJoin } from 'tailwind-merge'

import { useGameStore } from '@/components/GameProvider'
import { useSoundStore } from '@/components/SoundProvider'
import { InputConfig } from '@/components/ui/menu/InputConfig'

type MenuProps = {
  ref: RefObject<HTMLElement | null>
  transitionStatus: TransitionStatus
  closeMenu: () => void
}

const Menu: FC<MenuProps> = ({ ref, transitionStatus, closeMenu }) => {
  const isMuted = useSoundStore((s) => s.isMuted)
  const setIsMuted = useSoundStore((s) => s.setIsMuted)
  const startSpeedRun = useGameStore((s) => s.startSpeedRun)

  return (
    <aside
      ref={ref}
      className={twJoin(
        'fixed inset-0 z-200 flex size-full flex-col items-center justify-center gap-6 bg-black transition-opacity duration-200',
        transitionStatus === 'entered' && 'opacity-100',
        transitionStatus === 'exiting' && 'opacity-0',
        transitionStatus === 'exited' && 'opacity-0',
      )}>
      <h3>Menu</h3>

      {/* Audio toggle */}
      <button
        onClick={() => setIsMuted(!isMuted)}
        aria-pressed={!isMuted}
        aria-label={isMuted ? 'Enable audio' : 'Mute audio'}
        className={twJoin('pointer-events-auto place-self-end self-start px-4')}>
        {isMuted ? (
          <VolumeXIcon className="size-5 sm:size-7" strokeWidth={1.75} />
        ) : (
          <Volume2Icon className="size-5 sm:size-7" strokeWidth={1.75} />
        )}
      </button>

      <InputConfig />

      <button
        type="button"
        className="pointer-events-auto size-fit self-end rounded-lg bg-white px-3 py-1.5 text-xs font-bold text-black uppercase transition md:text-sm"
        onClick={startSpeedRun}>
        <FlagIcon className="mr-2 inline-block" strokeWidth={2.5} size={20} />
        Start Speedroll
      </button>

      <button onClick={closeMenu} className="p-4">
        Close
      </button>
    </aside>
  )
}

export default Menu
