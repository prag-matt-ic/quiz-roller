'use client'

import { useGSAP } from '@gsap/react'
import { Html } from '@react-three/drei'
import { shaderMaterial } from '@react-three/drei'
import { extend } from '@react-three/fiber'
import {
  CuboidCollider,
  type IntersectionEnterHandler,
  type IntersectionExitHandler,
  RapierRigidBody,
  RigidBody,
} from '@react-three/rapier'
import gsap from 'gsap'
import EasePack from 'gsap/dist/EasePack'
import { InfoIcon } from 'lucide-react'
import { type FC, PropsWithChildren, type RefObject, useRef, useState } from 'react'
import { SwitchTransition, Transition } from 'react-transition-group'
import { twMerge } from 'tailwind-merge'
import { Vector3, type Vector3Tuple } from 'three'

import { useGameStore } from '@/components/GameProvider'
import { PLAYER_RADIUS } from '@/components/player/ConfirmationBar'
import { type RigidBodyUserData } from '@/model/schema'
import { TILE_SIZE } from '@/utils/tiles'

import { COLOUR_RANGES, createPaletteGradient } from '../palette'
import fragmentShader from './infoZone.frag'
import vertexShader from './infoZone.vert'

gsap.registerPlugin(EasePack)

type InfoZoneShaderUniforms = {
  uAspect: number
  uOpacity: number
  uTilesX: number
  uTilesY: number
}

const INITIAL_UNIFORMS: InfoZoneShaderUniforms = {
  uAspect: 1,
  uOpacity: 1,
  uTilesX: 1,
  uTilesY: 1,
}

const InfoZoneShader = shaderMaterial(INITIAL_UNIFORMS, vertexShader, fragmentShader)
const InfoZoneShaderMaterial = extend(InfoZoneShader)

type Props = PropsWithChildren<{
  ref?: RefObject<RapierRigidBody | null>
  position: Vector3Tuple
  width?: number
  height?: number

  infoContainerClassName?: string
}>

// Shows HTML content when the player enters the zone
export const InfoZone: FC<Props> = ({
  ref,
  position,
  width = 2,
  height = 4,
  infoContainerClassName,
  children,
}) => {
  const playerColourIndex = useGameStore((s) => s.playerColourIndex)
  const setCameraLookAtPosition = useGameStore((s) => s.setCameraLookAtPosition)

  const [showInfo, setShowInfo] = useState(false)
  const infoContainer = useRef<HTMLDivElement>(null)
  const infoPositionOffset: Vector3Tuple = [0, 0, 1]

  const lookAtInfo = () => {
    if (!ref || !ref.current) return
    const currentTranslation = ref.current.translation()
    const targetPosition = new Vector3(
      currentTranslation.x + infoPositionOffset[0],
      currentTranslation.y + infoPositionOffset[1],
      currentTranslation.z + infoPositionOffset[2],
    )
    setCameraLookAtPosition(targetPosition)
  }

  const onIntersectionEnter: IntersectionEnterHandler = (event) => {
    const otherUserData = event.other.rigidBodyObject?.userData as RigidBodyUserData
    if (!otherUserData) return
    if (otherUserData.type !== 'player') return
    setShowInfo(true)
    lookAtInfo()
  }

  const onIntersectionExit: IntersectionExitHandler = (event) => {
    const otherUserData = event.other.rigidBodyObject?.userData as RigidBodyUserData
    if (!otherUserData) return
    if (otherUserData.type !== 'player') return
    setShowInfo(false)
    setCameraLookAtPosition(null)
  }

  const { contextSafe } = useGSAP({ scope: infoContainer })

  const onEnter = contextSafe(() => {
    gsap.fromTo(
      infoContainer.current,
      { opacity: 0, scale: 0.8 },
      {
        opacity: 1,
        scale: 1,
        duration: 0.32,
        ease: 'expoScale(0.8,1.0,power1.out)',
      },
    )
  })

  const onExit = contextSafe(() => {
    gsap.to(infoContainer.current, { opacity: 0, scale: 0.9, duration: 0.2 })
  })

  const userData: RigidBodyUserData = {
    type: 'info',
  }

  const aspect = width / height
  const tilesX = Math.max(width / TILE_SIZE, 0.01)
  const tilesY = Math.max(height / TILE_SIZE, 0.01)

  // Generate gradient colors based on selected colour band
  const range = COLOUR_RANGES[playerColourIndex]
  const rgbGradient = createPaletteGradient(range.min, range.max, {
    mode: 'rgb',
    angle: 45,
  })
  const oklchGradient = createPaletteGradient(range.min, range.max, {
    mode: 'oklch',
    angle: 45,
  })

  return (
    <>
      {/* Zone */}
      <RigidBody
        ref={ref}
        // KEEP DYNAMIC
        type="dynamic"
        gravityScale={0}
        friction={0}
        mass={0}
        position={position}
        rotation={[-Math.PI / 2, 0, 0]}
        colliders={false}
        userData={userData}>
        <CuboidCollider
          args={[width / 2, height / 2, PLAYER_RADIUS * 2]}
          sensor={true}
          mass={0}
          friction={0}
          onIntersectionEnter={onIntersectionEnter}
          onIntersectionExit={onIntersectionExit}
        />
        <mesh position={[0, 0, 0]}>
          <planeGeometry args={[width, height]} />
          <InfoZoneShaderMaterial
            transparent={true}
            uAspect={aspect}
            uTilesX={tilesX}
            uTilesY={tilesY}
          />
        </mesh>

        {/* Temp mesh to show the info is placed. */}
        {/* <mesh position={infoPositionOffset}>
          <sphereGeometry args={[0.2, 16, 16]} />
          <meshBasicMaterial color="white" />
        </mesh> */}
        {/* Info Content */}
        <Html
          sprite={true}
          // transform={true}
          center={true}
          pointerEvents="none"
          position={infoPositionOffset}
          className="relative select-none">
          <SwitchTransition>
            <Transition
              key={`${showInfo}`}
              mountOnEnter={true}
              unmountOnExit={true}
              timeout={{ enter: 0, exit: 350 }}
              onEnter={onEnter}
              onExit={onExit}
              nodeRef={infoContainer}>
              {() =>
                showInfo ? (
                  <div
                    ref={infoContainer}
                    className={twMerge(
                      'relative h-80 w-120 max-w-full rounded-2xl bg-white p-6 opacity-0 shadow-lg ring-2 shadow-black/25 ring-black/20 sm:p-10',
                      infoContainerClassName,
                    )}>
                    {children}
                  </div>
                ) : (
                  <div ref={infoContainer} className="flex items-center justify-center">
                    <div
                      className="absolute size-12 overflow-hidden rounded-full bg-linear-60 from-white to-black shadow-md shadow-black/25"
                      style={{
                        background: rgbGradient,
                        backgroundImage: oklchGradient,
                      }}
                    />
                    <InfoIcon strokeWidth={1.75} className="relative size-14" />
                  </div>
                )
              }
            </Transition>
          </SwitchTransition>
        </Html>
      </RigidBody>
    </>
  )
}
