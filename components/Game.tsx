'use client'

import { useGSAP } from '@gsap/react'
import { PerformanceMonitor, Stats } from '@react-three/drei'
import { Canvas } from '@react-three/fiber'
import { Physics } from '@react-three/rapier'
import gsap from 'gsap'
import { type FC, Suspense, useEffect, useState } from 'react'
import * as THREE from 'three'

import Background from '@/components/background/Background'
import Platform from '@/components/platform/Platform'
import Player from '@/components/player/Player'

import Camera, { CAMERA_CONFIG } from './Camera'
import FloatingTiles from './floatingTiles/FloatingTiles'
import { Stage } from './GameProvider'
import OutOfBounds from './OutOfBounds'
import { usePerformanceStore } from './PerformanceProvider'

gsap.registerPlugin(useGSAP)

// Start at the intro sweep position to avoid a jump before animation
const INITIAL_CAMERA_POSITION = CAMERA_CONFIG[Stage.HOME].position

type Props = {
  isDebug: boolean
  isMobile: boolean
}

const Game: FC<Props> = ({ isDebug, isMobile }) => {
  const maxDPR = usePerformanceStore((s) => s.maxDPR)
  const simFps = usePerformanceStore((s) => s.simFps)
  const onPerformanceChange = usePerformanceStore((s) => s.onPerformanceChange)
  const physicsTimeStep = simFps === 0 ? 'vary' : 1 / simFps

  const [dpr, setDpr] = useState(1)

  useEffect(() => {
    if (!!maxDPR) {
      setDpr(Math.min(window.devicePixelRatio ?? 1, maxDPR))
    } else {
      setDpr(window.devicePixelRatio ?? 1)
    }
  }, [maxDPR])

  return (
    <Canvas
      className="fixed! inset-0! h-lvh! w-full"
      onContextMenu={(e) => e.preventDefault()}
      dpr={dpr}
      camera={{
        position: [
          INITIAL_CAMERA_POSITION.x,
          INITIAL_CAMERA_POSITION.y,
          INITIAL_CAMERA_POSITION.z,
        ],
        far: 40,
        fov: 65,
      }}
      gl={{
        alpha: false,
        antialias: !isMobile,
        toneMapping: THREE.ACESFilmicToneMapping,
        toneMappingExposure: 0.2,
      }}>
      <PerformanceMonitor
        // Create an upper/lower FPS band relative to device refresh rate
        // If avg fps > upper => incline (step quality up); if < lower => decline (step down)
        bounds={(refreshrate) => (refreshrate > 90 ? [50, 80] : [50, 60])}
        onIncline={() => onPerformanceChange(true)}
        onDecline={() => onPerformanceChange(false)}
        flipflops={2}>
        <ambientLight intensity={1.0} />
        {/* <OrbitControls /> */}
        <Camera />
        {isDebug && <Stats />}
        <Suspense>
          <Physics debug={false} timeStep={physicsTimeStep}>
            <Background />
            <FloatingTiles />
            <OutOfBounds />
            <Platform />
            <Player />
          </Physics>
        </Suspense>
      </PerformanceMonitor>
    </Canvas>
  )
}

export default Game
