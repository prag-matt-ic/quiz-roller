'use client'

import { useGSAP } from '@gsap/react'
import { OrbitControls, PerformanceMonitor, Stats } from '@react-three/drei'
import { Canvas } from '@react-three/fiber'
import { Physics } from '@react-three/rapier'
import gsap from 'gsap'
import { type FC, Suspense, useEffect, useMemo, useState } from 'react'

import Platform from '@/components/platform/Platform'
import Player from '@/components/player/Player'

import Camera, {
  CAMERA_POSITION_FOR_STAGE_DESKTOP,
  CAMERA_POSITION_FOR_STAGE_MOBILE,
} from './Camera'
import { Stage, useGameStore } from './GameProvider'
import OutOfBounds from './OutOfBounds'
import { usePerformanceStore } from './PerformanceProvider'
import homeTexture from '@/assets/platform/home.png'
import info1Texture from '@/assets/platform/info-1.png'
import info2Texture from '@/assets/platform/info-2.png'
import info3Texture from '@/assets/platform/info-3.png'
import obstacle1Texture from '@/assets/platform/obstacles-1.png'
import obstacle2Texture from '@/assets/platform/obstacles-2.png'
import obstacle3Texture from '@/assets/platform/obstacles-3.png'
import speedRunTexture from '@/assets/platform/speed-run-finish.png'
import ctaTexture from '@/assets/platform/cta.png'
import testTexture from '@/assets/platform/test.png'
import { INFO_ZONES_CONTENT } from '@/resources/content'
import { loadHtmlImage } from '@/utils/loadImage'
import { parseSectionBitmap, type SectionBitmapLayout } from '@/utils/platform/sectionBitmap'
import Backdrop from './backdrop/Backdrop'

gsap.registerPlugin(useGSAP)

type Props = {
  isDebug: boolean
  isMobile: boolean
}

const INFO_BITMAP_TEXTURES = [info1Texture.src, info2Texture.src, info3Texture.src]
const OBSTACLE_BITMAP_TEXTURES = [
  obstacle1Texture.src,
  obstacle2Texture.src,
  obstacle1Texture.src,
  obstacle3Texture.src,
]

const TEST_SECTIONS_COUNT = INFO_ZONES_CONTENT.length

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

  const {
    homeLayout,
    infoLayouts,
    obstacleLayouts,
    speedRunLayout,
    ctaLayout,
    testLayouts,
    isTestMode,
  } = usePlatformLayout()

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
        powerPreference: 'high-performance',
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
            <Platform
              key={isTestMode ? 'test' : 'normal'}
              homeLayout={homeLayout}
              infoLayouts={infoLayouts}
              obstacleLayouts={obstacleLayouts}
              speedRunLayout={speedRunLayout}
              ctaLayout={ctaLayout}
              testLayouts={testLayouts}
              isTestMode={isTestMode}
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
  const isTestMode = usePerformanceStore((s) => s.isTestPlatform)
  const [homeLayout, setHomeLayout] = useState<SectionBitmapLayout | null>(null)
  const [obstacleLayouts, setObstacleLayouts] = useState<Array<SectionBitmapLayout | null>>([])
  const [infoLayouts, setInfoLayouts] = useState<Array<SectionBitmapLayout | null>>([])
  const [speedRunLayout, setSpeedRunLayout] = useState<SectionBitmapLayout | null>(null)
  const [ctaLayout, setCtaLayout] = useState<SectionBitmapLayout | null>(null)
  const [testLayouts, setTestLayouts] = useState<Array<SectionBitmapLayout | null>>([])
  const setTotalRingsCount = useGameStore((s) => s.setTotalRingsCount)
  const resetPlatformTick = useGameStore((s) => s.resetPlatformTick)
  const isSpeedRunMode = useGameStore((s) => s.isSpeedRunMode)

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

    if (isTestMode) {
      loadHtmlImage([testTexture.src]).then((images) => {
        if (!isMounted) return
        const layout = imageToLayout(images[0], 'test')
        const repeatedLayouts = layout
          ? Array.from({ length: TEST_SECTIONS_COUNT }, () => layout)
          : []
        setTestLayouts(repeatedLayouts)
        setHomeLayout(null)
        setInfoLayouts([])
        setObstacleLayouts([])
        setSpeedRunLayout(null)
        setCtaLayout(null)
      })
    } else {
      loadHtmlImage([
        homeTexture.src,
        ...INFO_BITMAP_TEXTURES,
        ...OBSTACLE_BITMAP_TEXTURES,
        speedRunTexture.src,
        ctaTexture.src,
      ]).then((images) => {
        if (!isMounted) return
        let index = 0

        const homeLayout = imageToLayout(images[index], 'home')
        index++

        const infoImages = images.slice(index, index + INFO_BITMAP_TEXTURES.length)
        const infoLayouts = infoImages.map((image, layoutIndex) =>
          imageToLayout(image, `info-${layoutIndex}`),
        )
        index += INFO_BITMAP_TEXTURES.length

        const obstacleImages = images.slice(index, index + OBSTACLE_BITMAP_TEXTURES.length)
        const obstacleLayouts = obstacleImages.map((image, layoutIndex) =>
          imageToLayout(image, `obstacle-${layoutIndex}`),
        )
        index += OBSTACLE_BITMAP_TEXTURES.length

        const speedRunLayout = imageToLayout(images[index], 'speed-run')
        index++

        const ctaLayout = imageToLayout(images[index], 'cta')

        setTestLayouts([])
        setHomeLayout(homeLayout)
        setInfoLayouts(infoLayouts)
        setObstacleLayouts(obstacleLayouts)
        setSpeedRunLayout(speedRunLayout)
        setCtaLayout(ctaLayout)
      })
    }

    return () => {
      isMounted = false
    }
  }, [isTestMode, setTotalRingsCount])

  useEffect(() => {
    const updateTotalRingsCount = () => {
      if (isTestMode) {
        const totalTestRings = testLayouts.reduce(
          (sum, layout) => sum + (layout?.totalRingsCount ?? 0),
          0,
        )
        setTotalRingsCount(totalTestRings)
        return
      }

      const layouts = [homeLayout, ...infoLayouts, ...obstacleLayouts]
      if (isSpeedRunMode) layouts.push(speedRunLayout)
      else layouts.push(ctaLayout)

      const totalRings = layouts.reduce(
        (sum, layout) => sum + (layout?.totalRingsCount ?? 0),
        0,
      )
      setTotalRingsCount(totalRings)
    }

    updateTotalRingsCount()
  }, [
    resetPlatformTick,
    homeLayout,
    infoLayouts,
    obstacleLayouts,
    speedRunLayout,
    ctaLayout,
    setTotalRingsCount,
    isSpeedRunMode,
    isTestMode,
    testLayouts,
  ])

  return {
    homeLayout,
    infoLayouts,
    obstacleLayouts,
    speedRunLayout,
    ctaLayout,
    testLayouts,
    isTestMode,
  }
}
