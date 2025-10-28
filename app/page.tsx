import dynamic from 'next/dynamic'

import LoadingOverlay from '@/components/loading/LoadingOverlay'
import isMobileServer from '@/utils/isMobileServer'

const GameApp = dynamic(() => import('@/components/GameApp'))

export default async function Home() {
  const isMobile = await isMobileServer()
  return (
    <main className="h-lvh w-full overflow-hidden">
      <LoadingOverlay />
      <GameApp isMobile={isMobile} />
    </main>
  )
}
