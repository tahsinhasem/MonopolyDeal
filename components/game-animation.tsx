"use client"

import { useEffect, useState } from "react"

interface GameAnimationProps {
  animation: {
    type: string
    emoji: string
    message: string
    playerName: string
  } | null
  onComplete: () => void
}

export function GameAnimation({ animation, onComplete }: GameAnimationProps) {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    if (animation) {
      setIsVisible(true)
      const timer = setTimeout(() => {
        setIsVisible(false)
        setTimeout(onComplete, 300) // Wait for fade out
      }, 2500)

      return () => clearTimeout(timer)
    }
  }, [animation, onComplete])

  if (!animation || !isVisible) return null

  return (
    <div className="fixed inset-0 pointer-events-none z-50 flex items-center justify-center">
      <div className="bg-black bg-opacity-50 rounded-lg p-6 text-white text-center animate-bounce">
        <div className="text-6xl mb-4 animate-pulse">{animation.emoji}</div>
        <div className="text-xl font-bold mb-2">{animation.playerName}</div>
        <div className="text-lg">{animation.message}</div>
      </div>

      {/* Floating emojis */}
      <div className="absolute inset-0 overflow-hidden">
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="absolute text-4xl animate-ping"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 2}s`,
              animationDuration: `${2 + Math.random() * 2}s`,
            }}
          >
            {animation.emoji}
          </div>
        ))}
      </div>
    </div>
  )
}
