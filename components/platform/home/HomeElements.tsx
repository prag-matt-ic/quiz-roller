import { RapierRigidBody } from '@react-three/rapier'
import React, { createRef, type FC, useCallback, useImperativeHandle, useRef } from 'react'
import { type RefObject } from 'react'
import { Group, Mesh } from 'three'

import { AnswerTile } from '@/components/answerTile/AnswerTile'
import ColourPicker from '@/components/colourPicker/ColourPicker'
import { useGameStore } from '@/components/GameProvider'
import { Text } from '@/components/Text'
import { Topic, type TopicUserData } from '@/model/schema'
import {
  COLOUR_TILE_OPTIONS,
  COLOUR_TILE_TEXT_RELATIVE_Z,
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

const LOG_PREFIX = '[HomeElements]'

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

  const translation = useRef({ x: 0, y: 0, z: 0 })

  const positionElements = useCallback(
    (rowData: RowData[]) => {
      console.log(`${LOG_PREFIX} positionElements called with ${rowData.length} rows`)

      rowData.forEach((row, rowIndex) => {
        if (row.type !== 'home') return
        const rowZ = -rowIndex * TILE_SIZE + INITIAL_ROWS_Z_OFFSET

        console.log(`${LOG_PREFIX} positioning home row ${rowIndex} with rowZ ${rowZ}`)

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
            if (!answerRef.current) {
              console.warn(`${LOG_PREFIX} topicAnswerRef[${index}] missing during positioning`)
              continue
            }

            translation.current.x = position[0]
            translation.current.y = position[1]
            translation.current.z = position[2] + rowZ
            answerRef.current.setTranslation(translation.current, true)

            console.log(
              `${LOG_PREFIX} positioned topicAnswer[${index}] at [${translation.current.x}, ${translation.current.y}, ${translation.current.z}]`,
            )
          }
        }

        const textPosition = row.topicTextPosition
        if (!!textPosition && !!topicText.current) {
          topicText.current.position.set(
            textPosition[0],
            textPosition[1],
            textPosition[2] + rowZ,
          )

          console.log(
            `${LOG_PREFIX} topic text moved to [${topicText.current.position.x}, ${topicText.current.position.y}, ${topicText.current.position.z}]`,
          )
        } else if (!!textPosition) {
          console.warn(`${LOG_PREFIX} topicText ref missing when positioning text`)
        }

        const logoPosition = row.logoPosition
        if (!!logoPosition && !!logo.current) {
          logo.current.position.set(logoPosition[0], logoPosition[1], logoPosition[2] + rowZ)

          console.log(
            `${LOG_PREFIX} logo moved to [${logo.current.position.x}, ${logo.current.position.y}, ${logo.current.position.z}]`,
          )
        } else if (!!logoPosition) {
          console.warn(`${LOG_PREFIX} logo ref missing when positioning logo`)
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

          console.log(
            `${LOG_PREFIX} colour option[${index}] positioned at [${translation.current.x}, ${translation.current.y}, ${translation.current.z}]`,
          )
        }

        if (colourPickerText.current) {
          colourPickerText.current.position.set(
            0,
            ON_TILE_Y,
            baseZ + COLOUR_TILE_TEXT_RELATIVE_Z,
          )

          console.log(
            `${LOG_PREFIX} colour picker text moved to [${colourPickerText.current.position.x}, ${colourPickerText.current.position.y}, ${colourPickerText.current.position.z}]`,
          )
        } else {
          console.warn(`${LOG_PREFIX} colourPickerText ref missing when positioning text`)
        }
      })
    },
    [colourPickerOptionRefs, topicAnswerRefs],
  )

  const moveElements = useCallback(
    (zStep: number) => {
      console.log(`${LOG_PREFIX} moveElements called with zStep ${zStep}`)

      for (const topicAnswerRef of topicAnswerRefs) {
        if (!topicAnswerRef.current) continue

        const currentTranslation = topicAnswerRef.current.translation()
        const nextZ = currentTranslation.z + zStep
        translation.current.x = currentTranslation.x
        translation.current.y = currentTranslation.y

        if (nextZ > MAX_Z) {
          translation.current.y = HIDE_POSITION_Y
          translation.current.z = HIDE_POSITION_Z
          topicAnswerRef.current.setTranslation(translation.current, false)
          console.log(`${LOG_PREFIX} hid topic answer at indices [${currentTranslation.x}, ${currentTranslation.y}, ${currentTranslation.z}]`)
          continue
        }

        translation.current.z = nextZ
        topicAnswerRef.current.setTranslation(translation.current, true)
        console.log(
          `${LOG_PREFIX} moved topic answer to [${translation.current.x}, ${translation.current.y}, ${translation.current.z}]`,
        )
      }

      if (!!topicText.current) {
        const nextZ = topicText.current.position.z + zStep
        if (nextZ > MAX_Z) {
          topicText.current.position.z = HIDE_POSITION_Z
          topicText.current.position.y = HIDE_POSITION_Y
          console.log(`${LOG_PREFIX} hid topic text`)
        } else {
          topicText.current.position.z = nextZ
          console.log(
            `${LOG_PREFIX} moved topic text to [${topicText.current.position.x}, ${topicText.current.position.y}, ${topicText.current.position.z}]`,
          )
        }
      }

      if (!!logo.current) {
        const nextZ = logo.current.position.z + zStep
        if (nextZ > MAX_Z) {
          logo.current.position.z = HIDE_POSITION_Z
          logo.current.position.y = HIDE_POSITION_Y
          console.log(`${LOG_PREFIX} hid logo`)
        } else {
          logo.current.position.z = nextZ
          console.log(
            `${LOG_PREFIX} moved logo to [${logo.current.position.x}, ${logo.current.position.y}, ${logo.current.position.z}]`,
          )
        }
      }

      if (!!colourPickerText.current) {
        const nextZ = colourPickerText.current.position.z + zStep
        if (nextZ > MAX_Z) {
          colourPickerText.current.position.z = HIDE_POSITION_Z
          colourPickerText.current.position.y = HIDE_POSITION_Y
          console.log(`${LOG_PREFIX} hid colour picker text`)
        } else {
          colourPickerText.current.position.z = nextZ
          console.log(
            `${LOG_PREFIX} moved colour picker text to [${colourPickerText.current.position.x}, ${colourPickerText.current.position.y}, ${colourPickerText.current.position.z}]`,
          )
        }
      }

      for (const optionRef of colourPickerOptionRefs) {
        if (!optionRef.current) continue

        const currentTranslation = optionRef.current.translation()
        const nextZ = currentTranslation.z + zStep
        translation.current.x = currentTranslation.x
        translation.current.y = currentTranslation.y

        if (nextZ > MAX_Z) {
          translation.current.y = HIDE_POSITION_Y
          translation.current.z = HIDE_POSITION_Z
          optionRef.current.setTranslation(translation.current, false)
          console.log(
            `${LOG_PREFIX} hid colour option at [${currentTranslation.x}, ${currentTranslation.y}, ${currentTranslation.z}]`,
          )
          continue
        }

        translation.current.z = nextZ
        optionRef.current.setTranslation(translation.current, true)
        console.log(
          `${LOG_PREFIX} moved colour option to [${translation.current.x}, ${translation.current.y}, ${translation.current.z}]`,
        )
      }
    },
    [colourPickerOptionRefs, topicAnswerRefs],
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
    </>
  )
}

export default HomeElements
