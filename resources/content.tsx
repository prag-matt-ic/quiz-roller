import {
  ArrowUpRight,
  BotIcon,
  BoxIcon,
  CompassIcon,
  DownloadCloud,
  HandshakeIcon,
  LightbulbIcon,
  type LucideIcon,
  PaletteIcon,
} from 'lucide-react'
import Link from 'next/link'
import { type ReactNode } from 'react'

import { Credit } from '@/components/ui/Credit'
import Panel from '@/components/ui/panel/Panel'
import { PanelHeader } from '@/components/ui/panel/PanelHeader'
import { CollectibleID } from '@/model/schema'

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
          className="flex items-center gap-2 font-bold underline-offset-3 hover:underline lg:text-lg"
          rel="noopener noreferrer">
          Pragmattic Design Tools
          <ArrowUpRight />
        </a>
        <span className="mt-1 block text-sm font-medium text-neutral-300">
          A set of design tools developed alongside this project.
          <br />
          Used for generating gradients (like the marble), subtle colour variations (think
          particles), and grainy noise-based textures (perfect for backgrounds).
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
          className="flex items-center gap-2 font-bold underline-offset-3 hover:underline lg:text-lg"
          rel="noopener noreferrer">
          Clean Code Prompts (Typescript/GLSL)
          <DownloadCloud />
        </Link>
        <span className="mt-1 block text-sm font-medium text-white/80">
          These instructions will help an AI refactor existing code for readability, best
          practices and performance. Useful for keeping AI-generated code clean and efficient
          whilst you move quickly.
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
          className="flex items-center gap-2 font-bold underline-offset-3 hover:underline lg:text-lg"
          rel="noopener noreferrer">
          Free 15 Minute Consultation
          <ArrowUpRight />
        </a>
        <span className="mt-1 block text-sm font-medium text-white/80">
          Our team at Loopspeed would love to discuss your 3D or AI web project. Get in touch
          via the website.
        </span>
      </>
    ),
  },
}

// The message of the site

//

export const HEADINGS_CONTENT: string[] = [
  'From scroll-driven storytelling to fully interactive worlds',
  'This is the era of big ideas',
  'We vibe coded this project with AI',
  'What will you launch?',
  'Ready to speed roll?',
]

//

export const INFO_ZONES_CARD_CONTENT: ReactNode[] = [
  <Panel key="info-welcome" className="p-4 xl:p-8" strength={3}>
    <PanelHeader icon={CompassIcon} label="Explore the map" />

    <p className="max-w-md text-sm font-semibold xl:text-lg">
      Practice movement and learn the terrain before competing against the clock to claim your
      place on the leaderboard.
      <br />
      <br />
      <b>How fast will you roll?</b>
    </p>
  </Panel>,

  <Panel key="info-ai" className="p-4 xl:p-8" strength={3}>
    <PanelHeader icon={LightbulbIcon} label="The era of ideas" />

    <p className="max-w-md text-sm xl:text-lg">
      As builders utilising AI, we have more time than ever to focus on unique ideas and
      crafting memorable user experiences.
      <br />
      <br />
      <b>We are entering the era of ideas, and it&apos;s a great time to be a creator.</b>
    </p>
  </Panel>,

  <Panel key="info-technologies" className="p-4 xl:p-8" strength={3}>
    <PanelHeader icon={BoxIcon} label="Technologies Used" />
    <ul className="list-inside list-disc text-sm xl:text-lg">
      <li>
        <b>Next.js</b> as the web framework
      </li>
      <li>
        <b>React Three Fiber</b> for 3D rendering
      </li>
      <li>
        <b>Rapier</b> for physics and collision events
      </li>
      <li>
        <b>WebGL</b> for materials and particle effects
      </li>
      <li>
        <b>Zustand</b> for state management
      </li>
      <li>
        <b>GSAP</b> for driving animations
      </li>
      <li>
        <b>Tailwind CSS</b> for UI styling
      </li>
    </ul>
  </Panel>,
]
