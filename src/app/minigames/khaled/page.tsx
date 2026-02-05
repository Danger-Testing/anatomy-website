'use client'

import { useEffect, useState, useRef, useCallback } from 'react'

interface FallingLobster {
  id: number
  x: number
  y: number
  rotation: number
  speed: number
  delay: number
}

interface Bubble {
  id: number
  x: number
  y: number
  opacity: number
}

export default function KhaledPage() {
  const [lobsters, setLobsters] = useState<FallingLobster[]>([])
  const [bubbles, setBubbles] = useState<Bubble[]>([])
  const [audioReady, setAudioReady] = useState(false)
  const [soundEnabled, setSoundEnabled] = useState(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const lobsterIdRef = useRef(0)
  const bubbleIdRef = useRef(0)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  // Initialize audio
  useEffect(() => {
    audioRef.current = new Audio('/lobster_sound.mp3')
    audioRef.current.preload = 'auto'
    setAudioReady(true)
    return () => {
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current = null
      }
    }
  }, [])

  const spawnLobster = useCallback(() => {
    const newLobster: FallingLobster = {
      id: lobsterIdRef.current++,
      x: Math.random() * 50 + 25, // 25-75% of screen width (25% padding each side)
      y: -15, // Start above screen
      rotation: Math.random() * 360,
      speed: 2 + Math.random() * 3,
      delay: 500,
    }
    setLobsters(prev => [...prev, newLobster])
  }, [])

  const spawnBubble = useCallback(() => {
    const newBubble: Bubble = {
      id: bubbleIdRef.current++,
      x: 8 + Math.random() * 15, // Near Khaled (left side)
      y: 55 + Math.random() * 10,
      opacity: 1,
    }
    setBubbles(prev => [...prev, newBubble])

    // Remove bubble after animation
    setTimeout(() => {
      setBubbles(prev => prev.filter(b => b.id !== newBubble.id))
    }, 2000)
  }, [])

  const playSound = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.currentTime = 0
      audioRef.current.play().catch(() => {
        // Audio play failed, likely due to autoplay policy
      })
    }
  }, [])

  // Main interval - every 5 seconds
  useEffect(() => {
    if (!audioReady) return

    const trigger = () => {
      playSound()
      spawnBubble()
      // Delay lobster spawn until after the phrase is said
      setTimeout(spawnLobster, 250)
    }

    // Initial trigger after a short delay
    const initialTimeout = setTimeout(trigger, 500)

    // Then every 5 seconds
    intervalRef.current = setInterval(trigger, 5000)

    return () => {
      clearTimeout(initialTimeout)
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [audioReady, playSound, spawnBubble, spawnLobster])

  // Animation loop for falling lobsters - they land on the table (~85% down the screen)
  useEffect(() => {
    const tableLevel = 83 // Lobsters stop at this % from top (on the table)
    const animate = () => {
      setLobsters(prev =>
        prev.map(lobster => {
          if (lobster.delay > 0) {
            return { ...lobster, delay: lobster.delay - 50 }
          }
          if (lobster.y >= tableLevel) {
            // Lobster has landed on table - stop moving
            return { ...lobster, speed: 0 }
          }
          return {
            ...lobster,
            y: lobster.y + lobster.speed * 0.5,
            rotation: lobster.rotation + 2,
          }
        })
      )
    }

    const animationInterval = setInterval(animate, 50)
    return () => clearInterval(animationInterval)
  }, [])

  // Click anywhere to enable audio (for autoplay policy)
  const handleClick = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.play().then(() => {
        audioRef.current?.pause()
        audioRef.current!.currentTime = 0
        setSoundEnabled(true)
      }).catch(() => {})
    }
  }, [])

  return (
    <div
      className="fixed inset-0 overflow-hidden cursor-pointer p-8"
      style={{ backgroundColor: '#FFFFFF' }}
      onClick={handleClick}
    >
      {/* Background - Khaled at table (fullscreen with padding) */}
      <img
        src="/khaled_.png"
        alt="DJ Khaled at table"
        className="absolute inset-8 w-[calc(100%-4rem)] h-[calc(100%-4rem)] object-contain object-bottom pointer-events-none"
      />

      {/* Speech bubbles (fullscreen with padding) */}
      {bubbles.map(bubble => (
        <div
          key={bubble.id}
          className="absolute inset-8 w-[calc(100%-4rem)] h-[calc(100%-4rem)] pointer-events-none animate-bubble z-10"
        >
          <img
            src="/bubblle.png"
            alt="Bring out the lobster!"
            className="w-full h-full object-contain"
          />
        </div>
      ))}

      {/* Falling lobsters */}
      {lobsters.map(lobster => (
        <img
          key={lobster.id}
          src="/lobster (2).png"
          alt="Lobster"
          className="absolute pointer-events-none"
          style={{
            left: `${lobster.x}%`,
            top: `${lobster.y}%`,
            transform: `translate(-50%, -50%) rotate(${lobster.rotation}deg)`,
            width: '60px',
            height: 'auto',
          }}
        />
      ))}

      {/* Click prompt */}
      {!soundEnabled && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 text-black text-sm opacity-50">
          Click anywhere to enable sound
        </div>
      )}

      <style jsx>{`
        @keyframes bubble {
          0% {
            opacity: 0;
            transform: scale(0.5);
          }
          20% {
            opacity: 1;
            transform: scale(1);
          }
          80% {
            opacity: 1;
            transform: scale(1);
          }
          100% {
            opacity: 0;
            transform: scale(0.8);
          }
        }
        .animate-bubble {
          animation: bubble 2s ease-out forwards;
        }
      `}</style>
    </div>
  )
}
