import { useTexture } from '@react-three/drei'
import { type FC, type RefObject, Suspense } from 'react'
import { Group } from 'three'

import logo from '@/assets/textures/home-logo.webp'
import { TILE_SIZE } from '@/utils/tiles'

type Props = {
  ref: RefObject<Group | null>
}

const WIDTH = TILE_SIZE * 8
const ASPECT = logo.width / logo.height
const HEIGHT = WIDTH / ASPECT

const Logo: FC<Props> = ({ ref }) => {
  const texture = useTexture(logo.src)

  return (
    <group ref={ref} position={[0, -40, -40]}>
      <Suspense>
        <mesh rotation={[-Math.PI / 2, 0, 0]} renderOrder={2}>
          <planeGeometry args={[WIDTH, HEIGHT]} />
          <meshBasicMaterial map={texture} transparent={true} />
        </mesh>
      </Suspense>
    </group>
  )
}

export default Logo
