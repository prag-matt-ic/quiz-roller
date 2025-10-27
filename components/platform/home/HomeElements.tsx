import { RapierRigidBody } from '@react-three/rapier'
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
  COLOUR_TILE_TEXT_RELATIVE_Z,
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
  ON_TILE_Y,
  RowData,
  TILE_SIZE,
} from '@/utils/tiles'

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
]

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

  const colourPickerText = useRef<Mesh>(null)
  const colourPickerOptionRefs = useRef(
    COLOUR_TILE_OPTIONS.map(() => createRef<RapierRigidBody>()),
  ).current

  const infoZone = useRef<RapierRigidBody>(null)

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

        const infoZonePlacement = row.infoZonePosition
        if (!!infoZonePlacement && !!infoZone.current) {
          translation.current.x = infoZonePlacement[0]
          translation.current.y = infoZonePlacement[1]
          translation.current.z = infoZonePlacement[2] + rowZ
          infoZone.current.setTranslation(translation.current, true)
        }

        const colourPickerPlacement = row.colourPickerPosition
        if (!colourPickerPlacement) return

        const baseZ = colourPickerPlacement[2] + rowZ

        for (let index = 0; index < COLOUR_TILE_OPTIONS.length; index++) {
          const optionRef = colourPickerOptionRefs[index]
          const option = COLOUR_TILE_OPTIONS[index]
          if (!optionRef?.current) continue

          translation.current.x = option.position[0]
          translation.current.y = option.position[1]
          translation.current.z = baseZ + option.relativeZ
          optionRef.current.setTranslation(translation.current, true)
        }

        if (colourPickerText.current) {
          colourPickerText.current.position.set(
            0,
            ON_TILE_Y,
            baseZ + COLOUR_TILE_TEXT_RELATIVE_Z,
          )
        }
      })
    },
    [colourPickerOptionRefs, infoZone, topicAnswerRefs],
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

      if (!!colourPickerText.current) {
        const nextZ = colourPickerText.current.position.z + zStep
        if (nextZ > maxZ) {
          colourPickerText.current.position.z = HIDE_POSITION_Z
          colourPickerText.current.position.y = HIDE_POSITION_Y
        } else {
          colourPickerText.current.position.z = nextZ
        }
      }

      for (const optionRef of colourPickerOptionRefs) {
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

      if (!!infoZone.current) {
        const currentTranslation = infoZone.current.translation()
        const nextZ = currentTranslation.z + zStep
        translation.current.x = currentTranslation.x
        translation.current.y = currentTranslation.y

        if (nextZ > maxZ) {
          translation.current.y = HIDE_POSITION_Y
          translation.current.z = HIDE_POSITION_Z
          infoZone.current.setTranslation(translation.current, false)
        } else {
          translation.current.z = nextZ
          infoZone.current.setTranslation(translation.current, true)
        }
      }
    },
    [colourPickerOptionRefs, infoZone, maxZ, topicAnswerRefs],
  )

  useImperativeHandle(ref, () => {
    return {
      moveElements,
      positionElements,
    }
  }, [moveElements, positionElements])

  return (
    <>
      <Text
        ref={topicText}
        text="Roll over a topic to begin"
        position={[0, HIDE_POSITION_Y, HIDE_POSITION_Z]}
        width={TEXT_WIDTH}
        height={TEXT_HEIGHT}
      />
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
      <Logo ref={logo} />

      <ColourPicker
        options={COLOUR_TILE_OPTIONS}
        optionRefs={colourPickerOptionRefs}
        textRef={colourPickerText}
      />

      <InfoZone
        ref={infoZone}
        position={[0, HIDE_POSITION_Y, HIDE_POSITION_Z]}
        width={INFO_ZONE_WIDTH}
        height={INFO_ZONE_HEIGHT}
        infoContainerClassName="space-y-3">
        <h2 className="text-xl font-black text-black">Welcome</h2>
        <p>This is some intro content placeholder</p>
      </InfoZone>
    </>
  )
}

export default HomeElements
