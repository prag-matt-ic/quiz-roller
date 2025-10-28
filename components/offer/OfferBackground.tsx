'use client'

import { type FC, Suspense } from 'react'

const OfferBackground: FC = () => {
  return (
    <>
      <color attach="background" args={["#0a0a0a"]} />
      <ambientLight intensity={1.0} />
    </>
  )
}

export default OfferBackground
