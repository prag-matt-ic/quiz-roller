import { Volume2Icon, VolumeXIcon } from 'lucide-react'
import { type FC } from 'react'
import { twJoin } from 'tailwind-merge'

import { useSoundStore } from '@/components/SoundProvider'

const AudioToggle: FC = () => {
  const isMuted = useSoundStore((s) => s.isMuted)
  const setIsMuted = useSoundStore((s) => s.setIsMuted)

  return (
    <button
      type="button"
      onClick={() => setIsMuted(!isMuted)}
      aria-pressed={!isMuted}
      aria-label={isMuted ? 'Enable audio' : 'Mute audio'}
      className={twJoin(
        'pointer-events-auto fixed top-6 right-6 z-[120] flex items-center gap-2 rounded-full border border-white/20 bg-black/50 px-4 py-2 text-xs font-semibold tracking-[0.2em] text-white uppercase shadow-lg shadow-black/40 transition-colors duration-200',
        !isMuted && 'border-white/10 bg-white/80 text-black shadow-black/20',
      )}>
      {isMuted ? (
        <VolumeXIcon className="size-5" strokeWidth={1.75} />
      ) : (
        <Volume2Icon className="size-5" strokeWidth={1.75} />
      )}
      <span>{isMuted ? 'Muted' : 'On'}</span>
    </button>
  )
}

export default AudioToggle
