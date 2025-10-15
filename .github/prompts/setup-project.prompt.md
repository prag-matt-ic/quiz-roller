---
mode: 'agent'
description: 'Install packages and set up the project structure'
---

## Task

Set up a new Next.js 15 project with React Three Fiber, Tailwind CSS 4, GSAP, Zustand, and Zod. Configure ESLint with simple-import-sort, TypeScript with path aliases, and create example components following the project's architecture patterns.

## Steps

1. **Install core dependencies**

   ```bash
   npm install @react-three/fiber @react-three/drei @react-three/rapier three zustand zod gsap @gsap/react tailwind-merge react-transition-group lucide-react
   ```

2. **Install dev dependencies**

   ```bash
   npm install -D @types/three @types/react-transition-group eslint-plugin-simple-import-sort
   ```

3. **Configure ESLint** (`eslint.config.mjs`)

   ```javascript
   import { FlatCompat } from '@eslint/eslintrc'
   import simpleImportSort from 'eslint-plugin-simple-import-sort'
   import { dirname } from 'path'
   import { fileURLToPath } from 'url'

   const __filename = fileURLToPath(import.meta.url)
   const __dirname = dirname(__filename)

   const compat = new FlatCompat({
     baseDirectory: __dirname,
   })

   const eslintConfig = [
     ...compat.extends('next/core-web-vitals', 'next/typescript'),
     {
       plugins: {
         'simple-import-sort': simpleImportSort,
       },
       ignores: ['node_modules/**', '.next/**', 'out/**', 'build/**', 'next-env.d.ts'],
       rules: {
         '@typescript-eslint/no-unused-vars': 'warn',
         'simple-import-sort/imports': 'warn',
         'simple-import-sort/exports': 'error',
         '@typescript-eslint/no-explicit-any': 'warn',
         'no-console': [
           'warn',
           {
             allow: ['warn', 'error'],
           },
         ],
       },
     },
   ]

   export default eslintConfig
   ```

4. **Configure Tailwind CSS** (`app/globals.css`)

   ```css
   @import 'tailwindcss';

   :root {
     --background: #000;
     --foreground: #fff;
   }

   @theme inline {
     --color-background: var(--background);
     --color-foreground: var(--foreground);
   }

   body {
     background: var(--background);
     color: var(--foreground);
     font-family:
       system-ui,
       -apple-system,
       sans-serif;
   }

   button,
   a {
     cursor: pointer;
   }

   @layer utilities {
     .heading-xl {
       @apply text-4xl !leading-tight font-[500] tracking-tight sm:text-6xl md:text-8xl;
     }
     .heading-lg {
       @apply text-3xl !leading-tight font-[500] tracking-tight sm:text-4xl md:text-5xl;
     }
     .heading-md {
       @apply text-2xl leading-tight font-[500] tracking-normal sm:text-3xl;
     }
     .paragraph {
       @apply text-base lg:text-lg;
     }
   }
   ```

5. **Create example Zustand store** (`stores/useAppStore.ts`)

   ```typescript
   import { create } from 'zustand'

   type AppState = {
     count: number
     increment: () => void
     decrement: () => void
   }

   export const useAppStore = create<AppState>((set) => ({
     count: 0,
     increment: () => set((state) => ({ count: state.count + 1 })),
     decrement: () => set((state) => ({ count: state.count - 1 })),
   }))
   ```

6. **Create Zustand context provider** (`components/AppProvider.tsx`)

   ```tsx
   'use client'

   import { createContext, type FC, type PropsWithChildren, useContext, useRef } from 'react'
   import { createStore, type StoreApi, useStore } from 'zustand'

   type AppState = {
     theme: 'light' | 'dark'
     setTheme: (theme: 'light' | 'dark') => void
   }

   type AppStore = StoreApi<AppState>
   const AppContext = createContext<AppStore>(undefined!)

   const createAppStore = () =>
     createStore<AppState>((set) => ({
       theme: 'dark',
       setTheme: (theme) => set({ theme }),
     }))

   export const AppProvider: FC<PropsWithChildren> = ({ children }) => {
     const store = useRef<AppStore>(createAppStore())
     return <AppContext.Provider value={store.current}>{children}</AppContext.Provider>
   }

   export function useAppStore<T>(selector: (state: AppState) => T): T {
     const store = useContext(AppContext)
     if (!store) throw new Error('Missing AppProvider in the tree')
     return useStore(store, selector)
   }

   export function useAppStoreAPI(): AppStore {
     const store = useContext(AppContext)
     if (!store) throw new Error('Missing AppProvider in the tree')
     return store
   }
   ```

