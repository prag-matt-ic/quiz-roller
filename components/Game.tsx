'use client'

import { useGSAP } from '@gsap/react'
import { PerformanceMonitor, Stats, OrbitControls } from '@react-three/drei'
import { Canvas } from '@react-three/fiber'
import { Physics } from '@react-three/rapier'
import gsap from 'gsap'
import { type FC, Suspense, useEffect, useMemo, useState } from 'react'

import Background from '@/components/background/Background'
import Platform from '@/components/platform/Platform'
import Player from '@/components/player/Player'

import Camera, { CAMERA_CONFIG } from './Camera'
import FloatingTiles from './floatingTiles/FloatingTiles'
import { Stage } from './GameProvider'
import OutOfBounds from './OutOfBounds'
import { usePerformanceStore } from './PerformanceProvider'
import homeTexture from '@/assets/platform/home.png'
import info1Texture from '@/assets/platform/info-1.png'
import info2Texture from '@/assets/platform/info-2.png'
import info3Texture from '@/assets/platform/info-3.png'
import obstacle1Texture from '@/assets/platform/obstacles-1.png'
import obstacle2Texture from '@/assets/platform/obstacles-2.png'
import { loadHtmlImage } from '@/utils/loadImage'

gsap.registerPlugin(useGSAP)

// Start at the intro sweep position to avoid a jump before animation
const INITIAL_CAMERA_POSITION = CAMERA_CONFIG[Stage.HOME].position

type Props = {
  isDebug: boolean
  isMobile: boolean
}

const INFO_BITMAP_TEXTURES = [info1Texture.src, info2Texture.src, info3Texture.src] // TODO: replace duplicates once dedicated info bitmaps are available
const OBSTACLE_BITMAP_TEXTURES = [
  obstacle1Texture.src,
  obstacle2Texture.src,
  obstacle1Texture.src,
  obstacle2Texture.src,
]

const Game: FC<Props> = ({ isDebug, isMobile }) => {
  const maxDPR = usePerformanceStore((s) => s.maxDPR)
  const simFps = usePerformanceStore((s) => s.simFps)
  const onPerformanceChange = usePerformanceStore((s) => s.onPerformanceChange)
  const physicsTimeStep = simFps === 0 ? 'vary' : 1 / simFps
  const [homeBitmap, setHomeBitmap] = useState<HTMLImageElement | null>(null)
  const [obstaclesBitmaps, setObstaclesBitmaps] = useState<(HTMLImageElement | null)[]>([])
  const [infoBitmaps, setInfoBitmaps] = useState<(HTMLImageElement | null)[]>([])

  useEffect(() => {
    let isMounted = true

    loadHtmlImage([homeTexture.src, ...INFO_BITMAP_TEXTURES, ...OBSTACLE_BITMAP_TEXTURES]).then(
      (images) => {
        if (!isMounted) return
        setHomeBitmap(images[0])
        setInfoBitmaps(images.slice(1, 1 + INFO_BITMAP_TEXTURES.length))
        setObstaclesBitmaps(images.slice(1 + INFO_BITMAP_TEXTURES.length))
      },
    )

    return () => {
      isMounted = false
    }
  }, [])

  const dpr = useMemo<number>(() => {
    if (typeof window === 'undefined') return 1
    if (!!maxDPR) return Math.min(window.devicePixelRatio ?? 1, maxDPR)
    return window.devicePixelRatio ?? 1
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
        toneMappingExposure: 0.2,
        powerPreference: 'high-performance',
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
          <Physics debug={isDebug} timeStep={physicsTimeStep}>
            {/* <Background /> */}

            {/* TODO: drive the floating tiles using the row data/textures.. */}
            <FloatingTiles />
            <OutOfBounds />
            <Platform
              homeBitmap={homeBitmap}
              infoBitmaps={infoBitmaps}
              obstacleBitmaps={obstaclesBitmaps}
            />
            <Player />
          </Physics>
        </Suspense>
      </PerformanceMonitor>
    </Canvas>
  )
}

export default Game
