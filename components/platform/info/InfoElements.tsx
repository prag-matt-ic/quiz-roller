import { RapierRigidBody } from '@react-three/rapier'
import { createRef, type FC, useCallback, useImperativeHandle, useRef, useState } from 'react'
import { type RefObject } from 'react'
import { Mesh } from 'three'

import { InfoAnswerTile } from '@/components/answerTile/AnswerTile'
import { useGameStore } from '@/components/GameProvider'
import { Text } from '@/components/Text'
import {
  ANSWER_TILE_COUNT,
  INFO_TEXT_HEIGHT,
  INFO_TEXT_WIDTH,
} from '@/utils/platform/infoSection'
import {
  ANSWER_TILE_HEIGHT,
  HIDE_POSITION_Y,
  HIDE_POSITION_Z,
  MAX_Z,
  type RowData,
} from '@/utils/tiles'
import InvisibleWall from '@/components/invisibleWall/InvisibleWall'

export type InfoElementsHandle = {
  moveElements: (zStep: number) => void
  positionElementsIfNeeded: (row: RowData | undefined, rowZ: number) => void
  hideElementsIfNeeded: (row: RowData | undefined) => void
}

type Props = {
  ref: RefObject<InfoElementsHandle | null>
}

const INITIAL_QUESTION_POSITION = {
  Y: 0.01,
  Z: -999,
} as const


// TODO: add InfoZone component.
const InfoElements: FC<Props> = ({ ref }) => {
  const currentInfo = useGameStore((s) => s.currentInfo)
  const translation = useRef({ x: 0, y: 0, z: 0 }) // reusable object for translations

  const infoText = useRef<Mesh>(null)
  const [infoAnswerRefs, _] = useState(
    Array.from({ length: ANSWER_TILE_COUNT }, () => createRef<RapierRigidBody>()),
  )

  const infoIsOutOfView = useRef<boolean>(false)
  const answersAreOutOfView = useRef<boolean>(false)

  // Called when the row is raised
  const positionElementsIfNeeded = useCallback(
    (row: RowData | undefined, rowZ: number) => {
      if (!row) return
      if (row.type !== 'info') return

      const textPosition = row.infoTextPosition
      if (!!textPosition && infoText.current) {
        infoText.current.position.set(textPosition[0], textPosition[1], rowZ + textPosition[2])
        infoIsOutOfView.current = false
      }

      const answerPositions = row.answerTilePositions
      if (!answerPositions) return
      answersAreOutOfView.current = false

      for (
        let answerIndex = 0;
        answerIndex < answerPositions.length && answerIndex < infoAnswerRefs.length;
        answerIndex++
      ) {
        const position = answerPositions[answerIndex]
        if (!position) continue

        const answerRef = infoAnswerRefs[answerIndex]
        if (!answerRef.current) continue

        translation.current.x = position[0]
        translation.current.y = position[1]
        translation.current.z = rowZ + position[2]
        answerRef.current.setTranslation(translation.current, true)
      }
    },
    [infoAnswerRefs],
  )

  // Called when the row is lowered
  const hideElementsIfNeeded = useCallback(
    (row: RowData | undefined) => {
      if (!row) return
      if (row.type !== 'info') return

      if (!!infoText.current) {
        infoText.current.position.z = HIDE_POSITION_Z
        infoText.current.position.y = HIDE_POSITION_Y
      }

      for (const answerRef of infoAnswerRefs) {
        if (!answerRef.current) continue
        translation.current.x = answerRef.current.translation().x
        translation.current.y = HIDE_POSITION_Y
        translation.current.z = HIDE_POSITION_Z
        answerRef.current.setTranslation(translation.current, false)
      }
    },
    [infoAnswerRefs],
  )

  const moveElements = useCallback(
    (zStep: number) => {
      if (!infoText.current) return

      const isInfoBehindCamera = infoText.current.position.z > MAX_Z
      if (isInfoBehindCamera && !infoIsOutOfView.current) {
        infoText.current.position.z = HIDE_POSITION_Z
        infoText.current.position.y = HIDE_POSITION_Y
        infoIsOutOfView.current = true
      } else {
        infoText.current.position.z += zStep
      }

      if (answersAreOutOfView.current) return
      for (const answerRef of infoAnswerRefs) {
        if (!answerRef.current) continue

        const currentTranslation = answerRef.current.translation()
        if (currentTranslation.z > MAX_Z) {
          translation.current.x = currentTranslation.x
          translation.current.y = HIDE_POSITION_Y
          translation.current.z = HIDE_POSITION_Z
          answerRef.current.setTranslation(translation.current, false)

          answersAreOutOfView.current = true
          continue
        }

        translation.current.x = currentTranslation.x
        translation.current.y = currentTranslation.y
        translation.current.z = currentTranslation.z + zStep
        answerRef.current.setTranslation(translation.current, true)
      }
    },
    [infoAnswerRefs],
  )

  useImperativeHandle(ref, () => {
    return {
      moveElements,
      positionElementsIfNeeded,
      hideElementsIfNeeded,
    }
  }, [moveElements, positionElementsIfNeeded, hideElementsIfNeeded])

  return (
    <>
      <Text
        ref={infoText}
        text={currentInfo?.text ?? ''}
        position={[0, INITIAL_INFO_POSITION.Y, INITIAL_INFO_POSITION.Z]}
        width={INFO_TEXT_WIDTH}
        height={INFO_TEXT_HEIGHT}
      />
      {infoAnswerRefs.map((answerRef, answerIndex) => (
        <QuestionAnswerTile
          key={`question-answer-${answerIndex}`}
          ref={answerRef}
          index={answerIndex}
          position={[0, HIDE_POSITION_Y, HIDE_POSITION_Z]}
          isOutOfView={answersAreOutOfView}
        />
      ))}
      {/* TODO: add floating heading text */}
      {/* TODO: add collectible */}
      {/* TODO: add info zone. */}
    </>
  )
}

export default InfoElements
