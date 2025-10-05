'use client'

import { KinematicCharacterController } from '@dimforge/rapier3d-compat'
import { useRapier } from '@react-three/rapier'
import { useEffect, useLayoutEffect, useRef } from 'react'

type Input = {
  forward: boolean
  backward: boolean
  left: boolean
  right: boolean
}

function usePlayerController() {
  const { world } = useRapier()
  const controllerRef = useRef<KinematicCharacterController | null>(null)

  useLayoutEffect(() => {
    if (!world) return
    if (!!controllerRef.current) return // already created

    function setupController() {
      const controller = world.createCharacterController(0.01)

      // Enable auto-stepping over small obstacles (like terrain gaps)
      controller.enableAutostep(0.5, 0.2, true)

      // Enable snap-to-ground to stick to terrain surfaces
      controller.enableSnapToGround(0.5)

      // Set up vector (positive Y axis)
      controller.setUp({ x: 0.0, y: 1.0, z: 0.0 })

      // Configure slope handling
      controller.setMaxSlopeClimbAngle((45 * Math.PI) / 180) // 45 degrees max climb
      controller.setMinSlopeSlideAngle((30 * Math.PI) / 180) // 30 degrees min slide

      // Allow interaction with dynamic bodies
      controller.setApplyImpulsesToDynamicBodies(true)

      controllerRef.current = controller
    }

    setupController()
  }, [world])

  // Track pressed movement intents in a ref to avoid re-renders
  const input = useRef<Input>({
    forward: false,
    backward: false,
    left: false,
    right: false,
  })

  // Keyboard listeners (WASD + Arrow keys). Up/Down -> Z axis, Left/Right -> X axis.
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.code) {
        case 'ArrowUp':
        case 'KeyW':
          input.current.forward = true
          break
        case 'ArrowDown':
        case 'KeyS':
          input.current.backward = true
          break
        case 'ArrowLeft':
        case 'KeyA':
          input.current.left = true
          break
        case 'ArrowRight':
        case 'KeyD':
          input.current.right = true
          break
      }
    }

    const handleKeyUp = (e: KeyboardEvent) => {
      switch (e.code) {
        case 'ArrowUp':
        case 'KeyW':
          input.current.forward = false
          break
        case 'ArrowDown':
        case 'KeyS':
          input.current.backward = false
          break
        case 'ArrowLeft':
        case 'KeyA':
          input.current.left = false
          break
        case 'ArrowRight':
        case 'KeyD':
          input.current.right = false
          break
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
    }
  }, [])

  return { controllerRef, input }
}

export default usePlayerController
