import {
  type FC,
  type RefObject,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
} from 'react'

import { useGameStore } from '@/components/GameProvider'
import Collectible from '@/components/platform/collectibles/collectible/Collectible'
import useDynamicRigidBodies from '@/components/platform/useDynamicRigidBodies'
import { COLLECTIBLE_IDS, type CollectibleID } from '@/model/schema'
import { INFO_ZONE_HEIGHT, INFO_ZONE_WIDTH } from '@/utils/platform/infoZoneDimensions'
import { type RowData } from '@/utils/tiles'

export type CollectiblesHandle = {
  moveElements: (zStep: number) => void
  positionElementsIfNeeded: (row: RowData, rowZ: number) => void
  hideElementsIfNeeded: (row: RowData) => void
}

type Props = {
  ref: RefObject<CollectiblesHandle | null>
  onReadyChange: (isReady: boolean) => void
}

const Collectibles: FC<Props> = ({ ref, onReadyChange }) => {
  const totalCollectibles = useGameStore((s) => s.totalCounts.collectibles)
  const { refs, isVisibleStates, translation, applyPlacement, hideRigidBodyAtIndex } =
    useDynamicRigidBodies(totalCollectibles)

  const renderedCollectibleIds = useMemo<CollectibleID[]>(() => {
    const count = refs.length
    if (count === 0) return []
    return Array.from(
      { length: count },
      (_, index) => COLLECTIBLE_IDS[index % COLLECTIBLE_IDS.length],
    )
  }, [refs.length])

  const positionElementsIfNeeded = useCallback(
    (row: RowData, rowZ: number) => {
      const placements = row.collectiblePlacements
      if (!placements?.length) return
      placements.forEach((placement) => {
        applyPlacement(placement, rowZ)
      })
    },
    [applyPlacement],
  )

  const hideElementsIfNeeded = useCallback(
    (row: RowData) => {
      const placements = row.collectiblePlacements
      if (!placements?.length) return
      placements.forEach((placement) => {
        const contentIndex = placement[3]
        if (contentIndex == null) return
        hideRigidBodyAtIndex(contentIndex)
      })
    },
    [hideRigidBodyAtIndex],
  )

  const moveElements = useCallback(
    (zStep: number) => {
      if (zStep === 0) return
      isVisibleStates.forEach((isVisible, index) => {
        if (!isVisible) return
        const body = refs[index]
        if (!body?.current) return
        const currentPosition = body.current.translation()
        translation.current.x = currentPosition?.x ?? 0
        translation.current.y = currentPosition?.y ?? 0
        translation.current.z = (currentPosition?.z ?? 0) + zStep
        body.current.setTranslation(translation.current, true)
      })
    },
    [isVisibleStates, refs, translation],
  )

  useImperativeHandle(
    ref,
    () => ({
      moveElements,
      positionElementsIfNeeded,
      hideElementsIfNeeded,
    }),
    [hideElementsIfNeeded, moveElements, positionElementsIfNeeded],
  )

  useEffect(() => {
    onReadyChange(true)
    return () => {
      onReadyChange(false)
    }
  }, [onReadyChange])

  return (
    <>
      {refs.map((collectibleRef, index) => {
        const collectibleId =
          renderedCollectibleIds[index] ?? COLLECTIBLE_IDS[index % COLLECTIBLE_IDS.length]
        return (
          <Collectible
            key={`collectible-${index}`}
            ref={collectibleRef}
            id={collectibleId}
            width={INFO_ZONE_WIDTH}
            height={INFO_ZONE_HEIGHT}
            isVisible={isVisibleStates[index]}
          />
        )
      })}
    </>
  )
}

export default Collectibles
