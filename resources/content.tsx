import { type HudIndicatorConfig } from '@/components/GameProvider'
import Card from '@/components/ui/Card'
import { CollectibleID } from '@/model/schema'
import { ArrowUpCircleIcon, HandshakeIcon, BotIcon, CoinsIcon, LucideIcon } from 'lucide-react'
import { type ReactNode } from 'react'

type InfoContent = {
  heading: string
  infoZoneContainerClassName?: string
  infoZoneContent: ReactNode
}

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

const BLUE_PARTICLE_PALETTE = [
  '#5a62f2',
  '#c1b4ff',
  '#cab5ff',
  '#c0c2ff',
  '#acc2ff',
  '#d2baff',
  '#e7daff',
  '#c2bbff',
  '#d5baff',
  '#e7e1ff',
  '#f4f2fe',
  '#f3ecff',
]

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

export const GEMS_BY_ID: Record<CollectibleID, { colour: string; particlesPalette: string[] }> =
  {
    [CollectibleID.Discount]: {
      colour: '#F6B253',
      particlesPalette: GOLD_PARTICLE_PALETTE,
    },
    [CollectibleID.AI_Prompts]: {
      colour: '#5A62F2',
      particlesPalette: BLUE_PARTICLE_PALETTE,
    },
    [CollectibleID.Consultation]: {
      colour: '#4682B4',
      particlesPalette: ['#E5F0FF', '#B3D1FF', '#80B2FF', '#4682B4', '#2C5D8A'],
    },
  } as const

export const INFO_ZONES_CONTENT: InfoContent[] = [
  {
    heading: 'We help teams bring 3D to the browser without the bloat',
    infoZoneContainerClassName: 'grid w-[328px] sm:w-160 grid-cols-1 gap-3',
    infoZoneContent: (
      <>
        <Card className="w-full">
          <h2 className="info-header">About</h2>
          <p className="paragraph-sm max-w-md">
            Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor
            incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud
            exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.
          </p>
        </Card>
      </>
    ),
  },
  {
    heading: 'Senior Three.js developers supercharged with AI capabilities',
    infoZoneContainerClassName: 'grid w-[328px] sm:w-160 grid-cols-1 gap-3',
    infoZoneContent: (
      <>
        <Card className="w-full">
          <h2 className="info-header">Placeholder</h2>
          <p className="paragraph-sm max-w-md">
            This experience is built using React Three Fiber, Rapier physics and WebGL for
            immersive graphics.
          </p>
        </Card>
      </>
    ),
  },
  {
    heading: '3D that looks incredible and runs fast everywhere',
    infoZoneContainerClassName: 'grid w-[328px] sm:w-160 grid-cols-1 gap-3',
    infoZoneContent: (
      <>
        <Card className="w-full">
          <h2 className="info-header">Placeholder</h2>
          <p className="paragraph-sm max-w-md">
            Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor
            incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud
            exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.
          </p>
        </Card>
      </>
    ),
  },
]

export const COLLECTIBLES_HUD_CONFIG: Record<CollectibleID, HudIndicatorConfig> = {
  [CollectibleID.Discount]: {
    autoDismissS: 3.5,
    content: <p className="text-sm whitespace-nowrap sm:text-base">Bonus unlocked!</p>,
  },
  [CollectibleID.AI_Prompts]: {
    autoDismissS: 3.5,
    content: <p className="text-sm whitespace-nowrap sm:text-base">Bonus unlocked!</p>,
  },
  [CollectibleID.Consultation]: {
    autoDismissS: 3.5,
    content: <p className="text-sm whitespace-nowrap sm:text-base">Bonus unlocked!</p>,
  },
}

export const MOVE_HUD_INDICATOR: HudIndicatorConfig = {
  autoDismissS: 4,
  content: (
    <div className="flex items-center gap-2 pr-2">
      <ArrowUpCircleIcon strokeWidth={1.5} size={32} />
      <span className="block font-bold whitespace-nowrap uppercase">
        Use your keys to move along
      </span>
    </div>
  ),
}
