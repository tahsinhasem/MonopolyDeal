"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { GameCard } from "./card";
import type { Player } from "@/lib/types";
import { getCard, PROPERTY_COLORS } from "@/lib/cards";

interface DebtPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (paymentCards: string[]) => void;
  player: Player;
  debtAmount: number;
  debtType: string; // "rent", "debt_collector", "birthday"
  creditorName: string;
}

interface PaymentCard {
  cardId: string;
  value: number;
  type: "money" | "property";
  propertyColor?: string;
}

export function DebtPaymentModal({
  isOpen,
  onClose,
  onConfirm,
  player,
  debtAmount,
  debtType,
  creditorName,
}: DebtPaymentModalProps) {
  const [selectedCards, setSelectedCards] = useState<string[]>([]);
  const [availableCards, setAvailableCards] = useState<PaymentCard[]>([]);

  useEffect(() => {
    if (!player) return;

    const cards: PaymentCard[] = [];

    // Add money cards from bank
    player.bank.forEach((cardId) => {
      const card = getCard(cardId);
      if (card && card.value !== undefined) {
        cards.push({
          cardId,
          value: card.value,
          type: "money",
        });
      }
    });

    // Add property cards (can only use properties from incomplete sets)
    Object.entries(player.properties).forEach(([color, cardIds]) => {
      // Check if this is a complete set
      const colorInfo = PROPERTY_COLORS[color as keyof typeof PROPERTY_COLORS];
      const isCompleteSet = colorInfo && cardIds.length === colorInfo.count;

      if (!isCompleteSet) {
        cardIds.forEach((cardId) => {
          const card = getCard(cardId);
          if (card && card.value !== undefined) {
            cards.push({
              cardId,
              value: card.value,
              type: "property",
              propertyColor: color,
            });
          }
        });
      }
    });

    // Sort by value (highest first) to help with selection
    cards.sort((a, b) => b.value - a.value);
    setAvailableCards(cards);
  }, [player]);

  const getTotalSelectedValue = () => {
    return selectedCards.reduce((total, cardId) => {
      const card = availableCards.find((c) => c.cardId === cardId);
      return total + (card?.value || 0);
    }, 0);
  };

  const toggleCardSelection = (cardId: string) => {
    if (selectedCards.includes(cardId)) {
      setSelectedCards(selectedCards.filter((id) => id !== cardId));
    } else {
      setSelectedCards([...selectedCards, cardId]);
    }
  };

  const autoSelectOptimal = () => {
    const sortedCards = [...availableCards].sort((a, b) => a.value - b.value);
    const selected: string[] = [];
    let remainingDebt = debtAmount;

    for (const card of sortedCards) {
      if (remainingDebt <= 0) break;
      selected.push(card.cardId);
      remainingDebt -= card.value;
    }

    setSelectedCards(selected);
  };

  const handleConfirm = () => {
    if (
      getTotalSelectedValue() >= debtAmount ||
      isSelectingEverything ||
      hasNoCards
    ) {
      onConfirm(selectedCards);
      handleClose();
    }
  };

  const handleClose = () => {
    setSelectedCards([]);
    onClose();
  };

  const selectedValue = getTotalSelectedValue();
  const totalAvailableValue = availableCards.reduce(
    (sum, card) => sum + card.value,
    0
  );
  const isSelectingEverything =
    selectedCards.length === availableCards.length && selectedCards.length > 0;
  const hasNoCards = availableCards.length === 0;
  const canPayExactly = selectedValue >= debtAmount;
  const canPayPartially =
    isSelectingEverything && totalAvailableValue < debtAmount;
  const canPayNothing = hasNoCards; // Player has no cards to pay with
  const canConfirm = canPayExactly || canPayPartially || canPayNothing;
  const overpayment = selectedValue - debtAmount;
  const isOverpaying = selectedValue > debtAmount;
  const shortfall = debtAmount - totalAvailableValue;

  const getDebtTypeDisplay = () => {
    switch (debtType) {
      case "rent":
        return "rent";
      case "debt_collector":
        return "debt";
      case "birthday":
        return "birthday money";
      default:
        return "payment";
    }
  };

  if (!player) return null;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">
            Pay {getDebtTypeDisplay()} to {creditorName}
          </DialogTitle>
          <div className="space-y-2">
            <p className="text-gray-600">
              You owe <strong>${debtAmount}M</strong> but only have{" "}
              <strong>${player.bankValue}M</strong> in your bank.
            </p>
            <p className="text-gray-600">
              Select cards worth at least <strong>${debtAmount}M</strong> to pay
              the debt. You can use money cards from your bank and property
              cards.
            </p>
            {overpayment > 0 && canPayExactly && (
              <p className="text-amber-600 font-medium">
                ⚠️ You will overpay by ${overpayment}M with the current
                selection.
                {overpayment <= 2
                  ? " This is normal when you don't have exact change."
                  : " Consider if you want to pay this much extra."}
              </p>
            )}
            {hasNoCards && (
              <p className="text-red-600 font-medium">
                ⚠️ You have no cards available to pay the debt. The entire $
                {debtAmount}M debt will be forgiven.
              </p>
            )}
            {canPayPartially && !canPayExactly && !hasNoCards && (
              <p className="text-red-600 font-medium">
                ⚠️ You don&apos;t have enough cards to pay the full debt. You
                can only pay ${totalAvailableValue}M of the ${debtAmount}M owed.
                The remaining ${shortfall}M debt will be forgiven.
              </p>
            )}
            {selectedValue === 0 && availableCards.length > 0 && (
              <p className="text-blue-600 font-medium">
                💡 You can select all your available cards if you don&apos;t
                have enough for exact payment.
              </p>
            )}
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {/* Payment Summary */}
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex justify-between items-center text-lg font-semibold">
              <span>Amount Owed:</span>
              <span className="text-red-600">${debtAmount}M</span>
            </div>
            <div className="flex justify-between items-center text-lg font-semibold">
              <span>Selected Value:</span>
              <span
                className={
                  selectedValue >= debtAmount
                    ? "text-green-600"
                    : canPayPartially && isSelectingEverything
                    ? "text-orange-600"
                    : "text-gray-600"
                }
              >
                ${selectedValue}M
              </span>
            </div>
            {overpayment > 0 && canPayExactly && (
              <div className="flex justify-between items-center text-sm text-amber-600">
                <span>Overpayment:</span>
                <span>${overpayment}M</span>
              </div>
            )}
            {hasNoCards && (
              <div className="flex justify-between items-center text-sm text-red-600">
                <span>Debt Forgiveness:</span>
                <span>${debtAmount}M (no cards available)</span>
              </div>
            )}
            {canPayPartially && !canPayExactly && !hasNoCards && (
              <div className="flex justify-between items-center text-sm text-red-600">
                <span>Shortfall:</span>
                <span>${shortfall}M (will be forgiven)</span>
              </div>
            )}
          </div>

          {/* Auto-select button */}
          {!hasNoCards && (
            <div className="text-center space-x-3">
              <Button onClick={autoSelectOptimal} variant="outline" size="sm">
                Auto-select optimal cards
              </Button>
              <Button
                onClick={() =>
                  setSelectedCards(availableCards.map((c) => c.cardId))
                }
                variant="outline"
                size="sm"
                className="bg-amber-50 hover:bg-amber-100 border-amber-300"
              >
                Select all available cards
              </Button>
            </div>
          )}

          {/* Available Cards */}
          <div>
            <h3 className="text-lg font-semibold mb-4">
              Available Cards for Payment
            </h3>
            {availableCards.length === 0 ? (
              <div className="text-center py-8 bg-gray-50 rounded-lg">
                <p className="text-gray-600 text-lg font-medium mb-2">
                  💳 No cards available for payment
                </p>
                <p className="text-gray-500 text-sm">
                  You have no money in your bank and no incomplete property sets
                  to pay with.
                  <br />
                  The debt will be automatically forgiven.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                {availableCards.map((paymentCard) => {
                  const isSelected = selectedCards.includes(paymentCard.cardId);
                  return (
                    <div
                      key={paymentCard.cardId}
                      className={`cursor-pointer transition-all ${
                        isSelected
                          ? "ring-2 ring-blue-500 transform scale-105"
                          : "hover:scale-102"
                      }`}
                      onClick={() => toggleCardSelection(paymentCard.cardId)}
                    >
                      <GameCard cardId={paymentCard.cardId} size="medium" />
                      <div className="text-center mt-1">
                        <p className="text-xs font-medium">
                          ${paymentCard.value}M
                        </p>
                        <p className="text-xs text-gray-500 capitalize">
                          {paymentCard.type === "property" &&
                          paymentCard.propertyColor
                            ? `${paymentCard.propertyColor} property`
                            : paymentCard.type}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Selected Cards Summary */}
          {selectedCards.length > 0 && (
            <div className="bg-blue-50 rounded-lg p-4">
              <h4 className="font-semibold mb-2">Selected for Payment:</h4>
              <div className="space-y-2">
                <div className="flex flex-wrap gap-2">
                  {selectedCards.map((cardId) => {
                    const paymentCard = availableCards.find(
                      (c) => c.cardId === cardId
                    );
                    const card = getCard(cardId);
                    return (
                      <div
                        key={cardId}
                        className="flex items-center gap-1 bg-white rounded px-2 py-1 text-sm"
                      >
                        <span>{card?.name || "Unknown"}</span>
                        <span className="font-medium">
                          ${paymentCard?.value}M
                        </span>
                        <span className="text-xs text-gray-500">
                          (
                          {paymentCard?.type === "property"
                            ? `${paymentCard.propertyColor} property`
                            : "money"}
                          )
                        </span>
                      </div>
                    );
                  })}
                </div>
                <div className="text-sm text-gray-600 mt-2">
                  💰 Money cards will go to {creditorName}&apos;s bank | 🏠
                  Property cards will go to {creditorName}&apos;s properties
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
            disabled={!canConfirm}
            className={canConfirm ? "bg-green-600 hover:bg-green-700" : ""}
          >
            {hasNoCards
              ? "Accept Debt Forgiveness"
              : isOverpaying
              ? `Pay All (${selectedValue}M)`
              : `Pay ${selectedValue}M`}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
