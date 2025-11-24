import { useEffect, useRef, type FC } from 'react'

import { useGameStore, useGameStoreAPI } from '@/components/GameProvider'

const ProgressBar: FC = () => {
  const totalRows = useGameStore((s) => s.totalRows)
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
    <div className="fixed right-0 z-100 h-full w-1 overflow-hidden bg-black">
      <div
        ref={barRef}
        className="absolute bottom-0 h-full w-1 bg-white transition-transform duration-100 ease-linear"
        style={{
          transform: 'translate3d(0,100%,0)',
        }}
      />
    </div>
  )
}

export default ProgressBar
