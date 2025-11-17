import { RapierRigidBody } from '@react-three/rapier'
import { type FC, type ReactNode, useCallback, useImperativeHandle, useRef } from 'react'
import { type RefObject } from 'react'
import { Mesh } from 'three'

import { useGameStore } from '@/components/GameProvider'
import { INFO_ZONE_HEIGHT, INFO_ZONE_WIDTH } from '@/utils/platform/infoSection'
import { HEADING_HEIGHT, HEADING_Y, HEADING_WIDTH } from '@/utils/platform/floatingHeading'
import { HIDE_POSITION_Y, HIDE_POSITION_Z, type RowData } from '@/utils/tiles'
import { InfoZone } from '@/components/infoZone/InfoZone'
import { InfoIcon } from 'lucide-react'
import { FloatingHeading } from '@/components/FloatingHeading'
import Card from '@/components/ui/Card'
import { Credit } from '../home/Credit'

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
  const infoZone = useRef<RapierRigidBody>(null)
  const contentIndex = useGameStore((s) => s.infoContentIndex) // Content index is set in Platform when the info section row is raised.

  // const infoIsOutOfView = useRef<boolean>(false)

  // Called when the row is raised
  const positionElementsIfNeeded = useCallback((row: RowData | undefined, rowZ: number) => {
    if (!row) return
    if (row.type !== 'info') return

    // Check for floating heading position
    const floatingHeadingPosition = row.floatingHeadingPosition
    if (!!floatingHeadingPosition && heading.current) {
      const newZ = rowZ + floatingHeadingPosition[2]

      heading.current.position.set(floatingHeadingPosition[0], floatingHeadingPosition[1], newZ)
      console.warn('[InfoElements] Positioned heading', {
        contentIndex: row.infoContentIndex,
        position: heading.current.position,
      })
      // infoIsOutOfView.current = false
    }

    // Check for info zone positions
    const infoZonePositions = row.infoZonePositions
    if (!!infoZonePositions && infoZone.current) {
      const zonePos = infoZonePositions[0]
      if (zonePos) {
        const newZ = rowZ + zonePos[2]

        translation.current.x = zonePos[0]
        translation.current.y = zonePos[1]
        translation.current.z = newZ
        infoZone.current.setTranslation(translation.current, true)
        console.warn('[InfoElements] Positioned info zone', {
          contentIndex: row.infoContentIndex,
          translation: { ...translation.current },
        })
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
      console.warn('[InfoElements] Hid heading', {
        contentIndex: row.infoContentIndex,
        position: heading.current.position,
      })
    }

    if (shouldHideInfoZone && infoZone.current) {
      translation.current.z = HIDE_POSITION_Z
      translation.current.y = HIDE_POSITION_Y
      infoZone.current.setTranslation(translation.current, true)
      console.warn('[InfoElements] Hid info zone', {
        contentIndex: row.infoContentIndex,
        translation: { ...translation.current },
      })
    }
  }, [])

  const moveElements = useCallback((zStep: number) => {
    if (!heading.current) return
    heading.current.position.z += zStep

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
      />

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

      {/* TODO: add collectible */}
    </>
  )
}

export default InfoElements

type InfoContent = {
  heading: string
  infoZoneContent: ReactNode
  // collectible?
}

const INFO_SECTION_CONTENT: InfoContent[] = [
  {
    heading: 'Heading first!',
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
  },
  { heading: 'Heading second!', infoZoneContent: <></> },
  { heading: 'Heading third!', infoZoneContent: <></> },
]
