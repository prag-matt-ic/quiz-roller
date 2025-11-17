'use client'
import { useGSAP } from '@gsap/react'
import { usePrevious } from '@mantine/hooks'
import gsap from 'gsap'
import { type FC, useMemo, useRef } from 'react'
import { float, Fn, If, materialColor, uniform, uv } from 'three/tsl'
import {
  CanvasTexture,
  ClampToEdgeWrapping,
  DoubleSide,
  LinearFilter,
  Mesh,
} from 'three/webgpu'

import { PLANE_RADIUS, Stage, useGameStore } from '@/hooks/useGameStore'
import { getGrainyNoise } from '@/utils/tslHelpers'

type Message = {
  title: string
  subtitle: string
}

const INBOUND_MESSAGES: Record<Stage, Message> = {
  [Stage.LANDING]: { title: '', subtitle: '' },
  [Stage.INTRO]: { title: 'WELCOME TO THE MAGIC FLOOR', subtitle: '' },
  [Stage.OUTER]: {
    title: 'MOVE TO THE LIGHT',
    subtitle: 'use your arrow keys',
  },
  [Stage.INNER]: { title: 'ALMOST THERE', subtitle: 'keep on going' },
  [Stage.CENTER]: {
    title: "YOU'RE BRIGHT! JUST A MINI WEBGPU SHOWCASE",
    subtitle: 'by pragmattic',
  },
} as const

const OUTBOUND_MESSAGES: Record<Stage, Message> = {
  [Stage.LANDING]: { title: '', subtitle: '' },
  [Stage.INTRO]: { title: '', subtitle: '' },
  [Stage.OUTER]: { title: 'THE LIGHT NEEDS YOU!', subtitle: '' },
  [Stage.INNER]: { title: 'HEY, COME BACK!', subtitle: '' },
  [Stage.CENTER]: { title: '', subtitle: '' },
} as const

const CYLINDER_RADIUS = PLANE_RADIUS + 1
const CYLINDER_HEIGHT = 3
const CYLINDER_WIDTH = CYLINDER_RADIUS * Math.PI * 2
// Set canvas size to match plane aspect ratio to avoid distortion
const CAVAS_HEIGHT = 420
const CANVAS_WIDTH = CAVAS_HEIGHT * (CYLINDER_WIDTH / CYLINDER_HEIGHT)
// It will wrap the entire way around the circle

const WIDTH_SEGMENTS = 64
const HEIGHT_SEGMENTS = 1

function writeTextToCanvas({
  ctx,
  message,
}: {
  ctx: CanvasRenderingContext2D
  message: Message
}) {
  ctx.clearRect(0, 0, CANVAS_WIDTH, CAVAS_HEIGHT)
  // Transparent background
  ctx.fillStyle = 'rgba(0,0,0,0)'
  ctx.fillRect(0, 0, CANVAS_WIDTH, CAVAS_HEIGHT)

  const x = CANVAS_WIDTH / 2

  // Heading
  ctx.font = `800 ${340}px Poppins, sans-serif`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'bottom'
  ctx.fillStyle = '#F3F1ED'
  ctx.letterSpacing = '-0.06em'
  ctx.fillText(message.title, x, CAVAS_HEIGHT + 60)

  // Subheading
  const subtitleFontSize = 112
  ctx.fillStyle = '#D7D1C3'
  ctx.letterSpacing = '-0.02em'
  ctx.font = `700 ${subtitleFontSize}px Poppins, sans-serif`
  ctx.fillText(message.subtitle, x, CAVAS_HEIGHT - 280)
}

function setupCanvasTexture() {
  // Create original canvas to store pristine text (unblurred)
  const textCanvas = document.createElement('canvas')
  textCanvas.width = CANVAS_WIDTH
  textCanvas.height = CAVAS_HEIGHT
  textCanvas.style.display = 'none' // Hide the canvas element
  const textContext = textCanvas.getContext('2d', { alpha: true })
  if (!textContext) throw new Error('Failed to get canvas context')

  // Create a separate canvas for the texture (will be drawn into)
  const displayCanvas = document.createElement('canvas')
  displayCanvas.width = CANVAS_WIDTH
  displayCanvas.height = CAVAS_HEIGHT
  const displayContext = displayCanvas.getContext('2d', { alpha: true })
  if (!displayContext) throw new Error('Failed to get display canvas context')

  // Flip the text horizontally for correct orientation inside the cylinder
  displayContext.translate(CANVAS_WIDTH, 0)
  displayContext.scale(-1, 1)
  displayContext.drawImage(textCanvas, 0, 0)

  const texture = new CanvasTexture(displayCanvas)
  // Configure texture for crisp text rendering
  texture.generateMipmaps = false
  texture.minFilter = LinearFilter
  texture.magFilter = LinearFilter
  texture.wrapS = ClampToEdgeWrapping
  texture.wrapT = ClampToEdgeWrapping

  return {
    textCanvas,
    textContext,
    displayContext,
    texture,
  }
}

