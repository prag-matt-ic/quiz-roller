import { useRef } from 'react'

function useThrottledLog(frameInterval: number = 20) {
  const count = useRef<number>(0)

  const throttledLog = (log: any) => {
    count.current = (count.current + 1) % frameInterval
    if (count.current === 0) console.warn(log)
  }

  return throttledLog
}

export default useThrottledLog
