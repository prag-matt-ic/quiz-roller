import { headers } from 'next/headers'

const isMobileServer = async () => {
  const headersList = await headers()
  const userAgent = headersList.get('user-agent')
  return !!userAgent?.includes('Mobile')
}

export default isMobileServer
