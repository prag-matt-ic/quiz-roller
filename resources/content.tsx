import { Credit } from '@/components/platform/home/Credit'
import Card from '@/components/ui/Card'
import { type ReactNode } from 'react'

type InfoContent = {
  heading: string
  infoZoneContent: ReactNode
  isInfoOnLeft: boolean
}

export const INFO_SECTION_CONTENT: InfoContent[] = [
  {
    heading: 'We help you bring 3D to the browser without the bloat',
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
    isInfoOnLeft: true,
  },
  {
    heading: 'Senior Three.js developers supercharged with AI capabilities',
    infoZoneContent: <></>,
    isInfoOnLeft: false,
  },
  { heading: 'Heading third!', infoZoneContent: <></>, isInfoOnLeft: true },
]
