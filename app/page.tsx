import dynamic from 'next/dynamic'

import LoadingOverlay from '@/components/loading/LoadingOverlay'
import isMobileServer from '@/utils/isMobileServer'

const Main = dynamic(() => import('@/components/Main'))

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export default async function Home(props: PageProps) {
  const isMobile = await isMobileServer()
  const searchParams = await props.searchParams
  const isDebug = searchParams?.debug === 'true'

  return (
    <main className="h-lvh w-full overflow-hidden">
      <LoadingOverlay />
      <Main isMobile={isMobile} isDebug={isDebug} />
    </main>
  )
}
