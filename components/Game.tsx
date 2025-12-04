'use client'

import { useGSAP } from '@gsap/react'
import { OrbitControls, PerformanceMonitor, Stats } from '@react-three/drei'
import { Canvas } from '@react-three/fiber'
import { Physics } from '@react-three/rapier'
import gsap from 'gsap'
import { type FC, Suspense, useMemo } from 'react'

import Camera, {
  CAMERA_POSITION_FOR_STAGE_DESKTOP,
  CAMERA_POSITION_FOR_STAGE_MOBILE,
} from '@/components/Camera'
import { Stage } from '@/components/GameProvider'
import OutOfBounds from '@/components/OutOfBounds'
import { usePerformanceStore } from '@/components/PerformanceProvider'
import Backdrop from '@/components/backdrop/Backdrop'
import Platform from '@/components/platform/Platform'
import Player from '@/components/player/Player'

gsap.registerPlugin(useGSAP)

type Props = {
  isDebug: boolean
  isMobile: boolean
}

const Game: FC<Props> = ({ isDebug, isMobile }) => {
  const maxDPR = usePerformanceStore((s) => s.maxDPR)
  const simFps = usePerformanceStore((s) => s.simFps)
  const onPerformanceChange = usePerformanceStore((s) => s.onPerformanceChange)
  const isPhysicsDebug = usePerformanceStore((s) => s.isPhysicsDebug)
  const physicsTimeStep = simFps === 0 ? 'vary' : 1 / simFps

  const cameraPositions = isMobile
    ? CAMERA_POSITION_FOR_STAGE_MOBILE
    : CAMERA_POSITION_FOR_STAGE_DESKTOP

  const dpr = useMemo<number>(() => {
    if (typeof window === 'undefined') return 1
    if (!!maxDPR) return Math.min(window.devicePixelRatio ?? 1, maxDPR)
    return window.devicePixelRatio ?? 1
  }, [maxDPR])

  return (
    <Canvas
      className="fixed! inset-0! h-dvh! w-full"
      onContextMenu={(e) => e.preventDefault()}
      dpr={dpr}
      camera={{
        position: [0, cameraPositions[Stage.HOME].y, cameraPositions[Stage.HOME].z],
        far: process.env.NODE_ENV === 'development' ? 10000 : 40,
        fov: 65,
      }}
      gl={{
        alpha: false,
        antialias: !isMobile,
        powerPreference:
          process.env.NODE_ENV === 'development' ? 'low-power' : 'high-performance',
      }}>
      <PerformanceMonitor
        // Create an upper/lower FPS band relative to device refresh rate
        // If avg fps > upper => incline (step quality up); if < lower => decline (step down)
        bounds={(refreshrate) => (refreshrate > 90 ? [50, 80] : [50, 60])}
        onIncline={() => onPerformanceChange(true)}
        onDecline={() => onPerformanceChange(false)}
        flipflops={2}>
        {/* <ambientLight intensity={1.0} /> */}
        {/* <OrbitControls /> */}
        <Camera isMobile={isMobile} positions={cameraPositions} />
        {isDebug && <Stats />}
        <Backdrop />
        <Suspense>
          <Physics debug={isPhysicsDebug} timeStep={physicsTimeStep}>
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

// ------------------
// Ideas

// player fly in effect on initial spawn. Platform starts out of view, it then scrolls towards the player as the player's y position drops it onto the starting place.

// Glass walls with text that shatter as you roll through them
