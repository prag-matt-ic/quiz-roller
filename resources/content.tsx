import {
  AlertTriangleIcon,
  ArrowBigUpDashIcon,
  BotIcon,
  CoinsIcon,
  FlameIcon,
  HandshakeIcon,
  LaughIcon,
  LucideIcon,
  MoveIcon,
  RotateCcwIcon,
  SparklesIcon,
  TrendingUpIcon,
} from 'lucide-react'
import { type ReactNode } from 'react'

import { type HudIndicatorConfig } from '@/components/GameProvider'
import { CollectibleID } from '@/model/schema'
import { InputType } from '@/stores/types'

export const COLLECTIBLES_CONTENT: Record<
  CollectibleID,
  { content: ReactNode; Icon: LucideIcon }
> = {
  [CollectibleID.Discount]: {
    Icon: CoinsIcon,
    content: '10% discount off your first project',
  },
  [CollectibleID.AI_Prompts]: {
    Icon: BotIcon,
    content: 'Utilise proprietary AI prompts',
  },
  [CollectibleID.Consultation]: {
    Icon: HandshakeIcon,
    content: 'Free 30 minute consultation',
  },
}

export const GOLD_PARTICLE_PALETTE = [
  '#f6b253',
  '#ffcc3e',
  '#ffb328',
  '#ffc82c',
  '#ffdd3f',
  '#ffbd1f',
  '#ffb51d',
  '#ffaf07',
  '#ffe55e',
  '#f7ebda',
  '#fff7ec',
  '#fde5d2',
]

const BLUE_PARTICLE_PALETTE = [
  '#6a68e7',
  '#e4d8ff',
  '#debcff',
  '#b8bfff',
  '#b1c0ff',
  '#d8c1ff',
  '#e7c4ff',
  '#e8ceff',
  '#eec6ff',
  '#e4e1f9',
  '#e9e3fc',
  '#fffaff',
]

const GREEN_PARTICLE_PALETTE = [
  '#5ed35e',
  '#47ec5e',
  '#97ff7c',
  '#74e45d',
  '#80f662',
  '#6ae557',
  '#5ce62c',
  '#60ea48',
  '#4eff83',
  '#eeffe9',
  '#e7fce1',
  '#e6ffdd',
]

export const GEMS_BY_ID: Record<CollectibleID, { colour: string; particlesPalette: string[] }> =
  {
    [CollectibleID.Discount]: {
      colour: '#F6B253',
      particlesPalette: GOLD_PARTICLE_PALETTE,
    },
    [CollectibleID.AI_Prompts]: {
      colour: '#6A68E7',
      particlesPalette: BLUE_PARTICLE_PALETTE,
    },
    [CollectibleID.Consultation]: {
      colour: '#5ED35E',
      particlesPalette: GREEN_PARTICLE_PALETTE,
    },
  } as const

export const HEADINGS_CONTENT: string[] = [
  'From scroll-driven storytelling to fully interactive worlds',
  'Bring your ideas to life with stunning 3D web experiences',
  'Senior Three.js developers supercharged with AI',
  'Ready to take the next step?',
]

export const INFO_ZONES_CARD_CONTENT: ReactNode[] = [
  <>
    <h2 className="info-header">About</h2>
    <p className="paragraph-sm max-w-md">
      Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt
      ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation
      ullamco laboris nisi ut aliquip ex ea commodo consequat.
    </p>
  </>,
  <>
    <h2 className="info-header">Optimised for mobile and desktop</h2>
    <p className="paragraph-sm max-w-md">
      Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt
      ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation
      ullamco laboris nisi ut aliquip ex ea commodo consequat.
    </p>
  </>,
  <>
    <h2 className="info-header">Collaborative Process</h2>
    <p className="paragraph-sm max-w-md">
      Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt
      ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation
      ullamco laboris nisi ut aliquip ex ea commodo consequat.
    </p>
  </>,
]

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
