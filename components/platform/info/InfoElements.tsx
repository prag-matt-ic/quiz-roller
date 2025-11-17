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
import {
  HEADER_FLOAT_HEIGHT,
  INFO_TEXT_HEIGHT,
  INFO_TEXT_WIDTH,
} from '@/utils/platform/infoSection'
import { HIDE_POSITION_Y, HIDE_POSITION_Z, MAX_Z, type RowData } from '@/utils/tiles'
import { InfoZone } from '@/components/infoZone/InfoZone'
import { InfoIcon } from 'lucide-react'
import { INFO_ZONE_HEIGHT, INFO_ZONE_WIDTH } from '@/utils/platform/homeSection'
import { FloatingHeader } from '@/components/FloatingHeader'
import Card from '@/components/ui/Card'
import { Credit } from '../home/HomeInfo'

export type InfoElementsHandle = {
  moveElements: (zStep: number) => void
  positionElementsIfNeeded: (row: RowData | undefined, rowZ: number) => void
  hideElementsIfNeeded: (row: RowData | undefined) => void
}

type Props = {
  ref: RefObject<InfoElementsHandle | null>
}

const INITIAL_INFO_POSITION = {
  Y: HEADER_FLOAT_HEIGHT,
  Z: -999,
} as const

// TODO: add InfoZone component.
const InfoElements: FC<Props> = ({ ref }) => {
  const translation = useRef({ x: 0, y: 0, z: 0 }) // reusable object for translations

  const infoText = useRef<Mesh>(null)
  const infoZone = useRef<RapierRigidBody>(null)
  const infoContentIndex = useGameStore((s) => s.infoContentIndex)
  const [contentIndex, setContentIndex] = useState<number>(0)

  const infoIsOutOfView = useRef<boolean>(false)

  // Called when the row is raised
  const positionElementsIfNeeded = useCallback(
    (row: RowData | undefined, rowZ: number) => {
      if (!row) return
      if (row.type !== 'info') return

      if (!!row.infoContentIndex && row.infoContentIndex !== contentIndex) {
        setContentIndex(row.infoContentIndex)
      }

      // Check for floating heading position
      const floatingHeadingPosition = row.floatingHeadingPosition
      if (!!floatingHeadingPosition && infoText.current) {
        const newZ = rowZ + floatingHeadingPosition[2]

        infoText.current.position.set(
          floatingHeadingPosition[0],
          floatingHeadingPosition[1],
          newZ,
        )
        infoIsOutOfView.current = false
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
        }
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

    if (!!infoZone.current) {
      translation.current.z = HIDE_POSITION_Z
      translation.current.y = HIDE_POSITION_Y
      infoZone.current.setTranslation(translation.current, true)
    }
  }, [])

  const moveElements = useCallback((zStep: number) => {
    if (!infoText.current) return
    const isInfoBehindCamera = infoText.current.position.z > MAX_Z + 10
    if (isInfoBehindCamera && !infoIsOutOfView.current) {
      infoText.current.position.z = HIDE_POSITION_Z
      infoText.current.position.y = HIDE_POSITION_Y
      infoIsOutOfView.current = true
    } else if (!infoIsOutOfView.current) {
      infoText.current.position.z += zStep
    }

    // Move info zone
    if (!!infoZone.current && !infoIsOutOfView.current) {
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
      <FloatingHeader
        ref={infoText}
        text={INFO_SECTION_CONTENT[contentIndex].heading}
        position={[0, INITIAL_INFO_POSITION.Y, INITIAL_INFO_POSITION.Z]}
        width={INFO_TEXT_WIDTH}
        height={INFO_TEXT_HEIGHT}
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
