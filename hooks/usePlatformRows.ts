import { useEffect } from 'react'

import ctaTexture from '@/assets/platform/1.0/cta.png'
import homeTexture from '@/assets/platform/1.0/home.png'
import info1Texture from '@/assets/platform/1.0/info-1.png'
import info2Texture from '@/assets/platform/1.0/info-2.png'
import info3Texture from '@/assets/platform/1.0/info-3.png'
import obstacle1Texture from '@/assets/platform/1.0/obstacles-1.png'
import obstacle2Texture from '@/assets/platform/1.0/obstacles-2.png'
import obstacle3Texture from '@/assets/platform/1.0/obstacles-3.png'
import obstacle4Texture from '@/assets/platform/1.0/obstacles-4.png'
import speedRunTexture from '@/assets/platform/1.0/speed-run-finish.png'
import testTexture from '@/assets/platform/1.0/test.png'
import { Stage, useGameStore } from '@/components/GameProvider'
import { createTotalCounts } from '@/stores/totalCounts'
import { GameMode } from '@/stores/types'
import { loadHtmlImage } from '@/utils/loadImage'
import { parseSectionBitmap } from '@/utils/platform/sectionBitmap'
import type { RowData } from '@/utils/tiles'

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

const MAIN_RUN_TEXTURES: TextureDescriptor[] = [
  ...CORE_TEXTURES,
  { src: ctaTexture.src, stage: Stage.CTA },
]

const SPEED_RUN_TEXTURES: TextureDescriptor[] = [
  ...CORE_TEXTURES,
  { src: speedRunTexture.src, stage: Stage.SPEED_RUN_FINISH },
]

const TEST_MODE_TEXTURES: TextureDescriptor[] = [
  {
    src: testTexture.src,
    stage: Stage.HOME,
  },
  { src: ctaTexture.src, stage: Stage.CTA },
]

const MODE_TEXTURES_MAP: Record<GameMode, TextureDescriptor[]> = {
  [GameMode.MAIN]: MAIN_RUN_TEXTURES,
  [GameMode.SPEEDRUN]: SPEED_RUN_TEXTURES,
  [GameMode.TEST]: TEST_MODE_TEXTURES,
}

// TODO: handle new level versions..

function usePlatformRows() {
  const isStoreHydrated = useGameStore((s) => s._isHydrated)
  const mode = useGameStore((s) => s.mode)
  const setRowsData = useGameStore((s) => s.setRowsData)

  useEffect(() => {
    if (!isStoreHydrated) return
    let isMounted = true
    const textures = MODE_TEXTURES_MAP[mode] || MAIN_RUN_TEXTURES

    const textureSources = textures.map((descriptor) => descriptor.src)
    const totalCounts = createTotalCounts()

    console.warn('[Game] Loading platform rows for mode:', { isStoreHydrated, mode })

    loadHtmlImage(textureSources).then((images) => {
      if (!isMounted) return

      const rows: RowData[] = []

      images.forEach((image, index) => {
        const descriptor = textures[index]
        if (!descriptor || !image) return
        try {
          const { rows: parsedRows } = parseSectionBitmap(image, descriptor.stage, totalCounts)
          rows.push(...parsedRows)
        } catch (error) {
          console.error(`[Game] Failed to parse ${descriptor.stage} bitmap`, error)
        }
      })
      setRowsData(rows, totalCounts)
    })

    return () => {
      isMounted = false
    }
  }, [isStoreHydrated, mode, setRowsData])

  return mode
}
export default usePlatformRows
