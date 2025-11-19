import { useEffect, useRef, type FC } from 'react'

import { useGameStore, useGameStoreAPI } from '@/components/GameProvider'

const ProgressBar: FC = () => {
  const totalRows = useGameStore((s) => s.totalRows)
  const gameStoreAPI = useGameStoreAPI()
  const barRef = useRef<HTMLDivElement | null>(null)
  const totalRowsRef = useRef(totalRows)

  useEffect(() => {
    const updateBarTransform = (row: number) => {
      const denominator = Math.max(1, totalRowsRef.current - 1)
      const rowsProgress = Math.min(1, Math.max(0, row / denominator))
      if (barRef.current) {
        barRef.current.style.transform = `translateY(${100 - rowsProgress * 100}%)`
      }
    }

    updateBarTransform(gameStoreAPI.getState().currentRow)

    const unsubscribe = gameStoreAPI.subscribe((state, prevState) => {
      if (state.currentRow === prevState.currentRow) return
      updateBarTransform(state.currentRow)
    })

    return unsubscribe
  }, [gameStoreAPI])

  return (
    <div className="fixed right-0 z-100 h-full w-1.5 overflow-hidden bg-black">
      <div
        className="absolute bottom-0 h-full w-1.5 bg-amber-500 transition-transform duration-100 ease-linear"
        ref={barRef}
      />
    </div>
  )
}

export default ProgressBar
