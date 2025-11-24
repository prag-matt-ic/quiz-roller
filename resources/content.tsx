import { type HudIndicatorConfig } from '@/components/GameProvider'
import { Credit } from '@/components/platform/home/Credit'
import Card from '@/components/ui/Card'
import { CollectibleType } from '@/model/schema'
import { ArrowUpCircleIcon, BotIcon, CoinsIcon, LucideIcon } from 'lucide-react'
import { type FC, type ReactNode } from 'react'

type InfoContent = {
  heading: string
  infoZoneContainerClassName?: string
  infoZoneContent: ReactNode
}

// badges: [
//   {
//     label: 'Stand out',
//     Icon: HeartIcon,
//   },
//   {
//     label: 'Boost engagement and conversions',
//     Icon: TrendingUp,
//   },
//   {
//     label: 'Optimised experiences',
//     Icon: CircleGauge,
//   },

export const INFO_ZONES_CONTENT: InfoContent[] = [
  {
    heading: 'We help teams bring 3D to the browser without the bloat',
    infoZoneContainerClassName:
      'grid w-[328px] sm:w-168 grid-cols-1 md:grid-cols-5 gap-3 md:gap-4',
    infoZoneContent: (
      <>
        <Card className="w-full md:col-span-5" paletteIndex={0}>
          <h2 className="info-header">About</h2>
          <p className="paragraph-sm max-w-md">
            Quizroller is a proof of concept developed to showcase the potential of 3D web
            experiences for educational purposes.
            <br />
            <br />
            It&apos;s built using React Three Fiber, Rapier physics and WebGL for immersive
            graphics.
          </p>
        </Card>

        <Card className="w-full md:col-span-3" paletteIndex={0}>
          <h2 className="info-header">Partnerships</h2>
          <p className="paragraph-sm">
            Interested in launching your own immersive learning experience?
            <br />
            <br />
            <a href="mailto:pragmattic.ltd@gmail.com" className="underline underline-offset-2">
              Let&apos;s chat!
            </a>
          </p>
        </Card>

        <Card className="w-full md:col-span-2" paletteIndex={0}>
          <h2 className="info-header">Credits</h2>
          <Credit
            role="Lead Developer"
            name="Matthew Frawley"
            url="https://github.com/prag-matt-ic"
          />
          <Credit role="Support" name="Theo Walton" url="https://github.com/Void-vlk" />
        </Card>
      </>
    ),
  },
  {
    heading: 'Senior Three.js developers supercharged with AI capabilities',
    infoZoneContainerClassName: 'grid w-[328px] sm:w-168 grid-cols-1 gap-3',
    infoZoneContent: (
      <>
        <Card className="w-full" paletteIndex={0}>
          <h2 className="info-header">Placeholder</h2>
          <p className="paragraph-sm max-w-md">
            Quizroller is a proof of concept developed to showcase the potential of 3D web
            experiences for educational purposes.
            <br />
            <br />
            It&apos;s built using React Three Fiber, Rapier physics and WebGL for immersive
            graphics.
          </p>
        </Card>
      </>
    ),
  },
  {
    heading: 'Heading third!',
    infoZoneContainerClassName: 'grid w-[328px] sm:w-168 grid-cols-1 gap-3',
    infoZoneContent: (
      <>
        <Card className="w-full" paletteIndex={0}>
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

const CollectibleHUDContent: FC<{
  Icon: LucideIcon
  text: ReactNode
}> = ({ Icon, text }) => {
  return (
    <div className="flex items-center gap-2 pr-2">
      <Icon strokeWidth={1.5} size={32} />
      <p className="block text-sm font-medium uppercase">
        Bonus Unlocked!
        <span className="block text-xl font-bold whitespace-nowrap uppercase">{text}</span>
      </p>
    </div>
  )
}

export const COLLECTIBLES_HUD_CONFIG: Record<CollectibleType, HudIndicatorConfig> = {
  [CollectibleType.Discount]: {
    autoDismissS: 6,
    content: <CollectibleHUDContent Icon={CoinsIcon} text="10% off your first project!" />,
  },
  [CollectibleType.AI_Prompts]: {
    autoDismissS: 6,
    content: <CollectibleHUDContent Icon={BotIcon} text="Access to proprietary AI prompts" />,
  },
  [CollectibleType.Consultation]: {
    autoDismissS: 6,
    content: <CollectibleHUDContent Icon={CoinsIcon} text="Free 30 minute consultation!" />,
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
