import Main from '@/components/Main'
import isMobileServer from '@/utils/isMobileServer'

export default async function Home() {
  const isMobile = await isMobileServer()
  return <Main isMobile={isMobile} />
}
