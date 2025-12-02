'use client'

import { type FC } from 'react'
import { ArrowLeft, ArrowRight, Joystick, Keyboard, Settings2, Volume2, VolumeX } from 'lucide-react'
import { twMerge } from 'tailwind-merge'

import { useGameStore } from '@/components/GameProvider'
import { SceneQuality, usePerformanceStore } from '@/components/PerformanceProvider'
import { useSoundStore } from '@/components/SoundProvider'
import { ButtonGroup } from '@/components/ui/ButtonGroup'
import Surface from '@/components/ui/surface/Surface'
import { InputType } from '@/stores/types'

import { PANEL_BASE_CLASSES, PANEL_VARIANTS } from './panelStyles'

type SettingsProps = {
  className?: string
}

export const Settings: FC<SettingsProps> = ({ className }) => {
  const inputType = useGameStore((s) => s.inputType)
  const setInputType = useGameStore((s) => s.setInputType)
  const joystickPosition = useGameStore((s) => s.joystickPosition)
  const setJoystickPosition = useGameStore((s) => s.setJoystickPosition)

  const sceneQuality = usePerformanceStore((s) => s.sceneQuality)
  const setSceneQuality = usePerformanceStore((s) => s.setSceneQuality)

  const isMuted = useSoundStore((s) => s.isMuted)
  const setIsMuted = useSoundStore((s) => s.setIsMuted)

  return (
    <Surface
      className={twMerge(PANEL_BASE_CLASSES, PANEL_VARIANTS.dark, className)}>
      <div className="flex h-full flex-col gap-4">
        <div className="flex items-center gap-2">
          <Settings2 className="size-4 text-white/50" />
          <span className="text-xs font-medium uppercase tracking-widest text-white/50">
            Settings
          </span>
        </div>

        <div className="flex flex-col gap-4">
          {/* Audio */}
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-white/70">Audio</span>
            <ButtonGroup
              value={isMuted ? 'off' : 'on'}
              onChange={(val) => setIsMuted(val === 'off')}
              items={[
                { label: 'On', value: 'on', Icon: Volume2 },
                { label: 'Off', value: 'off', Icon: VolumeX },
              ]}
            />
          </div>

          {/* Input */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-white/70">Input</span>
              <ButtonGroup
                value={inputType}
                onChange={setInputType}
                items={[
                  { label: 'Keyboard', value: InputType.KEYS, Icon: Keyboard },
                  { label: 'Joystick', value: InputType.JOYSTICK, Icon: Joystick },
                ]}
              />
            </div>
            {inputType === InputType.JOYSTICK && (
              <div className="flex justify-end">
                <ButtonGroup
                  value={joystickPosition}
                  onChange={setJoystickPosition}
                  items={[
                    { label: 'Left Handed', value: 'left', Icon: ArrowLeft },
                    { label: 'Right Handed', value: 'right', Icon: ArrowRight },
                  ]}
                />
              </div>
            )}
          </div>

          {/* Quality */}
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-white/70">Quality</span>
            <ButtonGroup
              value={sceneQuality}
              onChange={setSceneQuality}
              items={[
                { label: 'Low', value: SceneQuality.LOW },
                { label: 'Med', value: SceneQuality.MEDIUM },
                { label: 'High', value: SceneQuality.HIGH },
              ]}
            />
          </div>
        </div>
      </div>
    </Surface>
  )
}
