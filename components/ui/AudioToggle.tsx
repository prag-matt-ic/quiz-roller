import { Volume2Icon, VolumeXIcon } from 'lucide-react'
import { type FC } from 'react'
import { twJoin } from 'tailwind-merge'

import { useSoundStore } from '@/components/SoundProvider'

const AudioToggle: FC = () => {
  const isMuted = useSoundStore((s) => s.isMuted)
  const setIsMuted = useSoundStore((s) => s.setIsMuted)

  return (
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
  )
}

export default AudioToggle
