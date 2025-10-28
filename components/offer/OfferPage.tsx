'use client'

import { Canvas } from '@react-three/fiber'
import { type FC, Suspense } from 'react'

import OfferBackground from '@/components/offer/OfferBackground'

const OfferPage: FC = () => {
  return (
    <div className="relative h-lvh w-full">
      <div className="pointer-events-none fixed inset-0 -z-10">
        <Canvas dpr={1} gl={{ antialias: false }}>
          <Suspense>
            <OfferBackground />
          </Suspense>
        </Canvas>
      </div>

      <main className="relative z-10 h-lvh overflow-auto">
        <section id="hero" className="mx-auto max-w-5xl px-6 py-16">
          <div className="space-y-6">
            <h1 className="heading-xl">Offer — Palette &amp; Gradients</h1>
            <p className="paragraph">
              Quick visual test of the palette variables and OKLCH gradients.
            </p>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="rounded-lg p-6 text-white shadow-lg"
                  style={{ background: `var(--palette-range-${i}-oklch)` }}>
                  <h2 className="heading-md">Range {i} (OKLCH)</h2>
                  <p className="paragraph-sm">
                    Uses <code>--palette-range-{i}-oklch</code>
                  </p>
                </div>
              ))}
            </div>

            <div>
              <h3 className="subheading">Discrete swatches</h3>
              <div className="mt-3 flex flex-wrap gap-3">
                {Array.from({ length: 10 }).map((_, i) => (
                  <div
                    key={i}
                    className="h-10 w-10 rounded border shadow-inner"
                    style={{ background: `var(--palette-${i})` }}
                    title={`--palette-${i}`}
                  />
                ))}
              </div>
            </div>
          </div>
        </section>

        <section id="pilot-plan" className="mx-auto max-w-5xl px-6 py-16">
          <div className="space-y-4">
            <h2 className="heading-lg">More tests</h2>
            <p className="paragraph">
              Use these styles to validate blending and contrast in the scene.
            </p>

            <div className="flex gap-4">
              <button
                className="rounded-lg px-4 py-2 text-black"
                style={{ background: 'var(--palette-2)' }}>
                Action
              </button>

              <button
                className="rounded-lg border px-4 py-2 text-white"
                style={{
                  background: 'linear-gradient(90deg, var(--palette-7), var(--palette-9))',
                }}>
                Gradient Button
              </button>
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}

export default OfferPage
