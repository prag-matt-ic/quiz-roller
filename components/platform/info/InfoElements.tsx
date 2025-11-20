import { RapierRigidBody } from '@react-three/rapier'
import {
  type FC,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  type RefObject,
  useState,
} from 'react'
import { Mesh } from 'three'

import { useGameStore } from '@/components/GameProvider'
import { INFO_ZONE_HEIGHT, INFO_ZONE_WIDTH } from '@/utils/platform/infoSection'
import { HEADING_HEIGHT, HEADING_Y, HEADING_WIDTH } from '@/utils/platform/floatingHeading'
import { HIDE_POSITION_Y, HIDE_POSITION_Z, type RowData } from '@/utils/tiles'
import { InfoZone } from '@/components/infoZone/InfoZone'
import { InfoIcon } from 'lucide-react'
import { FloatingHeading } from '@/components/floatingHeading/FloatingHeading'
import Collectible from '@/components/collectible/Collectible'
import { INFO_ZONES_CONTENT } from '@/resources/content'
import { COLLECTIBLE_TYPES } from '@/model/schema'

export type InfoElementsHandle = {
  moveElements: (zStep: number) => void
  positionElementsIfNeeded: (row: RowData | undefined, rowZ: number) => void
  hideElementsIfNeeded: (row: RowData | undefined) => void
}

type Props = {
  ref: RefObject<InfoElementsHandle | null>
  onReadyChange: (isReady: boolean) => void
}

const INITIAL_INFO_POSITION = {
  Y: HEADING_Y,
  Z: -999,
} as const

const InfoElements: FC<Props> = ({ ref, onReadyChange }) => {
  const translation = useRef({ x: 0, y: 0, z: 0 }) // reusable object for translations

  const heading = useRef<Mesh>(null)
  const [isHeadingVisible, setHeadingVisible] = useState(false)
  const collectible = useRef<RapierRigidBody>(null)
  const isCollectibleOutOfView = useRef(true)
  const infoZone = useRef<RapierRigidBody>(null)
  const contentIndex = useGameStore((s) => s.infoContentIndex) // Content index is set in Platform when the info section row is raised.

  // Called when the row is raised
  const positionElementsIfNeeded = useCallback((row: RowData | undefined, rowZ: number) => {
    if (!row) return
    if (row.type !== 'info') return

    // Check for floating heading position
    const floatingHeadingPosition = row.floatingHeadingPosition
    if (!!floatingHeadingPosition) {
      const newZ = rowZ + floatingHeadingPosition[2]

      if (heading.current) {
        heading.current.position.set(
          floatingHeadingPosition[0],
          floatingHeadingPosition[1],
          newZ,
        )
      }
      setHeadingVisible(true)
    }

    // Check for info zone positions
    const collectiblePos = row.collectiblePosition
    if (collectiblePos && collectible.current) {
      const newZ = rowZ + collectiblePos[2]
      translation.current.x = collectiblePos[0]
      translation.current.y = collectiblePos[1]
      translation.current.z = newZ
      collectible.current.setTranslation(translation.current, true)
      isCollectibleOutOfView.current = false
    }

    const infoZonePos = row.infoZonePositions?.find((pos) => !!pos)
    if (infoZonePos && infoZone.current) {
      const newZ = rowZ + infoZonePos[2]
      translation.current.x = infoZonePos[0]
      translation.current.y = infoZonePos[1]
      translation.current.z = newZ
      infoZone.current.setTranslation(translation.current, true)
    }
  }, [])

  // Called when the row is lowered
  const hideElementsIfNeeded = useCallback((row: RowData | undefined) => {
    if (!row) return
    if (row.type !== 'info') return

    const shouldHideHeading = !!row.floatingHeadingPosition
    const shouldHideInfoZone = row.infoZonePositions?.some((pos) => !!pos) === true
    const shouldHideCollectible = !!row.collectiblePosition

    if (shouldHideHeading) {
      setHeadingVisible(false)
    }

    if (shouldHideCollectible && collectible.current) {
      translation.current.z = HIDE_POSITION_Z
      translation.current.y = HIDE_POSITION_Y
      collectible.current.setTranslation(translation.current, true)
      isCollectibleOutOfView.current = true
    }

    if (shouldHideInfoZone && infoZone.current) {
      translation.current.z = HIDE_POSITION_Z
      translation.current.y = HIDE_POSITION_Y
      infoZone.current.setTranslation(translation.current, true)
    }
  }, [])

  const moveElements = useCallback((zStep: number) => {
    if (!!heading.current) {
      heading.current.position.z += zStep
    }

    // Move collectible
    if (!!collectible.current) {
      const currentTranslation = collectible.current.translation()
      const newZ = currentTranslation.z + zStep
      translation.current.x = currentTranslation.x
      translation.current.y = currentTranslation.y
      translation.current.z = newZ
      collectible.current.setTranslation(translation.current, true)
    }

    // Move info zone
    if (!!infoZone.current) {
      const currentTranslation = infoZone.current.translation()
      const newZ = currentTranslation.z + zStep
      translation.current.x = currentTranslation.x
      translation.current.y = currentTranslation.y
      translation.current.z = newZ
      infoZone.current.setTranslation(translation.current, true)
    }
  }, [])

  useImperativeHandle(ref, () => {
    return {
      moveElements,
      positionElementsIfNeeded,
      hideElementsIfNeeded,
    }
  }, [moveElements, positionElementsIfNeeded, hideElementsIfNeeded])

  useEffect(() => {
    onReadyChange(true)
    return () => {
      onReadyChange(false)
    }
  }, [onReadyChange])

  return (
    <>
      <FloatingHeading
        ref={heading}
        text={INFO_ZONES_CONTENT[contentIndex].heading}
        position={[0, INITIAL_INFO_POSITION.Y, INITIAL_INFO_POSITION.Z]}
        width={HEADING_WIDTH}
        height={HEADING_HEIGHT}
        isVisible={isHeadingVisible}
      />

      <Collectible
        key="collectible"
        ref={collectible}
        position={[0, HIDE_POSITION_Y, HIDE_POSITION_Z]}
        width={INFO_ZONE_WIDTH}
        height={INFO_ZONE_HEIGHT}
        type={COLLECTIBLE_TYPES[contentIndex]}
        isOutOfView={isCollectibleOutOfView}
      />

      <InfoZone
        key="info-zone"
        ref={infoZone}
        position={[0, HIDE_POSITION_Y, HIDE_POSITION_Z]}
        width={INFO_ZONE_WIDTH}
        height={INFO_ZONE_HEIGHT}
        infoContainerClassName="grid w-[328px] sm:w-168 grid-cols-1 md:grid-cols-5 gap-3 md:gap-4"
        Icon={InfoIcon}>
        {INFO_ZONES_CONTENT[contentIndex].infoZoneContent}
      </InfoZone>
    </>
  )
}

export default InfoElements
