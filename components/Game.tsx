'use client'

import { useGSAP } from '@gsap/react'
import { OrbitControls, Stats } from '@react-three/drei'
import { Canvas } from '@react-three/fiber'
import { Physics } from '@react-three/rapier'
import gsap from 'gsap'
import { type FC, Suspense } from 'react'

import Player from '@/components/player/Player'
import Terrain from '@/components/terrain/Terrain'

import Camera, { CAMERA_POSITIONS } from './Camera'
import { Stage } from './GameProvider'
import Particles from './particles/Particles'
// import FloatingTiles from './floatingTiles/FloatingTiles'

gsap.registerPlugin(useGSAP)

const INITIAL_CAMERA_POSITION = CAMERA_POSITIONS[Stage.INTRO]

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
        far: 60,
        fov: 60,
      }}>
      <ambientLight intensity={1} />
      <pointLight position={[0, 5, -0.5]} intensity={16} />
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
      {/* <FloatingTiles isMobile={false} /> */}
      <Terrain />
      {/* <Particles isMobile={false} /> */}
      <Player />
    </>
  )
}
