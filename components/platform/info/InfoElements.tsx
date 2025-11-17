import { RapierRigidBody } from '@react-three/rapier'
import {
  createRef,
  type FC,
  ReactNode,
  useCallback,
  useImperativeHandle,
  useRef,
  useState,
} from 'react'
import { type RefObject } from 'react'
import { Mesh } from 'three'

import { useGameStore } from '@/components/GameProvider'
import { Text } from '@/components/Text'
import { INFO_TEXT_HEIGHT, INFO_TEXT_WIDTH } from '@/utils/platform/infoSection'
import { HIDE_POSITION_Y, HIDE_POSITION_Z, MAX_Z, type RowData } from '@/utils/tiles'
import { InfoZone } from '@/components/infoZone/InfoZone'
import { InfoIcon } from 'lucide-react'
import { INFO_ZONE_HEIGHT, INFO_ZONE_WIDTH } from '@/utils/platform/homeSection'

export type InfoElementsHandle = {
  moveElements: (zStep: number) => void
  positionElementsIfNeeded: (row: RowData | undefined, rowZ: number) => void
  hideElementsIfNeeded: (row: RowData | undefined) => void
}

type Props = {
  ref: RefObject<InfoElementsHandle | null>
}

const INITIAL_INFO_POSITION = {
  Y: 0.01,
  Z: -999,
} as const

// TODO: add InfoZone component.
const InfoElements: FC<Props> = ({ ref }) => {
  const translation = useRef({ x: 0, y: 0, z: 0 }) // reusable object for translations

  const infoText = useRef<Mesh>(null)
  const [contentIndex, setContentIndex] = useState<number>(0)

  const infoIsOutOfView = useRef<boolean>(false)

  // Called when the row is raised
  const positionElementsIfNeeded = useCallback(
    (row: RowData | undefined, rowZ: number) => {
      if (!row) return
      if (row.type !== 'info') return

      console.log('Positioning info elements:', row)
      if (!!row.infoContentIndex && row.infoContentIndex !== contentIndex) {
        setContentIndex(row.infoContentIndex)
      }

      const textPosition = row.tileTextPosition
      if (!!textPosition && infoText.current) {
        infoText.current.position.set(textPosition[0], textPosition[1], rowZ + textPosition[2])
        infoIsOutOfView.current = false
      }
    },
    [contentIndex],
  )

  // Called when the row is lowered
  const hideElementsIfNeeded = useCallback((row: RowData | undefined) => {
    if (!row) return
    if (row.type !== 'info') return

    if (!!infoText.current) {
      infoText.current.position.z = HIDE_POSITION_Z
      infoText.current.position.y = HIDE_POSITION_Y
    }
  }, [])

  const moveElements = useCallback((zStep: number) => {
    if (!infoText.current) return

    const isInfoBehindCamera = infoText.current.position.z > MAX_Z
    if (isInfoBehindCamera && !infoIsOutOfView.current) {
      infoText.current.position.z = HIDE_POSITION_Z
      infoText.current.position.y = HIDE_POSITION_Y
      infoIsOutOfView.current = true
    } else {
      infoText.current.position.z += zStep
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
      {/* TODO: replace with the floating heading... */}
      <Text
        ref={infoText}
        text={INFO_SECTION_CONTENT[contentIndex].heading}
        position={[0, INITIAL_INFO_POSITION.Y, INITIAL_INFO_POSITION.Z]}
        width={INFO_TEXT_WIDTH}
        height={INFO_TEXT_HEIGHT}
      />
      {/* TODO: add floating heading text */}
      {/* TODO: add info zone. */}
      {/* <InfoZone
        key="info-zone"
        ref={infoZoneRef}
        position={[0, HIDE_POSITION_Y, HIDE_POSITION_Z]}
        width={INFO_ZONE_WIDTH}
        height={INFO_ZONE_HEIGHT}
        infoContainerClassName="grid w-[328px] sm:w-168 grid-cols-1 md:grid-cols-5 gap-3 md:gap-4"
        Icon={InfoIcon}>
        // CONTENT FROM DATA BELOW..
        <></>
      </InfoZone> */}

      {/* TODO: add collectible */}
    </>
  )
}

export default InfoElements

type InfoContent = {
  heading: string
  // infoZoneContent: ReactNode
  // collectible?
}

const INFO_SECTION_CONTENT: InfoContent[] = [
  { heading: 'Heading first!' },
  { heading: 'Heading second!' },
  { heading: 'Heading third!' },
]
