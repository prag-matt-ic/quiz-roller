'use client'

import { useGSAP } from '@gsap/react'
import { OrbitControls } from '@react-three/drei'
import { Canvas } from '@react-three/fiber'
import { Physics } from '@react-three/rapier'
import gsap from 'gsap'
import { type FC, Suspense } from 'react'

import Player from './player/Player'
import Question from './Question'
import Terrain from './terrain/Terrain'
import Topics from './Topic'

gsap.registerPlugin(useGSAP)

const Game: FC = () => {
  return (
    <Canvas
      className="!absolute !inset-0 !h-lvh w-full"
      camera={{ position: [0, 4, 8], fov: 60 }}>
      <ambientLight intensity={2} />
      <OrbitControls />
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
      <Topics />
      <Question />
      <Player />
    </>
  )
}
