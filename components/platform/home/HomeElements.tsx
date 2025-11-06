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
} from 'react'
import { Group } from 'three'

import { AnswerTile } from '@/components/answerTile/AnswerTile'
import ColourPicker from '@/components/colourPicker/ColourPicker'
import { useGameStore } from '@/components/GameProvider'
import { InfoZone } from '@/components/infoZone/InfoZone'
import { type StartUserData } from '@/model/schema'
import {
  COLOUR_TILE_OPTIONS,
  HOME_ANSWER_TILE_HEIGHT,
  HOME_ANSWER_TILE_WIDTH,
  INFO_ZONE_HEIGHT,
  INFO_ZONE_WIDTH,
} from '@/utils/platform/homeSection'
import {
  HIDE_POSITION_Y,
  HIDE_POSITION_Z,
  INITIAL_ROWS_Z_OFFSET,
  MAX_Z,
  type RowData,
  TILE_SIZE,
} from '@/utils/tiles'

import { Card, Credit } from './HomeInfo'
import Logo from './Logo'

const START_TILE_USER_DATA: StartUserData = {
  type: 'start',
}

const headingClasses = 'text-xl lg:text-2xl font-bold text-black'

export type HomeElementsHandle = {
  moveElements: (zStep: number) => void
}

type Props = {
  ref: RefObject<HomeElementsHandle | null>
  rowsData: RefObject<RowData[]>
}

