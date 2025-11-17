import { RapierRigidBody } from '@react-three/rapier'
import {
  BadgeQuestionMarkIcon,
  FlagIcon,
  GemIcon,
  InfoIcon,
  TrendingUpIcon,
} from 'lucide-react'
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
import { InfoZone } from '@/components/infoZone/InfoZone'
import FlatImage from '@/components/platform/home/FlatImage'
import { Credit } from '@/components/platform/home/HomeInfo'
import Card from '@/components/ui/Card'
import { INFO_ZONE_HEIGHT, INFO_ZONE_WIDTH } from '@/utils/platform/homeSection'
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

  const [infoZoneRefs] = useState(Array.from({ length: 2 }, () => createRef<RapierRigidBody>()))

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

        const infoZonePlacements = row.infoZonePositions
        if (!!infoZonePlacements) {
          for (
            let index = 0;
            index < infoZonePlacements.length && index < infoZoneRefs.length;
            index++
          ) {
            const placement = infoZonePlacements[index]
            if (!placement) continue

            const infoZoneRef = infoZoneRefs[index]
            if (!infoZoneRef.current) continue

            translation.current.x = placement[0]
            translation.current.y = placement[1]
            translation.current.z = placement[2] + rowZ
            infoZoneRef.current.setTranslation(translation.current, true)
          }
        }
      })
    }

    positionElements(rowsData.current)
  }, [infoZoneRefs, rowsData])

  const moveElements = useCallback(
    (zStep: number) => {
      if (!!image.current) {
        const nextZ = image.current.position.z + zStep
        image.current.position.z = nextZ
      }

      for (const infoZoneRef of infoZoneRefs) {
        if (!infoZoneRef.current) continue

        const currentTranslation = infoZoneRef.current.translation()
        const nextZ = currentTranslation.z + zStep
        translation.current.x = currentTranslation.x
        translation.current.y = currentTranslation.y

        translation.current.z = nextZ
        infoZoneRef.current.setTranslation(translation.current, true)
      }
    },
    [infoZoneRefs],
  )

  useImperativeHandle(ref, () => {
    return {
      moveElements,
    }
  }, [moveElements])

  const paletteIndex = useGameStore((s) => s.paletteIndex)

  return (
    <>
      <FlatImage ref={image} image={startArrow} height={HEIGHT} width={WIDTH} />

      {/* <InfoZone
        key="info-zone-1"
        ref={infoZoneRefs[0]}
        position={[0, HIDE_POSITION_Y, HIDE_POSITION_Z]}
        width={INFO_ZONE_WIDTH}
        height={INFO_ZONE_HEIGHT}
        infoContainerClassName="grid w-[328px] sm:w-168 grid-cols-1 md:grid-cols-5 gap-3 md:gap-4"
        Icon={InfoIcon}>
        <>
          <Card className="w-full md:col-span-5" paletteIndex={paletteIndex}>
            <h2 className={headingClasses}>About</h2>
            <p className="paragraph-sm max-w-md">
              Quizroller is a proof of concept developed to showcase the potential of 3D web
              experiences for educational purposes.
              <br />
              <br />
              It&apos;s built using React Three Fiber, Rapier physics and WebGL for immersive
              graphics.
            </p>
          </Card>

          <Card className="w-full md:col-span-3" paletteIndex={paletteIndex}>
            <h2 className={headingClasses}>Partnerships</h2>
            <p className="paragraph-sm">
              Interested in launching your own immersive learning experience?
              <br />
              <br />
              <a
                href="mailto:pragmattic.ltd@gmail.com"
                className="underline underline-offset-2">
                Let&apos;s chat!
              </a>
            </p>
          </Card>

          <Card className="w-full md:col-span-2" paletteIndex={paletteIndex}>
            <h2 className={headingClasses}>Credits</h2>
            <Credit
              role="Lead Developer"
              name="Matthew Frawley"
              url="https://github.com/prag-matt-ic"
            />
            <Credit role="Support" name="Theo Walton" url="https://github.com/Void-vlk" />
          </Card>
        </>
      </InfoZone>

      <InfoZone
        key="info-zone-2"
        // eslint-disable-next-line react-hooks/refs
        ref={infoZoneRefs[1]}
        position={[0, HIDE_POSITION_Y, HIDE_POSITION_Z]}
        width={INFO_ZONE_WIDTH}
        height={INFO_ZONE_HEIGHT}
        infoContainerClassName="grid w-[328px] sm:w-160 grid-rows-auto sm:grid-cols-3 gap-3 sm:gap-4"
        Icon={FlagIcon}>
        <>
          <Card className="sm:col-span-3" paletteIndex={paletteIndex}>
            <h2 className="text-xl font-bold text-black">Your Mission</h2>
            <p className="paragraph font-semibold">
              As the Innovation Orb, your mission is to master critical skills for building
              tomorrow&apos;s digital experiences.
              <br />
              <br />
              <span className="font-extrabold italic">How far can you roll?</span>
            </p>
          </Card>

          <Card
            className="col-span-1"
            childrenClassName="flex-row sm:flex-col"
            paletteIndex={paletteIndex}>
            <BadgeQuestionMarkIcon className="mb-1 size-5 sm:size-7" />
            <p className="paragraph-sm font-semibold">Test your knowledge on UX/UI and AI</p>
          </Card>

          <Card
            className="col-span-1"
            childrenClassName="flex-row sm:flex-col"
            paletteIndex={paletteIndex}>
            <GemIcon className="mb-1 size-5 sm:size-7" strokeWidth={1.5} />
            <p className="paragraph-sm font-semibold">
              Each correct answer unlocks fragments of the future web!
            </p>
          </Card>
          <Card
            className="col-span-1"
            childrenClassName="flex-row sm:flex-col"
            paletteIndex={paletteIndex}>
            <TrendingUpIcon className="mb-1 size-5 sm:size-7" />
            <p className="paragraph-sm font-semibold">
              Questions increase in difficulty the further you roll
            </p>
          </Card>
        </>
      </InfoZone> */}
    </>
  )
}

export default HomeElements