const TextCylinder: FC = () => {
  const stage = useGameStore((s) => s.stage)
  const prevStage = usePrevious(stage)

  const { uOpacity, colorNode, texture, textCanvas, textContext, displayContext } =
    useMemo(() => {
      const textures = setupCanvasTexture()
      const uOpacity = uniform(1.0, 'float')

      const colorNode = Fn(() => {
        // Skip black/transparent areas
        If(materialColor.w.equal(0.0), () => {
          return materialColor
        })

        const UV = uv().toVar()
        const colour = materialColor.toVar()

        // Add grainy noise to texture
        const grain = getGrainyNoise(UV.mul(24), float(200.0))
        colour.subAssign(grain.mul(0.5))

        colour.mulAssign(uOpacity)
        return colour
      })()

      return { uOpacity, colorNode, ...textures }
    }, [])

  const mesh = useRef<Mesh>(null)
  const blurTween = useRef<GSAPTween>(null)
  const rotationTween = useRef<GSAPTween>(null)

  useGSAP(() => {
    if (!textCanvas || !texture || !textContext || !displayContext) return
    if (!mesh.current) return
    if (stage === Stage.LANDING) return

    const stageIndex = Object.values(Stage).indexOf(stage)
    const isMovingIn = stageIndex > Object.values(Stage).indexOf(prevStage ?? Stage.LANDING)

    const messageSet = isMovingIn ? INBOUND_MESSAGES : OUTBOUND_MESSAGES

    const blurAmount = { value: 0 }
    const blurMultipler = 32

    rotationTween.current?.kill()
    blurTween.current?.kill()

    function updateTexture() {
      displayContext.clearRect(0, 0, displayContext.canvas.width, displayContext.canvas.height)
      // Set the filter before drawing
      displayContext.filter = `blur(${blurAmount.value * blurMultipler}px)`
      // Draw the original text canvas with the blur filter applied
      displayContext.drawImage(textCanvas, 0, 0)
      texture.needsUpdate = true
    }

    // When the stage changes, animate opacity to 0, write in the new message, then fade back in, then start oscillating
    gsap
      .timeline({ onComplete: onTransitionComplete })
      .to(blurAmount, {
        value: 1,
        duration: 0.5,
        ease: 'power1.out',
        onUpdate: () => {
          // Animate opacity based on blur
          uOpacity.value = 1.0 - blurAmount.value
          updateTexture()
        },
        onComplete: () => {
          writeTextToCanvas({
            ctx: textContext,
            message: messageSet[stage],
          })
        },
      })
      .to(blurAmount, {
        value: 0,
        duration: 1.0,
        ease: 'power1.out',
        onUpdate: () => {
          // Animate opacity based on blur
          uOpacity.value = 1.0 - blurAmount.value
          updateTexture()
        },
      })

    // Oscillates the text blur amount
    function onTransitionComplete() {
      blurTween.current = gsap.to(blurAmount, {
        value: 1,
        duration: 5,
        yoyo: true,
        repeat: -1,
        ease: 'none',
        onUpdate: () => {
          // Animate opacity based on blur (doesn't go fully to 0)
          uOpacity.value = 1.0 - blurAmount.value * 0.8
          updateTexture()
        },
      })
    }

    if (stage === Stage.CENTER) {
      rotationTween.current = gsap.to(mesh.current.rotation, {
        y: Math.PI * 2,
        duration: 60,
        ease: 'none',
        repeat: -1,
      })
    } else {
      rotationTween.current = gsap.to(mesh.current.rotation, {
        y: 0,
        duration: 1.0,
        ease: 'power2.out',
      })
    }
  }, [stage, textCanvas, textContext, texture])

  return (
    <mesh ref={mesh} position={[0, CYLINDER_HEIGHT / 2, 0]}>
      <cylinderGeometry
        args={[
          PLANE_RADIUS,
          PLANE_RADIUS,
          CYLINDER_HEIGHT,
          WIDTH_SEGMENTS,
          HEIGHT_SEGMENTS,
          true,
        ]}
      />
      <meshBasicNodeMaterial
        depthTest={false}
        key={colorNode.uuid}
        transparent={true}
        colorNode={colorNode}
        side={DoubleSide}
        map={texture}
      />
    </mesh>
  )
}

export default TextCylinder
