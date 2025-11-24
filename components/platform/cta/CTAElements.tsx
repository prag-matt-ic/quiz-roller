import { RapierRigidBody } from '@react-three/rapier'
import {
  type FC,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  type RefObject,
} from 'react'

import { CTA_ZONE_HEIGHT, CTA_ZONE_WIDTH } from '@/utils/platform/ctaSection'
import { HIDE_POSITION_Y, HIDE_POSITION_Z, type RowData } from '@/utils/tiles'
import { InfoZone } from '@/components/infoZone/InfoZone'
import { Trophy } from 'lucide-react'
import CTATimeDisplay from '@/components/ui/TimeDisplay'

export type CTAElementsHandle = {
  moveElements: (zStep: number) => void
  positionElementsIfNeeded: (row: RowData | undefined, rowZ: number) => void
  hideElementsIfNeeded: (row: RowData | undefined) => void
}

type Props = {
  ref: RefObject<CTAElementsHandle | null>
  onReadyChange: (isReady: boolean) => void
}

const CTAElements: FC<Props> = ({ ref, onReadyChange }) => {
  const translation = useRef({ x: 0, y: 0, z: 0 })
  const ctaZone = useRef<RapierRigidBody>(null)

  const positionElementsIfNeeded = useCallback((row: RowData | undefined, rowZ: number) => {
    if (!row) return
    if (row.type !== 'cta') return

    const ctaZonePos = row.ctaZonePosition
    if (ctaZonePos && ctaZone.current) {
      const newZ = rowZ + ctaZonePos[2]
      translation.current.x = ctaZonePos[0]
      translation.current.y = ctaZonePos[1]
      translation.current.z = newZ
      ctaZone.current.setTranslation(translation.current, true)
    }
  }, [])

  const hideElementsIfNeeded = useCallback((row: RowData | undefined) => {
    if (!row) return
    if (row.type !== 'cta') return

    const shouldHideZone = !!row.ctaZonePosition

    if (shouldHideZone && ctaZone.current) {
      translation.current.x = 0
      translation.current.y = HIDE_POSITION_Y
      translation.current.z = HIDE_POSITION_Z
      ctaZone.current.setTranslation(translation.current, true)
    }
  }, [])

  const moveElements = useCallback((zStep: number) => {
    if (!!ctaZone.current) {
      const currentTranslation = ctaZone.current.translation()
      const newZ = currentTranslation.z + zStep
      translation.current.x = currentTranslation.x
      translation.current.y = currentTranslation.y
      translation.current.z = newZ
      ctaZone.current.setTranslation(translation.current, true)
    }
  }, [])

  useImperativeHandle(
    ref,
    () => ({
      moveElements,
      positionElementsIfNeeded,
      hideElementsIfNeeded,
    }),
    [moveElements, positionElementsIfNeeded, hideElementsIfNeeded],
  )

  useEffect(() => {
    onReadyChange(true)
    return () => {
      onReadyChange(false)
    }
  }, [onReadyChange])

  return (
    <>
      {/* TODO: introduce new InfoProjection element.
      // There is a trigger zone which works simiar to InfoZone but instead of showing a popup it presents the element in 3D space behind the zone.
        // You roll into it, and the camera position changes to look at the info.
    */}
      {/* <InfoZone
        key="cta-zone"
        ref={ctaZone}
        position={[0, HIDE_POSITION_Y, HIDE_POSITION_Z]}
        width={CTA_ZONE_WIDTH}
        height={CTA_ZONE_HEIGHT}
        infoContainerClassName="w-[328px] sm:w-[450px]"
        Icon={Trophy}>
        <CTATimeDisplay />
      </InfoZone> */}
    </>
  )
}

export default CTAElements
