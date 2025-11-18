import { type FC } from 'react'

import { useGameStore } from '@/components/GameProvider'

const ProgressBar: FC = () => {
  const totalRows = useGameStore((s) => s.totalRows)
  const currentRowIndex = useGameStore((s) => s.currentRow)

  const rowsProgress = Math.min(1, Math.max(0, currentRowIndex / (totalRows - 1)))

  // TODO: subscribe to progress and animate the bar without a React re-render

  return (
    <div className="fixed right-0 z-100 h-full w-1.5 overflow-hidden bg-black">
      <div
        className="absolute bottom-0 h-full w-1.5 bg-amber-500 transition-transform duration-100 ease-linear"
        style={{
          transform: `translateY(${100 - rowsProgress * 100}%)`,
        }}
      />
    </div>
  )
}

export default ProgressBar
