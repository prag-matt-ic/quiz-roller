'use client'
import { shaderMaterial } from '@react-three/drei'
import { extend, useFrame } from '@react-three/fiber'
import { CylinderCollider, type RapierRigidBody, RigidBody } from '@react-three/rapier'
import { type FC, type RefObject, useRef } from 'react'
import { Mesh, type Vector3Tuple } from 'three'

import { useGameStore } from '@/components/GameProvider'
import { PLAYER_RADIUS } from '@/components/player/ConfirmationBar'
import { Text } from '@/components/Text'
import { type MarbleColourUserData } from '@/model/schema'
import { COLOUR_TILE_SIZE, COLOUR_TILE_TEXT_RELATIVE_Z } from '@/utils/platform/homeSection'
import { ON_TILE_Y, TILE_SIZE } from '@/utils/tiles'

import colourTileFragment from './colourTile.frag'
import colourTileVertex from './colourTile.vert'

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

export type ColourTileOption = {
  index: number
  position: Vector3Tuple
  relativeZ: number
  userData: MarbleColourUserData
}

type ColourTileProps = {
  option: ColourTileOption
  isActive: boolean
  ref: RefObject<RapierRigidBody | null>
}

const ColourTile: FC<ColourTileProps> = ({ option, isActive, ref }) => {
  const shader = useRef<typeof ColourTileShaderMaterial & ColourTileShaderUniforms>(null)

  useFrame(({ clock }) => {
    if (!shader.current) return
    shader.current.uTime = clock.elapsedTime
  })

  return (
    <RigidBody
      ref={ref}
      // KEEP DYNAMIC
      type="dynamic"
      gravityScale={0}
      friction={0}
      mass={0}
      position={option.position}
      rotation={[-Math.PI / 2, 0, 0]}
      colliders={false}
      userData={option.userData}>
      <CylinderCollider
        rotation={[-Math.PI / 2, 0, 0]}
        args={[COLOUR_TILE_SIZE / 2, PLAYER_RADIUS * 2]}
        sensor={true}
      />
      <mesh>
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

type ColourPickerProps = {
  options: ColourTileOption[]
  optionRefs: ReadonlyArray<RefObject<RapierRigidBody | null>>
  textRef: RefObject<Mesh | null>
}

const ColourPicker: FC<ColourPickerProps> = ({ options, optionRefs, textRef }) => {
  const playerColourIndex = useGameStore((s) => s.playerColourIndex)

  return (
    <group>
      <Text
        ref={textRef}
        position={[0, ON_TILE_Y, COLOUR_TILE_TEXT_RELATIVE_Z]}
        width={TILE_SIZE * 8}
        height={TILE_SIZE * 2}
        text="Paint your marble"
      />
      {options.map((option) => (
        <ColourTile
          key={option.index}
          option={option}
          isActive={option.index === playerColourIndex}
          ref={optionRefs?.[option.index]}
        />
      ))}
    </group>
  )
}

export default ColourPicker
