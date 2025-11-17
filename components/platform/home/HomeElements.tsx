import { RapierRigidBody } from '@react-three/rapier'
import {
  createRef,
  type FC,
  useCallback,
  useImperativeHandle,
  useRef,
  type RefObject,
  useEffect,
  useState,
} from 'react'
import { Group } from 'three'

import startArrow from '@/assets/textures/arrow-big-up-dash.webp'
import { useGameStore } from '@/components/GameProvider'
import FlatImage from '@/components/platform/home/FlatImage'
import {
  HIDE_POSITION_Y,
  HIDE_POSITION_Z,
  INITIAL_ROWS_Z_OFFSET,
  MAX_Z,
  type RowData,
  TILE_SIZE,
} from '@/utils/tiles'

const WIDTH = TILE_SIZE * 4
const ASPECT = startArrow.width / startArrow.height
const HEIGHT = WIDTH / ASPECT

export type HomeElementsHandle = {
  moveElements: (zStep: number) => void
}

type Props = {
  ref: RefObject<HomeElementsHandle | null>
  rowsData: RefObject<RowData[]>
}

const HomeElements: FC<Props> = ({ ref, rowsData }) => {
  const image = useRef<Group>(null)
  const translation = useRef({ x: 0, y: 0, z: 0 })

  useEffect(() => {
    const positionElements = (rowData: RowData[]) => {
      rowData.forEach((row, rowIndex) => {
        if (row.type !== 'home') return
        const rowZ = -rowIndex * TILE_SIZE + INITIAL_ROWS_Z_OFFSET

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
  }, [rowsData])

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
