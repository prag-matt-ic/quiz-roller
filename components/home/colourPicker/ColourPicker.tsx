// Create a home grid of instanced tiles which the player can freely navigate around
'use client'
import { shaderMaterial } from '@react-three/drei'
import { extend, useFrame } from '@react-three/fiber'
import { CylinderCollider, RigidBody } from '@react-three/rapier'
import { type FC, useMemo, useRef } from 'react'
import { type Vector3Tuple } from 'three'

import { PLAYER_INITIAL_HOME_POSITION, useGameStore } from '@/components/GameProvider'
import { COLOUR_RANGES } from '@/components/palette'
import { PLAYER_RADIUS } from '@/components/player/ConfirmationBar'
import { Text } from '@/components/Text'
import { type MarbleColourUserData } from '@/model/schema'
import { ANSWER_TILE_Y, SAFE_HEIGHT, TILE_SIZE, TILE_THICKNESS } from '@/utils/tiles'

import colourTileFragment from './colourTile.frag'
import colourTileVertex from './colourTile.vert'

const COLOUR_TILE_SIZE = TILE_SIZE * 2
const COLOUR_TILE_GAP_BETWEEN = TILE_SIZE
const COLOUR_TILE_BASE_Z = TILE_SIZE * 6
const COLOUR_TILE_Y = SAFE_HEIGHT + TILE_THICKNESS * 0.5 + 0.02
const COLOUR_TILE_ROTATION: [number, number, number] = [-Math.PI / 2, 0, 0]
const COLOUR_TILE_MESH_OFFSET: Vector3Tuple = [0, 0, 0.03]

type ColourTileShaderUniforms = {
  uTime: number
  uColourIndex: number
  uIsActive: number
}

const INITIAL_COLOUR_TILE_UNIFORMS: ColourTileShaderUniforms = {
  uTime: 0,
  uColourIndex: 0,
  uIsActive: 0,
}

const ColourTileShader = shaderMaterial(
  INITIAL_COLOUR_TILE_UNIFORMS,
  colourTileVertex,
  colourTileFragment,
)
const ColourTileShaderMaterial = extend(ColourTileShader)

type ColourTileOption = {
  index: number
  position: Vector3Tuple
  userData: MarbleColourUserData
}

type ColourTileProps = {
  option: ColourTileOption
  isActive: boolean
}

const COLOUR_TILE_TIME_MULTIPLIER = 2.5

const ColourTile: FC<ColourTileProps> = ({ option, isActive }) => {
  const shader = useRef<typeof ColourTileShaderMaterial & ColourTileShaderUniforms>(null)

  useFrame(({ clock }) => {
    if (!shader.current) return
    shader.current.uTime = clock.elapsedTime * COLOUR_TILE_TIME_MULTIPLIER
  })

  return (
    <RigidBody
      key={option.index}
      // KEEP DYNAMIC
      type="dynamic"
      gravityScale={0}
      friction={0}
      mass={0}
      position={option.position}
      rotation={COLOUR_TILE_ROTATION}
      colliders={false}
      userData={option.userData}>
      <CylinderCollider
        rotation={[-Math.PI / 2, 0, 0]}
        args={[COLOUR_TILE_SIZE / 2, PLAYER_RADIUS * 2]}
        sensor={true}
      />
      <mesh position={COLOUR_TILE_MESH_OFFSET}>
        <planeGeometry args={[COLOUR_TILE_SIZE, COLOUR_TILE_SIZE]} />
        <ColourTileShaderMaterial
          ref={shader}
          key={ColourTileShader.key}
          uColourIndex={option.index}
          uIsActive={isActive ? 1 : 0}
        />
      </mesh>
    </RigidBody>
  )
}

const ColourPicker: FC = () => {
  const playerColourIndex = useGameStore((s) => s.playerColourIndex)

  const options = useMemo<ColourTileOption[]>(() => {
    const horizontalCenterOffset = (COLOUR_RANGES.length - 1) / 2

    return COLOUR_RANGES.map((_, index) => {
      const xOffset =
        (index - horizontalCenterOffset) * (COLOUR_TILE_SIZE + COLOUR_TILE_GAP_BETWEEN)
      const position: Vector3Tuple = [xOffset, COLOUR_TILE_Y, COLOUR_TILE_BASE_Z]
      const userData: MarbleColourUserData = {
        type: 'marble-colour',
        colourIndex: index,
      }

      return { index, position, userData }
    })
  }, [])

  return (
    <group>
      <Text
        position={[0, ANSWER_TILE_Y, COLOUR_TILE_BASE_Z - 2]}
        width={TILE_SIZE * 8}
        height={TILE_SIZE * 2}
        text="Paint your marble"
        textCanvasOptions={{}}
      />
      {options.map((option) => (
        <ColourTile
          key={option.index}
          option={option}
          isActive={option.index === playerColourIndex}
        />
      ))}
    </group>
  )
}

export default ColourPicker
