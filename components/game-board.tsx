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

  const currentPlayer = game.players[currentUserId];
  const isCurrentTurn = game.currentTurnPlayerId === currentUserId;
  const otherPlayers = Object.values(game.players).filter(
    (p) => p.uid !== currentUserId
  );

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
              emoji: "🌈",
              message: "Wildcard Property!",
              playerName: currentPlayer.displayName,
            });
            setShownWildcardAnimations((prev) => new Set([...prev, cardId]));
          }
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
      onPlayCard(
        selectedCards,
        "PLAY_ACTION",
        selectedTargetPlayer,
        propertyColor
      );
      resetSelection();
    }
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
        selectedCard.type === "property")
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
    if (selectedCard?.name === "Rent" || selectedCard?.name === "Wild Rent") {
      // For rent cards, show colors the current player owns
      return Object.keys(currentPlayer.properties).filter(
        (color) => currentPlayer.properties[color].length > 0
      );
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
      default:
        return "";
    }
  };

  return (
    <div className="min-h-screen bg-green-800 p-2 md:p-4">
      <div className="max-w-7xl mx-auto">
        {/* Game Header */}
        <div className="bg-white rounded-lg p-3 md:p-4 mb-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
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

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 mb-6">
          {/* Other Players */}
          <div className="lg:col-span-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
              {otherPlayers.map((player) => (
                <Card
                  key={player.uid}
                  className={`bg-white cursor-pointer transition-all min-w-0 ${
                    selectedTargetPlayer === player.uid
                      ? "ring-2 ring-blue-500"
                      : ""
                  }`}
                  onClick={() => {
                    if (showTargetPicker) {
                      setSelectedTargetPlayer(player.uid);
                    }
                  }}
                >
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base md:text-lg flex items-center justify-between min-w-0">
                      <span className="truncate flex-1 mr-2">
                        {player.displayName}
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
                                set.isComplete ? "text-green-600 font-bold" : ""
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
              ))}
            </div>
          </div>

          {/* Game Logs */}
          <div className="lg:col-span-1">
            <GameLogs logs={logs} />
          </div>
        </div>

        {/* Current Player Area */}
        <div className="bg-white rounded-lg p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold">Your Area</h2>
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
                    <div className="text-sm text-gray-600 mb-2">
                      Click on a player above to select them as the target
                    </div>
                    {selectedTargetPlayer && (
                      <div className="text-sm text-green-600">
                        Selected:{" "}
                        {game.players[selectedTargetPlayer]?.displayName}
                      </div>
                    )}
                  </div>
                )}

                {/* Property Color Selection (for Rent cards only) */}
                {(showColorPicker || showPropertyPicker) && (
                  <div className="mb-4">
                    <label className="block text-sm font-medium mb-2">
                      {showColorPicker
                        ? "Choose Property Color:"
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

        {/* Game Animation */}
        <GameAnimation
          animation={currentAnimation}
          onComplete={() => setCurrentAnimation(null)}
        />
      </div>
    </div>
  );
}
