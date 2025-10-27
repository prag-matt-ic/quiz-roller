'use client'

import { useTexture } from '@react-three/drei'
import { useThree } from '@react-three/fiber'
import { type FC, useEffect } from 'react'
import * as THREE from 'three'

import backgroundImage from '@/assets/textures/background.webp'

const Background: FC = () => {
  const scene = useThree((s) => s.scene)
  const { width: viewportWidth, height: viewportHeight } = useThree((s) => s.size)
  const texture = useTexture(backgroundImage.src)

  useEffect(() => {
    if (!texture || viewportWidth === 0 || viewportHeight === 0) return
    const imageWidth = backgroundImage.width
    const imageHeight = backgroundImage.height
    if (!imageWidth || !imageHeight) return

    texture.colorSpace = THREE.LinearSRGBColorSpace
    texture.wrapS = THREE.ClampToEdgeWrapping
    texture.wrapT = THREE.ClampToEdgeWrapping

    const rendererAspect = viewportWidth / viewportHeight
    const imageAspect = imageWidth / imageHeight

    let repeatX = 1
    let repeatY = 1

    if (rendererAspect > imageAspect) {
      repeatY = imageAspect / rendererAspect
    } else if (rendererAspect < imageAspect) {
      repeatX = rendererAspect / imageAspect
    }

    const offsetX = (1 - repeatX) * 0.5
    const offsetY = (1 - repeatY) * 0.5

    const prevMatrixAutoUpdate = texture.matrixAutoUpdate
    const prevRepeatX = texture.repeat.x
    const prevRepeatY = texture.repeat.y
    const prevOffsetX = texture.offset.x
    const prevOffsetY = texture.offset.y

    texture.matrixAutoUpdate = false
    texture.repeat.set(repeatX, repeatY)
    texture.offset.set(offsetX, offsetY)
    texture.updateMatrix()
    texture.needsUpdate = true

    scene.background = texture

    return () => {
      scene.background = null
      texture.matrixAutoUpdate = prevMatrixAutoUpdate
      texture.repeat.set(prevRepeatX, prevRepeatY)
      texture.offset.set(prevOffsetX, prevOffsetY)
      texture.updateMatrix()
    }
  }, [scene, texture, viewportWidth, viewportHeight])

  return null
}

export default Background
