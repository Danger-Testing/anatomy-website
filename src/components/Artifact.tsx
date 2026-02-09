'use client'

import { useState, useEffect, useRef } from 'react'
import { BodyPart } from '@/lib/types'

interface ArtifactProps {
  part: BodyPart
  onClick: () => void
  onPositionChange: (position: { x: number; y: number }) => void
  onResize: (size: { width: number; height: number }) => void
  containerRef: React.RefObject<HTMLDivElement | null>
}

export function Artifact({
  part,
  onClick,
  onPositionChange,
  onResize,
  containerRef
}: ArtifactProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [isResizing, setIsResizing] = useState(false)
  const [isHovered, setIsHovered] = useState(false)
  const dragStart = useRef({ x: 0, y: 0, startX: 0, startY: 0 })
  const resizeStart = useRef({ width: 0, height: 0, startX: 0, startY: 0 })

  const clickStart = useRef<{ x: number; y: number; time: number } | null>(null)

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return
    e.preventDefault()
    clickStart.current = { x: e.clientX, y: e.clientY, time: Date.now() }
    setIsDragging(true)
    dragStart.current = {
      x: e.clientX,
      y: e.clientY,
      startX: part.position.x,
      startY: part.position.y
    }
  }

  const handleMouseUp = (e: React.MouseEvent) => {
    if (clickStart.current) {
      const dx = Math.abs(e.clientX - clickStart.current.x)
      const dy = Math.abs(e.clientY - clickStart.current.y)
      const dt = Date.now() - clickStart.current.time
      if (dx < 5 && dy < 5 && dt < 300) {
        onClick()
      }
      clickStart.current = null
    }
  }

  const handleResizeStart = (e: React.MouseEvent) => {
    e.stopPropagation()
    e.preventDefault()
    setIsResizing(true)
    resizeStart.current = {
      width: part.position.width,
      height: part.position.height,
      startX: e.clientX,
      startY: e.clientY
    }
  }

  useEffect(() => {
    if (!isDragging && !isResizing) return

    const handleMouseMove = (e: MouseEvent) => {
      if (!containerRef.current) return

      if (isDragging) {
        const rect = containerRef.current.getBoundingClientRect()
        const deltaX = ((e.clientX - dragStart.current.x) / rect.width) * 100
        const deltaY = ((e.clientY - dragStart.current.y) / rect.height) * 100
        onPositionChange({
          x: Math.max(0, Math.min(90, dragStart.current.startX + deltaX)),
          y: Math.max(0, Math.min(90, dragStart.current.startY + deltaY))
        })
      }

      if (isResizing) {
        const rect = containerRef.current.getBoundingClientRect()
        const deltaX = ((e.clientX - resizeStart.current.startX) / rect.width) * 100 * (rect.width / 100)
        const deltaY = ((e.clientY - resizeStart.current.startY) / rect.height) * 100 * (rect.height / 100)
        onResize({
          width: Math.max(50, resizeStart.current.width + deltaX),
          height: Math.max(50, resizeStart.current.height + deltaY)
        })
      }
    }

    const handleMouseUp = () => {
      setIsDragging(false)
      setIsResizing(false)
    }

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)

    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isDragging, isResizing, containerRef, onPositionChange, onResize])

  return (
    <div
      className="absolute group select-none"
      style={{
        left: `${part.position.x}%`,
        top: `${part.position.y}%`,
        width: part.position.width,
        height: part.position.height,
        transform: part.position.rotation ? `rotate(${part.position.rotation}deg)` : undefined,
        cursor: isDragging ? 'grabbing' : 'grab',
        zIndex: isDragging || isHovered ? 50 : 10
      }}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* The artifact image */}
      <img
        src={part.imageUrl}
        alt={part.label}
        className="w-full h-full object-contain"
        draggable={false}
      />

      {/* Label below */}
      <div
        className="absolute -bottom-8 left-1/2 -translate-x-1/2 text-lg uppercase tracking-wider font-bold whitespace-nowrap"
        style={{ color: '#000' }}
      >
        {part.label}
      </div>

    </div>
  )
}
