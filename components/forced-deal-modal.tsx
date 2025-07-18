"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { GameCard } from "./card"
import type { Player } from "@/lib/types"
import { PROPERTY_COLORS } from "@/lib/cards"

interface ForcedDealModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: (myPropertyId: string, targetPropertyId: string) => void
  currentPlayer: Player
  targetPlayer: Player | null
  targetPlayerName: string
}

export function ForcedDealModal({
  isOpen,
  onClose,
  onConfirm,
  currentPlayer,
  targetPlayer,
  targetPlayerName,
}: ForcedDealModalProps) {
  const [selectedMyProperty, setSelectedMyProperty] = useState<string>("")
  const [selectedTargetProperty, setSelectedTargetProperty] = useState<string>("")

  // Add early return if required data is not available
  if (!currentPlayer || !targetPlayer) {
    return null
  }

  const getAvailableProperties = (player: Player) => {
    // Add null check for player
    if (!player || !player.properties) {
      return []
    }

    const availableProperties: Array<{ cardId: string; color: string; colorName: string }> = []

    Object.entries(player.properties).forEach(([color, cardIds]) => {
      const colorInfo = PROPERTY_COLORS[color as keyof typeof PROPERTY_COLORS]
      const isCompleteSet = colorInfo && cardIds.length === colorInfo.count

      // Can't trade properties from complete sets
      if (!isCompleteSet) {
        cardIds.forEach((cardId) => {
          availableProperties.push({
            cardId,
            color,
            colorName: colorInfo?.name || color,
          })
        })
      }
    })

    return availableProperties
  }

  const myAvailableProperties = getAvailableProperties(currentPlayer)
  const targetAvailableProperties = getAvailableProperties(targetPlayer)

  const handleConfirm = () => {
    if (selectedMyProperty && selectedTargetProperty) {
      onConfirm(selectedMyProperty, selectedTargetProperty)
      handleClose()
    }
  }

  const handleClose = () => {
    setSelectedMyProperty("")
    setSelectedTargetProperty("")
    onClose()
  }

  const canConfirm = selectedMyProperty && selectedTargetProperty

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">Forced Deal with {targetPlayerName}</DialogTitle>
          <p className="text-gray-600">
            Select one of your properties and one of {targetPlayerName}'s properties to trade. You cannot trade
            properties from complete sets.
          </p>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Your Properties */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Your Properties (Select One)</h3>
            {myAvailableProperties.length === 0 ? (
              <p className="text-gray-500 text-center py-8">
                You have no properties available for trading. (Complete sets cannot be traded)
              </p>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {myAvailableProperties.map((property) => (
                  <div
                    key={property.cardId}
                    className={`cursor-pointer transition-all ${
                      selectedMyProperty === property.cardId
                        ? "ring-2 ring-blue-500 transform scale-105"
                        : "hover:scale-102"
                    }`}
                    onClick={() => setSelectedMyProperty(property.cardId)}
                  >
                    <GameCard cardId={property.cardId} size="medium" />
                    <p className="text-xs text-center mt-1 font-medium capitalize">{property.colorName}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Target Player's Properties */}
          <div>
            <h3 className="text-lg font-semibold mb-4">{targetPlayerName}'s Properties (Select One)</h3>
            {targetAvailableProperties.length === 0 ? (
              <p className="text-gray-500 text-center py-8">
                {targetPlayerName} has no properties available for trading. (Complete sets cannot be traded)
              </p>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {targetAvailableProperties.map((property) => (
                  <div
                    key={property.cardId}
                    className={`cursor-pointer transition-all ${
                      selectedTargetProperty === property.cardId
                        ? "ring-2 ring-green-500 transform scale-105"
                        : "hover:scale-102"
                    }`}
                    onClick={() => setSelectedTargetProperty(property.cardId)}
                  >
                    <GameCard cardId={property.cardId} size="medium" />
                    <p className="text-xs text-center mt-1 font-medium capitalize">{property.colorName}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Selection Summary */}
        {(selectedMyProperty || selectedTargetProperty) && (
          <div className="bg-gray-50 rounded-lg p-4 mt-4">
            <h4 className="font-semibold mb-2">Trade Summary:</h4>
            <div className="flex items-center justify-center gap-4">
              <div className="text-center">
                <p className="text-sm text-gray-600">You give:</p>
                {selectedMyProperty ? (
                  <div className="mt-2">
                    <GameCard cardId={selectedMyProperty} size="small" />
                  </div>
                ) : (
                  <p className="text-gray-400 mt-2">Select a property</p>
                )}
              </div>

              <div className="text-2xl">⇄</div>

              <div className="text-center">
                <p className="text-sm text-gray-600">You get:</p>
                {selectedTargetProperty ? (
                  <div className="mt-2">
                    <GameCard cardId={selectedTargetProperty} size="small" />
                  </div>
                ) : (
                  <p className="text-gray-400 mt-2">Select a property</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-3 justify-end mt-6">
          <Button onClick={handleClose} variant="outline">
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={!canConfirm} className="bg-green-600 hover:bg-green-700">
            Confirm Trade
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
