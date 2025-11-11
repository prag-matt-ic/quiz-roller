'use client'

import { Leva } from 'leva'

import { LEVA_CONTROLS_THEME } from '@/components/textureGenerator/levaTheme'
// import TextureCanvas from '@/components/textureGenerator/TextureCanvas'

function TextureGeneratorPage() {
  return (
    <main className="grid h-screen w-full grid-cols-[1fr_500px] grid-rows-[auto_1fr] overflow-hidden bg-gray-900 text-white">
      {/* Header */}
      <header className="col-span-2 px-6 py-4">
        <h1 className="text-2xl font-bold">Background Texture Generator</h1>
      </header>

      {/* Main Content */}
      <div className="relative flex items-center justify-center bg-black">
        <div className="!absolute !aspect-square !h-full max-w-full shrink-0">
          {/* <TextureCanvas /> */}
        </div>
      </div>

      <aside className="h-full overflow-auto bg-slate-900">
        <Leva
          theme={LEVA_CONTROLS_THEME}
          hideCopyButton={true}
          titleBar={{ drag: false, filter: false }}
          fill={true}
          collapsed={false}
        />
      </aside>
    </main>
  )
}

export default TextureGeneratorPage
