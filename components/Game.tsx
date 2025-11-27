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
import obstacle4Texture from '@/assets/platform/obstacles-4.png'
import speedRunTexture from '@/assets/platform/speed-run-finish.png'
import ctaTexture from '@/assets/platform/cta.png'
import testTexture from '@/assets/platform/test.png'
import { loadHtmlImage } from '@/utils/loadImage'
import { parseSectionBitmap, type SectionBitmapLayout } from '@/utils/platform/sectionBitmap'
import Backdrop from './backdrop/Backdrop'

gsap.registerPlugin(useGSAP)

type Props = {
  isDebug: boolean
  isMobile: boolean
}

type TextureDescriptor = {
  src: string
  stage: Stage
}

const CORE_TEXTURES: TextureDescriptor[] = [
  { src: homeTexture.src, stage: Stage.HOME },
  { src: obstacle1Texture.src, stage: Stage.OBSTACLES },
  { src: info1Texture.src, stage: Stage.INFO },
  { src: obstacle2Texture.src, stage: Stage.OBSTACLES },
  { src: info2Texture.src, stage: Stage.INFO },
  { src: obstacle3Texture.src, stage: Stage.OBSTACLES },
  { src: info3Texture.src, stage: Stage.INFO },
  { src: obstacle4Texture.src, stage: Stage.OBSTACLES },
]

const MAIN_TEXTURES: TextureDescriptor[] = [
  ...CORE_TEXTURES,
  { src: ctaTexture.src, stage: Stage.CTA },
]

const SPEED_RUN_TEXTURES: TextureDescriptor[] = [
  ...CORE_TEXTURES,
  { src: speedRunTexture.src, stage: Stage.SPEED_RUN_FINISH },
]

// Use these when isTestPlatform is true
const TEST_TEXTURES: TextureDescriptor[] = [
  {
    src: testTexture.src,
    stage: Stage.TEST,
  },
]

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

  const { sectionLayouts, isTestMode } = usePlatformLayout()

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
              sectionLayouts={sectionLayouts}
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
  const [sectionLayouts, setSectionLayouts] = useState<SectionBitmapLayout[]>([])
  const setTotalRingsCount = useGameStore((s) => s.setTotalRingsCount)
  const resetPlatformTick = useGameStore((s) => s.resetPlatformTick)
  const isSpeedRunMode = useGameStore((s) => s.isSpeedRunMode)

  useEffect(() => {
    let isMounted = true

    const imageToLayout = (
      image: HTMLImageElement | null,
      stage: Stage,
    ): SectionBitmapLayout | null => {
      if (!image) return null
      try {
        return parseSectionBitmap(image, stage)
      } catch (error) {
        console.error(`[Game] Failed to parse ${stage} bitmap`, error)
        return null
      }
    }

    const textures = isTestMode
      ? TEST_TEXTURES
      : isSpeedRunMode
        ? SPEED_RUN_TEXTURES
        : MAIN_TEXTURES

    loadHtmlImage(textures.map((descriptor) => descriptor.src)).then((images) => {
      if (!isMounted) return
      const layouts: SectionBitmapLayout[] = images
        .map((image, index) => {
          const descriptor = textures[index]
          if (!descriptor) return null
          return imageToLayout(image, descriptor.stage)
        })
        .filter((layout): layout is SectionBitmapLayout => layout !== null)
      setSectionLayouts(layouts)
    })

    return () => {
      isMounted = false
    }
  }, [isTestMode, isSpeedRunMode])

  useEffect(() => {
    const updateTotalRingsCount = () => {
      const totalRings = sectionLayouts.reduce(
        (sum, layout) => sum + (layout?.totalRingsCount ?? 0),
        0,
      )
      setTotalRingsCount(totalRings)
    }

    updateTotalRingsCount()
  }, [resetPlatformTick, sectionLayouts, setTotalRingsCount])

  return {
    sectionLayouts,
    isTestMode,
  }
}
