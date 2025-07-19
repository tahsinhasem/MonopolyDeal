"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { GameCard } from "./card";
import type { Player } from "@/lib/types";
import { getCard } from "@/lib/cards";

interface JustSayNoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (justSayNoCardId?: string) => void;
  onDecline: () => void;
  player: Player;
  actionDescription: string;
  attackerName: string;
  actionType: string;
}

export function JustSayNoModal({
  isOpen,
  onClose,
  onConfirm,
  onDecline,
  player,
  actionDescription,
  attackerName,
  actionType,
}: JustSayNoModalProps) {
  const [selectedJustSayNoCard, setSelectedJustSayNoCard] =
    useState<string>("");

  // Find all "Just Say No!" cards in the player's hand
  const justSayNoCards = player.hand.filter((cardId) => {
    const card = getCard(cardId);
    return card && card.name === "Just Say No!";
  });

  const handleConfirm = () => {
    onConfirm(selectedJustSayNoCard || undefined);
    handleClose();
  };

  const handleDecline = () => {
    onDecline();
    handleClose();
  };

  const handleClose = () => {
    setSelectedJustSayNoCard("");
    onClose();
  };

  const getActionIcon = () => {
    switch (actionType) {
      case "Rent":
      case "Wild Rent":
        return "🏠";
      case "Debt Collector":
        return "💰";
      case "Sly Deal":
        return "🕵️";
      case "Deal Breaker":
        return "💥";
      case "Forced Deal":
        return "🤝";
      case "It's My Birthday":
        return "🎂";
      default:
        return "⚡";
    }
  };

  if (!player) return null;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-center">
            {getActionIcon()} Action Played Against You!
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Action Description */}
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="text-center">
              <p className="text-lg font-semibold text-red-800 mb-2">
                {attackerName} played {actionType}
              </p>
              <p className="text-red-700">{actionDescription}</p>
            </div>
          </div>

          {/* Just Say No Cards Available */}
          {justSayNoCards.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold mb-3 text-center">
                💫 You can block this action!
              </h3>
              <p className="text-sm text-gray-600 mb-4 text-center">
                Select a "Just Say No!" card to cancel {attackerName}'s action
              </p>

              <div className="flex justify-center gap-3">
                {justSayNoCards.map((cardId) => (
                  <div
                    key={cardId}
                    className={`cursor-pointer transition-all ${
                      selectedJustSayNoCard === cardId
                        ? "ring-2 ring-blue-500 transform scale-105"
                        : "hover:scale-102"
                    }`}
                    onClick={() => setSelectedJustSayNoCard(cardId)}
                  >
                    <GameCard cardId={cardId} size="medium" />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* No Just Say No Cards */}
          {justSayNoCards.length === 0 && (
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-center text-gray-600">
                💔 You don't have any "Just Say No!" cards to block this action.
                <br />
                You must accept the effect of {attackerName}'s {actionType}.
              </p>
            </div>
          )}

          {/* Decision Time Warning */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
            <p className="text-sm text-yellow-800 text-center">
              ⏰ <strong>Decision required:</strong> Choose whether to block
              this action or let it happen.
              {justSayNoCards.length > 0 &&
                " Other players are waiting for your response."}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 justify-center mt-6">
          <Button
            onClick={handleDecline}
            variant="outline"
            className="flex-1 max-w-40"
          >
            Let it happen
          </Button>
          {justSayNoCards.length > 0 && (
            <Button
              onClick={handleConfirm}
              disabled={!selectedJustSayNoCard}
              className="flex-1 max-w-40 bg-blue-600 hover:bg-blue-700"
            >
              Just Say No! ⛔
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
