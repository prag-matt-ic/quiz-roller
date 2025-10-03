'use client'

import { useGSAP } from '@gsap/react'
import { Canvas } from '@react-three/fiber'
import { Physics } from '@react-three/rapier'
import gsap from 'gsap'
import { type FC, Suspense } from 'react'

import Player from '@/components/player/Player'
import Terrain from '@/components/terrain/Terrain'

import Camera, { CAMERA_POSITIONS } from './Camera'
import { Stage } from './GameProvider'

gsap.registerPlugin(useGSAP)

const INITIAL_CAMERA_POSITION = CAMERA_POSITIONS[Stage.INTRO]

const Game: FC = () => {
  return (
    <Canvas
      className="!absolute !inset-0 !h-lvh w-full"
      camera={{
        position: [
          INITIAL_CAMERA_POSITION.x,
          INITIAL_CAMERA_POSITION.y,
          INITIAL_CAMERA_POSITION.z,
        ],
        fov: 60,
      }}>
      <ambientLight intensity={2} />
      {/* <OrbitControls /> */}
      <Camera isMobile={false} />
      <Suspense>
        <Physics debug={true}>
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
      <Terrain />
      <Player />
    </>
  )
}
