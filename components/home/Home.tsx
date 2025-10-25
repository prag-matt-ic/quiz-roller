'use client'

import { useTexture } from '@react-three/drei'
import { type FC, memo, Suspense, useMemo } from 'react'
import { type Vector3Tuple } from 'three'

import logo from '@/assets/textures/home-logo.webp'
import { AnswerTile } from '@/components/answerTile/AnswerTile'
import { useGameStore } from '@/components/GameProvider'
import { Text } from '@/components/Text'
import { InstancedTiles } from '@/components/tiles/InstancedTiles'
import { Topic, type TopicUserData } from '@/model/schema'
import {
  buildHomePlatform,
  HOME_ANSWER_TILE_CENTER_ROW,
  HOME_COLUMNS,
  HOME_LEFT_TILE_CENTER_COLUMN,
  HOME_RIGHT_TILE_CENTER_COLUMN,
  HOME_ROWS,
} from '@/utils/homeBuilder'
import { ANSWER_TILE_HEIGHT } from '@/utils/terrainBuilder'
import { ANSWER_TILE_Y, TILE_SIZE } from '@/utils/tiles'

import ColourPicker from './colourPicker/ColourPicker'

const columnToWorldX = (column: number) => (column - HOME_COLUMNS / 2 + 0.5) * TILE_SIZE
const rowToWorldZ = (row: number) => (row - HOME_ROWS / 2 + 0.5) * TILE_SIZE

const HOME_PROMPT_WIDTH = TILE_SIZE * 12
const HOME_PROMPT_HEIGHT = TILE_SIZE * 2

const HOME_ANSWER_TILE_Z = rowToWorldZ(HOME_ANSWER_TILE_CENTER_ROW)

const UX_TOPIC_TILE_POSITION: Vector3Tuple = [
  columnToWorldX(HOME_LEFT_TILE_CENTER_COLUMN),
  ANSWER_TILE_Y,
  HOME_ANSWER_TILE_Z,
]

const AI_TOPIC_TILE_POSITION: Vector3Tuple = [
  columnToWorldX(HOME_RIGHT_TILE_CENTER_COLUMN),
  ANSWER_TILE_Y,
  HOME_ANSWER_TILE_Z,
]

const UX_TOPIC_USER_DATA = {
  type: 'topic',
  topic: Topic.UX_UI_DESIGN,
} as const satisfies TopicUserData

const AI_TOPIC_USER_DATA = {
  type: 'topic',
  topic: Topic.ARTIFICIAL_INTELLIGENCE,
} as const satisfies TopicUserData

const HOME_PROMPT_POSITION: Vector3Tuple = [
  0,
  ANSWER_TILE_Y,
  HOME_ANSWER_TILE_Z + ANSWER_TILE_HEIGHT,
] as Vector3Tuple

const Home: FC = () => {
  const { instances, instanceVisibility, instanceSeed, instanceAnswerNumber } = useMemo(
    () => buildHomePlatform(),
    [],
  )
  const confirmingTopic = useGameStore((s) => s.confirmingTopic)

  const isConfirmingDesign = confirmingTopic?.topic === Topic.UX_UI_DESIGN
  const isConfirmingAi = confirmingTopic?.topic === Topic.ARTIFICIAL_INTELLIGENCE

  return (
    <>
      <InstancedTiles
        instances={instances}
        instanceVisibility={instanceVisibility}
        instanceSeed={instanceSeed}
        instanceAnswerNumber={instanceAnswerNumber}
        initialUniforms={{
          uEntryStartZ: -12,
          uEntryEndZ: -12,
          uExitEndZ: 12,
          uExitStartZ: 12,
        }}
      />

      {/* Topic Question at the top (further away from the player (up))... */}
      <AnswerTile
        position={UX_TOPIC_TILE_POSITION}
        text={Topic.UX_UI_DESIGN}
        userData={UX_TOPIC_USER_DATA}
        isConfirming={isConfirmingDesign}
        wasConfirmed={false}
        wasCorrect={false}
      />
      <AnswerTile
        position={AI_TOPIC_TILE_POSITION}
        text={Topic.ARTIFICIAL_INTELLIGENCE}
        userData={AI_TOPIC_USER_DATA}
        isConfirming={isConfirmingAi}
        wasConfirmed={false}
        wasCorrect={false}
      />
      <Text
        position={HOME_PROMPT_POSITION}
        width={HOME_PROMPT_WIDTH}
        height={HOME_PROMPT_HEIGHT}
        text="Roll over a topic to begin"
        textCanvasOptions={
          {
            // baseFontScale: 0.18,
          }
        }
      />

      {/* Logo in the center */}
      <Logo />

      {/* Colour Picker at the bottom */}
      <ColourPicker />
    </>
  )
}

export default Home

const Logo: FC = memo(
  () => {
    const texture = useTexture(logo.src)
    const logoAspect = logo.width / logo.height
    const logoTileWidth = TILE_SIZE * 8
    const logoTileHeight = logoTileWidth / logoAspect
    // texture.colorSpace = Colorspace
    return (
      <Suspense>
        <mesh position={[0, ANSWER_TILE_Y, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[logoTileWidth, logoTileHeight]} />
          <meshBasicMaterial map={texture} transparent={true} />
        </mesh>
      </Suspense>
    )
  },
  () => true,
)

Logo.displayName = 'Logo'
