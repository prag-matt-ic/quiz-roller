'use client'
const pendingLoads = new Map<string, Promise<HTMLImageElement>>()

function loadSingleHtmlImage(src: string): Promise<HTMLImageElement> {
  if (!src) {
    return Promise.reject(new Error('Image src must be provided'))
  }

  const cached = pendingLoads.get(src)
  if (cached) return cached

  if (typeof window === 'undefined') {
    return Promise.reject(new Error(`Cannot load image "${src}" on the server`))
  }

  const promise = new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image()
    image.decoding = 'async'
    image.loading = 'eager'

    image.onload = () => resolve(image)
    image.onerror = () => {
      pendingLoads.delete(src)
      reject(new Error(`Failed to load image "${src}"`))
    }

    image.src = src
  })

  pendingLoads.set(src, promise)
  return promise
}

export function loadHtmlImage(src: string): Promise<HTMLImageElement>

export function loadHtmlImage(srcs: string[]): Promise<(HTMLImageElement | null)[]>

export function loadHtmlImage(
  input: string | string[],
): Promise<HTMLImageElement | (HTMLImageElement | null)[]> {
  if (Array.isArray(input)) {
    return Promise.all(
      input.map((src) =>
        loadSingleHtmlImage(src).catch((error) => {
          if (process.env.NODE_ENV !== 'production') {
            console.warn(`[loadHtmlImage] Failed to load texture "${src}"`, error)
          }
          return null
        }),
      ),
    )
  }
  return loadSingleHtmlImage(input)
}
