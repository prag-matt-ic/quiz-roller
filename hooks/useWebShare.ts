'use client'

import { useEffect, useState } from 'react'

type NavigatorWithOptionalCanShare = Navigator & {
  canShare?: (data?: ShareData) => boolean
  share: (data: ShareData) => Promise<void>
}

const navigatorSupportsShare = (): boolean =>
  typeof navigator !== 'undefined' && typeof navigator.share === 'function'

const toError = (value: unknown): Error =>
  value instanceof Error ? value : new Error('Sharing failed')

export function useWebShare() {
  const [error, setError] = useState<Error | null>(null)
  const [isSharing, setIsSharing] = useState(false)
  const [isSupported, setIsSupported] = useState(() => navigatorSupportsShare())

  useEffect(() => {
    setIsSupported(navigatorSupportsShare())
  }, [])

  const handleShare = async (data: ShareData) => {
    if (!isSupported) return
    setIsSharing(true)

    try {
      const nav = navigator as NavigatorWithOptionalCanShare
      await nav.share(data)
      setError(null)
      return true
    } catch (err) {
      const domError = err as DOMException
      if (domError?.name === 'AbortError') {
        // User dismissed the native share dialog; not an error state.
        setError(null)
        return false
      }
      setError(toError(err))
      return false
    } finally {
      setIsSharing(false)
    }
  }

  return { isShareSupported: isSupported, isSharing, error, handleShare }
}

export default useWebShare
