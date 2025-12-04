'use client'

import { useGSAP } from '@gsap/react'
import gsap from 'gsap'
import dynamic from 'next/dynamic'
import Image from 'next/image'
import {
  type ButtonHTMLAttributes,
  type FC,
  type ReactNode,
  type TransitionEvent,
  useEffect,
  useRef,
  useState,
} from 'react'
import { twJoin } from 'tailwind-merge'

import speedroller from '@/assets/brand/SPEEDROLLER.svg'
import speedrollerFaint from '@/assets/brand/speedroller-faint.svg'
import { PLAYER_INITIAL_POSITION, useGameStore } from '@/components/GameProvider'
import { useSoundStore } from '@/components/SoundProvider'
import { InputConfig } from '@/components/ui/menu/InputConfig'
import { MOVE_HUD_CONFIG } from '@/resources/content'

import RotateDevice from './RotateDevice'

type CTAButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & { children: ReactNode }

const CTAButton: FC<CTAButtonProps> = ({
  children,
  className,
  disabled,
  type = 'button',
  ...props
}) => {
  return (
    <button
      {...props}
      type={type}
      disabled={disabled}
      className={twJoin(
        'relative inline-flex items-center justify-center overflow-hidden rounded-xl transition-opacity',
        disabled ? 'cursor-not-allowed opacity-60' : 'hover:opacity-90',
        className,
      )}
      style={{ width: 256, height: 54 }}>
      <svg
        width="256"
        height="54"
        viewBox="0 0 256 54"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="absolute inset-0 h-full w-full"
        aria-hidden="true">
        <rect
          x="0.5"
          y="0.5"
          width="255"
          height="53"
          rx="11.5"
          fill="black"
          fillOpacity="0.5"
        />
        <rect x="0.5" y="0.5" width="255" height="53" rx="11.5" stroke="url(#cta-gradient)" />
        <defs>
          <linearGradient
            id="cta-gradient"
            x1="0"
            y1="27"
            x2="264.356"
            y2="33.822"
            gradientUnits="userSpaceOnUse">
            <stop stopColor="#FFBB43" />
            <stop offset="0.605769" stopColor="#D34D0D" />
            <stop offset="1" stopColor="#331A36" />
          </linearGradient>
        </defs>
      </svg>
      <span className="relative z-10 px-4 text-sm font-semibold tracking-wide text-white uppercase">
        {children}
      </span>
    </button>
  )
}

type Props = {
  isMobile: boolean
}

const LoadingOverlay: FC<Props> = ({ isMobile }) => {
  const setIsMuted = useSoundStore((s) => s.setIsMuted)

  const revealRef = useRef<HTMLImageElement>(null)

  useGSAP(() => {
    gsap.fromTo(
      revealRef.current,
      { clipPath: 'inset(0 100% 0 0)' },
      { clipPath: 'inset(0 0% 0 0)', duration: 2.2, ease: 'power1.out' },
    )
  }, [])

  const isShowingLoadingOverlay = useGameStore((s) => s.isShowingLoadingOverlay)
  const setIsShowingLoadingOverlay = useGameStore((s) => s.setIsShowingLoadingOverlay)
  const isHydrated = useGameStore((s) => s._isHydrated)
  const isPlatformReady = useGameStore((s) => s.isPlatformReady)
  const respawnPlayer = useGameStore((s) => s.respawnPlayer)
  const inputType = useGameStore((s) => s.inputType)

  const [isExiting, setIsExiting] = useState(false)
  const [isMobileLandscape, setIsMobileLandscape] = useState(!isMobile)

  const isReady = isHydrated && isPlatformReady && (!isMobile || isMobileLandscape)

  const onStartClick = (isMuted: boolean) => {
    setIsMuted(isMuted)
    setIsExiting(true)
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (isShowingLoadingOverlay) setIsExiting(false)
  }, [isShowingLoadingOverlay])

  const onTransitionEnd = (e: TransitionEvent<HTMLDivElement>) => {
    if (!isExiting) return
    if (e.target !== e.currentTarget) return
    setIsShowingLoadingOverlay(false)
    const hud = MOVE_HUD_CONFIG[inputType]
    respawnPlayer(PLAYER_INITIAL_POSITION, hud)
  }

  if (!isShowingLoadingOverlay) return null

  return (
    <div
      id="loading-overlay"
      onTransitionEnd={onTransitionEnd}
      className={twJoin(
        'fixed inset-0 z-5000 flex flex-col items-center justify-center gap-4 to-120% px-4 py-4',
        'transition-opacity delay-50 duration-300 ease-out motion-reduce:duration-0',
        'bg-radial from-black/90 from-25% to-black/0 to-100% backdrop-blur-sm',
        isExiting ? 'opacity-0' : 'opacity-100',
      )}>
      <div
        className={twJoin(
          'absolute inset-0 bg-black transition-opacity delay-400 duration-600',
          isReady ? 'opacity-0' : 'opacity-100',
        )}
      />

      <div className="relative flex w-full shrink-0 content-stretch items-center gap-[8px]">
        <p className="relative shrink-0 font-['Unbounded:Medium',sans-serif] text-[20px] leading-[normal] font-medium tracking-[-0.2px] text-nowrap whitespace-pre text-white opacity-50">
          Pragmattic
        </p>
        <p
          className="relative w-[36px] shrink-0 font-['Nunito_Sans:Regular',sans-serif] text-[16px] leading-[normal] font-normal tracking-[-0.16px] text-white opacity-50"
          style={{ fontVariationSettings: "'YTLC' 500, 'wdth' 100" }}>
          AND
        </p>
        Loopspeed
        <p
          className="relative shrink-0 text-center font-['Nunito_Sans:Regular',sans-serif] text-[16px] leading-[normal] font-normal tracking-[-0.16px] text-nowrap whitespace-pre text-white opacity-50"
          style={{ fontVariationSettings: "'YTLC' 500, 'wdth' 100" }}>
          PRESENT
        </p>
      </div>

      <header className="relative flex h-[100px] w-full items-center justify-center">
        <Image
          src={speedrollerFaint}
          alt=""
          className="absolute h-[100px] w-auto max-w-full object-contain"
          priority
        />
        <Image
          ref={revealRef}
          src={speedroller}
          alt="Speedroller"
          className="absolute h-[100px] w-auto max-w-full object-contain"
          priority
        />
      </header>

      <InputConfig />

      <RotateDevice
        isMobile={isMobile}
        isLandscape={isMobileLandscape}
        setIsLandscape={setIsMobileLandscape}
      />

      <div className={twJoin('relative flex flex-col items-center gap-4 sm:flex-row')}>
        <CTAButton
          aria-label="Start experience"
          disabled={!isReady}
          onClick={() => onStartClick(false)}
          className="sm:mr-2">
          Start experience
        </CTAButton>
        <CTAButton
          aria-label="Start muted"
          onClick={() => onStartClick(true)}
          disabled={!isReady}>
          Enter in silence
        </CTAButton>
      </div>
    </div>
  )
}

export default LoadingOverlay
