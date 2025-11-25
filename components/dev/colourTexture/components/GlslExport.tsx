import { type FC, useMemo, useState } from 'react'
import { Copy } from 'lucide-react'
import type { Vector3Tuple } from 'three'

import type { CosinePaletteParams } from '../store/types'

export type GlslExportProps = {
  params: CosinePaletteParams
}

export const GlslExport: FC<GlslExportProps> = ({ params }) => {
  const [copiedGlsl, setCopiedGlsl] = useState(false)
  const [copiedJson, setCopiedJson] = useState(false)

  const glslCode = useMemo(() => {
    const formatVec3 = (vector: Vector3Tuple) =>
      `vec3(${vector[0].toFixed(3)}, ${vector[1].toFixed(3)}, ${vector[2].toFixed(3)})`

    return `vec3 a = ${formatVec3(params.a)};\nvec3 b = ${formatVec3(params.b)};\nvec3 c = ${formatVec3(params.c)};\nvec3 d = ${formatVec3(params.d)};`
  }, [params])

  const jsonCode = useMemo(() => JSON.stringify(params, null, 2), [params])

  const handleCopy = (value: string, setter: (state: boolean) => void) => {
    navigator.clipboard.writeText(value)
    setter(true)
    setTimeout(() => setter(false), 2000)
  }

  return (
    <div className="rounded-xl border border-white/5 bg-black/10 p-4">
      <div className="mb-2 flex items-center justify-between">
        <p className="text-sm font-semibold text-white">Export</p>
        <div className="flex gap-2">
          <button
            onClick={() => handleCopy(jsonCode, setCopiedJson)}
            className="flex items-center gap-2 rounded-lg bg-white/10 px-2 py-1 text-xs font-medium text-white transition hover:bg-white/20">
            {copiedJson ? (
              'Copied JSON!'
            ) : (
              <>
                <Copy size={12} />
                Copy JSON
              </>
            )}
          </button>
          <button
            onClick={() => handleCopy(glslCode, setCopiedGlsl)}
            className="flex items-center gap-2 rounded-lg bg-white/10 px-2 py-1 text-xs font-medium text-white transition hover:bg-white/20">
            {copiedGlsl ? (
              'Copied GLSL!'
            ) : (
              <>
                <Copy size={12} />
                Copy GLSL
              </>
            )}
          </button>
        </div>
      </div>
      <pre className="overflow-x-auto rounded-lg bg-black/30 p-3 font-mono text-[0.65rem] text-neutral-400">
        {glslCode}
      </pre>
    </div>
  )
}
