import {
  type FC,
  useCallback,
  useImperativeHandle,
  useRef,
  type RefObject,
  useEffect,
} from 'react'
import { Mesh } from 'three'

import { HIDE_POSITION_Y, HIDE_POSITION_Z, type RowData, TILE_SIZE } from '@/utils/tiles'
import { HEADING_HEIGHT, HEADING_WIDTH } from '@/utils/platform/floatingHeading'
import { FloatingHeading } from '@/components/floatingHeading/FloatingHeading'
import { Stage } from '@/components/GameProvider'

export type HomeElementsHandle = {
  moveElements: (zStep: number) => void
}

type Props = {
  ref: RefObject<HomeElementsHandle | null>
  rowsData: RefObject<RowData[]>
  rowStartZ: number
}

const HOME_HEADING_TEXT = 'From scroll-driven storytelling to fully interactive worlds'
const HIDDEN_HEADING_POSITION: [number, number, number] = [0, HIDE_POSITION_Y, HIDE_POSITION_Z]

const HomeElements: FC<Props> = ({ ref, rowsData, rowStartZ }) => {
  const heading = useRef<Mesh>(null)

  useEffect(() => {
    const positionElements = (rowData: RowData[]) => {
      rowData.forEach((row, rowIndex) => {
        if (row.type !== 'home') return
        const rowZ = rowStartZ - rowIndex * TILE_SIZE

        const floatingHeadingPosition = row.floatingHeadingPosition
        if (!!floatingHeadingPosition && heading.current) {
          heading.current.position.set(
            floatingHeadingPosition[0],
            floatingHeadingPosition[1],
            floatingHeadingPosition[2] + rowZ,
          )
        }
      })
    }

    positionElements(rowsData.current)
  }, [rowsData, rowStartZ])

  const moveElements = useCallback((zStep: number) => {
    if (heading.current) {
      heading.current.position.z += zStep
    }
  }, [])

  useImperativeHandle(ref, () => {
    return {
      moveElements,
    }
  }, [moveElements])

  return (
    <>
      <FloatingHeading
        ref={heading}
        text={HOME_HEADING_TEXT}
        position={HIDDEN_HEADING_POSITION}
        width={HEADING_WIDTH}
        height={HEADING_HEIGHT}
        activeStage={Stage.HOME}
      />
    </>
  )
}

export default HomeElements
