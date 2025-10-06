'use client'

import { useGSAP } from '@gsap/react'
import { Stats, useTexture } from '@react-three/drei'
import { Canvas, useThree } from '@react-three/fiber'
import { Physics } from '@react-three/rapier'
import gsap from 'gsap'
import { type FC, Suspense, useEffect } from 'react'
import * as THREE from 'three'

import backgroundImage from '@/assets/background.jpg'
import Player from '@/components/player/Player'
import Terrain from '@/components/terrain/Terrain'

import Camera, { CAMERA_CONFIG } from './Camera'
import FloatingTiles from './floatingTiles/FloatingTiles'
import { Stage } from './GameProvider'
import Particles from './particles/Particles'
import Ground from './terrain/Ground'

gsap.registerPlugin(useGSAP)

// Start at the intro sweep position to avoid a jump before animation
const INITIAL_CAMERA_POSITION = CAMERA_CONFIG[Stage.SPLASH].position

const Game: FC = () => {
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
        far: 45,
        fov: 60,
      }}
      gl={{
        alpha: false,
        antialias: true,
        toneMapping: THREE.ACESFilmicToneMapping,
        toneMappingExposure: 0.25,
      }}>
      <ambientLight intensity={1.0} />
      {/* <pointLight position={[0, 5, -0.5]} intensity={16} /> */}
      {/* <OrbitControls /> */}
      <Camera isMobile={false} />
      <Suspense>
        <Physics debug={false}>
          {process.env.NODE_ENV === 'development' && <Stats />}
          <Level />
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
      <Terrain />
      <Ground />
      {/* <Particles isMobile={false} /> */}
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
