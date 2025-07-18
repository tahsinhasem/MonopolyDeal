"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { GameCard } from "./card"
import type { Player } from "@/lib/types"
import { PROPERTY_COLORS } from "@/lib/cards"

interface PropertySelectionModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: (propertyId: string, propertyColor: string) => void
  targetPlayer: Player | null
  targetPlayerName: string
  actionType: "Sly Deal" | "Deal Breaker"
}

export function PropertySelectionModal({
  isOpen,
  onClose,
  onConfirm,
  targetPlayer,
  targetPlayerName,
  actionType,
}: PropertySelectionModalProps) {
  const [selectedProperty, setSelectedProperty] = useState<string>("")
  const [selectedPropertyColor, setSelectedPropertyColor] = useState<string>("")

  // Add early return if required data is not available
  if (!targetPlayer || !actionType) {
    return null
  }

  const getAvailablePropertySets = () => {
    // Add null check for targetPlayer
    if (!targetPlayer || !targetPlayer.properties) {
      return []
    }

    const availableSets: Array<{
      color: string
      colorName: string
      cards: string[]
      isComplete: boolean
      count: number
      maxCount: number
      rentValues: number[]
    }> = []

    Object.entries(targetPlayer.properties).forEach(([color, cardIds]) => {
      const colorInfo = PROPERTY_COLORS[color as keyof typeof PROPERTY_COLORS]
      const isComplete = colorInfo && cardIds.length === colorInfo.count

      // For Sly Deal: can steal from any set
      // For Deal Breaker: can only steal complete sets
      if (actionType === "Sly Deal" || (actionType === "Deal Breaker" && isComplete)) {
        availableSets.push({
          color,
          colorName: colorInfo?.name || color,
          cards: cardIds,
          isComplete: !!isComplete,
          count: cardIds.length,
          maxCount: colorInfo?.count || 0,
          rentValues: colorInfo?.rentValues || [],
        })
      }
    })

    return availableSets
  }

  const availablePropertySets = getAvailablePropertySets()

  const handlePropertySelect = (propertyId: string, color: string) => {
    setSelectedProperty(propertyId)
    setSelectedPropertyColor(color)
  }

  const handleConfirm = () => {
    if (selectedProperty && selectedPropertyColor) {
      onConfirm(selectedProperty, selectedPropertyColor)
      handleClose()
    }
  }

  const handleClose = () => {
    setSelectedProperty("")
    setSelectedPropertyColor("")
    onClose()
  }

  const getActionDescription = () => {
    if (actionType === "Sly Deal") {
      return `Select one property to steal from ${targetPlayerName}. You can steal any individual property, but not from complete sets if they only have one property of that color.`
    } else {
      return `Select a complete property set to steal from ${targetPlayerName}. You can only steal entire complete sets with Deal Breaker.`
    }
  }

  const getActionIcon = () => {
    return actionType === "Sly Deal" ? "🕵️" : "💥"
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold flex items-center gap-2">
            {getActionIcon()} {actionType} - Target: {targetPlayerName}
          </DialogTitle>
          <p className="text-gray-600">{getActionDescription()}</p>
        </DialogHeader>

        <div className="space-y-6">
          {availablePropertySets.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500 text-lg">
                {targetPlayerName} has no properties available for {actionType}.
              </p>
              {actionType === "Deal Breaker" && (
                <p className="text-gray-400 text-sm mt-2">Deal Breaker can only steal complete property sets.</p>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {availablePropertySets.map((propertySet) => (
                <div key={propertySet.color} className="border-2 rounded-lg p-4 bg-gray-50">
                  <div className="flex justify-between items-center mb-3">
                    <div>
                      <h3 className="text-lg font-bold capitalize">{propertySet.colorName}</h3>
                      <div className="flex items-center gap-4 text-sm text-gray-600">
                        <span>
                          Properties: {propertySet.count}/{propertySet.maxCount}
                        </span>
                        {propertySet.isComplete && (
                          <>
                            <span className="text-green-600 font-semibold">✓ Complete Set</span>
                            <span>Rent: {propertySet.rentValues.map((rent, i) => `${i + 1}=${rent}M`).join(", ")}</span>
                          </>
                        )}
                      </div>
                    </div>
                    {actionType === "Deal Breaker" && propertySet.isComplete && (
                      <div className="text-right">
                        <div className="text-sm text-orange-600 font-semibold">Entire Set</div>
                        <div className="text-xs text-gray-500">All properties will be stolen</div>
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                    {propertySet.cards.map((cardId) => (
                      <div
                        key={cardId}
                        className={`cursor-pointer transition-all ${
                          selectedProperty === cardId ? "ring-2 ring-red-500 transform scale-105" : "hover:scale-102"
                        }`}
                        onClick={() => handlePropertySelect(cardId, propertySet.color)}
                      >
                        <GameCard cardId={cardId} size="medium" />
                        {actionType === "Sly Deal" && (
                          <p className="text-xs text-center mt-1 text-gray-600">Click to steal this property</p>
                        )}
                      </div>
                    ))}
                  </div>

                  {actionType === "Deal Breaker" && propertySet.isComplete && (
                    <div className="mt-3 p-2 bg-orange-100 border border-orange-300 rounded">
                      <p className="text-sm text-orange-800 font-medium">
                        💥 Deal Breaker will steal ALL {propertySet.count} properties from this set
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Selection Summary */}
          {selectedProperty && (
            <div className="bg-red-50 border-2 border-red-200 rounded-lg p-4">
              <h4 className="font-semibold mb-2 flex items-center gap-2">
                {getActionIcon()} {actionType} Summary:
              </h4>
              <div className="flex items-center justify-center gap-4">
                <div className="text-center">
                  <p className="text-sm text-gray-600">You will steal:</p>
                  <div className="mt-2">
                    <GameCard cardId={selectedProperty} size="small" />
                  </div>
                  <p className="text-xs mt-1 font-medium capitalize">
                    {PROPERTY_COLORS[selectedPropertyColor as keyof typeof PROPERTY_COLORS]?.name ||
                      selectedPropertyColor}
                  </p>
                </div>

                <div className="text-2xl">→</div>

                <div className="text-center">
                  <p className="text-sm text-gray-600">From:</p>
                  <p className="text-lg font-bold mt-2">{targetPlayerName}</p>
                  {actionType === "Deal Breaker" && (
                    <p className="text-xs text-orange-600 font-medium mt-1">
                      (Complete set of {availablePropertySets.find((s) => s.color === selectedPropertyColor)?.count}{" "}
                      properties)
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 justify-end mt-6">
          <Button onClick={handleClose} variant="outline">
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!selectedProperty || availablePropertySets.length === 0}
            className="bg-red-600 hover:bg-red-700"
          >
            {getActionIcon()} Execute {actionType}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
