import { useEffect } from 'react'

import { Stage, useGameStore } from '@/components/GameProvider'
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
import { parseSectionBitmap } from '@/utils/platform/sectionBitmap'
import type { RowData } from '@/utils/tiles'
import { GameMode } from '@/stores/types'
import { createTotalCounts } from '@/stores/totalCounts'

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
  { src: ctaTexture.src, stage: Stage.CTA },
]

const MODE_TEXTURES_MAP: Record<GameMode, TextureDescriptor[]> = {
  [GameMode.MAIN]: MAIN_TEXTURES,
  [GameMode.SPEEDRUN]: SPEED_RUN_TEXTURES,
  [GameMode.TEST]: TEST_TEXTURES,
}

function usePlatformRows() {
  const mode = useGameStore((s) => s.mode)
  const setRowsData = useGameStore((s) => s.setRowsData)

  useEffect(() => {
    let isMounted = true
    const textures = MODE_TEXTURES_MAP[mode] || MAIN_TEXTURES

    const textureSources = textures.map((descriptor) => descriptor.src)
    const totalCounts = createTotalCounts()

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
  }, [mode, setRowsData])

  return mode
}
export default usePlatformRows
