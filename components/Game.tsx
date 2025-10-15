'use client'

import { useGSAP } from '@gsap/react'
import { Stats, useTexture } from '@react-three/drei'
import { Canvas, useThree } from '@react-three/fiber'
import { Physics } from '@react-three/rapier'
import gsap from 'gsap'
import { type FC, Suspense, useEffect } from 'react'
import * as THREE from 'three'

import backgroundImage from '@/assets/textures/background-2.jpg'
import Player from '@/components/player/Player'
import Terrain from '@/components/terrain/Terrain'
import { useDebugStore } from '@/stores/useDebugStore'

import Camera, { CAMERA_CONFIG } from './Camera'
import FloatingTiles from './floatingTiles/FloatingTiles'
import { useGameStore } from './GameProvider'
import { Stage } from './GameProvider'
import OutOfBounds from './terrain/OutOfBounds'

gsap.registerPlugin(useGSAP)

// Start at the intro sweep position to avoid a jump before animation
const INITIAL_CAMERA_POSITION = CAMERA_CONFIG[Stage.SPLASH].position

const Game: FC = () => {
  const simFps = useDebugStore((s) => s.simFps)
  const physicsTimeStep = simFps === 0 ? 'vary' : 1 / simFps
  const resetTick = useGameStore((s) => s.resetTick)
  return (
    <Canvas
      className="!absolute !inset-0 !h-lvh w-full"
      onContextMenu={(e) => e.preventDefault()}
      camera={{
        position: [
          INITIAL_CAMERA_POSITION.x,
          INITIAL_CAMERA_POSITION.y,
          INITIAL_CAMERA_POSITION.z,
        ],
        far: 40,
        fov: 60,
      }}
      gl={{
        alpha: false,
        antialias: true,
        toneMapping: THREE.ACESFilmicToneMapping,
        toneMappingExposure: 0.24,
      }}>
      <ambientLight intensity={1.0} />
      {/* <OrbitControls /> */}
      <Camera isMobile={false} />
      <Suspense>
        <Physics key={resetTick} debug={false} timeStep={physicsTimeStep}>
          {process.env.NODE_ENV === 'development' && <Stats />}
          <Level key={resetTick} />
        </Physics>
      </Suspense>
    </Canvas>
  )
}

export default Game

const Level: FC = () => {
  return (
    <>
      <Background />
      <FloatingTiles isMobile={false} />
      <OutOfBounds />
      <Terrain />
      <Player />
    </>
  )
}

const Background: FC = () => {
  const scene = useThree((state) => state.scene)
  const texture = useTexture(backgroundImage.src)

  useEffect(() => {
    if (!texture) return
    // Use LinearSRGBColorSpace to prevent double gamma correction
    texture.colorSpace = THREE.LinearSRGBColorSpace
    scene.background = texture

    return () => {
      scene.background = null
    }
  }, [scene, texture])

  return null
}
