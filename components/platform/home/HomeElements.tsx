import { type FC, useCallback, useImperativeHandle, useRef, type RefObject, useEffect } from 'react'
import { Group } from 'three'

import { type RowData, TILE_SIZE } from '@/utils/tiles'

export type HomeElementsHandle = {
  moveElements: (zStep: number) => void
}

type Props = {
  ref: RefObject<HomeElementsHandle | null>
  rowsData: RefObject<RowData[]>
  rowStartZ: number
}

const HomeElements: FC<Props> = ({ ref, rowsData, rowStartZ }) => {
  const image = useRef<Group>(null)

  useEffect(() => {
    const positionElements = (rowData: RowData[]) => {
      rowData.forEach((row, rowIndex) => {
        if (row.type !== 'home') return
        const rowZ = rowStartZ - rowIndex * TILE_SIZE

        const imagePosition = row.imagePosition
        if (!!imagePosition && !!image.current) {
          image.current.position.set(
            imagePosition[0],
            imagePosition[1],
            imagePosition[2] + rowZ,
          )
        }
      })
    }

    positionElements(rowsData.current)
  }, [rowsData, rowStartZ])

  const moveElements = useCallback((zStep: number) => {
    if (!!image.current) {
      const nextZ = image.current.position.z + zStep
      image.current.position.z = nextZ
    }
  }, [])

  useImperativeHandle(ref, () => {
    return {
      moveElements,
    }
  }, [moveElements])

  return (
    <>
      {/* Replaced the arrow image with highlighted cells instead (fits better) */}
      {/* <FlatImage ref={image} image={startArrow} height={HEIGHT} width={WIDTH} /> */}
    </>
  )
}

export default HomeElements
