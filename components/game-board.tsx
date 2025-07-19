"use client";

import { useState, useEffect } from "react";
import type { GameState, Player } from "@/lib/types";
import { GameCard, CardBack } from "./card";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getCard, PROPERTY_COLORS } from "@/lib/cards";
import { ForcedDealModal } from "./forced-deal-modal";
import { PropertySelectionModal } from "./property-selection-modal";
import { DebtPaymentModal } from "./debt-payment-modal";
import { JustSayNoModal } from "./just-say-no-modal";
import { GameAnimation } from "./game-animation";
import { GameLogs } from "./game-logs";

interface GameBoardProps {
  game: GameState;
  currentUserId: string;
  onDrawCards: () => void;
  onPlayCard: (
    cardIds: string[],
    action: string,
    targetId?: string,
    propertyColor?: string
  ) => void;
  onEndTurn: () => void;
  onDiscardCards: (cardIds: string[]) => void;
  onPayDebt: (cardIds: string[]) => void;
  onSayNo: (justSayNoCardId?: string) => void;
  onAcceptAction: () => void;
  rejoiningMessage?: string;
}

interface GameLog {
  id: string;
  timestamp: number;
  type: string;
  playerName: string;
  message: string;
  emoji: string;
}

interface Animation {
  type: string;
  emoji: string;
  message: string;
  playerName: string;
}

