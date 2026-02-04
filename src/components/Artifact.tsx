'use client'

import { useState, useEffect, useRef } from 'react'
import { BodyPart } from '@/lib/types'

interface ArtifactProps {
  part: BodyPart
  onEdit: () => void
  onImageChange: () => void
  onPositionChange: (position: { x: number; y: number }) => void
  onResize: (size: { width: number; height: number }) => void
  containerRef: React.RefObject<HTMLDivElement | null>
}

export function Artifact({
  part,
  onEdit,
  onImageChange,
  onPositionChange,
  onResize,
  containerRef
}: ArtifactProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [isResizing, setIsResizing] = useState(false)
  const [isHovered, setIsHovered] = useState(false)
  const dragStart = useRef({ x: 0, y: 0, startX: 0, startY: 0 })
  const resizeStart = useRef({ width: 0, height: 0, startX: 0, startY: 0 })

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return
    e.preventDefault()
    setIsDragging(true)
    dragStart.current = {
      x: e.clientX,
      y: e.clientY,
      startX: part.position.x,
      startY: part.position.y
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
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* The artifact image */}
      <img
        src={part.imageUrl}
        alt={part.label}
        className="w-full h-full object-contain transition-all duration-500"
        style={{
          filter: isHovered ? 'grayscale(0%)' : 'grayscale(100%)',
          opacity: isHovered ? 1 : 0.8
        }}
        draggable={false}
      />

      {/* Label */}
      <div
        className={`absolute -bottom-6 left-1/2 -translate-x-1/2 text-[10px] uppercase tracking-widest transition-opacity whitespace-nowrap ${
          isHovered ? 'opacity-100' : 'opacity-0'
        }`}
        style={{ color: '#999' }}
      >
        {part.label}
      </div>

      {/* Action buttons on hover */}
      {isHovered && (
        <div className="absolute -top-8 left-1/2 -translate-x-1/2 flex gap-1">
          <button
            onClick={(e) => {
              e.stopPropagation()
              onEdit()
            }}
            className="px-2 py-1 bg-black text-white text-[10px] uppercase tracking-wider hover:bg-gray-800"
            title="Edit content"
          >
            edit
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation()
              onImageChange()
            }}
            className="px-2 py-1 bg-black text-white text-[10px] uppercase tracking-wider hover:bg-gray-800"
            title="Change image"
          >
            image
          </button>
        </div>
      )}

      {/* Resize handle */}
      {isHovered && (
        <div
          className="absolute bottom-0 right-0 w-3 h-3 cursor-se-resize opacity-50 hover:opacity-100"
          onMouseDown={handleResizeStart}
        >
          <svg viewBox="0 0 12 12" className="w-full h-full">
            <path d="M10 10H6M10 10V6M10 10L6 6" stroke="#000" strokeWidth="1.5" fill="none" />
          </svg>
        </div>
      )}
    </div>
  )
}
