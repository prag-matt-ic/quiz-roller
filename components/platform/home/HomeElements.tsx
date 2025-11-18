import {
  type FC,
  useCallback,
  useImperativeHandle,
  useRef,
  type RefObject,
  useState,
} from 'react'
import { Mesh } from 'three'

import { HIDE_POSITION_Y, HIDE_POSITION_Z, type RowData } from '@/utils/tiles'
import { HEADING_HEIGHT, HEADING_WIDTH } from '@/utils/platform/floatingHeading'
import { FloatingHeading } from '@/components/floatingHeading/FloatingHeading'

export type HomeElementsHandle = {
  moveElements: (zStep: number) => void
  positionElementsIfNeeded: (row: RowData | undefined, rowZ: number) => void
  hideElementsIfNeeded: (row: RowData | undefined) => void
}

type Props = {
  ref: RefObject<HomeElementsHandle | null>
}

const HOME_HEADING_TEXT = 'From scroll-driven storytelling to fully interactive worlds'
const HIDDEN_HEADING_POSITION: [number, number, number] = [0, HIDE_POSITION_Y, HIDE_POSITION_Z]

const HomeElements: FC<Props> = ({ ref }) => {
  const heading = useRef<Mesh>(null)
  const [isHeadingVisible, setHeadingVisible] = useState(false)

  const positionElementsIfNeeded = useCallback((row: RowData | undefined, rowZ: number) => {
    if (!row) return
    if (row.type !== 'home') return
    const floatingHeadingPosition = row.floatingHeadingPosition
    if (!floatingHeadingPosition) return

    if (heading.current) {
      heading.current.position.set(
        floatingHeadingPosition[0],
        floatingHeadingPosition[1],
        floatingHeadingPosition[2] + rowZ,
      )
    }

    setHeadingVisible(true)
  }, [])

  const hideElementsIfNeeded = useCallback((row: RowData | undefined) => {
    if (!row) return
    if (row.type !== 'home') return
    const shouldHideHeading = !!row.floatingHeadingPosition
    if (!shouldHideHeading) return

    setHeadingVisible(false)
  }, [])

  const moveElements = useCallback((zStep: number) => {
    if (heading.current) {
      heading.current.position.z += zStep
    }
  }, [])

  useImperativeHandle(ref, () => {
    return {
      moveElements,
      positionElementsIfNeeded,
      hideElementsIfNeeded,
    }
  }, [moveElements, positionElementsIfNeeded, hideElementsIfNeeded])

  return (
    <>
      <FloatingHeading
        ref={heading}
        text={HOME_HEADING_TEXT}
        position={HIDDEN_HEADING_POSITION}
        width={HEADING_WIDTH}
        height={HEADING_HEIGHT}
        isVisible={isHeadingVisible}
      />
    </>
  )
}

export default HomeElements
