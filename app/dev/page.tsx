'use client'

import { Canvas } from '@react-three/fiber'
import { type FC, useCallback, useMemo, useRef } from 'react'
import { useShallow } from 'zustand/react/shallow'

import {
  ColourTextureCanvas,
  type ColourTextureCanvasHandle,
  ColorControls,
  DownloadControls,
  ParticlePalettePreview,
  ParticleControls,
  TextureControls,
} from '@/components/dev/colourTexture/components'
import {
  DesignerToolsProvider,
  useDesignerToolsStore,
} from '@/components/dev/colourTexture/DesignerToolsProvider'
import {
  CUSTOM_PRESET_ID,
  DEFAULT_EXPORT_RESOLUTION,
  PRESET_RESOLUTIONS,
} from '@/components/dev/colourTexture/store/constants'
import type { ColourTextureTab } from '@/components/dev/colourTexture/store/types'
import {
  clampResolution,
  getNormalizedAspectMultipliers,
  parseAspectInput,
  parseResolutionInput,
} from '@/components/dev/colourTexture/utils'

const ColourTextureContent: FC = () => {
  const canvasRef = useRef<ColourTextureCanvasHandle>(null)

  const { params, config } = useDesignerToolsStore(
    useShallow((state) => ({
      params: state.params,
      config: state.config,
    })),
  )
  const {
    resolutionPresetId,
    customResolutionInput,
    aspectWidthInput,
    aspectHeightInput,
    activeTab,
    updateDisplay,
  } = useDesignerToolsStore(
    useShallow((state) => ({
      resolutionPresetId: state.display.resolutionPresetId,
      customResolutionInput: state.display.customResolutionInput,
      aspectWidthInput: state.display.aspectWidthInput,
      aspectHeightInput: state.display.aspectHeightInput,
      activeTab: state.display.activeTab,
      updateDisplay: state.updateDisplay,
    })),
  )

  const handleResolutionPresetChange = useCallback(
    (value: string) => updateDisplay('resolutionPresetId', value),
    [updateDisplay],
  )

  const handleCustomResolutionChange = useCallback(
    (value: string) => updateDisplay('customResolutionInput', value),
    [updateDisplay],
  )

  const handleAspectWidthInputChange = useCallback(
    (value: string) => updateDisplay('aspectWidthInput', value),
    [updateDisplay],
  )

  const handleAspectHeightInputChange = useCallback(
    (value: string) => updateDisplay('aspectHeightInput', value),
    [updateDisplay],
  )

  const handleTabChange = useCallback(
    (tab: ColourTextureTab) => updateDisplay('activeTab', tab),
    [updateDisplay],
  )


  const baseResolution = useMemo(() => {
    if (resolutionPresetId === CUSTOM_PRESET_ID) {
      return parseResolutionInput(customResolutionInput)
    }
    const preset = PRESET_RESOLUTIONS.find((entry) => entry.id === resolutionPresetId)
    return preset?.width ?? DEFAULT_EXPORT_RESOLUTION
  }, [customResolutionInput, resolutionPresetId])

  const aspectWidthValue = useMemo(() => parseAspectInput(aspectWidthInput), [aspectWidthInput])
  const aspectHeightValue = useMemo(
    () => parseAspectInput(aspectHeightInput),
    [aspectHeightInput],
  )

  const { widthMultiplier, heightMultiplier } = useMemo(
    () => getNormalizedAspectMultipliers(aspectWidthValue, aspectHeightValue),
    [aspectHeightValue, aspectWidthValue],
  )

  const downloadWidth = useMemo(
    () => clampResolution(Math.round(baseResolution * widthMultiplier)),
    [baseResolution, widthMultiplier],
  )
  const downloadHeight = useMemo(
    () => clampResolution(Math.round(baseResolution * heightMultiplier)),
    [baseResolution, heightMultiplier],
  )

  const previewAspectRatio = useMemo(() => {
    if (aspectHeightValue === 0) return 1
    return aspectWidthValue / aspectHeightValue
  }, [aspectHeightValue, aspectWidthValue])

  const handleDownload = useCallback(() => {
    if (!canvasRef.current) return

    if (resolutionPresetId === CUSTOM_PRESET_ID) {
      const safeResolution = parseResolutionInput(customResolutionInput)
      updateDisplay('customResolutionInput', String(safeResolution))
    }

    canvasRef.current.capture(downloadWidth, downloadHeight)
  }, [customResolutionInput, downloadHeight, downloadWidth, resolutionPresetId, updateDisplay])

  return (
    <main className="grid h-svh grid-cols-1 grid-rows-[auto_1fr] overflow-hidden text-neutral-50 lg:grid-cols-[480px_1fr]">
      <nav className="col-span-full flex flex-wrap items-center justify-between gap-4 border-b border-white/5 bg-black/30 px-6 py-3 backdrop-blur">
        <div className="flex items-center gap-3">
          <div className="size-10 rounded-2xl bg-white/10" />
          <div className="text-sm font-semibold tracking-[0.2em] text-neutral-400 uppercase">
            Dev Tools
          </div>
        </div>
        <div className="flex gap-2 rounded-lg bg-white/5 p-1">
          <button
            onClick={() => handleTabChange('color')}
            className={`flex-1 rounded-md px-4 py-2 text-sm font-medium transition ${
              activeTab === 'color'
                ? 'bg-white/10 text-white'
                : 'text-neutral-400 hover:text-white'
            }`}>
            Color
          </button>
          <button
            onClick={() => handleTabChange('texture')}
            className={`flex-1 rounded-md px-4 py-2 text-sm font-medium transition ${
              activeTab === 'texture'
                ? 'bg-white/10 text-white'
                : 'text-neutral-400 hover:text-white'
            }`}>
            Texture
          </button>
          <button
            onClick={() => handleTabChange('particles')}
            className={`flex-1 rounded-md px-4 py-2 text-sm font-medium transition ${
              activeTab === 'particles'
                ? 'bg-white/10 text-white'
                : 'text-neutral-400 hover:text-white'
            }`}>
            Particles
          </button>
        </div>
      </nav>

      <section className="flex flex-col gap-6 overflow-y-auto border-b border-white/5 p-6 lg:border-r lg:border-b-0">
        <div className="flex-1">
          {activeTab === 'color' && <ColorControls />}
          {activeTab === 'texture' && <TextureControls />}
          {activeTab === 'particles' && <ParticleControls />}
        </div>
      </section>

      {activeTab === 'particles' ? (
        <section className="flex flex-col overflow-hidden bg-[#020202]">
          <ParticlePalettePreview />
        </section>
      ) : (
        <section className="relative flex items-center justify-center overflow-hidden bg-[#000]">
          <div className="relative w-full max-w-full" style={{ maxHeight: '100%' }}>
            <Canvas
              orthographic
              className="absolute inset-0 size-full"
              style={{ aspectRatio: previewAspectRatio }}
              camera={{
                position: [0, 0, 1],
                near: 0.01,
                far: 10,
                zoom: 1,
              }}
              gl={{
                alpha: false,
                antialias: true,
                preserveDrawingBuffer: true,
              }}>
              <ColourTextureCanvas ref={canvasRef} colourParams={params} textureConfig={config} />
            </Canvas>
          </div>
          <DownloadControls
            resolutionId={resolutionPresetId}
            onResolutionChange={handleResolutionPresetChange}
            customResolution={customResolutionInput}
            onCustomResolutionChange={handleCustomResolutionChange}
            aspectWidth={aspectWidthInput}
            aspectHeight={aspectHeightInput}
            onAspectWidthChange={handleAspectWidthInputChange}
            onAspectHeightChange={handleAspectHeightInputChange}
            computedWidth={downloadWidth}
            computedHeight={downloadHeight}
            onDownload={handleDownload}
          />
        </section>
      )}
    </main>
  )
}

const ColourTexturePage: FC = () => (
  <DesignerToolsProvider>
    <ColourTextureContent />
  </DesignerToolsProvider>
)

export default ColourTexturePage
