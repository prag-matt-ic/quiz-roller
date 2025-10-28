import { RapierRigidBody } from '@react-three/rapier'
import { FlagIcon, InfoIcon } from 'lucide-react'
import React, { createRef, type FC, useCallback, useImperativeHandle, useRef } from 'react'
import { type RefObject } from 'react'
import { Group, Mesh } from 'three'

import { AnswerTile } from '@/components/answerTile/AnswerTile'
import ColourPicker from '@/components/colourPicker/ColourPicker'
import { useGameStore } from '@/components/GameProvider'
import { InfoZone } from '@/components/infoZone/InfoZone'
import { Text } from '@/components/Text'
import { Topic, type TopicUserData } from '@/model/schema'
import {
  COLOUR_TILE_OPTIONS,
  INFO_ZONE_HEIGHT,
  INFO_ZONE_WIDTH,
  TEXT_HEIGHT,
  TEXT_WIDTH,
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

const TOPIC_USER_DATA: [TopicUserData, TopicUserData] = [
  {
    type: 'topic',
    topic: Topic.UX_UI_DESIGN,
  },
  {
    type: 'topic',
    topic: Topic.ARTIFICIAL_INTELLIGENCE,
  },
] as const

const headingClasses = 'text-xl lg:text-2xl font-bold text-black'

export type HomeElementsHandle = {
  moveElements: (zStep: number) => void
  positionElements: (rowData: RowData[]) => void
}

type Props = {
  ref: RefObject<HomeElementsHandle | null>
}

const HomeElements: FC<Props> = ({ ref }) => {
  const confirmingTopic = useGameStore((s) => s.confirmingTopic)
  const isConfirmingDesign = confirmingTopic?.topic === Topic.UX_UI_DESIGN
  const isConfirmingAI = confirmingTopic?.topic === Topic.ARTIFICIAL_INTELLIGENCE

  const topicText = useRef<Mesh | null>(null)
  const topicAnswerRefs = useRef(
    Array.from({ length: TOPIC_USER_DATA.length }, () => createRef<RapierRigidBody>()),
  ).current

  const logo = useRef<Group>(null)

  const colourPickerOptions = useRef(
    COLOUR_TILE_OPTIONS.map(() => createRef<RapierRigidBody>()),
  ).current

  const infoZoneRefs = useRef(
    Array.from({ length: 2 }, () => createRef<RapierRigidBody>()),
  ).current

  const translation = useRef({ x: 0, y: 0, z: 0 })
  const skipFutureMoves = useRef(false)

  const positionElements = useCallback(
    (rowData: RowData[]) => {
      skipFutureMoves.current = false

      rowData.forEach((row, rowIndex) => {
        if (row.type !== 'home') return
        const rowZ = -rowIndex * TILE_SIZE + INITIAL_ROWS_Z_OFFSET

        const answerPositions = row.answerTilePositions
        if (!!answerPositions) {
          for (
            let index = 0;
            index < answerPositions.length && index < topicAnswerRefs.length;
            index++
          ) {
            const position = answerPositions[index]
            if (!position) continue

            const answerRef = topicAnswerRefs[index]
            if (!answerRef.current) continue

            translation.current.x = position[0]
            translation.current.y = position[1]
            translation.current.z = position[2] + rowZ
            answerRef.current.setTranslation(translation.current, true)
          }
        }

        const textPosition = row.questionTextPosition
        if (!!textPosition && !!topicText.current) {
          topicText.current.position.set(
            textPosition[0],
            textPosition[1],
            textPosition[2] + rowZ,
          )
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
    },
    [colourPickerOptions, infoZoneRefs, topicAnswerRefs],
  )

  const maxZ = MAX_Z + INITIAL_ROWS_Z_OFFSET

  const moveElements = useCallback(
    (zStep: number) => {
      if (skipFutureMoves.current) return

      for (const topicAnswerRef of topicAnswerRefs) {
        if (!topicAnswerRef.current) continue

        const currentTranslation = topicAnswerRef.current.translation()
        const nextZ = currentTranslation.z + zStep
        translation.current.x = currentTranslation.x
        translation.current.y = currentTranslation.y

        if (nextZ > maxZ) {
          translation.current.y = HIDE_POSITION_Y
          translation.current.z = HIDE_POSITION_Z
          topicAnswerRef.current.setTranslation(translation.current, false)
          skipFutureMoves.current = true
          continue
        }

        translation.current.z = nextZ
        topicAnswerRef.current.setTranslation(translation.current, true)
      }

      if (!!topicText.current) {
        const nextZ = topicText.current.position.z + zStep
        if (nextZ > maxZ) {
          topicText.current.position.z = HIDE_POSITION_Z
          topicText.current.position.y = HIDE_POSITION_Y
        } else {
          topicText.current.position.z = nextZ
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
    [colourPickerOptions, infoZoneRefs, maxZ, topicAnswerRefs],
  )

  useImperativeHandle(ref, () => {
    return {
      moveElements,
      positionElements,
    }
  }, [moveElements, positionElements])

  const playerColourIndex = useGameStore((s) => s.colourIndex)

  return (
    <>
      {topicAnswerRefs.map((topicRef, index) => (
        <AnswerTile
          key={`topic-answer-${index}`}
          ref={topicRef}
          position={[0, HIDE_POSITION_Y, HIDE_POSITION_Z]}
          text={index === 0 ? Topic.UX_UI_DESIGN : Topic.ARTIFICIAL_INTELLIGENCE}
          userData={TOPIC_USER_DATA[index]}
          isConfirming={index === 0 ? isConfirmingDesign : isConfirmingAI}
          wasConfirmed={false}
          wasCorrect={false}
        />
      ))}

      <Text
        ref={topicText}
        text="Roll over a topic to begin"
        position={[0, HIDE_POSITION_Y, HIDE_POSITION_Z]}
        width={TEXT_WIDTH}
        height={TEXT_HEIGHT}
      />

      <Logo ref={logo} />

      <ColourPicker options={COLOUR_TILE_OPTIONS} optionRefs={colourPickerOptions} />

      <InfoZone
        key="info-zone-1"
        ref={infoZoneRefs[0]}
        position={[0, HIDE_POSITION_Y, HIDE_POSITION_Z]}
        width={INFO_ZONE_WIDTH}
        height={INFO_ZONE_HEIGHT}
        infoContainerClassName="grid w-168 grid-cols-5 gap-4"
        Icon={InfoIcon}>
        <>
          <Card className="col-span-5" playerColourIndex={playerColourIndex}>
            <h2 className={headingClasses}>About</h2>
            <p className="paragraph max-w-lg">
              Quizroller is a proof of concept game developed to showcase the potential of 3D
              web experiences for educational purposes.
              <br />
              <br />
              We believe that the future of learning should be as fun and engaging as playing a
              game!
            </p>
          </Card>

          <Card className="col-span-3" playerColourIndex={playerColourIndex}>
            <h2 className={headingClasses}>Partnerships</h2>
            <p className="paragraph-sm">
              Interested in sponsoring development or exploring a bespoke learning experience?
              Let&apos;s chat:{' '}
              <a
                href="mailto:pragmattic.ltd@gmail.com"
                className="underline underline-offset-2">
                pragmattic.ltd@gmail.com
              </a>
            </p>
          </Card>

          <Card className="col-span-2" playerColourIndex={playerColourIndex}>
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
        infoContainerClassName="grid w-168 grid-cols-3 gap-4"
        Icon={FlagIcon}>
        <>
          <Card className="col-span-3" playerColourIndex={playerColourIndex}>
            <h2 className="text-xl font-bold text-black">Your Mission</h2>
            <p className="paragraph">
              As the Innovation Orb, your goal is to master critical skills for building
              tomorrow&apos;s digital experiences.
              <br />
              {/* MISSION.... */}
              <br />
              <span className="font-extrabold">How far can you roll?</span>
            </p>
          </Card>

          <Card className="col-span-1" playerColourIndex={playerColourIndex}>
            [Image]
            <p className="paragraph-sm">Confirm a topic by rolling over the tile. </p>
          </Card>
          <Card className="col-span-1" playerColourIndex={playerColourIndex}>
            <p className="paragraph-sm">
              [Image] Each correct answer unlocks fragments of the future web.
            </p>
          </Card>
          <Card className="col-span-1" playerColourIndex={playerColourIndex}>
            <p className="paragraph-sm">
              [Image] Questions will challenge your knowledge and increase in difficulty.
            </p>
          </Card>
        </>
      </InfoZone>
    </>
  )
}

export default HomeElements