7. **Create Zod schemas** (`model/schema.ts`)

   ```typescript
   import { z } from 'zod'

   export const UserSchema = z.object({
     id: z.string().uuid(),
     name: z.string().min(1),
     email: z.string().email(),
     createdAt: z.date(),
   })

   export const GameConfigSchema = z.object({
     difficulty: z.number().min(1).max(10),
     playerCount: z.number().min(1).max(4),
     duration: z.number().positive(),
   })

   export type User = z.infer<typeof UserSchema>
   export type GameConfig = z.infer<typeof GameConfigSchema>
   ```

8. **Create UI Button component** (`components/ui/Button.tsx`)

   ```tsx
   import type { ButtonHTMLAttributes, FC, ReactNode } from 'react'
   import { twMerge } from 'tailwind-merge'

   type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
     variant?: 'primary' | 'secondary'
     children: ReactNode
     className?: string
   }

   const baseStyles =
     'flex w-fit cursor-pointer items-center justify-center gap-3 rounded-full px-8 py-3 text-lg font-[600] backdrop-blur-sm'

   const variantStyles = {
     primary:
       'border border-white/20 bg-linear-90 from-white/5 to-white/15 text-white shadow-xl shadow-white/5 hover:from-white/10 hover:to-white/20',
     secondary:
       'border border-white/5 bg-white/3 text-white/70 hover:bg-white/8 hover:text-white',
   }

   const Button: FC<ButtonProps> = ({ variant = 'primary', children, className, ...props }) => {
     return (
       <button className={twMerge(baseStyles, variantStyles[variant], className)} {...props}>
         {children}
       </button>
     )
   }

   export default Button
   ```

   **Example with lucide-react icons:**

   ```tsx
   import { Play, Pause } from 'lucide-react'
   import Button from '@/components/ui/Button'

   <Button variant="primary">
     <Play className="size-5" />
     Start Game
   </Button>

   <Button variant="secondary">
     <Pause className="size-5" />
     Pause
   </Button>
   ```

9. **Create GSAP animation hook** (`hooks/useGSAPAnimation.ts`)

   ```typescript
   import { useGSAP } from '@gsap/react'
   import gsap from 'gsap'
   import { useRef } from 'react'

   export function useGSAPAnimation() {
     const tweenRef = useRef<GSAPTween | null>(null)
     const targetRef = useRef({ value: 0 })

     useGSAP(() => {
       // Cleanup on unmount
       return () => {
         tweenRef.current?.kill()
       }
     })

     const animateTo = (
       endValue: number,
       duration: number,
       onUpdate?: (value: number) => void,
     ) => {
       tweenRef.current?.kill()
       tweenRef.current = gsap.to(targetRef.current, {
         value: endValue,
         duration,
         ease: 'power2.out',
         onUpdate: () => {
           onUpdate?.(targetRef.current.value)
         },
       })
     }

     return { animateTo, targetRef }
   }
   ```

10. **Create React Transition Group examples** (`components/Transitions.tsx`)

    ```tsx
    'use client'

    import { useGSAP } from '@gsap/react'
    import gsap from 'gsap'
    import { type FC, type ReactNode, useRef } from 'react'
    import { SwitchTransition, Transition } from 'react-transition-group'

    // SwitchTransition example - switches between two states
    export const FadeSwitch: FC<{ children: ReactNode; transitionKey: string }> = ({
      children,
      transitionKey,
    }) => {
      const nodeRef = useRef<HTMLDivElement>(null)

      return (
        <SwitchTransition mode="out-in">
          <Transition
            key={transitionKey}
            nodeRef={nodeRef}
            timeout={500}
            onEnter={() => {
              if (!nodeRef.current) return
              gsap.fromTo(
                nodeRef.current,
                { opacity: 0, y: 20 },
                { opacity: 1, y: 0, duration: 0.5, ease: 'power2.out' },
              )
            }}
            onExit={() => {
              if (!nodeRef.current) return
              gsap.to(nodeRef.current, {
                opacity: 0,
                y: -20,
                duration: 0.5,
                ease: 'power2.in',
              })
            }}>
            <div ref={nodeRef}>{children}</div>
          </Transition>
        </SwitchTransition>
      )
    }

    // Regular Transition example - mount/unmount with animation
    export const FadeInOut: FC<{ show: boolean; children: ReactNode }> = ({
      show,
      children,
    }) => {
      const nodeRef = useRef<HTMLDivElement>(null)

      return (
        <Transition
          nodeRef={nodeRef}
          in={show}
          timeout={300}
          mountOnEnter
          unmountOnExit
          onEnter={() => {
            if (!nodeRef.current) return
            gsap.fromTo(
              nodeRef.current,
              { opacity: 0, scale: 0.9 },
              { opacity: 1, scale: 1, duration: 0.3, ease: 'back.out(1.7)' },
            )
          }}
          onExit={() => {
            if (!nodeRef.current) return
            gsap.to(nodeRef.current, {
              opacity: 0,
              scale: 0.9,
              duration: 0.3,
              ease: 'power2.in',
            })
          }}>
          <div ref={nodeRef}>{children}</div>
        </Transition>
      )
    }
    ```

