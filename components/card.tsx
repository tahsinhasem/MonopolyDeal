"use client"

import { getCard, PROPERTY_COLORS } from "@/lib/cards"
import { Card, CardContent } from "@/components/ui/card"

interface GameCardProps {
  cardId: string
  isSelected?: boolean
  onClick?: () => void
  className?: string
  size?: "small" | "medium" | "large"
}

const COLOR_STYLES = {
  brown: "bg-gradient-to-b from-amber-700 to-amber-900 text-white border-amber-800",
  lightblue: "bg-gradient-to-b from-sky-200 to-sky-400 text-black border-sky-500",
  pink: "bg-gradient-to-b from-pink-300 to-pink-500 text-white border-pink-600",
  orange: "bg-gradient-to-b from-orange-400 to-orange-600 text-white border-orange-700",
  red: "bg-gradient-to-b from-red-500 to-red-700 text-white border-red-800",
  yellow: "bg-gradient-to-b from-yellow-300 to-yellow-500 text-black border-yellow-600",
  green: "bg-gradient-to-b from-green-500 to-green-700 text-white border-green-800",
  darkblue: "bg-gradient-to-b from-blue-700 to-blue-900 text-white border-blue-900",
  utility: "bg-gradient-to-b from-gray-300 to-gray-500 text-black border-gray-600",
  railroad: "bg-gradient-to-b from-gray-700 to-gray-900 text-white border-gray-900",
}

export function GameCard({ cardId, isSelected, onClick, className = "", size = "medium" }: GameCardProps) {
  const card = getCard(cardId)

  if (!card) {
    return (
      <Card className={`cursor-pointer ${getSizeClasses(size)} ${className}`} onClick={onClick}>
        <CardContent className="p-2 h-full flex items-center justify-center bg-gray-200">
          <span className="text-xs">Unknown</span>
        </CardContent>
      </Card>
    )
  }

  const getCardStyle = () => {
    if (card.type === "property" && card.color) {
      return COLOR_STYLES[card.color as keyof typeof COLOR_STYLES] || "bg-gray-200 border-gray-300"
    }
    if (card.type === "money") return "bg-gradient-to-b from-green-100 to-green-200 text-green-800 border-green-300"
    if (card.type === "action") return "bg-gradient-to-b from-blue-100 to-blue-200 text-blue-800 border-blue-300"
    if (card.type === "rent") return "bg-gradient-to-b from-purple-100 to-purple-200 text-purple-800 border-purple-300"
    if (card.type === "house") return "bg-gradient-to-b from-yellow-100 to-yellow-200 text-yellow-800 border-yellow-300"
    if (card.type === "hotel") return "bg-gradient-to-b from-red-100 to-red-200 text-red-800 border-red-300"
    return "bg-gray-100 border-gray-300"
  }

  const getRentInfo = () => {
    if (card.type === "property" && card.color) {
      const colorInfo = PROPERTY_COLORS[card.color as keyof typeof PROPERTY_COLORS]
      if (colorInfo) {
        return {
          rentValues: colorInfo.rentValues,
          setSize: colorInfo.count,
          colorName: colorInfo.name,
        }
      }
    }
    return null
  }

  const rentInfo = getRentInfo()

  return (
    <Card
      className={`cursor-pointer transition-all border-2 ${
        isSelected ? "ring-4 ring-blue-400 transform -translate-y-2 shadow-lg" : "hover:shadow-md"
      } ${getSizeClasses(size)} ${className}`}
      onClick={onClick}
    >
      <CardContent className={`p-2 h-full flex flex-col justify-between ${getCardStyle()}`}>
        {/* Card Header */}
        <div className="text-center">
          <div className="text-sm font-bold leading-tight mb-1 px-1 truncate">{card.name}</div>
          {card.value && <div className="text-lg font-bold">${card.value}M</div>}
        </div>

        {/* Card Type Badge */}
        <div className="text-center">
          <span className="text-xs px-2 py-1 bg-black bg-opacity-20 rounded uppercase font-semibold truncate">
            {card.type === "property" && card.colors ? "Wildcard" : card.type}
          </span>
        </div>

        {/* Property-specific info */}
        {card.type === "property" && rentInfo && (
          <div className="text-center text-xs space-y-1 px-1">
            <div className="font-semibold truncate">{rentInfo.colorName}</div>
            <div className="truncate">Set: {rentInfo.setSize} properties</div>
            <div className="text-xs truncate">
              Rent: {rentInfo.rentValues.map((rent, i) => `${i + 1}=${rent}M`).join(", ")}
            </div>
          </div>
        )}

        {/* Wildcard info */}
        {card.type === "property" && card.colors && (
          <div className="text-center text-xs px-1">
            <div className="font-semibold">Wildcard</div>
            <div className="truncate">
              Can be:{" "}
              {card.colors
                .map((color) => PROPERTY_COLORS[color as keyof typeof PROPERTY_COLORS]?.name || color)
                .join(" or ")}
            </div>
          </div>
        )}

        {/* Action card description */}
        {card.type === "action" && card.description && (
          <div className="text-center text-xs px-1">
            <div className="font-semibold">Action</div>
            <div className="leading-tight truncate">{card.description}</div>
          </div>
        )}

        {/* Rent card info */}
        {card.type === "rent" && (
          <div className="text-center text-xs px-1">
            <div className="font-semibold">Rent Card</div>
            {card.colors ? (
              <div className="truncate">
                For:{" "}
                {card.colors
                  .map((color) => PROPERTY_COLORS[color as keyof typeof PROPERTY_COLORS]?.name || color)
                  .join("/")}
              </div>
            ) : (
              <div>Wild Rent - Any Color</div>
            )}
          </div>
        )}

        {/* Money card info */}
        {card.type === "money" && (
          <div className="text-center text-xs">
            <div className="font-semibold">Money</div>
            <div>Bank Value</div>
          </div>
        )}

        {/* House/Hotel info */}
        {(card.type === "house" || card.type === "hotel") && (
          <div className="text-center text-xs px-1">
            <div className="font-semibold">{card.type === "house" ? "House" : "Hotel"}</div>
            <div className="truncate">{card.description}</div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function getSizeClasses(size: "small" | "medium" | "large"): string {
  switch (size) {
    case "small":
      return "w-16 h-24"
    case "medium":
      return "w-32 h-44"
    case "large":
      return "w-40 h-56"
    default:
      return "w-32 h-44"
  }
}

export function CardBack({
  className = "",
  size = "medium",
}: { className?: string; size?: "small" | "medium" | "large" }) {
  return (
    <Card className={`${getSizeClasses(size)} ${className}`}>
      <CardContent className="p-2 h-full flex items-center justify-center bg-gradient-to-br from-blue-600 to-purple-600 border-2 border-blue-700">
        <div className="text-white text-center">
          <div className="text-lg font-bold">Deal</div>
          <div className="text-xs mt-1">🎲</div>
        </div>
      </CardContent>
    </Card>
  )
}
