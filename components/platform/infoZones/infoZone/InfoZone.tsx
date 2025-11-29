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
import {
  type FC,
  type PropsWithChildren,
  type RefObject,
  Suspense,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { Transition } from 'react-transition-group'
import { twMerge } from 'tailwind-merge'
import { Vector3, type Vector3Tuple } from 'three'

import { useGameStore } from '@/components/GameProvider'
import { usePerformanceStore } from '@/components/PerformanceProvider'
import { SoundFX, useSoundStore } from '@/components/SoundProvider'
import { PLAYER_RADIUS } from '@/components/player/PlayerHUD'
import { InfoZoneUserData, type RigidBodyUserData } from '@/model/schema'
import { COLLISION_GROUPS } from '@/utils/collisionGroups'
import {
  INFO_ZONE_COLS,
  INFO_ZONE_HEIGHT,
  INFO_ZONE_ROWS,
  INFO_ZONE_WIDTH,
} from '@/utils/platform/infoZoneDimensions'
import { HIDDEN_POSITION } from '@/utils/tiles'

import IconSphere from './iconSphere/IconSphere'
import fragmentShader from './infoZone.frag'
import vertexShader from './infoZone.vert'

gsap.registerPlugin(EasePack)

type InfoZoneShaderUniforms = {
  uAspect: number
  uOpacity: number
  uTilesX: number
  uTilesY: number
  uShowProgress: number
  uDistanceFadeEnabled: number
}

const INITIAL_UNIFORMS: InfoZoneShaderUniforms = {
  uAspect: 1,
  uOpacity: 1,
  uTilesX: 1,
  uTilesY: 1,
  uShowProgress: 0,
  uDistanceFadeEnabled: 1,
}

const InfoZoneShader = shaderMaterial(INITIAL_UNIFORMS, vertexShader, fragmentShader)
const InfoZoneShaderMaterial = extend(InfoZoneShader)

export type InfoZoneProps = PropsWithChildren<{
  ref: RefObject<RapierRigidBody | null>
  isVisible: boolean
  infoContainerClassName?: string
  infoPositionOffset?: Vector3Tuple
  alwaysShowInfo?: boolean
  infoContentHtmlProps?: HtmlProps
  iconSrc: string
  sphereColour?: string // If other than default
}>

const userData: InfoZoneUserData = {
  type: 'info-zone',
}

// Shows HTML content when the player enters the zone
export const InfoZone: FC<InfoZoneProps> = ({
  ref,
  isVisible,
  infoContainerClassName,
  children,
  infoPositionOffset = [0, 0, 4],
  alwaysShowInfo = false,
  infoContentHtmlProps = {},
  iconSrc,
  sphereColour,
}) => {
  const htmlPortal = useGameStore((s) => s.htmlPortal)
  const setCameraLookAtPosition = useGameStore((s) => s.setCameraLookAtPosition)
  const playSoundFX = useSoundStore((s) => s.playSoundFX)
  const useDistanceFade = usePerformanceStore((s) => s.sceneConfig.isDistanceFadeEnabled)

  const [showInfo, setShowInfo] = useState(alwaysShowInfo)
  const infoContainer = useRef<HTMLDivElement>(null)
  const tileShader = useRef<typeof InfoZoneShaderMaterial & InfoZoneShaderUniforms>(null)

  const lookAtInfo = () => {
    if (!isVisible) return
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
    gsap.to(tileShader.current, {
      duration: 0.4,
      uShowProgress: 1,
      ease: 'power2.out',
    })
  })

  const onInfoExit = contextSafe(() => {
    gsap.to(infoContainer.current, {
      opacity: 0,
      scale: 0.8,
      duration: 0.28,
      ease: 'expoScale(0.8,1.0,power1.out)',
    })
    gsap.to(tileShader.current, {
      duration: 0.3,
      uShowProgress: 0,
      ease: 'power2.in',
    })
  })

  const aspect = INFO_ZONE_WIDTH / INFO_ZONE_HEIGHT
  const tilesX = INFO_ZONE_COLS
  const tilesY = INFO_ZONE_ROWS

  return (
    <RigidBody
      ref={ref}
      // KEEP DYNAMIC
      type="dynamic"
      gravityScale={0}
      friction={0}
      mass={0}
      position={HIDDEN_POSITION} // Overwritten dynamically in the parent
      rotation={[-Math.PI / 2, 0, 0]}
      colliders={false}
      userData={userData}>
      <CuboidCollider
        args={[INFO_ZONE_WIDTH / 2, INFO_ZONE_HEIGHT / 2, PLAYER_RADIUS * 2]}
        sensor={true}
        mass={0}
        friction={0}
        onIntersectionEnter={onIntersectionEnter}
        onIntersectionExit={onIntersectionExit}
        collisionGroups={COLLISION_GROUPS.infoZoneSensor}
      />
      <group visible={isVisible}>
        {/* Floor tile */}
        <mesh position={[0, 0, 0.01]} renderOrder={2}>
          <planeGeometry args={[INFO_ZONE_WIDTH, INFO_ZONE_HEIGHT]} />
          <InfoZoneShaderMaterial
            ref={tileShader}
            key={InfoZoneShader.key}
            transparent={true}
            uAspect={aspect}
            uTilesX={tilesX}
            uTilesY={tilesY}
            uDistanceFadeEnabled={useDistanceFade ? 1 : 0}
          />
        </mesh>

        {/* Floating Icon Sphere */}
        <Suspense fallback={null}>
          <IconSphere
            iconSrc={iconSrc}
            colour={sphereColour}
            isVisible={isVisible}
            shouldHide={showInfo}
          />
        </Suspense>
      </group>
      {/* Mesh to show where info content is placed. */}
      {/* <mesh position={infoPositionOffset}>
          <sphereGeometry args={[0.5, 16, 16]} />
          <meshBasicMaterial color="white" />
        </mesh> */}

      {/* Info Content */}
      {isVisible && (
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
  )
}
