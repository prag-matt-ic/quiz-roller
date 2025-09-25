'use client'

import { useGSAP } from '@gsap/react'
import { OrbitControls } from '@react-three/drei'
import { Canvas } from '@react-three/fiber'
import { Physics } from '@react-three/rapier'
import gsap from 'gsap'
import { type FC, Suspense } from 'react'

import Answers from './Answer'
import Player from './player/Player'
import Terrain from './terrain/Terrain'

gsap.registerPlugin(useGSAP)

type Props = {
  onAnswerConfirmed: (text: string) => void
}

const Game: FC<Props> = ({ onAnswerConfirmed }) => {
  return (
    <Canvas className="!absolute !inset-0 !h-lvh w-full" camera={{ position: [0, 4, 8], fov: 60 }}>
      <ambientLight />
      <directionalLight position={[3, 8, 0]} intensity={3} />
      <OrbitControls />
      <Suspense>
        <Physics debug={false}>
          <Terrain />
          <Answers />
          <Player onAnswerConfirmed={onAnswerConfirmed} />
        </Physics>
      </Suspense>
    </Canvas>
  )
}

export default Game
