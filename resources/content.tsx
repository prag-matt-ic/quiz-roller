import { type HudIndicatorConfig } from '@/components/GameProvider'
import { Credit } from '@/components/platform/home/Credit'
import Card from '@/components/ui/Card'
import { CollectibleType } from '@/model/schema'
import { ArrowUpCircleIcon, CoinsIcon, LucideIcon } from 'lucide-react'
import { FC, type ReactNode } from 'react'

type InfoContent = {
  heading: string
  infoZoneContent: ReactNode
}

export const INFO_ZONES_CONTENT: InfoContent[] = [
  {
    heading: 'We help teams bring 3D to the browser without the bloat',
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
    infoZoneContent: <></>,
  },
  { heading: 'Heading third!', infoZoneContent: <></> },
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
    content: <CollectibleHUDContent Icon={CoinsIcon} text="Access to proprietary AI prompts" />,
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
