/* eslint-disable react-hooks/refs */
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
import {
  type FC,
  type PropsWithChildren,
  type RefObject,
  type ReactNode,
  useRef,
  useState,
  useEffect,
} from 'react'
import { Transition } from 'react-transition-group'
import { twMerge } from 'tailwind-merge'
import { Vector3, type Vector3Tuple } from 'three'

import { useGameStore } from '@/components/GameProvider'
import { PLAYER_RADIUS } from '@/components/player/PlayerHUD'
import { SoundFX, useSoundStore } from '@/components/SoundProvider'
import { type RigidBodyUserData } from '@/model/schema'
import { TILE_SIZE } from '@/utils/tiles'

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
  isCollectible?: boolean
  contentIndex?: number
  gemModelSlot?: ReactNode
}>

// Shows HTML content when the player enters the zone
export const InfoZone: FC<Props> = ({
  ref,
  position,
  width,
  height,
  infoContainerClassName,
  Icon,
  isCollectible = false,
  contentIndex = 0,
  gemModelSlot,
  children,
}) => {
  const setCameraLookAtPosition = useGameStore((s) => s.setCameraLookAtPosition)
  const setConfirmingCollectible = useGameStore((s) => s.setConfirmingCollectible)
  const collectedCollectibles = useGameStore((s) => s.collectedCollectibles)
  const playSoundFX = useSoundStore((s) => s.playSoundFX)

  const [showInfo, setShowInfo] = useState(false)
  const [isPlayerInZone, setIsPlayerInZone] = useState(false)
  const justCollectedRef = useRef(false)
  const iconContainer = useRef<HTMLDivElement>(null)
  const infoContainer = useRef<HTMLDivElement>(null)
  const iconPositionOffset: Vector3Tuple = [0, 0, 1]
  const infoPositionOffset: Vector3Tuple = [0, 0, 4]

  const isCollected = isCollectible && collectedCollectibles.includes(contentIndex)

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

    setIsPlayerInZone(true)
    justCollectedRef.current = false

    if (isCollectible) {
      // lookAtInfo()

      if (isCollected) {
        setShowInfo(true)
      } else {
        setConfirmingCollectible(contentIndex)
      }
    } else {
      setShowInfo(true)
      lookAtInfo()
    }
  }

  const onIntersectionExit: IntersectionExitHandler = (event) => {
    const otherUserData = event.other.rigidBodyObject?.userData as RigidBodyUserData
    if (!otherUserData) return
    if (otherUserData.type !== 'player') return

    setIsPlayerInZone(false)

    if (isCollectible && !isCollected) {
      setConfirmingCollectible(null)
    }

    // Always reset camera and hide info when exiting
    setShowInfo(false)
    setCameraLookAtPosition(null)
  }

  // When a collectible is collected, show the content and move camera (only if player still in zone)
  useEffect(() => {
    // Check if collection status changed
    const wasJustCollected = isCollectible && isCollected && !justCollectedRef.current

    if (wasJustCollected && isPlayerInZone && !showInfo) {
      justCollectedRef.current = true
      setShowInfo(true)
      // lookAtInfo()
    }
  }, [
    isCollected,
    isCollectible,
    showInfo,
    // lookAtInfo,
    isPlayerInZone,
  ])

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
    playSoundFX(SoundFX.OPEN_INFO)
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
      duration: 0.28,
      ease: 'expoScale(0.8,1.0,power1.out)',
    })
  })

  const userData: RigidBodyUserData = {
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
        />
        <mesh position={[0, 0, 0.01]} renderOrder={2}>
          <planeGeometry args={[width, height]} />
          <InfoZoneShaderMaterial
            key={InfoZoneShader.key}
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
          renderOrder={2}
          occlude={false}
          pointerEvents="none"
          position={iconPositionOffset}
          className="relative z-10 select-none">
          <Transition
            in={!showInfo}
            timeout={{ enter: 0, exit: 300 }}
            onEnter={onIconEnter}
            onExit={onIconExit}
            nodeRef={iconContainer}>
            <div
              ref={iconContainer}
              className="bg-teal-accent flex items-center justify-center overflow-hidden rounded-full p-2 sm:p-3">
              <Icon strokeWidth={1.75} className="size-9 sm:size-11" />
            </div>
          </Transition>
        </Html>

        {/* Mesh to show where info content is placed. */}
        {/* <mesh position={infoPositionOffset}>
          <sphereGeometry args={[0.5, 16, 16]} />
          <meshBasicMaterial color="white" />
        </mesh> */}

        {/* 3D Gem Model - always rendered to avoid flash, visibility controlled by scale */}
        {isCollectible && gemModelSlot && (
          <>
            {/* Lights from camera viewing angle (front) - 4 corners */}
            <spotLight
              position={[3.5 + 1, 0.5 + 1, 1.5 + 3]}
              target-position={[3.5, 0.5, 1.5]}
              intensity={25}
              angle={Math.PI / 3}
              penumbra={0.1}
              distance={10}
              castShadow
            />
            <spotLight
              position={[3.5 - 1, 0.5 + 1, 1.5 + 3]}
              target-position={[3.5, 0.5, 1.5]}
              intensity={25}
              angle={Math.PI / 3}
              penumbra={0.1}
              distance={10}
            />
            <spotLight
              position={[3.5 + 1, 0.5 - 1, 1.5 + 3]}
              target-position={[3.5, 0.5, 1.5]}
              intensity={25}
              angle={Math.PI / 3}
              penumbra={0.1}
              distance={10}
            />
            <spotLight
              position={[3.5 - 1, 0.5 - 1, 1.5 + 3]}
              target-position={[3.5, 0.5, 1.5]}
              intensity={25}
              angle={Math.PI / 3}
              penumbra={0.1}
              distance={10}
            />
            {/* Additional lights from below to illuminate bottom half */}
            {/* <pointLight position={[3.5, 0.5 - 2, 1.5]} intensity={15} distance={5} />
            <pointLight position={[3.5 + 1.5, 0.5, 1.5]} intensity={12} distance={5} />
            <pointLight position={[3.5 - 1.5, 0.5, 1.5]} intensity={12} distance={5} /> */}
            <group position={[0, -1, 2.5]} scale={showInfo ? 1 : 0}>
              {gemModelSlot}
            </group>
          </>
        )}

        {/* Info Content */}
        <Html
          sprite={true}
          center={true}
          renderOrder={2}
          occlude={false}
          pointerEvents="none"
          position={infoPositionOffset}
          className="relative z-100 select-none">
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
      </RigidBody>
    </>
  )
}
