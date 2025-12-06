import {
  AlertTriangleIcon,
  ArrowBigUpDashIcon,
  ArrowUpRight,
  BotIcon,
  DownloadCloud,
  FlameIcon,
  HandshakeIcon,
  LaughIcon,
  LucideIcon,
  MoveIcon,
  PaletteIcon,
  RotateCcwIcon,
  SparklesIcon,
  TrendingUpIcon,
} from 'lucide-react'
import Link from 'next/link'
import { type ReactNode } from 'react'

import { type HudIndicatorConfig } from '@/components/GameProvider'
import { Credit } from '@/components/ui/Credit'
import { CollectibleID } from '@/model/schema'
import { InputType } from '@/stores/types'

export const COLLECTIBLES_CONTENT: Record<
  CollectibleID,
  { content: ReactNode; Icon: LucideIcon }
> = {
  [CollectibleID.DesignTools]: {
    Icon: PaletteIcon,
    content: (
      <>
        <a
          href="https://pragmattic-design-tools.vercel.app/mode/gradient"
          target="_blank"
          className="flex items-center gap-2 font-bold lg:text-lg"
          rel="noopener noreferrer">
          Pragmattic Design Tools
          <ArrowUpRight />
        </a>
        <span className="mt-1 block text-sm font-medium text-white/80">
          A set of opinionated design tools developed alongside this project. Used for
          generating beautiful gradients, colour variations, and grainy noise-based textures.
        </span>
      </>
    ),
  },
  [CollectibleID.AI_Prompts]: {
    Icon: BotIcon,
    content: (
      <>
        <Link
          href="/bonuses/prompts.md"
          target="_blank"
          className="flex items-center gap-2 font-bold lg:text-lg"
          rel="noopener noreferrer">
          Clean Typescript and GLSL Prompts
          <DownloadCloud />
        </Link>
        <span className="mt-1 block text-sm font-medium text-white/80">
          Prompts that will refactor existing code for readability, best practices and
          performance. Used in this project to keep the code clean and efficient whilst moving
          quickly. Best used in conjunction with a reasoning LLM.
        </span>
      </>
    ),
  },
  [CollectibleID.Consultation]: {
    Icon: HandshakeIcon,
    content: (
      <>
        <a
          href="https://www.loopspeed.co.uk/"
          target="_blank"
          className="flex items-center gap-2 font-bold lg:text-lg"
          rel="noopener noreferrer">
          Free 15 Minute Consultation
          <ArrowUpRight />
        </a>
        <span className="mt-1 block text-sm font-medium text-white/80">
          Our team at Loopspeed are happy to discuss your next 3D or AI web project. Get in
          touch via the website.
        </span>
      </>
    ),
  },
}

// The message of the site

//

export const HEADINGS_CONTENT: string[] = [
  'Discover the future of 3D web development',
  'xxxx',
  'xxx',
  'Ready to race?',
]

// From scroll-driven storytelling to fully interactive worlds

export const INFO_ZONES_CARD_CONTENT: ReactNode[] = [
  <>
    <h2 className="info-header">How it&apos;s built</h2>
    {/* Pair this with  */}
    <p className="paragraph-sm max-w-md">
      Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt
      ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation
      ullamco laboris nisi ut aliquip ex ea commodo consequat.
    </p>
  </>,
  <>
    <h2 className="info-header">AI as a tool, not a replacement</h2>
    {/* Pair this with the AI prompts bonus */}
    <p className="paragraph-sm max-w-md">
      Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt
      ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation
      ullamco laboris nisi ut aliquip ex ea commodo consequat.
    </p>
  </>,
  <>
    <h2 className="info-header">About the authors</h2>
    {/* Pair this with free 30 minute consultation */}
    <p className="paragraph-sm max-w-md">
      Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt
      ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation
      ullamco laboris nisi ut aliquip ex ea commodo consequat.
    </p>

    <Credit name="Matthew Frawley" role="Lead Developer" />
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