export function GameBoard({
  game,
  currentUserId,
  onDrawCards,
  onPlayCard,
  onEndTurn,
  onDiscardCards,
  onPayDebt,
  onSayNo,
  onAcceptAction,
  rejoiningMessage,
}: GameBoardProps) {
  const [selectedCards, setSelectedCards] = useState<string[]>([]);
  const [selectedPropertyColor, setSelectedPropertyColor] =
    useState<string>("");
  const [selectedTargetPlayer, setSelectedTargetPlayer] = useState<string>("");
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showTargetPicker, setShowTargetPicker] = useState(false);
  const [showPropertyPicker, setShowPropertyPicker] = useState(false);
  const [showForcedDealModal, setShowForcedDealModal] = useState(false);
  const [showPropertySelectionModal, setShowPropertySelectionModal] =
    useState(false);
  const [showDebtPaymentModal, setShowDebtPaymentModal] = useState(false);
  const [showJustSayNoModal, setShowJustSayNoModal] = useState(false);
  const [logs, setLogs] = useState<GameLog[]>([]);
  const [currentAnimation, setCurrentAnimation] = useState<Animation | null>(
    null
  );
  const [lastActionId, setLastActionId] = useState<string>("");
  const [shownAnimations, setShownAnimations] = useState<Set<string>>(
    new Set()
  );
  const [shownCompletedSets, setShownCompletedSets] = useState<Set<string>>(
    new Set()
  );
  const [shownWildcardAnimations, setShownWildcardAnimations] = useState<
    Set<string>
  >(new Set());
  const [handCurrentPage, setHandCurrentPage] = useState<number>(0);
  const [waitingForConfirmation, setWaitingForConfirmation] = useState<{
    actionType: string;
    targetPlayerName: string;
  } | null>(null);

  const currentPlayer = game.players[currentUserId];
  const isCurrentTurn = game.currentTurnPlayerId === currentUserId;
  const otherPlayers = Object.values(game.players).filter(
    (p) => p.uid !== currentUserId
  );

  // Check if current player needs to pay debt
  const needsToPayDebt =
    game.pendingAction &&
    game.pendingAction.targetId === currentUserId &&
    game.pendingAction.debtAmount &&
    game.pendingAction.debtAmount > currentPlayer.bankValue;

  // Handle game state changes for logs and animations
  useEffect(() => {
    if (
      game.lastAction &&
      game.lastAction.timestamp.toString() !== lastActionId
    ) {
      setLastActionId(game.lastAction.timestamp.toString());

      const player = game.players[game.lastAction.playerId];
      const targetPlayer = game.lastAction.targetId
        ? game.players[game.lastAction.targetId]
        : null;

      if (player) {
        const logEntry = createLogEntry(game.lastAction, player, targetPlayer);
        const animation = createAnimation(
          game.lastAction,
          player,
          targetPlayer
        );

        if (logEntry) {
          setLogs((prev) => [...prev, logEntry].slice(-50)); // Keep last 50 logs
        }

        // Only show animation if we haven't shown it for this action already
        if (
          animation &&
          game.lastAction &&
          !shownAnimations.has(game.lastAction.timestamp.toString())
        ) {
          setCurrentAnimation(animation);
          setShownAnimations(
            (prev) => new Set([...prev, game.lastAction!.timestamp.toString()])
          );
        }
      }
    }
  }, [game.lastAction, game.players, lastActionId, shownAnimations]);

  // Check for completed sets and show celebration
  useEffect(() => {
    Object.values(game.players).forEach((player) => {
      const playerPropertySets = getPlayerPropertySets(player);
      const completedSets = playerPropertySets.filter((set) => set.isComplete);

      completedSets.forEach((set) => {
        const setKey = `${player.uid}-${set.color}`;

        // Only show animation if this set completion hasn't been shown before
        if (!shownCompletedSets.has(setKey) && player.uid !== currentUserId) {
          setShownCompletedSets((prev) => new Set([...prev, setKey]));

          // Show celebration for completed sets with a slight delay
          setTimeout(() => {
            if (!currentAnimation) {
              setCurrentAnimation({
                type: "SET_COMPLETE",
                emoji: "🎊",
                message: `Completed ${set.color} property set!`,
                playerName: player.displayName,
              });
            }
          }, 1000);
        }
      });
    });
  }, [game.players, currentUserId, currentAnimation, shownCompletedSets]);

  // Show debt payment modal when needed
  useEffect(() => {
    if (needsToPayDebt && !showDebtPaymentModal) {
      setShowDebtPaymentModal(true);
    }
  }, [needsToPayDebt, showDebtPaymentModal]);

  // Show Just Say No modal when a "Just Say No"-able action is pending
  useEffect(() => {
    const needsJustSayNoConfirmation =
      game.pendingAction &&
      game.pendingAction.targetId === currentUserId &&
      game.pendingAction.canSayNo &&
      game.pendingAction.type === "CONFIRM_ACTION";

    if (needsJustSayNoConfirmation && !showJustSayNoModal) {
      setShowJustSayNoModal(true);
    } else if (!needsJustSayNoConfirmation && showJustSayNoModal) {
      setShowJustSayNoModal(false);
    }
  }, [game.pendingAction, currentUserId, showJustSayNoModal]);

  // Clear waiting state when pending action starts or game state changes
  useEffect(() => {
    if (game.pendingAction || game.currentTurnPlayerId !== currentUserId) {
      setWaitingForConfirmation(null);
    }
  }, [game.pendingAction, game.currentTurnPlayerId, currentUserId]);

  // Reset hand page when hand size changes significantly
  useEffect(() => {
    const maxPage = Math.ceil(currentPlayer.hand.length / 6) - 1;
    if (handCurrentPage > maxPage) {
      setHandCurrentPage(Math.max(0, maxPage));
    }
  }, [currentPlayer.hand.length, handCurrentPage]);

  const createLogEntry = (
    action: {
      type: string;
      playerId: string;
      targetId?: string;
      cardId?: string;
      timestamp: number;
    },
    player: Player,
    targetPlayer: Player | null
  ): GameLog | null => {
    const timestamp = action.timestamp;
    // Create a unique ID by including timestamp, player ID, action type, and random number
    const id = `${timestamp}-${action.playerId}-${action.type}-${Math.random()
      .toString(36)
      .substr(2, 9)}`;

    switch (action.type) {
      case "It's My Birthday":
        return {
          id,
          timestamp,
          type: action.type,
          playerName: player.displayName,
          message: "celebrated their birthday! Everyone pays 2M",
          emoji: "🎉",
        };

      case "Pass Go":
        return {
          id,
          timestamp,
          type: action.type,
          playerName: player.displayName,
          message: "passed GO and drew 2 cards",
          emoji: "🎯",
        };

      case "Debt Collector":
        return {
          id,
          timestamp,
          type: action.type,
          playerName: player.displayName,
          message: `collected 5M debt from ${
            targetPlayer?.displayName || "someone"
          }`,
          emoji: "💰",
        };

      case "Sly Deal":
        return {
          id,
          timestamp,
          type: action.type,
          playerName: player.displayName,
          message: `stole a property from ${
            targetPlayer?.displayName || "someone"
          }`,
          emoji: "🕵️",
        };

      case "Deal Breaker":
        return {
          id,
          timestamp,
          type: action.type,
          playerName: player.displayName,
          message: `broke a deal and stole a complete set from ${
            targetPlayer?.displayName || "someone"
          }`,
          emoji: "💥",
        };

      case "Forced Deal":
        return {
          id,
          timestamp,
          type: action.type,
          playerName: player.displayName,
          message: `forced a property trade with ${
            targetPlayer?.displayName || "someone"
          }`,
          emoji: "🤝",
        };

      case "Rent":
      case "Wild Rent":
        return {
          id,
          timestamp,
          type: action.type,
          playerName: player.displayName,
          message: `charged rent to ${targetPlayer?.displayName || "someone"}`,
          emoji: "🏠",
        };

      case "DEBT_PAID_RENT":
        return {
          id,
          timestamp,
          type: action.type,
          playerName: player.displayName,
          message: `paid rent debt to ${
            targetPlayer?.displayName || "someone"
          }`,
          emoji: "💸",
        };

      case "DEBT_PAID_DEBT_COLLECTOR":
        return {
          id,
          timestamp,
          type: action.type,
          playerName: player.displayName,
          message: `paid debt collection to ${
            targetPlayer?.displayName || "someone"
          }`,
          emoji: "💸",
        };

      case "DEBT_PAID_BIRTHDAY":
        return {
          id,
          timestamp,
          type: action.type,
          playerName: player.displayName,
          message: `paid birthday money to ${
            targetPlayer?.displayName || "someone"
          }`,
          emoji: "💸",
        };

      default:
        return null;
    }
  };

  const createAnimation = (
    action: {
      type: string;
      playerId: string;
      targetId?: string;
      cardId?: string;
      timestamp: number;
    },
    player: Player,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    targetPlayer: Player | null
  ): Animation | null => {
    switch (action.type) {
      case "It's My Birthday":
        return {
          type: action.type,
          emoji: "🎉",
          message: "It's My Birthday!",
          playerName: player.displayName,
        };

      case "Pass Go":
        return {
          type: action.type,
          emoji: "🎯",
          message: "Passed GO!",
          playerName: player.displayName,
        };

      case "Debt Collector":
        return {
          type: action.type,
          emoji: "💰",
          message: "Debt Collector!",
          playerName: player.displayName,
        };

      case "Sly Deal":
        return {
          type: action.type,
          emoji: "🕵️",
          message: "Sly Deal!",
          playerName: player.displayName,
        };

      case "Deal Breaker":
        return {
          type: action.type,
          emoji: "💥",
          message: "Deal Breaker!",
          playerName: player.displayName,
        };

      case "Forced Deal":
        return {
          type: action.type,
          emoji: "🤝",
          message: "Forced Deal!",
          playerName: player.displayName,
        };

      case "Rent":
      case "Wild Rent":
        return {
          type: action.type,
          emoji: "🏠",
          message: action.type === "Wild Rent" ? "Wild Rent!" : "Rent!",
          playerName: player.displayName,
        };

      default:
        return null;
    }
  };

  const toggleCardSelection = (cardId: string) => {
    if (selectedCards.includes(cardId)) {
      resetSelection();
    } else {
      setSelectedCards([cardId]);
      const card = getCard(cardId);

      // Reset all selections
      setShowColorPicker(false);
      setShowTargetPicker(false);
      setShowPropertyPicker(false);
      setSelectedPropertyColor("");
      setSelectedTargetPlayer("");

      if (card) {
        // Check if it's a wildcard property that needs color selection
        if (card.type === "property" && card.colors && card.colors.length > 1) {
          setShowColorPicker(true);
          // Show wildcard animation only once per card
          if (!shownWildcardAnimations.has(cardId)) {
            setCurrentAnimation({
              type: "WILDCARD",
              emoji: card.name === "Super Wildcard" ? "⭐" : "🌈",
              message:
                card.name === "Super Wildcard"
                  ? "Super Wildcard Property!"
                  : "Wildcard Property!",
              playerName: currentPlayer.displayName,
            });
            setShownWildcardAnimations((prev) => new Set([...prev, cardId]));
          }
        }

        // Check if it's a house or hotel card that needs property color selection
        if (card.type === "house" || card.type === "hotel") {
          setShowColorPicker(true);
        }

        // Check if it's an action card that needs target selection
        if (card.type === "action" || card.type === "rent") {
          if (needsTargetSelection(card.name)) {
            setShowTargetPicker(true);
          }
          if (
            needsPropertySelection(card.name) &&
            !usesModalForPropertySelection(card.name)
          ) {
            setShowPropertyPicker(true);
          }
        }
      }
    }
  };

  const resetSelection = () => {
    setSelectedCards([]);
    setShowColorPicker(false);
    setShowTargetPicker(false);
    setShowPropertyPicker(false);
    setSelectedPropertyColor("");
    setSelectedTargetPlayer("");
    setShowForcedDealModal(false);
    setShowPropertySelectionModal(false);
    setShowDebtPaymentModal(false);
    setShowJustSayNoModal(false);
    setWaitingForConfirmation(null);
    setHandCurrentPage(0); // Reset hand page when clearing selection
  };

  const needsTargetSelection = (cardName: string): boolean => {
    return [
      "Debt Collector",
      "Sly Deal",
      "Deal Breaker",
      "Forced Deal",
      "Rent",
      "Wild Rent",
    ].includes(cardName);
  };

  const needsPropertySelection = (cardName: string): boolean => {
    return ["Sly Deal", "Deal Breaker", "Rent", "Wild Rent"].includes(cardName);
  };

  const usesModalForPropertySelection = (cardName: string): boolean => {
    return ["Sly Deal", "Deal Breaker"].includes(cardName);
  };

  const getSelectedCard = () => {
    if (selectedCards.length === 1) {
      return getCard(selectedCards[0]);
    }
    return null;
  };

  const selectedCard = getSelectedCard();

  const handlePlayAsMoney = () => {
    if (selectedCards.length === 1) {
      onPlayCard(selectedCards, "PLAY_MONEY");
      resetSelection();
    }
  };

  const handlePlayAsProperty = () => {
    if (selectedCards.length === 1) {
      let colorToUse = selectedPropertyColor;

      // If not a wildcard, use the card's natural color
      if (
        selectedCard?.type === "property" &&
        selectedCard.color &&
        !selectedCard.colors
      ) {
        colorToUse = selectedCard.color;
      }

      if (colorToUse) {
        onPlayCard(selectedCards, "PLAY_PROPERTY", undefined, colorToUse);
        resetSelection();
      }
    }
  };

  const handlePlayAsImprovement = () => {
    if (selectedCards.length === 1 && selectedPropertyColor) {
      onPlayCard(
        selectedCards,
        "PLAY_IMPROVEMENT",
        undefined,
        selectedPropertyColor
      );
      resetSelection();
    }
  };

  const handlePlayAsAction = () => {
    if (selectedCards.length === 1 && selectedCard) {
      // Special handling for Forced Deal
      if (selectedCard.name === "Forced Deal") {
        if (!selectedTargetPlayer) {
          return; // Need target selection first
        }
        setShowForcedDealModal(true);
        return;
      }

      // Special handling for Sly Deal and Deal Breaker
      if (
        selectedCard.name === "Sly Deal" ||
        selectedCard.name === "Deal Breaker"
      ) {
        if (!selectedTargetPlayer) {
          return; // Need target selection first
        }
        setShowPropertySelectionModal(true);
        return;
      }

      // Check if all required selections are made for other action cards
      if (needsTargetSelection(selectedCard.name) && !selectedTargetPlayer) {
        return; // Need target selection
      }
      if (needsPropertySelection(selectedCard.name) && !selectedPropertyColor) {
        return; // Need property selection
      }

      // Set waiting state for actions that require target confirmation
      const actionsRequiringConfirmation = [
        "Debt Collector",
        "Rent",
        "Wild Rent",
        "It's My Birthday",
      ];

      if (
        actionsRequiringConfirmation.includes(selectedCard.name) &&
        selectedTargetPlayer
      ) {
        setWaitingForConfirmation({
          actionType: selectedCard.name,
          targetPlayerName:
            game.players[selectedTargetPlayer]?.displayName || "Unknown",
        });
      }

      onPlayCard(
        selectedCards,
        "PLAY_ACTION",
        selectedTargetPlayer,
        selectedPropertyColor
      );
      resetSelection();
    }
  };

  const handleForcedDealConfirm = (
    myPropertyId: string,
    targetPropertyId: string
  ) => {
    if (selectedCards.length === 1) {
      // Set waiting state for Forced Deal
      if (selectedTargetPlayer) {
        setWaitingForConfirmation({
          actionType: "Forced Deal",
          targetPlayerName:
            game.players[selectedTargetPlayer]?.displayName || "Unknown",
        });
      }

      // We'll pass both property IDs in the cardIds array for the Forced Deal
      onPlayCard(
        [selectedCards[0], myPropertyId, targetPropertyId],
        "PLAY_ACTION",
        selectedTargetPlayer
      );
      resetSelection();
    }
  };

  const handlePropertySelectionConfirm = (
    propertyId: string,
    propertyColor: string
  ) => {
    if (selectedCards.length === 1) {
      // Set waiting state for Sly Deal and Deal Breaker
      if (selectedTargetPlayer && selectedCard) {
        setWaitingForConfirmation({
          actionType: selectedCard.name,
          targetPlayerName:
            game.players[selectedTargetPlayer]?.displayName || "Unknown",
        });
      }

      onPlayCard(
        selectedCards,
        "PLAY_ACTION",
        selectedTargetPlayer,
        propertyColor
      );
      resetSelection();
    }
  };

  const handleDebtPayment = (paymentCards: string[]) => {
    onPayDebt(paymentCards);
    setShowDebtPaymentModal(false);
  };

  const handleJustSayNo = (justSayNoCardId?: string) => {
    if (justSayNoCardId) {
      onSayNo(justSayNoCardId);
    }
    setShowJustSayNoModal(false);
  };

  const handleAcceptAction = () => {
    onAcceptAction();
    setShowJustSayNoModal(false);
  };

  const handleDiscard = () => {
    if (selectedCards.length > 0) {
      onDiscardCards(selectedCards);
      resetSelection();
    }
  };

  const canPlayAsMoney = () => {
    return (
      selectedCard &&
      (selectedCard.type === "money" ||
        selectedCard.type === "action" ||
        selectedCard.type === "property" ||
        selectedCard.type === "house" ||
        selectedCard.type === "hotel" ||
        selectedCard.type === "rent")
    );
  };

  const canPlayAsProperty = () => {
    if (!selectedCard || selectedCard.type !== "property") return false;

    // If it's a wildcard, need color selection
    if (selectedCard.colors && selectedCard.colors.length > 1) {
      return selectedPropertyColor !== "";
    }

    // If it's a regular property, can always play
    return selectedCard.color !== undefined;
  };

  const canPlayAsAction = () => {
    if (
      !selectedCard ||
      (selectedCard.type !== "action" && selectedCard.type !== "rent")
    )
      return false;

    // Special cases for modal-based actions - only need target selection
    if (
      selectedCard.name === "Forced Deal" ||
      selectedCard.name === "Sly Deal" ||
      selectedCard.name === "Deal Breaker"
    ) {
      return selectedTargetPlayer !== "";
    }

    // Check if all required selections are made for other cards
    if (needsTargetSelection(selectedCard.name) && !selectedTargetPlayer)
      return false;
    if (needsPropertySelection(selectedCard.name) && !selectedPropertyColor)
      return false;

    return true;
  };

  const canPlayAsImprovement = () => {
    if (
      !selectedCard ||
      (selectedCard.type !== "house" && selectedCard.type !== "hotel")
    ) {
      return false;
    }

    // Need to select a property color first
    if (!selectedPropertyColor) return false;

    const currentPlayerProperties =
      currentPlayer.properties[selectedPropertyColor] || [];
    const colorInfo =
      PROPERTY_COLORS[selectedPropertyColor as keyof typeof PROPERTY_COLORS];

    // Property set must be complete
    if (!colorInfo || currentPlayerProperties.length !== colorInfo.count) {
      return false;
    }

    const currentImprovements = currentPlayer.improvements?.[
      selectedPropertyColor
    ] || { houses: [], hotel: undefined };

    if (selectedCard.type === "house") {
      // Can add house if less than 4 houses
      return currentImprovements.houses.length < 4;
    } else if (selectedCard.type === "hotel") {
      // Can add hotel if has at least 1 house and no hotel yet
      return (
        currentImprovements.houses.length > 0 && !currentImprovements.hotel
      );
    }

    return false;
  };

  const getPlayerPropertySets = (player: Player) => {
    return Object.entries(player.properties)
      .map(([color, cardIds]) => {
        const colorInfo =
          PROPERTY_COLORS[color as keyof typeof PROPERTY_COLORS];
        const isComplete = colorInfo && cardIds.length === colorInfo.count;

        return {
          color,
          cards: cardIds,
          isComplete,
          count: cardIds.length,
          maxCount: colorInfo?.count || 0,
          rentValues: colorInfo?.rentValues || [],
        };
      })
      .filter((set) => set.cards.length > 0);
  };

  const getAvailablePropertyColors = () => {
    // For House and Hotel cards, show only complete property sets
    if (selectedCard?.type === "house" || selectedCard?.type === "hotel") {
      return Object.keys(currentPlayer.properties).filter((color) => {
        const properties = currentPlayer.properties[color];
        const colorInfo =
          PROPERTY_COLORS[color as keyof typeof PROPERTY_COLORS];
        return colorInfo && properties.length === colorInfo.count;
      });
    }

    if (selectedCard?.name === "Rent" || selectedCard?.name === "Wild Rent") {
      // For rent cards, show colors the current player owns
      return Object.keys(currentPlayer.properties).filter(
        (color) => currentPlayer.properties[color].length > 0
      );
    }

    // For property cards including wildcards, show all possible colors
    if (selectedCard?.type === "property" && selectedCard?.colors) {
      return selectedCard.colors;
    }

    return Object.keys(PROPERTY_COLORS);
  };

  const getActionInstructions = () => {
    if (!selectedCard) return "";

    switch (selectedCard.name) {
      case "Forced Deal":
        return "First select a target player above, then click 'Play Action' to choose properties to trade.";
      case "Sly Deal":
        return "First select a target player above, then click 'Play Action' to choose which property to steal.";
      case "Deal Breaker":
        return "First select a target player above, then click 'Play Action' to choose which complete set to steal.";
      case "Debt Collector":
        return "Select a target player above to demand 5M from them.";
      case "Rent":
      case "Wild Rent":
        return "Select a target player and property color to charge rent.";
      case "House":
        return "Select a property color below to place a house on a complete set. Houses add +3M rent each (max 4 per set).";
      case "Hotel":
        return "Select a property color below to place a hotel on a complete set. Hotels add +5M rent and replace all houses.";
      default:
        return "";
    }
  };

  return (
    <div
      className="min-h-screen p-2 md:p-4 transition-all duration-300"
      style={{
        background: isCurrentTurn
          ? "linear-gradient(to bottom right, #15803d, #14532d)"
          : "linear-gradient(to bottom right, #374151, #111827)",
        boxShadow: isCurrentTurn
          ? "inset 0 2px 4px 0 rgba(0, 0, 0, 0.06)"
          : "none",
      }}
    >
      <div className="max-w-7xl mx-auto">
        {/* Turn Status Banner */}
        <div
          className="rounded-lg p-3 mb-4 text-center transition-all duration-300 text-white shadow-lg"
          style={{
            background: isCurrentTurn
              ? "linear-gradient(to right, #4ade80, #16a34a)"
              : "linear-gradient(to right, #9ca3af, #6b7280)",
            animation: isCurrentTurn ? "pulse 2s infinite" : "none",
          }}
        >
          <div className="flex items-center justify-center gap-2">
            <span className="text-lg font-bold">
              {isCurrentTurn ? "🎮 YOUR TURN!" : "⏳ Waiting..."}
            </span>
            <span className="text-sm opacity-90">
              {isCurrentTurn
                ? "Make your move!"
                : `${
                    game.players[game.currentTurnPlayerId]?.displayName
                  }'s turn`}
            </span>
          </div>
        </div>

        {/* Game Header */}
        <div
          className={`bg-white rounded-lg p-3 md:p-4 mb-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 transition-all duration-300 ${
            isCurrentTurn
              ? "border-4 border-green-400 shadow-lg"
              : "border-2 border-gray-300"
          }`}
        >
          <div className="min-w-0 flex-1">
            <h1 className="text-xl md:text-2xl font-bold truncate">
              Monopoly Deal
            </h1>
            <p className="text-gray-600 text-sm truncate">
              Game Code: {game.gameCode}
            </p>
          </div>
          <div className="text-left sm:text-right min-w-0 flex-shrink-0">
            <p className="font-semibold text-sm md:text-base truncate">
              Current Turn:{" "}
              {game.players[game.currentTurnPlayerId]?.displayName}
            </p>
            <p className="text-xs md:text-sm text-gray-600">
              Phase: {game.turnPhase} | Cards Played: {game.cardsPlayedThisTurn}
              /3
            </p>
          </div>
        </div>

        {/* Last Action Display */}
        {game.lastAction && (
          <div className="bg-yellow-100 border border-yellow-300 rounded-lg p-3 mb-4">
            <p className="text-sm">
              <strong>
                {game.players[game.lastAction.playerId]?.displayName}
              </strong>{" "}
              played <strong>{game.lastAction.type}</strong>
              {game.lastAction.targetId && (
                <>
                  {" "}
                  on{" "}
                  <strong>
                    {game.players[game.lastAction.targetId]?.displayName}
                  </strong>
                </>
              )}
            </p>
          </div>
        )}

        {/* Rejoining Message */}
        {rejoiningMessage && (
          <div className="bg-green-100 border border-green-300 rounded-lg p-3 mb-4">
            <p className="text-green-800 text-center font-medium">
              {rejoiningMessage}
            </p>
          </div>
        )}

        {/* Waiting for Confirmation Message */}
        {waitingForConfirmation && !game.pendingAction && (
          <div className="bg-blue-100 border border-blue-300 rounded-lg p-3 mb-4">
            <p className="text-blue-800 text-center font-medium">
              <span className="animate-pulse">⏳</span> Action initiated!
              Waiting for{" "}
              <strong>{waitingForConfirmation.targetPlayerName}</strong> to
              respond to your{" "}
              <strong>{waitingForConfirmation.actionType}</strong>
              <br />
              <span className="text-sm">
                {["Sly Deal", "Deal Breaker", "Forced Deal"].includes(
                  waitingForConfirmation.actionType
                )
                  ? "They can use 'Just Say No!' or proceed with the action"
                  : "They will be prompted to respond"}
              </span>
            </p>
          </div>
        )}

        {/* Pending Action Notification */}
        {game.pendingAction && (
          <div className="bg-orange-100 border border-orange-300 rounded-lg p-3 mb-4">
            <p className="text-orange-800 text-center font-medium">
              {game.pendingAction.targetId === currentUserId ? (
                <>
                  {/* Target player view - different messages based on action type */}
                  {game.pendingAction.debtAmount ? (
                    <>
                      You owe <strong>${game.pendingAction.debtAmount}M</strong>{" "}
                      to{" "}
                      <strong>
                        {game.players[game.pendingAction.playerId]?.displayName}
                      </strong>
                      {game.pendingAction.debtAmount >
                        currentPlayer.bankValue && (
                        <span className="text-red-600 ml-2">
                          (Insufficient funds - must pay with cards!)
                        </span>
                      )}
                    </>
                  ) : game.pendingAction.type === "CONFIRM_ACTION" ? (
                    <>
                      <strong>
                        {game.players[game.pendingAction.playerId]?.displayName}
                      </strong>{" "}
                      wants to{" "}
                      <strong>
                        {game.pendingAction.actionType === "Sly Deal" &&
                          "steal a property from you"}
                        {game.pendingAction.actionType === "Deal Breaker" &&
                          "steal a complete property set from you"}
                        {game.pendingAction.actionType === "Forced Deal" &&
                          "trade properties with you"}
                        {game.pendingAction.actionType === "Debt Collector" &&
                          "collect 5M from you"}
                        {game.pendingAction.actionType === "Rent" &&
                          "charge you rent"}
                        {game.pendingAction.actionType === "Wild Rent" &&
                          "charge you rent"}
                        {game.pendingAction.actionType === "It's My Birthday" &&
                          "collect birthday money from you"}
                        {![
                          "Sly Deal",
                          "Deal Breaker",
                          "Forced Deal",
                          "Debt Collector",
                          "Rent",
                          "Wild Rent",
                          "It's My Birthday",
                        ].includes(game.pendingAction.actionType || "") &&
                          "use an action card on you"}
                      </strong>
                      <br />
                      <span className="text-sm">
                        {game.pendingAction.canSayNo
                          ? "You can use 'Just Say No!' or accept the action"
                          : "You must respond to this action"}
                      </span>
                    </>
                  ) : (
                    <>
                      You need to respond to{" "}
                      <strong>
                        {game.players[game.pendingAction.playerId]?.displayName}
                      </strong>
                      's action
                    </>
                  )}
                </>
              ) : (
                <>
                  {/* Attacker/waiting player view */}
                  {game.pendingAction.type === "CONFIRM_ACTION" ? (
                    <>
                      ⏳ Waiting for{" "}
                      <strong>
                        {
                          game.players[game.pendingAction.targetId || ""]
                            ?.displayName
                        }
                      </strong>{" "}
                      to respond to your{" "}
                      <strong>{game.pendingAction.actionType}</strong>
                      <br />
                      <span className="text-sm">
                        {game.pendingAction.canSayNo
                          ? "They can use 'Just Say No!' or accept your action"
                          : "Waiting for their response..."}
                      </span>
                    </>
                  ) : (
                    <>
                      Waiting for{" "}
                      <strong>
                        {
                          game.players[game.pendingAction.targetId || ""]
                            ?.displayName
                        }
                      </strong>{" "}
                      to{" "}
                      {game.pendingAction.debtAmount
                        ? `pay $${game.pendingAction.debtAmount}M`
                        : "respond"}
                    </>
                  )}
                </>
              )}
            </p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 mb-6">
          {/* Other Players */}
          <div className="lg:col-span-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
              {otherPlayers.map((player) => {
                const isPlayersTurn = game.currentTurnPlayerId === player.uid;
                return (
                  <Card
                    key={player.uid}
                    className={`cursor-pointer transition-all min-w-0 ${
                      selectedTargetPlayer === player.uid
                        ? "ring-2 ring-blue-500"
                        : ""
                    }`}
                    style={{
                      backgroundColor: isPlayersTurn ? "#fefce8" : "#ffffff",
                      border: isPlayersTurn
                        ? "4px solid #facc15"
                        : "1px solid #e5e7eb",
                      boxShadow: isPlayersTurn
                        ? "0 10px 15px -3px rgba(0, 0, 0, 0.1)"
                        : "0 1px 2px 0 rgba(0, 0, 0, 0.05)",
                    }}
                    onClick={() => {
                      if (showTargetPicker) {
                        setSelectedTargetPlayer(player.uid);
                      }
                    }}
                  >
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base md:text-lg flex items-center justify-between min-w-0">
                        <span className="truncate flex-1 mr-2 flex items-center gap-2">
                          {isPlayersTurn && (
                            <span className="text-yellow-600">🎮</span>
                          )}
                          {player.displayName}
                          {isPlayersTurn && (
                            <span className="text-xs text-yellow-600 font-normal">
                              (Playing)
                            </span>
                          )}
                        </span>
                        <Badge
                          variant={
                            player.completedSets >= 3 ? "default" : "secondary"
                          }
                          className="flex-shrink-0"
                        >
                          {player.completedSets}/3 sets
                        </Badge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="min-w-0">
                      <div className="space-y-3">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-sm font-medium flex-shrink-0">
                            Hand:
                          </span>
                          <div className="flex gap-1 overflow-hidden flex-1">
                            {Array.from({
                              length: Math.min(player.hand.length, 3),
                            }).map((_, i) => (
                              <CardBack
                                key={i}
                                size="small"
                                className="flex-shrink-0"
                              />
                            ))}
                            {player.hand.length > 3 && (
                              <span className="text-xs text-gray-600 ml-1 whitespace-nowrap">
                                +{player.hand.length - 3}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="text-sm font-medium">
                          Bank: ${player.bankValue}M
                        </div>

                        {getPlayerPropertySets(player).map((set) => (
                          <div key={set.color} className="text-sm min-w-0">
                            <div className="flex justify-between items-center min-w-0">
                              <span className="font-medium capitalize truncate flex-1 mr-2">
                                {PROPERTY_COLORS[
                                  set.color as keyof typeof PROPERTY_COLORS
                                ]?.name || set.color}
                                :
                              </span>
                              <span
                                className={`${
                                  set.isComplete
                                    ? "text-green-600 font-bold"
                                    : ""
                                } whitespace-nowrap flex-shrink-0`}
                              >
                                {set.count}/{set.maxCount}
                                {set.isComplete && " ✓"}
                              </span>
                            </div>
                            {set.isComplete && (
                              <div className="text-xs text-green-600 truncate">
                                Rent:{" "}
                                {set.rentValues
                                  .map((rent, i) => `${i + 1}=${rent}M`)
                                  .join(", ")}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>

          {/* Game Logs */}
          <div className="lg:col-span-1">
            <GameLogs logs={logs} />
          </div>
        </div>

        {/* Current Player Area */}
        <div
          className="rounded-lg p-6 transition-all duration-300"
          style={{
            backgroundColor: isCurrentTurn ? "#f0fdf4" : "#f9fafb",
            border: isCurrentTurn ? "4px solid #4ade80" : "2px solid #d1d5db",
            boxShadow: isCurrentTurn
              ? "0 25px 50px -12px rgba(0, 0, 0, 0.25)"
              : "0 1px 3px 0 rgba(0, 0, 0, 0.1)",
          }}
        >
          <div className="flex justify-between items-center mb-6">
            <h2
              className={`text-xl font-bold flex items-center gap-2 ${
                isCurrentTurn ? "text-green-700" : "text-gray-700"
              }`}
            >
              {isCurrentTurn && <span className="text-green-600">🎮</span>}
              Your Area
              {isCurrentTurn && (
                <span className="text-sm text-green-600 font-normal">
                  (Your Turn!)
                </span>
              )}
            </h2>
            <div className="flex items-center gap-4">
              <span className="text-lg font-semibold">
                Bank: ${currentPlayer.bankValue}M
              </span>
              <Badge
                variant={
                  currentPlayer.completedSets >= 3 ? "default" : "secondary"
                }
                className="text-lg px-3 py-1"
              >
                {currentPlayer.completedSets}/3 sets
              </Badge>
            </div>
          </div>

          {/* Properties */}
          {getPlayerPropertySets(currentPlayer).length > 0 && (
            <div className="mb-6">
              <h3 className="font-semibold mb-4 text-lg">Your Properties</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {getPlayerPropertySets(currentPlayer).map((set) => (
                  <div
                    key={set.color}
                    className="border-2 rounded-lg p-4 bg-gray-50 min-w-0"
                  >
                    <div className="flex justify-between items-center mb-3">
                      <span className="font-bold text-lg capitalize truncate flex-1 mr-2">
                        {PROPERTY_COLORS[
                          set.color as keyof typeof PROPERTY_COLORS
                        ]?.name || set.color}
                      </span>
                      <span
                        className={`text-lg font-bold whitespace-nowrap ${
                          set.isComplete ? "text-green-600" : "text-gray-600"
                        }`}
                      >
                        {set.count}/{set.maxCount}
                        {set.isComplete && " ✓"}
                      </span>
                    </div>
                    {set.isComplete && (
                      <div className="text-sm text-green-600 font-medium mb-2 truncate">
                        Rent:{" "}
                        {set.rentValues
                          .map((rent, i) => `${i + 1}=${rent}M`)
                          .join(", ")}
                      </div>
                    )}
                    {/* Display improvements */}
                    {set.isComplete &&
                      currentPlayer.improvements &&
                      currentPlayer.improvements[set.color] && (
                        <div className="text-sm text-blue-600 font-medium mb-2">
                          <div className="flex flex-wrap gap-1">
                            {currentPlayer.improvements[set.color].houses?.map(
                              (houseId, index) => (
                                <span
                                  key={houseId}
                                  className="bg-blue-100 px-2 py-1 rounded text-xs"
                                >
                                  🏠 House {index + 1}
                                </span>
                              )
                            )}
                            {currentPlayer.improvements[set.color].hotel && (
                              <span className="bg-red-100 px-2 py-1 rounded text-xs">
                                🏨 Hotel
                              </span>
                            )}
                          </div>
                          <div className="text-xs mt-1">
                            Bonus: +
                            {(currentPlayer.improvements[set.color].houses
                              ?.length || 0) *
                              3 +
                              (currentPlayer.improvements[set.color].hotel
                                ? 5
                                : 0)}
                            M rent
                          </div>
                        </div>
                      )}
                    <div className="flex gap-2 flex-wrap overflow-hidden">
                      {set.cards.map((cardId) => (
                        <GameCard
                          key={cardId}
                          cardId={cardId}
                          size="large"
                          className="flex-shrink-0"
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Hand */}
          <div className="mb-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-semibold text-lg">
                Your Hand ({currentPlayer.hand.length}/7)
                {currentPlayer.hand.length > 7 && (
                  <span className="text-red-600 ml-2 font-bold text-sm">
                    Must discard {currentPlayer.hand.length - 7} cards
                  </span>
                )}
              </h3>

              {/* Pagination Controls */}
              {currentPlayer.hand.length > 6 && (
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setHandCurrentPage(Math.max(0, handCurrentPage - 1))
                    }
                    disabled={handCurrentPage === 0}
                    className="px-2 py-1 h-8"
                  >
                    ←
                  </Button>
                  <span className="text-sm text-gray-600 px-2">
                    {handCurrentPage + 1}/
                    {Math.ceil(currentPlayer.hand.length / 6)}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setHandCurrentPage(
                        Math.min(
                          Math.ceil(currentPlayer.hand.length / 6) - 1,
                          handCurrentPage + 1
                        )
                      )
                    }
                    disabled={
                      handCurrentPage >=
                      Math.ceil(currentPlayer.hand.length / 6) - 1
                    }
                    className="px-2 py-1 h-8"
                  >
                    →
                  </Button>
                </div>
              )}
            </div>

            {/* Paginated Hand Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3 justify-items-center">
              {currentPlayer.hand
                .slice(handCurrentPage * 6, (handCurrentPage + 1) * 6)
                .map((cardId) => (
                  <GameCard
                    key={cardId}
                    cardId={cardId}
                    size="large"
                    isSelected={selectedCards.includes(cardId)}
                    onClick={() => toggleCardSelection(cardId)}
                    className="w-full max-w-32"
                  />
                ))}
            </div>

            {/* Page indicator dots */}
            {currentPlayer.hand.length > 6 && (
              <div className="flex justify-center mt-3 gap-1">
                {Array.from({
                  length: Math.ceil(currentPlayer.hand.length / 6),
                }).map((_, index) => (
                  <button
                    key={index}
                    onClick={() => setHandCurrentPage(index)}
                    className={`w-2 h-2 rounded-full transition-colors ${
                      index === handCurrentPage ? "bg-blue-600" : "bg-gray-300"
                    }`}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="space-y-4">
            {/* Turn Actions */}
            {isCurrentTurn && game.turnPhase === "draw" && (
              <div className="text-center">
                <Button
                  onClick={onDrawCards}
                  size="lg"
                  className="text-lg px-8 py-3"
                >
                  Draw 2 Cards
                </Button>
              </div>
            )}

            {/* Card Play Options */}
            {selectedCard && isCurrentTurn && game.turnPhase === "play" && (
              <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4">
                <h4 className="font-semibold mb-3 text-lg">
                  Play Selected Card: {selectedCard.name}
                </h4>

                {/* Action Instructions */}
                {getActionInstructions() && (
                  <div className="mb-4 p-3 bg-blue-100 border border-blue-300 rounded">
                    <p className="text-sm text-blue-800">
                      <strong>Instructions:</strong> {getActionInstructions()}
                    </p>
                  </div>
                )}

                {/* Target Player Selection */}
                {showTargetPicker && (
                  <div className="mb-4">
                    <label className="block text-sm font-medium mb-2">
                      Choose Target Player:
                    </label>

                    {/* Dropdown Selection */}
                    <div className="mb-3">
                      <select
                        value={selectedTargetPlayer}
                        onChange={(e) =>
                          setSelectedTargetPlayer(e.target.value)
                        }
                        className="w-full p-2 border border-gray-300 rounded-md text-sm bg-white hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="" disabled>
                          Select a target player...
                        </option>
                        {otherPlayers.map((player) => (
                          <option key={player.uid} value={player.uid}>
                            {player.displayName} ({player.completedSets}/3 sets,
                            ${player.bankValue}M)
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Alternative: Click to Select */}
                    <div className="text-xs text-gray-500 mb-2">
                      💡 You can also click on a player card above to select
                      them
                    </div>

                    {selectedTargetPlayer && (
                      <div className="text-sm text-green-600 bg-green-50 border border-green-200 rounded p-2">
                        ✅ Selected:{" "}
                        {game.players[selectedTargetPlayer]?.displayName}
                      </div>
                    )}
                  </div>
                )}

                {/* Property Color Selection (for Rent cards only) */}
                {(showColorPicker || showPropertyPicker) && (
                  <div className="mb-4">
                    {/* Super Wildcard Instructions */}
                    {showColorPicker &&
                      selectedCard?.name === "Super Wildcard" && (
                        <div className="mb-3 p-3 bg-purple-50 border border-purple-200 rounded-lg">
                          <p className="text-sm text-purple-800">
                            <strong>⭐ Super Wildcard:</strong> This card can be
                            used as any property color! Choose which property
                            set you want to add it to.
                          </p>
                        </div>
                      )}

                    <label className="block text-sm font-medium mb-2">
                      {showColorPicker
                        ? selectedCard?.name === "Super Wildcard"
                          ? "Choose any Property Color (Super Wildcard):"
                          : "Choose Property Color:"
                        : "Choose Property Color to Target:"}
                    </label>
                    <div className="flex gap-2 flex-wrap">
                      {(showColorPicker
                        ? selectedCard.colors || []
                        : getAvailablePropertyColors()
                      ).map((color) => (
                        <Button
                          key={color}
                          onClick={() => setSelectedPropertyColor(color)}
                          variant={
                            selectedPropertyColor === color
                              ? "default"
                              : "outline"
                          }
                          size="sm"
                          className="capitalize"
                        >
                          {PROPERTY_COLORS[
                            color as keyof typeof PROPERTY_COLORS
                          ]?.name || color}
                        </Button>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex gap-3 flex-wrap">
                  {canPlayAsMoney() && (
                    <Button
                      onClick={handlePlayAsMoney}
                      disabled={game.cardsPlayedThisTurn >= 3}
                      variant="outline"
                      size="lg"
                    >
                      💰 Play as Money (${selectedCard.value}M)
                    </Button>
                  )}

                  {canPlayAsProperty() && (
                    <Button
                      onClick={handlePlayAsProperty}
                      disabled={game.cardsPlayedThisTurn >= 3}
                      variant="outline"
                      size="lg"
                    >
                      🏠 Play as Property
                    </Button>
                  )}

                  {canPlayAsImprovement() && (
                    <Button
                      onClick={handlePlayAsImprovement}
                      disabled={game.cardsPlayedThisTurn >= 3}
                      variant="outline"
                      size="lg"
                    >
                      🏗️ Play as Improvement
                    </Button>
                  )}

                  {canPlayAsAction() && (
                    <Button
                      onClick={handlePlayAsAction}
                      disabled={game.cardsPlayedThisTurn >= 3}
                      size="lg"
                    >
                      ⚡ Play Action: {selectedCard.name}
                    </Button>
                  )}
                </div>
              </div>
            )}

            {/* General Turn Actions */}
            {isCurrentTurn && game.turnPhase === "play" && (
              <div className="flex gap-3 justify-center">
                <Button onClick={onEndTurn} size="lg" variant="outline">
                  End Turn
                </Button>
              </div>
            )}

            {/* Discard Phase */}
            {isCurrentTurn && game.turnPhase === "discard" && (
              <div className="bg-red-50 border-2 border-red-200 rounded-lg p-4 text-center">
                <h4 className="font-semibold mb-3 text-lg text-red-700">
                  You must discard {currentPlayer.hand.length - 7} cards
                </h4>
                <Button
                  onClick={handleDiscard}
                  disabled={selectedCards.length === 0}
                  variant="destructive"
                  size="lg"
                >
                  Discard Selected ({selectedCards.length})
                </Button>
              </div>
            )}

            {/* Clear Selection */}
            {selectedCards.length > 0 && (
              <div className="text-center">
                <Button onClick={resetSelection} variant="ghost">
                  Clear Selection
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Game Info */}
        <div className="mt-4 bg-white rounded-lg p-4">
          <div className="flex justify-between text-sm text-gray-600">
            <span>Draw Pile: {game.drawPile.length} cards</span>
            <span>Discard Pile: {game.discardPile.length} cards</span>
          </div>
        </div>

        {/* Forced Deal Modal */}
        <ForcedDealModal
          isOpen={showForcedDealModal}
          onClose={() => setShowForcedDealModal(false)}
          onConfirm={handleForcedDealConfirm}
          currentPlayer={currentPlayer}
          targetPlayer={
            selectedTargetPlayer ? game.players[selectedTargetPlayer] : null
          }
          targetPlayerName={
            selectedTargetPlayer
              ? game.players[selectedTargetPlayer]?.displayName || ""
              : ""
          }
        />

        {/* Property Selection Modal (Sly Deal & Deal Breaker) */}
        <PropertySelectionModal
          isOpen={showPropertySelectionModal}
          onClose={() => setShowPropertySelectionModal(false)}
          onConfirm={handlePropertySelectionConfirm}
          targetPlayer={
            selectedTargetPlayer ? game.players[selectedTargetPlayer] : null
          }
          targetPlayerName={
            selectedTargetPlayer
              ? game.players[selectedTargetPlayer]?.displayName || ""
              : ""
          }
          actionType={selectedCard?.name as "Sly Deal" | "Deal Breaker"}
        />

        {/* Debt Payment Modal */}
        {game.pendingAction &&
          game.pendingAction.targetId === currentUserId &&
          game.pendingAction.debtAmount && (
            <DebtPaymentModal
              isOpen={showDebtPaymentModal}
              onClose={() => setShowDebtPaymentModal(false)}
              onConfirm={handleDebtPayment}
              player={currentPlayer}
              debtAmount={game.pendingAction.debtAmount}
              debtType={game.pendingAction.debtType || game.pendingAction.type}
              creditorName={
                game.players[game.pendingAction.playerId]?.displayName ||
                "Unknown"
              }
            />
          )}

        {/* Just Say No Modal */}
        {game.pendingAction &&
          game.pendingAction.targetId === currentUserId &&
          game.pendingAction.canSayNo &&
          game.pendingAction.type === "CONFIRM_ACTION" && (
            <JustSayNoModal
              isOpen={showJustSayNoModal}
              onClose={() => setShowJustSayNoModal(false)}
              onConfirm={handleJustSayNo}
              onDecline={handleAcceptAction}
              player={currentPlayer}
              actionDescription={game.pendingAction.actionDescription || ""}
              attackerName={
                game.players[game.pendingAction.playerId]?.displayName ||
                "Unknown"
              }
              actionType={game.pendingAction.actionType || "Unknown Action"}
            />
          )}

        {/* Game Animation */}
        <GameAnimation
          animation={currentAnimation}
          onComplete={() => setCurrentAnimation(null)}
        />
      </div>
    </div>
  );
}
