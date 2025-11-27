import { useGSAP } from '@gsap/react'
import { shaderMaterial, useTexture } from '@react-three/drei'
import { extend } from '@react-three/fiber'
import gsap from 'gsap'
import { type FC, Suspense, useRef } from 'react'
import { BoxGeometry, Texture, type Vector3Tuple } from 'three'

import { TILE_SIZE, TILE_THICKNESS } from '@/utils/tiles'

import fragmentShader from './infoTile.frag'
import vertexShader from './infoTile.vert'
import infoIcon from '@/assets/icons/info-icon.png'

export const INFO_TILE_WIDTH = TILE_SIZE * 2
export const INFO_TILE_HEIGHT = TILE_SIZE * 2
const INFO_TILE_DEPTH = TILE_THICKNESS * 2
const INFO_TILE_RAISE_DISTANCE = 2
const INFO_TILE_ROTATION_X = Math.PI / 2

const INFO_TILE_GEOMETRY = new BoxGeometry(
  INFO_TILE_WIDTH,
  INFO_TILE_HEIGHT,
  INFO_TILE_DEPTH,
  1,
  1,
  1,
)

type InfoTileShaderUniforms = {
  uExitProgress: number
  uRaiseDistance: number
  uTileHeight: number
  uIconTexture: Texture | null
}

const INITIAL_INFO_TILE_UNIFORMS: InfoTileShaderUniforms = {
  uExitProgress: 1,
  uRaiseDistance: INFO_TILE_RAISE_DISTANCE,
  uTileHeight: INFO_TILE_HEIGHT,
  uIconTexture: null,
}

const InfoTileShader = shaderMaterial(INITIAL_INFO_TILE_UNIFORMS, vertexShader, fragmentShader)
const InfoTileShaderMaterial = extend(InfoTileShader)

export type InfoTileShaderRef = typeof InfoTileShaderMaterial & InfoTileShaderUniforms

type InfoTileProps = {
  position: Vector3Tuple
  isHidden: boolean
}

export const InfoTile: FC<InfoTileProps> = ({ position, isHidden }) => {
  const shaderRef = useRef<InfoTileShaderRef | null>(null)
  const hasInitialized = useRef(false)

  const colourTexture = useTexture(infoIcon.src)

  useGSAP(
    () => {
      const material = shaderRef.current
      if (!material) return

      const target = isHidden ? 1 : 0

      if (!hasInitialized.current) {
        material.uExitProgress = target
        hasInitialized.current = true
        return
      }

      gsap.to(material, {
        duration: 0.4,
        uExitProgress: target,
        ease: 'power2.out',
        overwrite: true,
      })
    },
    { dependencies: [isHidden] },
  )

  return (
    <group position={position} rotation={[INFO_TILE_ROTATION_X, 0, 0]}>
      <mesh geometry={INFO_TILE_GEOMETRY} renderOrder={2}>
        <InfoTileShaderMaterial
          ref={shaderRef}
          transparent={true}
          depthWrite={false}
          depthTest={true}
          toneMapped={false}
          uRaiseDistance={INFO_TILE_RAISE_DISTANCE}
          uTileHeight={INFO_TILE_HEIGHT}
          uIconTexture={colourTexture}
        />
      </mesh>
    </group>
  )
}
