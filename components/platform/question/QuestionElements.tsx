import { RapierRigidBody } from '@react-three/rapier'
import { createRef, type FC, useCallback, useImperativeHandle, useRef, useState } from 'react'
import { type RefObject } from 'react'
import { Mesh } from 'three'

import { QuestionAnswerTile } from '@/components/answerTile/AnswerTile'
import { useGameStore } from '@/components/GameProvider'
import { Text } from '@/components/Text'
import {
  ANSWER_TILE_COUNT,
  QUESTION_TEXT_HEIGHT,
  QUESTION_TEXT_WIDTH,
} from '@/utils/platform/questionSection'
import { HIDE_POSITION_Y, HIDE_POSITION_Z, MAX_Z, type RowData } from '@/utils/tiles'

export type QuestionElementsHandle = {
  moveElements: (zStep: number) => void
  positionElementsIfNeeded: (row: RowData | undefined, rowZ: number) => void
}

type Props = {
  ref: RefObject<QuestionElementsHandle | null>
}

const INITIAL_QUESTION_POSITION = {
  Y: 0.01,
  Z: -999,
} as const

const QuestionElements: FC<Props> = ({ ref }) => {
  const currentQuestion = useGameStore((s) => s.currentQuestion)
  const translation = useRef({ x: 0, y: 0, z: 0 }) // reusable object for translations

  const questionText = useRef<Mesh>(null)
  const [questionAnswerRefs, _] = useState(
    Array.from({ length: ANSWER_TILE_COUNT }, () => createRef<RapierRigidBody>()),
  )

  const questionIsOutOfView = useRef<boolean>(false)
  const answersAreOutOfView = useRef<boolean>(false)

  const positionElementsIfNeeded = useCallback(
    (row: RowData | undefined, rowZ: number) => {
      if (!row) return
      if (row.type !== 'question') return

      const textPosition = row.questionTextPosition
      if (!!textPosition && questionText.current) {
        questionText.current.position.set(
          textPosition[0],
          textPosition[1],
          rowZ + textPosition[2],
        )
        questionIsOutOfView.current = false
      }

      const answerPositions = row.answerTilePositions
      if (!answerPositions) return
      answersAreOutOfView.current = false

      for (
        let answerIndex = 0;
        answerIndex < answerPositions.length && answerIndex < questionAnswerRefs.length;
        answerIndex++
      ) {
        const position = answerPositions[answerIndex]
        if (!position) continue

        const answerRef = questionAnswerRefs[answerIndex]
        if (!answerRef.current) continue

        translation.current.x = position[0]
        translation.current.y = position[1]
        translation.current.z = rowZ + position[2]
        answerRef.current.setTranslation(translation.current, true)
      }
    },
    [questionAnswerRefs],
  )

  const moveElements = useCallback(
    (zStep: number) => {
      if (!questionText.current) return

      const isQuestionBehindCamera = questionText.current.position.z > MAX_Z
      if (isQuestionBehindCamera && !questionIsOutOfView.current) {
        questionText.current.position.z = HIDE_POSITION_Z
        questionText.current.position.y = HIDE_POSITION_Y
        questionIsOutOfView.current = true
      } else {
        questionText.current.position.z += zStep
      }

      if (answersAreOutOfView.current) return
      for (const answerRef of questionAnswerRefs) {
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
    [questionAnswerRefs],
  )

  useImperativeHandle(ref, () => {
    return {
      moveElements,
      positionElementsIfNeeded,
    }
  }, [moveElements, positionElementsIfNeeded])

  return (
    <>
      <Text
        ref={questionText}
        text={currentQuestion?.text ?? ''}
        position={[0, INITIAL_QUESTION_POSITION.Y, INITIAL_QUESTION_POSITION.Z]}
        width={QUESTION_TEXT_WIDTH}
        height={QUESTION_TEXT_HEIGHT}
      />
      {questionAnswerRefs.map((answerRef, answerIndex) => (
        <QuestionAnswerTile
          key={`question-answer-${answerIndex}`}
          ref={answerRef}
          index={answerIndex}
          position={[0, HIDE_POSITION_Y, HIDE_POSITION_Z]}
          isOutOfView={answersAreOutOfView}
        />
      ))}
    </>
  )
}

export default QuestionElements
