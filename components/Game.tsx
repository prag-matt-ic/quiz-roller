'use client'

import { useGSAP } from '@gsap/react'
import { OrbitControls, PerformanceMonitor, Stats } from '@react-three/drei'
import { Canvas } from '@react-three/fiber'
import { Physics } from '@react-three/rapier'
import gsap from 'gsap'
import { type FC, Suspense, useEffect, useMemo } from 'react'

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
import {
  createRowContentIndexes,
  parseSectionBitmap,
  type RowContentIndexes,
} from '@/utils/platform/sectionBitmap'
import type { RowData } from '@/utils/tiles'
import {
  COLLECTIBLES_CONTENT,
  FLOATING_HEADINGS_CONTENT,
  INFO_ZONES_CONTENT,
} from '@/resources/content'
import Backdrop from './backdrop/Backdrop'
import { GameMode } from '@/stores/types'

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

// Use these when mode === GameMode.TEST
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

  const mode = usePlatformRows()

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
            <Platform key={mode} />
            <Player />
          </Physics>
        </Suspense>
      </PerformanceMonitor>
    </Canvas>
  )
}

export default Game

const MODE_TEXTURES_MAP: Record<GameMode, TextureDescriptor[]> = {
  [GameMode.MAIN]: MAIN_TEXTURES,
  [GameMode.SPEEDRUN]: SPEED_RUN_TEXTURES,
  [GameMode.TEST]: TEST_TEXTURES,
}

function usePlatformRows() {
  const mode = useGameStore((s) => s.mode)
  const setTotalRingsCount = useGameStore((s) => s.setTotalRingsCount)
  const setRowsData = useGameStore((s) => s.setRowsData)

  useEffect(() => {
    let isMounted = true
    const textures = MODE_TEXTURES_MAP[mode] || MAIN_TEXTURES

    const textureSources = textures.map((descriptor) => descriptor.src)
    const globalIndexes = createRowContentIndexes()

    loadHtmlImage(textureSources).then((images) => {
      if (!isMounted) return

      const rows: RowData[] = []
      let totalRings = 0

      images.forEach((image, index) => {
        const descriptor = textures[index]
        if (!descriptor || !image) return

        try {
          const { rows: parsedRows, totalRingsCount } = parseSectionBitmap(
            image,
            descriptor.stage,
            globalIndexes,
          )
          rows.push(...parsedRows)
          totalRings += totalRingsCount
        } catch (error) {
          console.error(`[Game] Failed to parse ${descriptor.stage} bitmap`, error)
        }
      })

      logRowBuildSummary(rows.length, textures.length, globalIndexes)
      setTotalRingsCount(totalRings)
      setRowsData(rows)
    })

    return () => {
      isMounted = false
    }
  }, [mode, setRowsData, setTotalRingsCount])

  return mode
}

function logRowBuildSummary(
  rowCount: number,
  textureCount: number,
  indexes: RowContentIndexes,
) {
  console.warn(`[Game] Built ${rowCount} rows from ${textureCount} textures`, { indexes })

  if (indexes.heading > FLOATING_HEADINGS_CONTENT.length) {
    console.error('More floating headings used than content available')
  }

  if (indexes.infoZone > INFO_ZONES_CONTENT.length) {
    console.error('More info zones used than content available', {
      indexes,
      infoContentLength: INFO_ZONES_CONTENT.length,
    })
  }

  if (indexes.collectible > Object.keys(COLLECTIBLES_CONTENT).length) {
    console.error('More collectibles used than content available', { indexes })
  }
}
