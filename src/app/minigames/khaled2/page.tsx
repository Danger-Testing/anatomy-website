'use client'

import { useEffect, useState, useRef, useCallback } from 'react'

interface WaitingLobster {
  id: string
  name: string
  confession: string
  offered_at: string
}

interface FallingLobster {
  id: string
  dataId: string
  name: string
  confession: string
  x: number
  y: number
  rotation: number
  speed: number
  landed: boolean
  delay: number
}

interface Bubble {
  id: number
  x: number
  y: number
  opacity: number
}

export default function Khaled2Page() {
  const [waitingQueue, setWaitingQueue] = useState<WaitingLobster[]>([])
  const [lobsters, setLobsters] = useState<FallingLobster[]>([])
  const [bubbles, setBubbles] = useState<Bubble[]>([])
  const [selectedLobster, setSelectedLobster] = useState<FallingLobster | null>(null)
  const [audioReady, setAudioReady] = useState(false)
  const [soundEnabled, setSoundEnabled] = useState(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const bubbleIdRef = useRef(0)
  const spawnIndexRef = useRef(0)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  const fetchWaitingLobsters = useCallback(async () => {
    try {
      const res = await fetch('/api/waiting')
      const data = await res.json()
      setWaitingQueue(data.lobsters || [])
    } catch {
      // Silent fail
    }
  }, [])

  useEffect(() => {
    fetchWaitingLobsters()
    const pollInterval = setInterval(fetchWaitingLobsters, 10000)
    return () => clearInterval(pollInterval)
  }, [fetchWaitingLobsters])

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

  const spawnBubble = useCallback(() => {
    const newBubble: Bubble = {
      id: bubbleIdRef.current++,
      x: 8 + Math.random() * 15,
      y: 55 + Math.random() * 10,
      opacity: 1,
    }
    setBubbles(prev => [...prev, newBubble])

    setTimeout(() => {
      setBubbles(prev => prev.filter(b => b.id !== newBubble.id))
    }, 2000)
  }, [])

  const playSound = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.currentTime = 0
      audioRef.current.play().catch(() => {})
    }
  }, [])

  const spawnNextLobster = useCallback(() => {
    if (waitingQueue.length === 0) return

    const index = spawnIndexRef.current % waitingQueue.length
    const lobsterData = waitingQueue[index]
    spawnIndexRef.current++

    setLobsters(prev => {
      const alreadyFalling = prev.some(l => l.dataId === lobsterData.id)
      if (alreadyFalling) return prev

      const newLobster: FallingLobster = {
        id: `falling-${Date.now()}-${Math.random()}`,
        dataId: lobsterData.id,
        name: lobsterData.name,
        confession: lobsterData.confession,
        x: Math.random() * 50 + 25,
        y: -15,
        rotation: Math.random() * 360,
        speed: 2 + Math.random() * 3,
        landed: false,
        delay: 1250,
      }
      return [...prev, newLobster]
    })
  }, [waitingQueue])

  useEffect(() => {
    if (!audioReady) return

    const trigger = () => {
      playSound()
      spawnBubble()
      setTimeout(spawnNextLobster, 250)
    }

    const initialTimeout = setTimeout(trigger, 500)
    intervalRef.current = setInterval(trigger, 5000)

    return () => {
      clearTimeout(initialTimeout)
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [audioReady, playSound, spawnBubble, spawnNextLobster])

  useEffect(() => {
    const tableLevel = 83
    const animate = () => {
      setLobsters(prev =>
        prev.map(lobster => {
          if (lobster.delay > 0) {
            return { ...lobster, delay: lobster.delay - 50 }
          }
          if (lobster.y >= tableLevel) {
            return { ...lobster, speed: 0, landed: true }
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

  const handleClick = useCallback(() => {
    if (audioRef.current && !soundEnabled) {
      audioRef.current.play().then(() => {
        audioRef.current?.pause()
        audioRef.current!.currentTime = 0
        setSoundEnabled(true)
      }).catch(() => {})
    }
  }, [soundEnabled])

  const handleLobsterClick = (e: React.MouseEvent, lobster: FallingLobster) => {
    e.stopPropagation()
    if (lobster.landed) {
      setSelectedLobster(lobster)
    }
  }

  return (
    <div
      className="fixed inset-0 overflow-hidden cursor-pointer p-8"
      style={{ backgroundColor: '#FFFFFF' }}
      onClick={handleClick}
    >
      <img
        src="/khaled_.png"
        alt="DJ Khaled at table"
        className="absolute inset-8 w-[calc(100%-4rem)] h-[calc(100%-4rem)] object-contain object-bottom pointer-events-none"
      />

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

      {lobsters.map(lobster => (
        <img
          key={lobster.id}
          src="/lobster (2).png"
          alt={lobster.name}
          onClick={(e) => handleLobsterClick(e, lobster)}
          className={`absolute ${lobster.landed ? 'cursor-pointer hover:scale-110 transition-transform' : 'pointer-events-none'}`}
          style={{
            left: `${lobster.x}%`,
            top: `${lobster.y}%`,
            transform: `translate(-50%, -50%) rotate(${lobster.rotation}deg)`,
            width: '60px',
            height: 'auto',
            zIndex: lobster.landed ? 20 : 5,
          }}
        />
      ))}

      {!soundEnabled && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 text-black text-sm opacity-50 z-30">
          Click anywhere to enable sound
        </div>
      )}

      {selectedLobster && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
          onClick={() => setSelectedLobster(null)}
        >
          <div
            className="bg-white p-8 max-w-md mx-4 rounded-lg shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-4 mb-4">
              <img src="/lobster (2).png" alt="" className="w-16 h-auto" />
              <h2 className="text-2xl font-bold uppercase">{selectedLobster.name}</h2>
            </div>
            <div className="mb-6">
              <h3 className="text-sm uppercase text-gray-500 mb-2">Confession</h3>
              <p className="text-lg">{selectedLobster.confession}</p>
            </div>
            <button
              onClick={() => setSelectedLobster(null)}
              className="w-full py-3 bg-black text-white uppercase font-bold hover:bg-gray-800 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {waitingQueue.length === 0 && lobsters.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none">
          <div className="text-center text-black/50">
            <p className="text-xl">No lobsters in the queue...</p>
            <p className="text-sm mt-2">Agents must offer themselves first</p>
          </div>
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
