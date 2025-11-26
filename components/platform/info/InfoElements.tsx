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
import { COLLECTIBLE_IDS } from '@/model/schema'

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
  const headingRowIndex = useRef<number | null>(null)
  const collectibleRowIndex = useRef<number | null>(null)
  const infoZoneRowIndex = useRef<number | null>(null)
  const [isInfoZonePositioned, setInfoZonePositioned] = useState(false)

  // Called when the row is raised
  const positionElementsIfNeeded = useCallback((row: RowData | undefined, rowZ: number) => {
    if (!row) return
    if (row.type !== 'info') return
    if (!heading.current || !collectible.current || !infoZone.current) return
    const absoluteRowIndex = row.rowIndex as number

    // Check for floating heading position
    const floatingHeadingPosition = row.floatingHeadingPosition
    if (!!floatingHeadingPosition) {
      if (headingRowIndex.current !== absoluteRowIndex) {
        const newZ = rowZ + floatingHeadingPosition[2]
        heading.current.position.set(
          floatingHeadingPosition[0],
          floatingHeadingPosition[1],
          newZ,
        )
        headingRowIndex.current = absoluteRowIndex
      }
      setHeadingVisible(true)
    }

    // Check for info zone positions
    const collectiblePos = row.collectiblePosition
    if (!!collectiblePos) {
      if (collectibleRowIndex.current !== absoluteRowIndex) {
        const newZ = rowZ + collectiblePos[2]
        translation.current.x = collectiblePos[0]
        translation.current.y = collectiblePos[1]
        translation.current.z = newZ
        collectible.current.setTranslation(translation.current, true)
        collectibleRowIndex.current = absoluteRowIndex
      }
      isCollectibleOutOfView.current = false
    }

    const infoZonePos = row.infoZonePositions?.find((pos) => !!pos)
    if (!!infoZonePos) {
      if (infoZoneRowIndex.current !== absoluteRowIndex) {
        const newZ = rowZ + infoZonePos[2]
        translation.current.x = infoZonePos[0]
        translation.current.y = infoZonePos[1]
        translation.current.z = newZ
        infoZone.current.setTranslation(translation.current, true)
        infoZoneRowIndex.current = absoluteRowIndex
      }
      setInfoZonePositioned(true)
    }
  }, [])

  // Called when the row is lowered
  const hideElementsIfNeeded = useCallback((row: RowData | undefined) => {
    if (!row) return
    if (row.type !== 'info') return

    const absoluteRowIndex = typeof row.rowIndex === 'number' ? row.rowIndex : null
    if (absoluteRowIndex == null) return

    const shouldHideHeading = !!row.floatingHeadingPosition
    const shouldHideInfoZone = row.infoZonePositions?.some((pos) => !!pos) === true
    const shouldHideCollectible = !!row.collectiblePosition

    if (shouldHideHeading && headingRowIndex.current === absoluteRowIndex) {
      setHeadingVisible(false)
      headingRowIndex.current = null
    }

    if (shouldHideCollectible && collectible.current && collectibleRowIndex.current === absoluteRowIndex) {
      translation.current.z = HIDE_POSITION_Z
      translation.current.y = HIDE_POSITION_Y
      collectible.current.setTranslation(translation.current, true)
      isCollectibleOutOfView.current = true
      collectibleRowIndex.current = null
    }

    if (shouldHideInfoZone && infoZone.current && infoZoneRowIndex.current === absoluteRowIndex) {
      translation.current.z = HIDE_POSITION_Z
      translation.current.y = HIDE_POSITION_Y
      infoZone.current.setTranslation(translation.current, true)
      infoZoneRowIndex.current = null
      setInfoZonePositioned(false)
    }
  }, [])

  const moveElements = useCallback((zStep: number) => {
    if (headingRowIndex.current != null && !!heading.current) {
      heading.current.position.z += zStep
    }

    // Move collectible
    if (collectibleRowIndex.current != null && !!collectible.current) {
      const currentTranslation = collectible.current.translation()
      const newZ = currentTranslation.z + zStep
      translation.current.x = currentTranslation.x
      translation.current.y = currentTranslation.y
      translation.current.z = newZ
      collectible.current.setTranslation(translation.current, true)
    }

    // Move info zone
    if (infoZoneRowIndex.current != null && !!infoZone.current) {
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

  const collectibleId = COLLECTIBLE_IDS[contentIndex]

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
        key={'collectible' + collectibleId}
        ref={collectible}
        position={[0, HIDE_POSITION_Y, HIDE_POSITION_Z]}
        width={INFO_ZONE_WIDTH}
        height={INFO_ZONE_HEIGHT}
        id={collectibleId}
        isOutOfView={isCollectibleOutOfView}
      />

      <InfoZone
        key="info-zone"
        ref={infoZone}
        position={[0, HIDE_POSITION_Y, HIDE_POSITION_Z]}
        width={INFO_ZONE_WIDTH}
        height={INFO_ZONE_HEIGHT}
        infoContainerClassName={INFO_ZONES_CONTENT[contentIndex].infoZoneContainerClassName}
        isPositioned={isInfoZonePositioned}
        Icon={InfoIcon}>
        {INFO_ZONES_CONTENT[contentIndex].infoZoneContent}
      </InfoZone>
    </>
  )
}

export default InfoElements
