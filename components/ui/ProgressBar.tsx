import { type FC, useEffect, useRef } from 'react'

import { useGameStore, useGameStoreAPI } from '@/components/GameProvider'

import { EMPTY_ROW_INDEX } from '../platform/usePlayerRespawn'

const ProgressBar: FC = () => {
  const totalRows = useGameStore((s) => s.totalCounts.rows)
  const gameStoreAPI = useGameStoreAPI()
  const barRef = useRef<HTMLDivElement | null>(null)
  const totalRowsRef = useRef(totalRows)

  useEffect(() => {
    totalRowsRef.current = totalRows
  }, [totalRows])

  useEffect(() => {
    const barElement = barRef.current
    if (!barElement) return

    const updateBarTransform = (row: number) => {
      if (row === EMPTY_ROW_INDEX) return // fallen off front or back of the platform
      const denominator = Math.max(1, totalRowsRef.current - 1)
      const rowsProgress = Math.min(1, Math.max(0, row / denominator))
      barElement.style.transform = `translate3d(0, ${100 - rowsProgress * 100}%, 0)`
    }

    const unsubscribe = gameStoreAPI.subscribe(
      (s) => s.currentRow,
      (currentRow) => {
        updateBarTransform(currentRow)
      },
    )

    return unsubscribe
  }, [gameStoreAPI])

  return (
    <div
      id="progress-bar"
      className="fixed top-1/2 right-1 z-100 h-48 w-1.5 -translate-y-1/2 overflow-hidden rounded-full bg-black">
      <div
        ref={barRef}
        className="absolute bottom-0 size-full bg-white/60 transition-transform duration-100 ease-linear"
        style={{
          transform: 'translate3d(0,100%,0)',
        }}
      />
    </div>
  )
}

export default ProgressBar
