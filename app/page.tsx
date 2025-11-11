import dynamic from 'next/dynamic'
import { type FC } from 'react'

import LoadingOverlay from '@/components/loading/LoadingOverlay'
import isMobileServer from '@/utils/isMobileServer'
import { SoundProvider } from '@/components/SoundProvider'
import { GameProvider } from '@/components/GameProvider'

const Main = dynamic(() => import('@/components/Main'))

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export default async function Home(props: PageProps) {
  const isMobile = await isMobileServer()
  const searchParams = await props.searchParams
  const isDebug = searchParams?.debug === 'true'

  return (
    <>
      <main className="h-lvh w-full overflow-hidden">
        <SoundProvider>
          <GameProvider>
            <LoadingOverlay />
            <Main isMobile={isMobile} isDebug={isDebug} />
          </GameProvider>
        </SoundProvider>
      </main>
      <StructuredData />
    </>
  )
}

const FAQS: { question: string; answer: string }[] = [
  {
    question: 'What is Quizroller?',
    answer: 'A free 3D endless runner quiz game you play in the browser.',
  },
  {
    question: 'How do I move my player?',
    answer: 'On desktop use WASD or the arrow keys. On mobile, use the virtual joystick.',
  },
  {
    question: 'Is Quizroller free to play?',
    answer: 'Yes. It is free and runs entirely in your web browser.',
  },
  {
    question: 'Which devices and browsers are supported?',
    answer: 'Any modern desktop or mobile browser that supports WebGL 2 and JavaScript.',
  },
  {
    question: 'What is the goal of the game?',
    answer:
      'Navigate your marble across the terrain and answer multiple choice questions to see how far you can roll.',
  },
  {
    question: 'Can I change my marble colour?',
    answer: 'Yes. Roll onto a colour picker tile to change your colour.',
  },
  {
    question: 'How does performance adapt to my device?',
    answer:
      'A Three.js performance monitor automatically adjusts visual quality and device pixel ratio to maintain smooth frame rates.',
  },
  {
    question: 'What technologies power the 3D web game?',
    answer:
      'Next.js, React Three Fiber, Rapier physics, custom WebGL/GLSL materials, Zustand for state, GSAP for animation, and Tailwind for UI.',
  },
  {
    question: 'Does the game require a server or store data there?',
    answer: 'No. There is no server state - all game logic runs client side.',
  },
  {
    question: 'Who created Quizroller?',
    answer: 'Matthew Frawley of Pragmattic Ltd.',
  },
]

const StructuredData: FC = () => {
  const faqEntities = FAQS.map(({ question, answer }) => ({
    '@type': 'Question',
    name: question,
    acceptedAnswer: { '@type': 'Answer', text: answer },
  }))

  const BASE_URL = 'https://quizroller.vercel.app'

  return (
    <>
      {/* Organization (minimal) for the Quizroller site */}
      <script
        type="application/ld+json"
        suppressHydrationWarning
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'Organization',
            '@id': `${BASE_URL}/#organization`,
            name: 'Pragmattic Ltd',
            url: BASE_URL,
            logo: `${BASE_URL}/web-app-manifest-512x512.png`,
            image: `${BASE_URL}/screenshots/home.jpg`,
            sameAs: ['https://github.com/prag-matt-ic'],
          }),
        }}
      />

      {/* Software Application details for the Quizroller game */}
      <script
        type="application/ld+json"
        suppressHydrationWarning
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': ['SoftwareApplication', 'WebApplication', 'VideoGame'],
            '@id': `${BASE_URL}/#software-application`,
            name: 'Quizroller',
            url: BASE_URL,
            applicationCategory: 'GameApplication',
            operatingSystem: 'WEB',
            browserRequirements: 'Requires WebGL 2.0 and JavaScript enabled',
            description:
              'A free 3D endless runner quiz game for the web. Navigate a marble over terrain, answering multiple-choice questions as you go.',
            image: [`${BASE_URL}/screenshots/home.jpg`],
            genre: ['Arcade', 'Trivia', 'Educational'],
            inLanguage: 'en-GB',
            offers: { '@type': 'Offer', price: 0 },
            publisher: { '@id': `${BASE_URL}/#organization` },
            author: { '@id': `${BASE_URL}/#organization` },
          }),
        }}
      />

      {/* WebSite entity for the domain */}
      <script
        type="application/ld+json"
        suppressHydrationWarning
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'WebSite',
            '@id': `${BASE_URL}/#website`,
            url: BASE_URL,
            name: 'Quizroller',
            inLanguage: 'en-GB',
            publisher: { '@id': `${BASE_URL}/#organization` },
          }),
        }}
      />

      {/* FAQs */}
      <script
        type="application/ld+json"
        suppressHydrationWarning
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'FAQPage',
            '@id': `${BASE_URL}/#faq`,
            mainEntity: faqEntities,
          }),
        }}
      />
    </>
  )
}
