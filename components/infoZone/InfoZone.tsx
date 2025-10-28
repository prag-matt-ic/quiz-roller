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
import { type LucideIcon } from 'lucide-react'
import { type FC, type PropsWithChildren, type RefObject, useRef, useState } from 'react'
import { Transition } from 'react-transition-group'
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
  width: number
  height: number
  infoContainerClassName?: string
  Icon: LucideIcon
}>

// Shows HTML content when the player enters the zone
export const InfoZone: FC<Props> = ({
  ref,
  position,
  width,
  height,
  infoContainerClassName,
  Icon,
  children,
}) => {
  const playerColourIndex = useGameStore((s) => s.playerColourIndex)
  const setCameraLookAtPosition = useGameStore((s) => s.setCameraLookAtPosition)

  const [showInfo, setShowInfo] = useState(false)
  const iconContainer = useRef<HTMLDivElement>(null)
  const infoContainer = useRef<HTMLDivElement>(null)
  const iconPositionOffset: Vector3Tuple = [0, 0, 1]
  const infoPositionOffset: Vector3Tuple = [0, 0, 3.5]

  const lookAtInfo = () => {
    if (!ref || !ref.current) return
    const currentTranslation = ref.current.translation()
    const targetPosition = new Vector3(
      currentTranslation.x - infoPositionOffset[0],
      currentTranslation.y - infoPositionOffset[1],
      currentTranslation.z - infoPositionOffset[2],
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

  const { contextSafe } = useGSAP({ dependencies: [showInfo] })

  const onIconEnter = contextSafe(() => {
    gsap.fromTo(
      iconContainer.current,
      { opacity: 0, y: -40 },
      { opacity: 1, y: 0, duration: 0.3, ease: 'power1.out' },
    )
  })

  const onIconExit = contextSafe(() => {
    gsap.to(iconContainer.current, { opacity: 0, y: -40, duration: 0.3, ease: 'power1.out' })
  })

  const onInfoEnter = contextSafe(() => {
    gsap.fromTo(
      '.card',
      { opacity: 0, scale: 0.8 },
      {
        opacity: 1,
        scale: 1,
        duration: 0.36,
        delay: 0.1,
        stagger: -0.07,
        ease: 'expoScale(0.8,1.0,power1.out)',
      },
    )
  })

  const onInfoExit = contextSafe(() => {
    gsap.to(infoContainer.current, {
      opacity: 0,
      scale: 0.8,
      duration: 0.3,
      ease: 'expoScale(0.8,1.0,power1.out)',
    })
  })

  const userData: RigidBodyUserData = {
    type: 'info',
  }

  const aspect = width / height
  const tilesX = width / TILE_SIZE
  const tilesY = height / TILE_SIZE

  // Generate gradient colors based on selected colour band
  const range = COLOUR_RANGES[playerColourIndex]
  const rgbGradient = createPaletteGradient(range.min, range.max, {
    mode: 'rgb',
    angle: 50,
  })
  const oklchGradient = createPaletteGradient(range.min, range.max, {
    mode: 'oklch',
    angle: 50,
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

        {/* Icon */}
        <Html
          sprite={true}
          center={true}
          pointerEvents="none"
          position={iconPositionOffset}
          className="relative select-none">
          <Transition
            in={!showInfo}
            mountOnEnter={true}
            unmountOnExit={true}
            timeout={{ enter: 0, exit: 300 }}
            onEnter={onIconEnter}
            onExit={onIconExit}
            nodeRef={iconContainer}>
            {() => (
              <div
                ref={iconContainer}
                className="flex items-center justify-center overflow-hidden rounded-full border border-black p-2.5"
                style={{
                  background: rgbGradient,
                  backgroundImage: oklchGradient,
                }}>
                <Icon strokeWidth={1.5} className="size-13" />
              </div>
            )}
          </Transition>
        </Html>

        {/* Mesh to show where info content is placed. */}
        {/* <mesh position={infoPositionOffset}>
          <sphereGeometry args={[0.5, 16, 16]} />
          <meshBasicMaterial color="white" />
        </mesh> */}

        {/* Info Content */}
        <Html
          sprite={true}
          center={true}
          pointerEvents="none"
          position={infoPositionOffset}
          className="relative select-none">
          <Transition
            in={showInfo}
            mountOnEnter={true}
            unmountOnExit={true}
            timeout={{ enter: 0, exit: 350 }}
            onEnter={onInfoEnter}
            onExit={onInfoExit}
            nodeRef={infoContainer}>
            {() => (
              <div
                ref={infoContainer}
                className={twMerge(
                  'relative size-fit max-h-[calc(100svh-40px)] max-w-[calc(100vw-40px)]',
                  infoContainerClassName,
                )}>
                {children}
              </div>
            )}
          </Transition>
        </Html>
      </RigidBody>
    </>
  )
}
