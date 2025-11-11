'use client'
import { shaderMaterial } from '@react-three/drei'
import { extend, useFrame } from '@react-three/fiber'
import { CylinderCollider, type RapierRigidBody, RigidBody } from '@react-three/rapier'
import { type FC, type RefObject, useRef } from 'react'
import { type Vector3Tuple } from 'three'

import { useGameStore } from '@/components/GameProvider'
import { usePerformanceStore } from '@/components/PerformanceProvider'
import { PLAYER_RADIUS } from '@/components/player/PlayerHUD'
import { type ColourTileUserData } from '@/model/schema'
import { COLOUR_TILE_SIZE } from '@/utils/platform/homeSection'

import colourTileFragment from './colourTile.frag'
import colourTileVertex from './colourTile.vert'

type ColourTileShaderUniforms = {
  uTime: number
  uPaletteIndex: number
  uIsActive: number
  uUseNoise: number
}

const INITIAL_COLOUR_TILE_UNIFORMS: ColourTileShaderUniforms = {
  uTime: 0,
  uPaletteIndex: 0,
  uIsActive: 0,
  uUseNoise: 1,
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
  userData: ColourTileUserData
}

type ColourTileProps = {
  option: ColourTileOption
  isActive: boolean
  ref: RefObject<RapierRigidBody | null>
  isOutOfView: RefObject<boolean>
}

const ColourTile: FC<ColourTileProps> = ({ option, isActive, ref, isOutOfView }) => {
  const shader = useRef<typeof ColourTileShaderMaterial & ColourTileShaderUniforms>(null)
  const useNoise = usePerformanceStore((s) => s.sceneConfig.colourTile.useNoise)

  useFrame(({ clock }) => {
    if (!shader.current) return
    if (isOutOfView.current || !useNoise) return
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
          uPaletteIndex={option.index}
          uIsActive={isActive ? 1 : 0}
          uUseNoise={useNoise ? 1 : 0}
        />
      </mesh>
    </RigidBody>
  )
}

type ColourPickerProps = {
  options: ColourTileOption[]
  optionRefs: ReadonlyArray<RefObject<RapierRigidBody | null>>
  isOutOfView: RefObject<boolean>
}

const ColourPicker: FC<ColourPickerProps> = ({ options, optionRefs = [], isOutOfView }) => {
  const paletteIndex = useGameStore((s) => s.paletteIndex)

  return (
    <group>
      {options.map((option) => (
        <ColourTile
          ref={optionRefs[option.index]}
          key={option.index}
          option={option}
          isActive={option.index === paletteIndex}
          isOutOfView={isOutOfView}
        />
      ))}
    </group>
  )
}

export default ColourPicker