11. **Create React Three Fiber scene** (`components/Scene.tsx`)

    ```tsx
    'use client'

    import { OrbitControls } from '@react-three/drei'
    import { Canvas } from '@react-three/fiber'
    import { type FC, type PropsWithChildren, useRef } from 'react'
    import { Vector3 } from 'three'

    const Box: FC<{ position: [number, number, number] }> = ({ position }) => {
      const meshRef = useRef<THREE.Mesh>(null)

      return (
        <mesh ref={meshRef} position={position}>
          <boxGeometry args={[1, 1, 1]} />
          <meshStandardMaterial color="orange" />
        </mesh>
      )
    }

    export const Scene: FC<PropsWithChildren> = ({ children }) => {
      // Preallocate reusable vectors (performance optimization)
      const cameraPosition = useRef(new Vector3(0, 5, 10))

      return (
        <Canvas camera={{ position: cameraPosition.current, fov: 50 }}>
          <ambientLight intensity={0.5} />
          <directionalLight position={[10, 10, 5]} intensity={1} />
          <Box position={[0, 0, 0]} />
          {children}
          <OrbitControls />
        </Canvas>
      )
    }
    ```

12. **Create shader files** (`components/shaders/animated.vert` and `animated.frag`)

    **Vertex shader** (`components/shaders/animated.vert`)

    ```glsl
    varying vec2 vUv;

    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
    ```

    **Fragment shader** (`components/shaders/animated.frag`)

    ```glsl
    uniform float uTime;
    uniform vec3 uColor;

    varying vec2 vUv;

    void main() {
      vec2 uv = vUv;

      // Animated gradient
      float wave = sin(uv.x * 10.0 + uTime) * 0.5 + 0.5;
      vec3 color = mix(uColor, vec3(1.0), wave * uv.y);

      gl_FragColor = vec4(color, 1.0);
    }
    ```

13. **Create TypeScript-safe shader material component** (`components/shaders/AnimatedShader.tsx`)

    ````tsx
    'use client'

    import { shaderMaterial } from '@react-three/drei'
    import { extend, useFrame } from '@react-three/fiber'
    import { forwardRef, type RefObject, useRef } from 'react'
    import * as THREE from 'three'

    import fragment from './animated.frag'
    import vertex from './animated.vert'

    // Type-safe uniforms interface
    export type AnimatedShaderUniforms = {
      uTime: number
      uColor: THREE.Color
    }

    // Initial uniform values
    const INITIAL_UNIFORMS: AnimatedShaderUniforms = {
      uTime: 0,
      uColor: new THREE.Color(0.2, 0.5, 1.0),
    }

    // Create shader material using @react-three/drei
    const AnimatedShader = shaderMaterial(INITIAL_UNIFORMS, vertex, fragment)

    // Extend R3F to make it available as JSX element
    export const AnimatedShaderMaterial = extend(AnimatedShader)

    // Component that uses the shader
    type AnimatedPlaneProps = {
      position?: [number, number, number]
      shaderRef?: RefObject<typeof AnimatedShaderMaterial & AnimatedShaderUniforms>
    }

    export const AnimatedShaderPlane = forwardRef<THREE.Mesh, AnimatedPlaneProps>(
      ({ position = [0, 0, 0], shaderRef }, ref) => {
        const localShaderRef = useRef<typeof AnimatedShaderMaterial & AnimatedShaderUniforms>(null)
        const materialRef = shaderRef || localShaderRef

        useFrame((_, delta) => {
          if (!materialRef.current) return
          // Update time uniform each frame
          materialRef.current.uTime += delta
        })

        return (
          <mesh ref={ref} position={position}>
            <planeGeometry args={[2, 2]} />
            <AnimatedShaderMaterial
              key={AnimatedShader.key}
              ref={materialRef}
              uTime={INITIAL_UNIFORMS.uTime}
              uColor={INITIAL_UNIFORMS.uColor}
            />
          </mesh>
        )
      },
    )

    AnimatedShaderPlane.displayName = 'AnimatedShaderPlane'
    ```14. **Create game frame hook** (`hooks/useGameFrame.ts`)

    ```typescript
    import { RootState, useFrame } from '@react-three/fiber'
    import { useRef } from 'react'

    // Calls callback every frame with delta time
    // Avoids per-frame allocations by reusing refs
    export function useGameFrame(
      callback: (state: RootState, delta: number) => void,
      priority = 0,
    ) {
      const accumulator = useRef(0)

      useFrame((state, delta) => {
        accumulator.current += delta
        callback(state, delta)
      }, priority)
    }

    export default useGameFrame
    ````

