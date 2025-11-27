/* eslint-disable react-hooks/refs */
'use client'

import { useGSAP } from '@gsap/react'
import { Html } from '@react-three/drei'
import { shaderMaterial } from '@react-three/drei'
import { type HtmlProps } from '@react-three/drei/web/Html'
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
import { type FC, type PropsWithChildren, type RefObject, useRef, useState } from 'react'
import { Transition } from 'react-transition-group'
import { twMerge } from 'tailwind-merge'
import { Vector3, type Vector3Tuple } from 'three'

import { useGameStore } from '@/components/GameProvider'
import { PLAYER_RADIUS } from '@/components/player/PlayerHUD'
import { SoundFX, useSoundStore } from '@/components/SoundProvider'
import { InfoZoneUserData, type RigidBodyUserData } from '@/model/schema'
import { TILE_SIZE } from '@/utils/tiles'
import { COLLISION_GROUPS } from '@/utils/collisionGroups'

import { InfoTile, INFO_TILE_HEIGHT } from './infoTile/InfoTile'
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
  isPositioned: boolean
  position: Vector3Tuple
  width: number
  height: number
  infoContainerClassName?: string
  infoPositionOffset?: Vector3Tuple
  alwaysShowInfo?: boolean
  infoContentHtmlProps?: HtmlProps
}>

const ICON_BASE_CLEARANCE = TILE_SIZE * 0.5
const iconPositionOffset: Vector3Tuple = [0, 0, INFO_TILE_HEIGHT / 2 + ICON_BASE_CLEARANCE]

// Shows HTML content when the player enters the zone
export const InfoZone: FC<Props> = ({
  ref,
  isPositioned = false,
  position,
  width,
  height,
  infoContainerClassName,
  children,
  infoPositionOffset = [0, 0, 4],
  alwaysShowInfo = false,
  infoContentHtmlProps = {},
}) => {
  const htmlPortal = useGameStore((s) => s.htmlPortal)
  const setCameraLookAtPosition = useGameStore((s) => s.setCameraLookAtPosition)
  const playSoundFX = useSoundStore((s) => s.playSoundFX)

  const [showInfo, setShowInfo] = useState(alwaysShowInfo)
  const infoContainer = useRef<HTMLDivElement>(null)

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
    lookAtInfo()
    if (alwaysShowInfo) return
    setShowInfo(true)
  }

  const onIntersectionExit: IntersectionExitHandler = (event) => {
    const otherUserData = event.other.rigidBodyObject?.userData as RigidBodyUserData
    if (!otherUserData) return
    if (otherUserData.type !== 'player') return
    // Reset camera and hide info when exiting
    setCameraLookAtPosition(null)
    if (alwaysShowInfo) return
    setShowInfo(false)
  }

  const { contextSafe } = useGSAP({ dependencies: [showInfo] })

  const onInfoEnter = contextSafe(() => {
    playSoundFX(SoundFX.OPEN_INFO)
    gsap.fromTo(
      infoContainer.current,
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
      duration: 0.28,
      ease: 'expoScale(0.8,1.0,power1.out)',
    })
  })

  const userData: InfoZoneUserData = {
    type: 'info-zone',
  }

  const aspect = width / height
  const tilesX = width / TILE_SIZE
  const tilesY = height / TILE_SIZE

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
          collisionGroups={COLLISION_GROUPS.infoZoneSensor}
        />
        <mesh position={[0, 0, 0.03]} renderOrder={2}>
          <planeGeometry args={[width, height]} />
          <InfoZoneShaderMaterial
            key={InfoZoneShader.key}
            transparent={true}
            uAspect={aspect}
            uTilesX={tilesX}
            uTilesY={tilesY}
          />
        </mesh>

        <InfoTile position={iconPositionOffset} isHidden={showInfo} />
        {/* Mesh to show where info content is placed. */}
        {/* <mesh position={infoPositionOffset}>
          <sphereGeometry args={[0.5, 16, 16]} />
          <meshBasicMaterial color="white" />
        </mesh> */}

        {/* Info Content */}
        {isPositioned && (
          <Html
            sprite={true}
            center={true}
            renderOrder={2}
            occlude={false}
            portal={htmlPortal}
            pointerEvents="none"
            position={infoPositionOffset}
            className="relative z-100 select-none"
            {...infoContentHtmlProps}>
            <Transition
              in={showInfo}
              mountOnEnter={true}
              unmountOnExit={true}
              timeout={{ enter: 0, exit: 300 }}
              onEnter={onInfoEnter}
              onExit={onInfoExit}
              nodeRef={infoContainer}>
              <div
                ref={infoContainer}
                className={twMerge(
                  'relative size-fit max-w-[calc(100vw-56px)]',
                  infoContainerClassName,
                )}>
                {children}
              </div>
            </Transition>
          </Html>
        )}
      </RigidBody>
    </>
  )
}
