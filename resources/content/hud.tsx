import {
  AlertTriangleIcon,
  ArrowBigUpDashIcon,
  FlameIcon,
  LaughIcon,
  MoveIcon,
  RotateCcwIcon,
  SparklesIcon,
  TrendingUpIcon,
} from 'lucide-react'

import { type HudIndicatorConfig } from '@/components/GameProvider'
import { InputType } from '@/stores/types'

export const MOVE_HUD_CONFIG: Record<InputType, HudIndicatorConfig> = {
  [InputType.KEYS]: {
    id: 'move-keys',
    autoDismissS: 4,
    Icon: MoveIcon,
    label: (
      <>
        <b>Arrow keys</b> to move
      </>
    ),
  },
  [InputType.JOYSTICK]: {
    id: 'move-joystick',
    autoDismissS: 4,
    Icon: MoveIcon,
    label: (
      <>
        <b>Touch joystick</b> to move
      </>
    ),
  },
}

export const OUT_OF_BOUNDS_HUD_CONFIG: HudIndicatorConfig[] = [
  {
    id: 'oob-1',
    autoDismissS: 3,
    Icon: AlertTriangleIcon,
    label: 'Nothing to see down there!',
  },
  {
    id: 'oob-2',
    autoDismissS: 3,
    Icon: RotateCcwIcon,
    label: (
      <>
        You unlocked: <b>1 free life</b>
      </>
    ),
  },
  {
    id: 'oob-3',
    autoDismissS: 3,
    Icon: SparklesIcon,
    label: (
      <>
        <b>Still no secrets</b>
      </>
    ),
  },
  {
    id: 'oob-4',
    autoDismissS: 3,
    Icon: ArrowBigUpDashIcon,
    label: 'Thanks for testing gravity!',
  },
  {
    id: 'oob-5',
    autoDismissS: 3,
    Icon: TrendingUpIcon,
    label: (
      <>
        Fall down 7 times, <b>stand up 8</b>
      </>
    ),
  },
  {
    id: 'oob-6',
    autoDismissS: 3,
    Icon: FlameIcon,
    label: 'Failure is not fatal',
  },
  {
    id: 'oob-7',
    autoDismissS: 3,
    Icon: LaughIcon,
    label: (
      <>
        <b>Rise.</b> Wiser than before.
      </>
    ),
  },
]