14. **Create main page** (`app/page.tsx`)

    ```tsx
    'use client'

    import { useState } from 'react'

    import { Scene } from '@/components/Scene'
    import { AnimatedShaderPlane } from '@/components/shaders/AnimatedShader'
    import { FadeInOut, FadeSwitch } from '@/components/Transitions'
    import Button from '@/components/ui/Button'
    import { useAppStore } from '@/stores/useAppStore'

    export default function Home() {
      const count = useAppStore((s) => s.count)
      const increment = useAppStore((s) => s.increment)
      const decrement = useAppStore((s) => s.decrement)
      const [showDetails, setShowDetails] = useState(false)

      return (
        <main className="relative size-full">
          <div className="absolute inset-0 z-0">
            <Scene>
              <AnimatedShaderPlane position={[0, 0, -2]} />
            </Scene>
          </div>
          <div className="pointer-events-none absolute inset-0 z-10 flex flex-col items-center justify-center gap-4">
            <FadeSwitch transitionKey={count.toString()}>
              <h1 className="heading-xl">Count: {count}</h1>
            </FadeSwitch>
            <div className="pointer-events-auto flex gap-4">
              <Button variant="primary" onClick={increment}>
                Increment
              </Button>
              <Button variant="secondary" onClick={decrement}>
                Decrement
              </Button>
              <Button variant="secondary" onClick={() => setShowDetails(!showDetails)}>
                Toggle Details
              </Button>
            </div>
            <FadeInOut show={showDetails}>
              <p className="paragraph pointer-events-auto rounded-lg bg-black/50 p-4 backdrop-blur">
                This is additional information that fades in and out.
              </p>
            </FadeInOut>
          </div>
        </main>
      )
    }
    ```

## Architecture Notes

### Performance Rules

- **No per-frame allocations**: Use `useRef` for reusable objects (Vector3, Quaternion, etc.)
- **Mutate in-place**: Use `.set()`, `.copy()`, `.add()` instead of creating new objects
- **Preallocate**: Create Vector3/Quaternion objects once in refs, reuse them

### State Management

- **Zustand with context**: Use React Context wrapper for component-level stores
- **Selectors**: Always use selectors to prevent unnecessary re-renders
- **Subscribe pattern**: For high-frequency updates, use subscriptions with refs

### Shaders & Materials

- **shaderMaterial from @react-three/drei**: Use `shaderMaterial()` to create typed shader materials
- **extend pattern**: Use `extend()` from R3F to register shader as JSX element
- **Type-safe uniforms**: Define interface for uniforms (no `{ value: }` wrappers needed)
- **Separate shader files**: Keep `.vert` and `.frag` files separate for better organization
- **Initial uniforms**: Define `INITIAL_UNIFORMS` constant with proper THREE.js types
- **forwardRef**: Use for components that need ref access to mesh or material
- **key prop**: Always use `key={ShaderName.key}` on shader material for proper HMR

### GSAP & React Transition Group

- **SwitchTransition**: Use for switching between two states (e.g., page transitions)
- **Transition**: Use for mount/unmount animations (e.g., modals, tooltips)
- **GSAP with transitions**: Use `nodeRef` to avoid findDOMNode warnings
- **Cleanup**: Always kill GSAP tweens in useGSAP cleanup function

### Styling

- **twMerge**: Use for merging external className props
- **twJoin**: Use for concatenating internal classes (no conflicts)
- **Size utility**: Use `size-[x]` instead of `h-[x] w-[x]` for squares

### Import Sorting

- ESLint with `simple-import-sort` will auto-sort imports
- Run `npm run lint` to check

### Code Style

- Functional components with TypeScript
- Meaningful names (no abbreviations)
- Small, pure functions
- Early returns over nesting
- Constants for magic numbers

## Verification

Run the following to verify setup:

```bash
npm run dev
npm run lint
```

Visit `http://localhost:3000` to see the working example with 3D scene and interactive UI.
