'use client'

import { useGSAP } from '@gsap/react'
import { OrbitControls, PerformanceMonitor, Stats } from '@react-three/drei'
import { Canvas } from '@react-three/fiber'
import { Physics } from '@react-three/rapier'
import gsap from 'gsap'
import { type FC, Suspense, useEffect, useMemo, useState } from 'react'

import Platform from '@/components/platform/Platform'
import Player from '@/components/player/Player'

import Camera, { CAMERA_POSITION_FOR_STAGE } from './Camera'
import { Stage } from './GameProvider'
import OutOfBounds from './OutOfBounds'
import { usePerformanceStore } from './PerformanceProvider'
import homeTexture from '@/assets/platform/home.png'
import info1Texture from '@/assets/platform/info-1.png'
import info2Texture from '@/assets/platform/info-2.png'
import info3Texture from '@/assets/platform/info-3.png'
import obstacle1Texture from '@/assets/platform/obstacles-1.png'
import obstacle2Texture from '@/assets/platform/obstacles-2.png'
import speedRunTexture from '@/assets/platform/speed-run-finish.png'
import ctaTexture from '@/assets/platform/cta.png'
import { loadHtmlImage } from '@/utils/loadImage'
import { parseSectionBitmap, type SectionBitmapLayout } from '@/utils/platform/sectionBitmap'
import Backdrop from './backdrop/Backdrop'
// import Background from './background/Background'

gsap.registerPlugin(useGSAP)

// Start at the intro sweep position to avoid a jump before animation
const HOME_CAMERA_POSITION = CAMERA_POSITION_FOR_STAGE[Stage.HOME]
const INITIAL_CAMERA_POSITION = {
  x: 0,
  y: HOME_CAMERA_POSITION.y,
  z: HOME_CAMERA_POSITION.z,
}

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

  const dpr = useMemo<number>(() => {
    if (typeof window === 'undefined') return 1
    if (!!maxDPR) return Math.min(window.devicePixelRatio ?? 1, maxDPR)
    return window.devicePixelRatio ?? 1
  }, [maxDPR])

  const { homeLayout, infoLayouts, obstacleLayouts, speedRunLayout, ctaLayout } =
    usePlatformLayout()

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
        far: process.env.NODE_ENV === 'development' ? 10000 : 40,
        fov: 65,
      }}
      gl={{
        alpha: false,
        antialias: !isMobile,
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
        <Backdrop />
        <Suspense>
          <Physics debug={isDebug} timeStep={physicsTimeStep}>
            <OutOfBounds />
            <Platform
              homeLayout={homeLayout}
              infoLayouts={infoLayouts}
              obstacleLayouts={obstacleLayouts}
              speedRunLayout={speedRunLayout}
              ctaLayout={ctaLayout}
            />
            <Player />
          </Physics>
        </Suspense>
      </PerformanceMonitor>
    </Canvas>
  )
}

export default Game

function usePlatformLayout() {
  const [homeLayout, setHomeLayout] = useState<SectionBitmapLayout | null>(null)
  const [obstacleLayouts, setObstacleLayouts] = useState<Array<SectionBitmapLayout | null>>([])
  const [infoLayouts, setInfoLayouts] = useState<Array<SectionBitmapLayout | null>>([])
  const [speedRunLayout, setSpeedRunLayout] = useState<SectionBitmapLayout | null>(null)
  const [ctaLayout, setCtaLayout] = useState<SectionBitmapLayout | null>(null)

  useEffect(() => {
    let isMounted = true

    const imageToLayout = (
      image: HTMLImageElement | null,
      label: string,
    ): SectionBitmapLayout | null => {
      if (!image) return null
      try {
        return parseSectionBitmap(image)
      } catch (error) {
        console.error(`[Game] Failed to parse ${label} bitmap`, error)
        return null
      }
    }

    loadHtmlImage([
      homeTexture.src,
      ...INFO_BITMAP_TEXTURES,
      ...OBSTACLE_BITMAP_TEXTURES,
      speedRunTexture.src,
      ctaTexture.src,
    ]).then((images) => {
      if (!isMounted) return
      let idx = 0

      setHomeLayout(imageToLayout(images[idx++], 'home'))

      const infoImages = images.slice(idx, idx + INFO_BITMAP_TEXTURES.length)
      setInfoLayouts(
        infoImages.map((image, layoutIndex) => imageToLayout(image, `info-${layoutIndex}`)),
      )
      idx += INFO_BITMAP_TEXTURES.length

      const obstacleImages = images.slice(idx, idx + OBSTACLE_BITMAP_TEXTURES.length)
      setObstacleLayouts(
        obstacleImages.map((image, layoutIndex) =>
          imageToLayout(image, `obstacle-${layoutIndex}`),
        ),
      )
      idx += OBSTACLE_BITMAP_TEXTURES.length

      setSpeedRunLayout(imageToLayout(images[idx], 'speed-run'))
      idx++

      setCtaLayout(imageToLayout(images[idx], 'cta'))
    })

    return () => {
      isMounted = false
    }
  }, [])
  return { homeLayout, infoLayouts, obstacleLayouts, speedRunLayout, ctaLayout }
}