const HomeElements: FC<Props> = ({ ref, rowsData }) => {
  const confirmingStart = useGameStore((s) => s.confirmingStart)
  const isConfirmingStart = Boolean(confirmingStart)

  const startTile = useRef<RapierRigidBody | null>(null)

  const logo = useRef<Group>(null)

  const colourPickerOptions = useRef(
    COLOUR_TILE_OPTIONS.map(() => createRef<RapierRigidBody>()),
  ).current

  const infoZoneRefs = useRef(
    Array.from({ length: 2 }, () => createRef<RapierRigidBody>()),
  ).current

  const translation = useRef({ x: 0, y: 0, z: 0 })
  const ignoreMoves = useRef(false)
  const maxZ = MAX_Z + INITIAL_ROWS_Z_OFFSET

  useEffect(() => {
    const positionElements = (rowData: RowData[]) => {
      ignoreMoves.current = false

      rowData.forEach((row, rowIndex) => {
        if (row.type !== 'home') return
        const rowZ = -rowIndex * TILE_SIZE + INITIAL_ROWS_Z_OFFSET

        const answerPosition = row.answerTilePositions?.[0]
        if (!!answerPosition && !!startTile.current) {
          translation.current.x = answerPosition[0]
          translation.current.y = answerPosition[1]
          translation.current.z = answerPosition[2] + rowZ
          startTile.current.setTranslation(translation.current, true)
        }

        const logoPosition = row.logoPosition
        if (!!logoPosition && !!logo.current) {
          logo.current.position.set(logoPosition[0], logoPosition[1], logoPosition[2] + rowZ)
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

        const colourPickerPlacement = row.colourPickerPosition
        if (!colourPickerPlacement) return

        const baseZ = colourPickerPlacement[2] + rowZ

        for (let index = 0; index < COLOUR_TILE_OPTIONS.length; index++) {
          const optionRef = colourPickerOptions[index]
          const option = COLOUR_TILE_OPTIONS[index]
          if (!optionRef?.current) continue

          translation.current.x = option.position[0]
          translation.current.y = option.position[1]
          translation.current.z = baseZ + option.relativeZ
          optionRef.current.setTranslation(translation.current, true)
        }
      })
    }

    positionElements(rowsData.current)
  }, [])

  const moveElements = useCallback(
    (zStep: number) => {
      if (ignoreMoves.current) return

      if (!!startTile.current) {
        const currentTranslation = startTile.current.translation()
        const nextZ = currentTranslation.z + zStep
        translation.current.x = currentTranslation.x
        translation.current.y = currentTranslation.y

        if (nextZ > maxZ) {
          translation.current.y = HIDE_POSITION_Y
          translation.current.z = HIDE_POSITION_Z
          startTile.current.setTranslation(translation.current, false)
          ignoreMoves.current = true
        } else {
          translation.current.z = nextZ
          startTile.current.setTranslation(translation.current, true)
        }
      }

      if (!!logo.current) {
        const nextZ = logo.current.position.z + zStep
        if (nextZ > maxZ) {
          logo.current.position.z = HIDE_POSITION_Z
          logo.current.position.y = HIDE_POSITION_Y
        } else {
          logo.current.position.z = nextZ
        }
      }

      for (const optionRef of colourPickerOptions) {
        if (!optionRef.current) continue
        const currentTranslation = optionRef.current.translation()
        const nextZ = currentTranslation.z + zStep
        translation.current.x = currentTranslation.x
        translation.current.y = currentTranslation.y

        if (nextZ > maxZ) {
          translation.current.y = HIDE_POSITION_Y
          translation.current.z = HIDE_POSITION_Z
          optionRef.current.setTranslation(translation.current, false)
          continue
        }

        translation.current.z = nextZ
        optionRef.current.setTranslation(translation.current, true)
      }

      for (const infoZoneRef of infoZoneRefs) {
        if (!infoZoneRef.current) continue

        const currentTranslation = infoZoneRef.current.translation()
        const nextZ = currentTranslation.z + zStep
        translation.current.x = currentTranslation.x
        translation.current.y = currentTranslation.y

        if (nextZ > maxZ) {
          translation.current.y = HIDE_POSITION_Y
          translation.current.z = HIDE_POSITION_Z
          infoZoneRef.current.setTranslation(translation.current, false)
          continue
        }

        translation.current.z = nextZ
        infoZoneRef.current.setTranslation(translation.current, true)
      }
    },
    [colourPickerOptions, infoZoneRefs, maxZ],
  )

  useImperativeHandle(ref, () => {
    return {
      moveElements,
    }
  }, [moveElements])

  const playerColourIndex = useGameStore((s) => s.colourIndex)

  return (
    <>
      <AnswerTile
        ref={startTile}
        position={[0, HIDE_POSITION_Y, HIDE_POSITION_Z]}
        text="Roll over to start"
        userData={START_TILE_USER_DATA}
        width={HOME_ANSWER_TILE_WIDTH}
        height={HOME_ANSWER_TILE_HEIGHT}
        isConfirming={isConfirmingStart}
        wasConfirmed={false}
        wasCorrect={false}
      />

      <Logo ref={logo} />

      <ColourPicker options={COLOUR_TILE_OPTIONS} optionRefs={colourPickerOptions} />

      <InfoZone
        key="info-zone-1"
        ref={infoZoneRefs[0]}
        position={[0, HIDE_POSITION_Y, HIDE_POSITION_Z]}
        width={INFO_ZONE_WIDTH}
        height={INFO_ZONE_HEIGHT}
        infoContainerClassName="grid w-168 grid-cols-1 md:grid-cols-5 gap-3 md:gap-4"
        Icon={InfoIcon}>
        <>
          <Card className="md:col-span-5" playerColourIndex={playerColourIndex}>
            <h2 className={headingClasses}>About</h2>
            <p className="paragraph-sm max-w-lg">
              Quizroller is a proof of concept developed to showcase the potential of 3D web
              experiences for educational purposes.
              <br />
              <br />
              We believe that learning should be as fun and engaging as playing a game!
            </p>
          </Card>

          <Card className="md:col-span-3" playerColourIndex={playerColourIndex}>
            <h2 className={headingClasses}>Partnerships</h2>
            <p className="paragraph-sm">
              Interested in launching your own bespoke interactive learning experience?
              <br />
              <br />
              <a
                href="mailto:pragmattic.ltd@gmail.com"
                className="underline underline-offset-2">
                Let&apos;s chat!
              </a>
            </p>
          </Card>

          <Card className="md:col-span-2" playerColourIndex={playerColourIndex}>
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
        ref={infoZoneRefs[1]}
        position={[0, HIDE_POSITION_Y, HIDE_POSITION_Z]}
        width={INFO_ZONE_WIDTH}
        height={INFO_ZONE_HEIGHT}
        infoContainerClassName="grid w-160 grid-cols-3 gap-4"
        Icon={FlagIcon}>
        <>
          <Card className="col-span-3" playerColourIndex={playerColourIndex}>
            <h2 className="text-xl font-bold text-black">Your Mission</h2>
            <p className="paragraph font-semibold">
              As the Innovation Orb, your mission is to master critical skills for building
              tomorrow&apos;s digital experiences.
              <br />
              <br />
              <span className="font-extrabold italic">How far can you roll?</span>
            </p>
          </Card>

          <Card className="col-span-1" playerColourIndex={playerColourIndex}>
            <BadgeQuestionMarkIcon className="mb-1 size-5 sm:size-7" />
            <p className="paragraph-sm font-semibold">Test your knowledge on UX/UI and AI</p>
          </Card>

          <Card className="col-span-1" playerColourIndex={playerColourIndex}>
            <GemIcon className="mb-1 size-5 sm:size-7" strokeWidth={1.5} />
            <p className="paragraph-sm font-semibold">
              Each correct answer unlocks fragments of the future web!
            </p>
          </Card>
          <Card className="col-span-1" playerColourIndex={playerColourIndex}>
            <TrendingUpIcon className="mb-1 size-5 sm:size-7" />
            <p className="paragraph-sm font-semibold">
              Questions increase in difficulty the further you roll
            </p>
          </Card>
        </>
      </InfoZone>
    </>
  )
}

export default HomeElements
