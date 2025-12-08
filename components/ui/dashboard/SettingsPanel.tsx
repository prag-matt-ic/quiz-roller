'use client'

import {
  ArrowLeft,
  ArrowRight,
  Joystick,
  Keyboard,
  Settings2,
  Volume2,
  VolumeX,
} from 'lucide-react'
import { type FC } from 'react'
import { twMerge } from 'tailwind-merge'

import { useGameStore } from '@/components/GameProvider'
import { SceneQuality, usePerformanceStore } from '@/components/PerformanceProvider'
import { useSoundStore } from '@/components/SoundProvider'
import { ButtonGroup } from '@/components/ui/ButtonGroup'
import Panel from '@/components/ui/panel/Panel'
import { PanelHeader } from '@/components/ui/panel/PanelHeader'
import { InputType } from '@/stores/types'

type Props = {
  className?: string
}

export const SettingsPanel: FC<Props> = ({ className }) => {
  const inputType = useGameStore((s) => s.inputType)
  const setInputType = useGameStore((s) => s.setInputType)
  const joystickPosition = useGameStore((s) => s.joystickPosition)
  const setJoystickPosition = useGameStore((s) => s.setJoystickPosition)

  const sceneQuality = usePerformanceStore((s) => s.sceneQuality)
  const setSceneQuality = usePerformanceStore((s) => s.setSceneQuality)

  const isMuted = useSoundStore((s) => s.isMuted)
  const setIsMuted = useSoundStore((s) => s.setIsMuted)

  return (
    <Panel
      className={twMerge('h-full', className)}
      strength={1}
      attractorClassName="bg-white/5 bg-linear-70 from-white/10 to-transparent">
      <PanelHeader icon={Settings2} label="Settings" />

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

            <div className="flex gap-2">
              <ButtonGroup
                value={inputType}
                onChange={setInputType}
                items={[
                  { label: 'Keyboard', value: InputType.KEYS, Icon: Keyboard },
                  { label: 'Joystick', value: InputType.JOYSTICK, Icon: Joystick },
                ]}
              />
              <ButtonGroup
                value={joystickPosition}
                onChange={setJoystickPosition}
                disabled={inputType !== InputType.JOYSTICK}
                items={[
                  { label: null, value: 'left', Icon: ArrowLeft },
                  { label: null, value: 'right', Icon: ArrowRight },
                ]}
              />
            </div>
          </div>
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
    </Panel>
  )
}
