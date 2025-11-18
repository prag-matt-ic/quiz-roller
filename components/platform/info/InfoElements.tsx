import { RapierRigidBody } from '@react-three/rapier'
import { type FC, type ReactNode, useCallback, useImperativeHandle, useRef } from 'react'
import { type RefObject } from 'react'
import { Mesh } from 'three'

import { Stage, useGameStore } from '@/components/GameProvider'
import { INFO_ZONE_HEIGHT, INFO_ZONE_WIDTH } from '@/utils/platform/infoSection'
import { HEADING_HEIGHT, HEADING_Y, HEADING_WIDTH } from '@/utils/platform/floatingHeading'
import { HIDE_POSITION_Y, HIDE_POSITION_Z, type RowData } from '@/utils/tiles'
import { InfoZone } from '@/components/infoZone/InfoZone'
import { GemIcon, InfoIcon } from 'lucide-react'
import { FloatingHeading } from '@/components/floatingHeading/FloatingHeading'
import Card from '@/components/ui/Card'
import { Credit } from '../home/Credit'
import GemModel from '@/components/collectible/GemModel'

export type InfoElementsHandle = {
  moveElements: (zStep: number) => void
  positionElementsIfNeeded: (row: RowData | undefined, rowZ: number) => void
  hideElementsIfNeeded: (row: RowData | undefined) => void
}

type Props = {
  ref: RefObject<InfoElementsHandle | null>
}

const INITIAL_INFO_POSITION = {
  Y: HEADING_Y,
  Z: -999,
} as const

const InfoElements: FC<Props> = ({ ref }) => {
  const translation = useRef({ x: 0, y: 0, z: 0 }) // reusable object for translations

  const heading = useRef<Mesh>(null)
  const collectible = useRef<RapierRigidBody>(null)
  const infoZone = useRef<RapierRigidBody>(null)
  const contentIndex = useGameStore((s) => s.infoContentIndex) // Content index is set in Platform when the info section row is raised.

  // Called when the row is raised
  const positionElementsIfNeeded = useCallback((row: RowData | undefined, rowZ: number) => {
    if (!row) return
    if (row.type !== 'info') return

    // Check for floating heading position
    const floatingHeadingPosition = row.floatingHeadingPosition
    if (!!floatingHeadingPosition && heading.current) {
      const newZ = rowZ + floatingHeadingPosition[2]

      heading.current.position.set(floatingHeadingPosition[0], floatingHeadingPosition[1], newZ)
    }

    // Check for info zone positions
    const infoZonePositions = row.infoZonePositions
    if (!!infoZonePositions) {
      // Position LEFT - index 0
      const collectiblePos = infoZonePositions[0]
      if (collectiblePos && collectible.current) {
        const newZ = rowZ + collectiblePos[2]
        translation.current.x = collectiblePos[0]
        translation.current.y = collectiblePos[1]
        translation.current.z = newZ
        collectible.current.setTranslation(translation.current, true)
      }

      // Position RIGHT - index 1
      const infoPos = infoZonePositions[1]
      if (infoPos && infoZone.current) {
        const newZ = rowZ + infoPos[2]
        translation.current.x = infoPos[0]
        translation.current.y = infoPos[1]
        translation.current.z = newZ
        infoZone.current.setTranslation(translation.current, true)
      }
    }
  }, [])

  // Called when the row is lowered
  const hideElementsIfNeeded = useCallback((row: RowData | undefined) => {
    if (!row) return
    if (row.type !== 'info') return

    const shouldHideHeading = !!row.floatingHeadingPosition
    const shouldHideInfoZone = row.infoZonePositions?.some((pos) => !!pos) === true

    if (shouldHideHeading && heading.current) {
      heading.current.position.z = HIDE_POSITION_Z
      heading.current.position.y = HIDE_POSITION_Y
    }

    if (shouldHideInfoZone) {
      if (collectible.current) {
        translation.current.z = HIDE_POSITION_Z
        translation.current.y = HIDE_POSITION_Y
        collectible.current.setTranslation(translation.current, true)
      }

      if (infoZone.current) {
        translation.current.z = HIDE_POSITION_Z
        translation.current.y = HIDE_POSITION_Y
        infoZone.current.setTranslation(translation.current, true)
      }
    }
  }, [])

  const moveElements = useCallback((zStep: number) => {
    if (!heading.current) return
    heading.current.position.z += zStep

    // Move collectible zone
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

  return (
    <>
      <FloatingHeading
        ref={heading}
        text={INFO_SECTION_CONTENT[contentIndex].heading}
        position={[0, INITIAL_INFO_POSITION.Y, INITIAL_INFO_POSITION.Z]}
        width={HEADING_WIDTH}
        height={HEADING_HEIGHT}
        activeStage={Stage.INFO}
      />

      <InfoZone
        key="collectible"
        ref={collectible}
        position={[0, HIDE_POSITION_Y, HIDE_POSITION_Z]}
        width={INFO_ZONE_WIDTH}
        height={INFO_ZONE_HEIGHT}
        infoContainerClassName="grid w-[328px] sm:w-168 grid-cols-1 md:grid-cols-5 gap-3 md:gap-4"
        Icon={GemIcon}
        isCollectible={true}
        contentIndex={contentIndex}
        gemModelSlot={<GemModel scale={0.08} />}/>

      <InfoZone
        key="info-zone"
        ref={infoZone}
        position={[0, HIDE_POSITION_Y, HIDE_POSITION_Z]}
        width={INFO_ZONE_WIDTH}
        height={INFO_ZONE_HEIGHT}
        infoContainerClassName="grid w-[328px] sm:w-168 grid-cols-1 md:grid-cols-5 gap-3 md:gap-4"
        Icon={InfoIcon}>
        {INFO_SECTION_CONTENT[contentIndex].infoZoneContent}
      </InfoZone>
    </>
  )
}

export default InfoElements

type InfoContent = {
  heading: string
  infoZoneContent: ReactNode
  isInfoOnLeft: boolean
}

export const INFO_SECTION_CONTENT: InfoContent[] = [
  {
    heading: 'We help you bring 3D to the browser without the bloat',
    infoZoneContent: (
      <>
        <Card className="w-full md:col-span-5" paletteIndex={0}>
          <h2 className="info-header">About</h2>
          <p className="paragraph-sm max-w-md">
            Quizroller is a proof of concept developed to showcase the potential of 3D web
            experiences for educational purposes.
            <br />
            <br />
            It&apos;s built using React Three Fiber, Rapier physics and WebGL for immersive
            graphics.
          </p>
        </Card>

        <Card className="w-full md:col-span-3" paletteIndex={0}>
          <h2 className="info-header">Partnerships</h2>
          <p className="paragraph-sm">
            Interested in launching your own immersive learning experience?
            <br />
            <br />
            <a href="mailto:pragmattic.ltd@gmail.com" className="underline underline-offset-2">
              Let&apos;s chat!
            </a>
          </p>
        </Card>

        <Card className="w-full md:col-span-2" paletteIndex={0}>
          <h2 className="info-header">Credits</h2>
          <Credit
            role="Lead Developer"
            name="Matthew Frawley"
            url="https://github.com/prag-matt-ic"
          />
          <Credit role="Support" name="Theo Walton" url="https://github.com/Void-vlk" />
        </Card>
      </>
    ),
    isInfoOnLeft: true,
  },
  {
    heading: 'Senior Three.js developers supercharged with AI capabilities',
    infoZoneContent: <></>,
    isInfoOnLeft: false,
  },
  { heading: 'Heading third!', infoZoneContent: <></>, isInfoOnLeft: true },
]
