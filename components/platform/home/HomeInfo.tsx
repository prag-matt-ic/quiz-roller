import {
  ArrowUpRight,
  FlagIcon,
  GemIcon,
  InfoIcon,
  type LucideIcon,
  RocketIcon,
} from 'lucide-react'
import type { FC, ReactNode } from 'react'
import { twJoin } from 'tailwind-merge'

// TODO: Add images here.
const cardHeadingClasses = 'text-xl lg:text-2xl font-bold text-black'
const cardClasses =
  'card rounded-2xl origin-bottom space-y-2.5 border border-black/50 bg-linear-70 from-white from-40% to-white/80 p-4 text-black shadow-lg shadow-black/25 sm:p-8'

// Small credits component used inside the Credits card below.
type CreditProps = {
  role: string
  name: string
  url?: string
}

const Credit: FC<CreditProps> = ({ role, name, url }) => {
  return (
    <div className="py-1">
      <span className="mb-1 block text-xs leading-none text-black/70 uppercase">{role}</span>
      {!!url ? (
        <a
          href={url}
          className="paragraph-sm flex items-center gap-1 font-semibold"
          target="_blank"
          rel="noopener noreferrer">
          {name}
          <ArrowUpRight size={16} />
        </a>
      ) : (
        <span className="paragraph-sm font-semibold">{name}</span>
      )}
    </div>
  )
}

export const HOME_INFO_ZONES: {
  containerClassName?: string
  Icon: LucideIcon
  children: ReactNode
}[] = [
  {
    Icon: InfoIcon,
    containerClassName: 'grid w-168 grid-cols-5 gap-4',
    children: (
      <>
        <div className={twJoin(cardClasses, 'col-span-5')}>
          <h2 className={cardHeadingClasses}>About</h2>
          <p className="paragraph max-w-lg">
            Quizroller is a proof of concept game developed to showcase the potential of 3D web
            experiences for educational purposes.
            <br />
            <br />
            We believe that the future of learning should be as fun and engaging as playing a
            game!
          </p>
        </div>

        <div className={twJoin(cardClasses, 'col-span-3')}>
          <h2 className={cardHeadingClasses}>Partnerships</h2>
          <p className="paragraph-sm">
            If you&apos;re interested in sponsoring further development of this project, or want
            to discuss working together on a new project, email:{' '}
            <a href="mailto:pragmattic.ltd@gmail.com" className="underline underline-offset-2">
              pragmattic.ltd@gmail.com
            </a>
          </p>
        </div>

        <div className={twJoin(cardClasses, 'col-span-2')}>
          <h2 className={cardHeadingClasses}>Credits</h2>
          <Credit
            role="Lead Developer"
            name="Matthew Frawley"
            url="https://github.com/prag-matt-ic"
          />
          <Credit role="Support" name="Theo Walton" url="https://github.com/Void-vlk" />
        </div>
      </>
    ),
  },
  {
    Icon: FlagIcon,
    containerClassName: 'grid w-168 grid-cols-3 gap-4',
    children: (
      <>
        <div className={twJoin(cardClasses, 'col-span-3')}>
          <h2 className="text-xl font-bold text-black">Your Mission</h2>
          <p className="paragraph">
            As the Innovation Orb, your goal is to master critical skills for building
            tomorrow&apos;s digital experiences.
            <br />
            {/* MISSION.... */}
            How far will you roll?
          </p>
        </div>

        <div className="card col-span-1 bg-black p-10">
          Confirm a topic by rolling over the tile
        </div>
        <div className="card col-span-1 bg-black p-10">
          Each correct answer unlocks fragments of the future web.
        </div>
        <div className="card col-span-1 bg-black p-10">
          Questions will challenge your knowledge and increase in difficulty.
        </div>
      </>
    ),
  },
]

//  <li>Confirm a topic by rolling over the tile.</li>
//       <li>
//         Navigate the web frontier. Each correct answer unlocks fragments of the future web.
//       </li>
//       <li>
//         Questions will challenge your knowledge and increase in difficulty the further you
//         travel.
//       </li>
