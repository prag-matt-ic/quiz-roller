import { Volume2Icon, VolumeXIcon } from 'lucide-react'
import { type FC } from 'react'
import { twJoin } from 'tailwind-merge'

import { useSoundStore } from '@/components/SoundProvider'

import Button from './Button'

const AudioToggle: FC = () => {
  const isMuted = useSoundStore((s) => s.isMuted)
  const setIsMuted = useSoundStore((s) => s.setIsMuted)

  return (
    <Button
      onClick={() => setIsMuted(!isMuted)}
      aria-pressed={!isMuted}
      aria-label={isMuted ? 'Enable audio' : 'Mute audio'}
      className={twJoin('pointer-events-auto fixed top-4 right-4 z-1000')}>
      {isMuted ? (
        <VolumeXIcon className="size-5" strokeWidth={1.75} />
      ) : (
        <Volume2Icon className="size-5" strokeWidth={1.75} />
      )}
      <span className="hidden text-sm sm:block">{isMuted ? 'SILENT' : 'ON'}</span>
    </Button>
  )
}

export default AudioToggle
