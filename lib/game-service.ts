import {
  collection,
  doc,
  addDoc,
  getDoc,
  updateDoc,
  onSnapshot,
  query,
  where,
  increment,
} from "firebase/firestore";
import { db } from "./firebase";
import type { GameState, Player, GameAction } from "./types";
import { shuffleDeck, PROPERTY_COLORS, getCard } from "./cards";

export function generateGameCode(): string {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

// Calculate rent including improvements (houses and hotels)
function calculateRentWithImprovements(
  properties: string[],
  improvements: { houses: string[]; hotel?: string } | undefined,
  colorInfo: (typeof PROPERTY_COLORS)[keyof typeof PROPERTY_COLORS]
): number {
  const baseRent =
    colorInfo.rentValues[
      Math.min(properties.length - 1, colorInfo.rentValues.length - 1)
    ];

  if (!improvements) return baseRent;

  let rentBonus = 0;

  // Each house adds 3M rent
  rentBonus += improvements.houses.length * 3;

  // Hotel adds 5M rent (replaces house bonuses)
  if (improvements.hotel) {
    rentBonus = 5; // Hotel overrides house bonuses
  }

  return baseRent + rentBonus;
}

export async function createGame(
  hostId: string,
  hostName: string
): Promise<string> {
  const gameCode = generateGameCode();
  const drawPile = shuffleDeck();

  const initialPlayer: Player = {
    uid: hostId,
    displayName: hostName,
    hand: drawPile.splice(0, 5),
    bank: [],
    properties: {},
    improvements: {},
    bankValue: 0,
    completedSets: 0,
    isHost: true,
  };

  const gameState: Omit<GameState, "id"> = {
    gameCode,
    status: "waiting",
    players: { [hostId]: initialPlayer },
    hostId,
    currentTurnPlayerId: "",
    drawPile,
    discardPile: [],
    turnPhase: "draw",
    cardsDrawnThisTurn: 0,
    cardsPlayedThisTurn: 0,
    version: 1,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  const docRef = await addDoc(collection(db, "games"), gameState);
  return docRef.id;
}

export async function joinGame(
  gameCode: string,
  playerId: string,
  playerName: string
): Promise<{ gameId: string | null; isRejoining: boolean }> {
  const gamesRef = collection(db, "games");
  const q = query(gamesRef, where("gameCode", "==", gameCode));

  return new Promise((resolve) => {
    const unsubscribe = onSnapshot(q, async (snapshot) => {
      unsubscribe();

      if (snapshot.empty) {
        resolve({ gameId: null, isRejoining: false });
        return;
      }

      const gameDoc = snapshot.docs[0];
      const gameData = gameDoc.data() as GameState;

      // Check if a player with this name already exists in the game
      const existingPlayer = Object.values(gameData.players).find(
        (player) =>
          player.displayName.toLowerCase() === playerName.toLowerCase()
      );

      if (existingPlayer) {
        // Player is rejoining - update their UID to the current user
        await updateDoc(doc(db, "games", gameDoc.id), {
          [`players.${existingPlayer.uid}.uid`]: playerId,
          updatedAt: Date.now(),
          version: increment(1),
        });

        // If the rejoining player was the host, update hostId
        if (existingPlayer.isHost && gameData.hostId === existingPlayer.uid) {
          await updateDoc(doc(db, "games", gameDoc.id), {
            hostId: playerId,
          });
        }

        // If it was their turn, update currentTurnPlayerId
        if (gameData.currentTurnPlayerId === existingPlayer.uid) {
          await updateDoc(doc(db, "games", gameDoc.id), {
            currentTurnPlayerId: playerId,
          });
        }

        // Update the player key in the players object
        const updatedPlayers = { ...gameData.players };
        delete updatedPlayers[existingPlayer.uid];
        updatedPlayers[playerId] = { ...existingPlayer, uid: playerId };

        await updateDoc(doc(db, "games", gameDoc.id), {
          players: updatedPlayers,
          updatedAt: Date.now(),
          version: increment(1),
        });

        resolve({ gameId: gameDoc.id, isRejoining: true });
        return;
      }

      // New player joining
      if (
        gameData.status !== "waiting" ||
        Object.keys(gameData.players).length >= 5
      ) {
        resolve({ gameId: null, isRejoining: false });
        return;
      }

      const newPlayer: Player = {
        uid: playerId,
        displayName: playerName,
        hand: gameData.drawPile.splice(0, 5),
        bank: [],
        properties: {},
        improvements: {},
        bankValue: 0,
        completedSets: 0,
        isHost: false,
      };

      await updateDoc(doc(db, "games", gameDoc.id), {
        [`players.${playerId}`]: newPlayer,
        drawPile: gameData.drawPile,
        updatedAt: Date.now(),
        version: increment(1),
      });

      resolve({ gameId: gameDoc.id, isRejoining: false });
    });
  });
}

export async function startGame(gameId: string, hostId: string): Promise<void> {
  const gameRef = doc(db, "games", gameId);
  const gameSnap = await getDoc(gameRef);

  if (!gameSnap.exists()) return;

  const gameData = gameSnap.data() as GameState;

  if (gameData.hostId !== hostId || gameData.status !== "waiting") return;

  const playerIds = Object.keys(gameData.players);
  const firstPlayerId = playerIds[0];

  await updateDoc(gameRef, {
    status: "playing",
    currentTurnPlayerId: firstPlayerId,
    turnPhase: "draw",
    updatedAt: Date.now(),
    version: increment(1),
  });
}

export function subscribeToGame(
  gameId: string,
  callback: (game: GameState | null) => void
) {
  const gameRef = doc(db, "games", gameId);

  return onSnapshot(gameRef, (doc) => {
    if (doc.exists()) {
      const gameData = { id: doc.id, ...doc.data() } as GameState;
      callback(gameData);
    } else {
      callback(null);
    }
  });
}

export async function executeGameAction(
  gameId: string,
  action: GameAction
): Promise<void> {
  const gameRef = doc(db, "games", gameId);
  const gameSnap = await getDoc(gameRef);

  if (!gameSnap.exists()) return;

  const gameData = gameSnap.data() as GameState;
  const player = gameData.players[action.playerId];

  // For PAY_DEBT, allow the debtor to pay even if it's not their turn
  if (!player) return;

  // For all actions except PAY_DEBT, check if it's the player's turn
  if (
    action.type !== "PAY_DEBT" &&
    gameData.currentTurnPlayerId !== action.playerId
  )
    return;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const updates: any = {
    updatedAt: Date.now(),
    version: increment(1),
  };

  switch (action.type) {
    case "DRAW_CARDS":
      if (gameData.turnPhase === "draw" && gameData.cardsDrawnThisTurn === 0) {
        const cardsToDrawCount = 2;
        const drawnCards = gameData.drawPile.slice(0, cardsToDrawCount);
        const newDrawPile = gameData.drawPile.slice(cardsToDrawCount);

        updates[`players.${action.playerId}.hand`] = [
          ...player.hand,
          ...drawnCards,
        ];
        updates.drawPile = newDrawPile;
        updates.cardsDrawnThisTurn = cardsToDrawCount;
        updates.turnPhase = "play";
      }
      break;

    case "PLAY_MONEY":
      if (
        action.cardIds &&
        gameData.turnPhase === "play" &&
        gameData.cardsPlayedThisTurn < 3
      ) {
        const cardId = action.cardIds[0];
        const card = getCard(cardId);

        if (card && player.hand.includes(cardId)) {
          const newHand = player.hand.filter((id) => id !== cardId);
          const newBank = [...player.bank, cardId];
          const newBankValue = player.bankValue + (card.value || 0);

          updates[`players.${action.playerId}.hand`] = newHand;
          updates[`players.${action.playerId}.bank`] = newBank;
          updates[`players.${action.playerId}.bankValue`] = newBankValue;
          updates.cardsPlayedThisTurn = gameData.cardsPlayedThisTurn + 1;
        }
      }
      break;

    case "PLAY_PROPERTY":
      if (
        action.cardIds &&
        action.propertyColor &&
        gameData.turnPhase === "play" &&
        gameData.cardsPlayedThisTurn < 3
      ) {
        const cardId = action.cardIds[0];
        const card = getCard(cardId);

        if (card && card.type === "property" && player.hand.includes(cardId)) {
          const newHand = player.hand.filter((id) => id !== cardId);
          const currentProperties =
            player.properties[action.propertyColor] || [];
          const newProperties = [...currentProperties, cardId];

          updates[`players.${action.playerId}.hand`] = newHand;
          updates[
            `players.${action.playerId}.properties.${action.propertyColor}`
          ] = newProperties;
          updates.cardsPlayedThisTurn = gameData.cardsPlayedThisTurn + 1;

          // Check for completed sets
          const colorInfo =
            PROPERTY_COLORS[
              action.propertyColor as keyof typeof PROPERTY_COLORS
            ];
          if (colorInfo && newProperties.length === colorInfo.count) {
            updates[`players.${action.playerId}.completedSets`] =
              player.completedSets + 1;
          }
        }
      }
      break;

    case "PLAY_IMPROVEMENT":
      if (
        action.cardIds &&
        action.propertyColor &&
        gameData.turnPhase === "play" &&
        gameData.cardsPlayedThisTurn < 3
      ) {
        const cardId = action.cardIds[0];
        const card = getCard(cardId);

        if (
          card &&
          (card.type === "house" || card.type === "hotel") &&
          player.hand.includes(cardId)
        ) {
          // Check if property set is complete
          const currentProperties =
            player.properties[action.propertyColor] || [];
          const colorInfo =
            PROPERTY_COLORS[
              action.propertyColor as keyof typeof PROPERTY_COLORS
            ];

          if (colorInfo && currentProperties.length === colorInfo.count) {
            const newHand = player.hand.filter((id) => id !== cardId);
            const currentImprovements = player.improvements[
              action.propertyColor
            ] || { houses: [], hotel: undefined };

            if (card.type === "house") {
              // Add house (max 4 houses per set)
              if (currentImprovements.houses.length < 4) {
                const newImprovements = {
                  ...currentImprovements,
                  houses: [...currentImprovements.houses, cardId],
                };

                updates[`players.${action.playerId}.hand`] = newHand;
                updates[
                  `players.${action.playerId}.improvements.${action.propertyColor}`
                ] = newImprovements;
                updates.cardsPlayedThisTurn = gameData.cardsPlayedThisTurn + 1;
              }
            } else if (card.type === "hotel") {
              // Add hotel (requires at least 1 house, replaces all houses)
              if (
                currentImprovements.houses.length > 0 &&
                !currentImprovements.hotel
              ) {
                // Move all houses to discard pile
                const newDiscardPile = [
                  ...gameData.discardPile,
                  ...currentImprovements.houses,
                ];
                const newImprovements = {
                  houses: [],
                  hotel: cardId,
                };

                updates[`players.${action.playerId}.hand`] = newHand;
                updates[
                  `players.${action.playerId}.improvements.${action.propertyColor}`
                ] = newImprovements;
                updates.discardPile = newDiscardPile;
                updates.cardsPlayedThisTurn = gameData.cardsPlayedThisTurn + 1;
              }
            }
          }
        }
      }
      break;

    case "END_TURN":
      if (gameData.turnPhase === "play" || gameData.turnPhase === "discard") {
        // Check hand limit
        if (player.hand.length > 7) {
          updates.turnPhase = "discard";
        } else {
          // Move to next player
          const playerIds = Object.keys(gameData.players);
          const currentIndex = playerIds.indexOf(action.playerId);
          const nextIndex = (currentIndex + 1) % playerIds.length;
          const nextPlayerId = playerIds[nextIndex];

          updates.currentTurnPlayerId = nextPlayerId;
          updates.turnPhase = "draw";
          updates.cardsDrawnThisTurn = 0;
          updates.cardsPlayedThisTurn = 0;
        }
      }
      break;

    case "DISCARD_CARDS":
      if (action.cardIds && gameData.turnPhase === "discard") {
        const newHand = player.hand.filter(
          (id) => !action.cardIds!.includes(id)
        );
        const newDiscardPile = [...gameData.discardPile, ...action.cardIds];

        updates[`players.${action.playerId}.hand`] = newHand;
        updates.discardPile = newDiscardPile;

        if (newHand.length <= 7) {
          // Move to next player
          const playerIds = Object.keys(gameData.players);
          const currentIndex = playerIds.indexOf(action.playerId);
          const nextIndex = (currentIndex + 1) % playerIds.length;
          const nextPlayerId = playerIds[nextIndex];

          updates.currentTurnPlayerId = nextPlayerId;
          updates.turnPhase = "draw";
          updates.cardsDrawnThisTurn = 0;
          updates.cardsPlayedThisTurn = 0;
        }
      }
      break;
    case "PLAY_ACTION":
      if (
        action.cardIds &&
        gameData.turnPhase === "play" &&
        gameData.cardsPlayedThisTurn < 3
      ) {
        const cardId = action.cardIds[0];
        const card = getCard(cardId);

        if (card && player.hand.includes(cardId)) {
          const newHand = player.hand.filter((id) => id !== cardId);
          const newDiscardPile = [...gameData.discardPile, cardId];

          updates[`players.${action.playerId}.hand`] = newHand;
          updates.discardPile = newDiscardPile;
          updates.cardsPlayedThisTurn = gameData.cardsPlayedThisTurn + 1;

          // Handle specific action cards
          switch (card.name) {
            case "Pass Go":
              // Pass Go doesn't target other players, execute immediately
              const passGoCards = gameData.drawPile.slice(0, 2);
              const newDrawPilePassGo = gameData.drawPile.slice(2);
              updates[`players.${action.playerId}.hand`] = [
                ...newHand,
                ...passGoCards,
              ];
              updates.drawPile = newDrawPilePassGo;
              break;

            case "It's My Birthday":
              // Birthday affects all players, but we'll ask for confirmation from each
              // For now, let's handle it without "Just Say No" (as it affects multiple players)
              const birthdayPendingPayments: Array<{
                creditorId: string;
                debtorId: string;
                amount: number;
                debtType: string;
              }> = [];

              Object.keys(gameData.players).forEach((playerId) => {
                if (playerId !== action.playerId) {
                  const targetPlayer = gameData.players[playerId];
                  const requiredPayment = 2;
                  const payment = Math.min(
                    requiredPayment,
                    targetPlayer.bankValue
                  );

                  if (payment > 0) {
                    // Transfer money from target to current player
                    const targetBankCards = targetPlayer.bank.slice(0, payment);
                    const newTargetBank = targetPlayer.bank.slice(payment);
                    const newTargetBankValue = targetPlayer.bankValue - payment;
                    const newCurrentBank = [...player.bank, ...targetBankCards];
                    const newCurrentBankValue = player.bankValue + payment;

                    updates[`players.${playerId}.bank`] = newTargetBank;
                    updates[`players.${playerId}.bankValue`] =
                      newTargetBankValue;
                    updates[`players.${action.playerId}.bank`] = newCurrentBank;
                    updates[`players.${action.playerId}.bankValue`] =
                      newCurrentBankValue;
                  }

                  // Check if player still owes money
                  if (payment < requiredPayment) {
                    birthdayPendingPayments.push({
                      creditorId: action.playerId,
                      debtorId: playerId,
                      amount: requiredPayment - payment,
                      debtType: "birthday",
                    });
                  }
                }
              });

              // If there are pending payments, set up the queue and start with the first one
              if (birthdayPendingPayments.length > 0) {
                const [firstDebt, ...remainingDebts] = birthdayPendingPayments;

                updates.pendingAction = {
                  type: "PAY_DEBT",
                  playerId: firstDebt.creditorId,
                  targetId: firstDebt.debtorId,
                  debtAmount: firstDebt.amount,
                  debtType: firstDebt.debtType,
                  canSayNo: false,
                };

                // Store remaining debts in the queue
                if (remainingDebts.length > 0) {
                  updates.pendingPayments = remainingDebts;
                }
              }
              break;

            case "Debt Collector":
              if (action.targetPlayerId) {
                // Create a pending action that asks for confirmation with "Just Say No"
                updates.pendingAction = {
                  type: "CONFIRM_ACTION",
                  playerId: action.playerId,
                  targetId: action.targetPlayerId,
                  canSayNo: true,
                  actionType: "Debt Collector",
                  actionDescription: `${player.displayName} wants to collect $5M from you using Debt Collector.`,
                  originalAction: action,
                };
              }
              break;

            case "Rent":
            case "Wild Rent":
              if (action.targetPlayerId && action.propertyColor) {
                const targetPlayer = gameData.players[action.targetPlayerId];
                const currentPlayerProperties =
                  player.properties[action.propertyColor] || [];

                if (targetPlayer && currentPlayerProperties.length > 0) {
                  const colorInfo =
                    PROPERTY_COLORS[
                      action.propertyColor as keyof typeof PROPERTY_COLORS
                    ];
                  if (colorInfo) {
                    const improvements =
                      player.improvements[action.propertyColor];
                    const rentAmount = calculateRentWithImprovements(
                      currentPlayerProperties,
                      improvements,
                      colorInfo
                    );

                    updates.pendingAction = {
                      type: "CONFIRM_ACTION",
                      playerId: action.playerId,
                      targetId: action.targetPlayerId,
                      canSayNo: true,
                      actionType: card.name,
                      actionDescription: `${player.displayName} wants to charge you $${rentAmount}M rent for ${colorInfo.name} properties.`,
                      originalAction: action,
                    };
                  }
                }
              }
              break;

            case "Sly Deal":
              if (action.targetPlayerId && action.propertyColor) {
                const targetPlayer = gameData.players[action.targetPlayerId];
                if (
                  targetPlayer &&
                  targetPlayer.properties[action.propertyColor]
                ) {
                  const targetProperties =
                    targetPlayer.properties[action.propertyColor];
                  if (targetProperties.length > 0) {
                    const colorInfo =
                      PROPERTY_COLORS[
                        action.propertyColor as keyof typeof PROPERTY_COLORS
                      ];

                    updates.pendingAction = {
                      type: "CONFIRM_ACTION",
                      playerId: action.playerId,
                      targetId: action.targetPlayerId,
                      canSayNo: true,
                      actionType: "Sly Deal",
                      actionDescription: `${
                        player.displayName
                      } wants to steal one of your ${
                        colorInfo?.name || action.propertyColor
                      } properties.`,
                      originalAction: action,
                    };
                  }
                }
              }
              break;

            case "Deal Breaker":
              if (action.targetPlayerId && action.propertyColor) {
                const targetPlayer = gameData.players[action.targetPlayerId];
                if (
                  targetPlayer &&
                  targetPlayer.properties[action.propertyColor]
                ) {
                  const targetProperties =
                    targetPlayer.properties[action.propertyColor];
                  const colorInfo =
                    PROPERTY_COLORS[
                      action.propertyColor as keyof typeof PROPERTY_COLORS
                    ];

                  // Only allow stealing complete sets
                  if (
                    colorInfo &&
                    targetProperties.length === colorInfo.count
                  ) {
                    updates.pendingAction = {
                      type: "CONFIRM_ACTION",
                      playerId: action.playerId,
                      targetId: action.targetPlayerId,
                      canSayNo: true,
                      actionType: "Deal Breaker",
                      actionDescription: `${player.displayName} wants to steal your complete ${colorInfo.name} property set!`,
                      originalAction: action,
                    };
                  }
                }
              }
              break;

            case "Forced Deal":
              console.log("Forced Deal case - creating pending action");
              console.log("action:", action);
              console.log("action.cardIds:", action.cardIds);
              if (
                action.targetPlayerId &&
                action.cardIds &&
                action.cardIds.length === 3
              ) {
                const targetPlayer = gameData.players[action.targetPlayerId];
                const [, myPropertyId, targetPropertyId] = action.cardIds;

                console.log("targetPlayer:", targetPlayer);
                console.log("myPropertyId:", myPropertyId);
                console.log("targetPropertyId:", targetPropertyId);

                if (targetPlayer) {
                  // Find which colors these properties belong to
                  let myPropertyColor = "";
                  let targetPropertyColor = "";

                  // Find my property color
                  Object.entries(player.properties).forEach(
                    ([color, cardIds]) => {
                      if (cardIds.includes(myPropertyId)) {
                        myPropertyColor = color;
                      }
                    }
                  );

                  // Find target property color
                  Object.entries(targetPlayer.properties).forEach(
                    ([color, cardIds]) => {
                      if (cardIds.includes(targetPropertyId)) {
                        targetPropertyColor = color;
                      }
                    }
                  );

                  if (myPropertyColor && targetPropertyColor) {
                    const myColorInfo =
                      PROPERTY_COLORS[
                        myPropertyColor as keyof typeof PROPERTY_COLORS
                      ];
                    const targetColorInfo =
                      PROPERTY_COLORS[
                        targetPropertyColor as keyof typeof PROPERTY_COLORS
                      ];

                    updates.pendingAction = {
                      type: "CONFIRM_ACTION",
                      playerId: action.playerId,
                      targetId: action.targetPlayerId,
                      canSayNo: true,
                      actionType: "Forced Deal",
                      actionDescription: `${
                        player.displayName
                      } wants to trade their ${
                        myColorInfo?.name || myPropertyColor
                      } property for your ${
                        targetColorInfo?.name || targetPropertyColor
                      } property.`,
                      originalAction: action,
                    };
                  }
                }
              }
          }

          // Set last action for game log
          updates.lastAction = {
            type: card.name,
            playerId: action.playerId,
            targetId: action.targetPlayerId,
            cardId: cardId,
            timestamp: Date.now(),
          };
        }
      }
      break;

    case "SAY_NO":
      // Handle "Just Say No!" card usage
      if (
        action.cardIds &&
        action.cardIds.length > 0 &&
        gameData.pendingAction &&
        gameData.pendingAction.targetId === action.playerId &&
        gameData.pendingAction.canSayNo
      ) {
        const justSayNoCardId = action.cardIds[0];
        const card = getCard(justSayNoCardId);

        if (
          card &&
          card.name === "Just Say No!" &&
          player.hand.includes(justSayNoCardId)
        ) {
          // Remove the "Just Say No!" card from player's hand
          const newHand = player.hand.filter((id) => id !== justSayNoCardId);
          const newDiscardPile = [...gameData.discardPile, justSayNoCardId];

          updates[`players.${action.playerId}.hand`] = newHand;
          updates.discardPile = newDiscardPile;

          // Cancel the pending action
          updates.pendingAction = null;

          // Set last action for log
          updates.lastAction = {
            type: "JUST_SAY_NO",
            playerId: action.playerId,
            targetId: gameData.pendingAction.playerId,
            cardId: justSayNoCardId,
            timestamp: Date.now(),
          };
        }
      }
      break;

    case "ACCEPT_ACTION":
      console.log("ACCEPT_ACTION case reached");
      console.log("gameData.pendingAction:", gameData.pendingAction);
      console.log("action.playerId:", action.playerId);

      // Handle accepting the action without playing "Just Say No!"
      if (
        gameData.pendingAction &&
        gameData.pendingAction.targetId === action.playerId &&
        gameData.pendingAction.canSayNo &&
        gameData.pendingAction.originalAction
      ) {
        console.log("All validation conditions met");
        // Execute the original action
        const originalAction = gameData.pendingAction.originalAction;
        const attacker = gameData.players[originalAction.playerId];
        const defender = gameData.players[action.playerId];

        console.log("originalAction:", originalAction);
        console.log("attacker:", attacker);
        console.log("defender:", defender);

        if (attacker && defender) {
          // Execute based on the original action type
          const originalCard = getCard(originalAction.cardIds?.[0] || "");

          console.log("originalCard:", originalCard);

          if (originalCard) {
            switch (originalCard.name) {
              case "Debt Collector":
                const requiredPayment = 5;
                const payment = Math.min(requiredPayment, defender.bankValue);

                if (payment > 0) {
                  // Transfer money from defender to attacker
                  const targetBankCards = defender.bank.slice(0, payment);
                  const newTargetBank = defender.bank.slice(payment);
                  const newTargetBankValue = defender.bankValue - payment;
                  const newCurrentBank = [...attacker.bank, ...targetBankCards];
                  const newCurrentBankValue = attacker.bankValue + payment;

                  updates[`players.${action.playerId}.bank`] = newTargetBank;
                  updates[`players.${action.playerId}.bankValue`] =
                    newTargetBankValue;
                  updates[`players.${originalAction.playerId}.bank`] =
                    newCurrentBank;
                  updates[`players.${originalAction.playerId}.bankValue`] =
                    newCurrentBankValue;
                }

                // Check if player still owes money
                if (payment < requiredPayment) {
                  updates.pendingAction = {
                    type: "PAY_DEBT",
                    playerId: originalAction.playerId,
                    targetId: action.playerId,
                    debtAmount: requiredPayment - payment,
                    debtType: "debt_collector",
                    canSayNo: false,
                  };
                } else {
                  updates.pendingAction = null;
                }
                break;

              case "Rent":
              case "Wild Rent":
                if (originalAction.propertyColor) {
                  const currentPlayerProperties =
                    attacker.properties[originalAction.propertyColor] || [];

                  if (currentPlayerProperties.length > 0) {
                    const colorInfo =
                      PROPERTY_COLORS[
                        originalAction.propertyColor as keyof typeof PROPERTY_COLORS
                      ];
                    if (colorInfo) {
                      const improvements =
                        attacker.improvements[originalAction.propertyColor];
                      const rentAmount = calculateRentWithImprovements(
                        currentPlayerProperties,
                        improvements,
                        colorInfo
                      );
                      const rentPayment = Math.min(
                        rentAmount,
                        defender.bankValue
                      );

                      if (rentPayment > 0) {
                        const targetBankCards = defender.bank.slice(
                          0,
                          rentPayment
                        );
                        const newTargetBank = defender.bank.slice(rentPayment);
                        const newTargetBankValue =
                          defender.bankValue - rentPayment;
                        const newCurrentBank = [
                          ...attacker.bank,
                          ...targetBankCards,
                        ];
                        const newCurrentBankValue =
                          attacker.bankValue + rentPayment;

                        updates[`players.${action.playerId}.bank`] =
                          newTargetBank;
                        updates[`players.${action.playerId}.bankValue`] =
                          newTargetBankValue;
                        updates[`players.${originalAction.playerId}.bank`] =
                          newCurrentBank;
                        updates[
                          `players.${originalAction.playerId}.bankValue`
                        ] = newCurrentBankValue;
                      }

                      // Check if player still owes rent
                      if (rentPayment < rentAmount) {
                        updates.pendingAction = {
                          type: "PAY_DEBT",
                          playerId: originalAction.playerId,
                          targetId: action.playerId,
                          debtAmount: rentAmount - rentPayment,
                          debtType: "rent",
                          canSayNo: false,
                        };
                      } else {
                        updates.pendingAction = null;
                      }
                    }
                  }
                }
                break;

              case "Sly Deal":
                if (
                  originalAction.propertyColor &&
                  defender.properties[originalAction.propertyColor]
                ) {
                  const targetProperties =
                    defender.properties[originalAction.propertyColor];
                  if (targetProperties.length > 0) {
                    // Steal one property (take the first one)
                    const stolenProperty = targetProperties[0];
                    const newTargetProperties = targetProperties.slice(1);
                    const currentPlayerProperties =
                      attacker.properties[originalAction.propertyColor] || [];
                    const newCurrentProperties = [
                      ...currentPlayerProperties,
                      stolenProperty,
                    ];

                    if (newTargetProperties.length === 0) {
                      // Remove the color entirely if no properties left
                      const newTargetPropertiesObj = { ...defender.properties };
                      delete newTargetPropertiesObj[
                        originalAction.propertyColor
                      ];
                      updates[`players.${action.playerId}.properties`] =
                        newTargetPropertiesObj;
                    } else {
                      updates[
                        `players.${action.playerId}.properties.${originalAction.propertyColor}`
                      ] = newTargetProperties;
                    }

                    updates[
                      `players.${originalAction.playerId}.properties.${originalAction.propertyColor}`
                    ] = newCurrentProperties;
                  }
                }
                updates.pendingAction = null;
                break;

              case "Deal Breaker":
                if (
                  originalAction.propertyColor &&
                  defender.properties[originalAction.propertyColor]
                ) {
                  const targetProperties =
                    defender.properties[originalAction.propertyColor];
                  const colorInfo =
                    PROPERTY_COLORS[
                      originalAction.propertyColor as keyof typeof PROPERTY_COLORS
                    ];

                  // Only steal complete sets
                  if (
                    colorInfo &&
                    targetProperties.length === colorInfo.count
                  ) {
                    // Steal the entire property set
                    const currentPlayerProperties =
                      attacker.properties[originalAction.propertyColor] || [];
                    const newCurrentProperties = [
                      ...currentPlayerProperties,
                      ...targetProperties,
                    ];

                    // Transfer improvements along with the property set
                    const targetImprovements =
                      defender.improvements[originalAction.propertyColor];
                    if (targetImprovements) {
                      updates[
                        `players.${originalAction.playerId}.improvements.${originalAction.propertyColor}`
                      ] = targetImprovements;

                      // Remove improvements from defender
                      const newTargetImprovements = {
                        ...defender.improvements,
                      };
                      delete newTargetImprovements[
                        originalAction.propertyColor
                      ];
                      updates[`players.${action.playerId}.improvements`] =
                        newTargetImprovements;
                    }

                    // Remove the set from target player
                    const newTargetPropertiesObj = { ...defender.properties };
                    delete newTargetPropertiesObj[originalAction.propertyColor];

                    updates[`players.${action.playerId}.properties`] =
                      newTargetPropertiesObj;
                    updates[`players.${action.playerId}.completedSets`] =
                      defender.completedSets - 1;
                    updates[
                      `players.${originalAction.playerId}.properties.${originalAction.propertyColor}`
                    ] = newCurrentProperties;

                    // Check if attacker now has a complete set
                    if (newCurrentProperties.length === colorInfo.count) {
                      updates[
                        `players.${originalAction.playerId}.completedSets`
                      ] = attacker.completedSets + 1;
                    }
                  }
                }
                updates.pendingAction = null;
                break;

              case "Forced Deal":
                if (
                  originalAction.cardIds &&
                  originalAction.cardIds.length === 3
                ) {
                  const [, myPropertyId, targetPropertyId] =
                    originalAction.cardIds;

                  // Find which colors these properties belong to
                  let myPropertyColor = "";
                  let targetPropertyColor = "";

                  // Find attacker's property color
                  Object.entries(attacker.properties).forEach(
                    ([color, cardIds]) => {
                      if (cardIds.includes(myPropertyId)) {
                        myPropertyColor = color;
                      }
                    }
                  );

                  // Find defender's property color
                  Object.entries(defender.properties).forEach(
                    ([color, cardIds]) => {
                      if (cardIds.includes(targetPropertyId)) {
                        targetPropertyColor = color;
                      }
                    }
                  );

                  if (myPropertyColor && targetPropertyColor) {
                    // Execute the property trade
                    const myCurrentProperties =
                      attacker.properties[myPropertyColor] || [];
                    const myNewProperties = myCurrentProperties.filter(
                      (id) => id !== myPropertyId
                    );

                    const targetCurrentProperties =
                      defender.properties[targetPropertyColor] || [];
                    const targetNewProperties = targetCurrentProperties.filter(
                      (id) => id !== targetPropertyId
                    );

                    // Add defender's property to attacker's collection
                    const myNewTargetColorProperties = [
                      ...(attacker.properties[targetPropertyColor] || []),
                      targetPropertyId,
                    ];

                    // Add attacker's property to defender's collection
                    const targetNewMyColorProperties = [
                      ...(defender.properties[myPropertyColor] || []),
                      myPropertyId,
                    ];

                    // Update attacker's properties
                    if (myNewProperties.length === 0) {
                      const newMyProperties = { ...attacker.properties };
                      delete newMyProperties[myPropertyColor];
                      updates[`players.${originalAction.playerId}.properties`] =
                        newMyProperties;
                    } else {
                      updates[
                        `players.${originalAction.playerId}.properties.${myPropertyColor}`
                      ] = myNewProperties;
                    }
                    updates[
                      `players.${originalAction.playerId}.properties.${targetPropertyColor}`
                    ] = myNewTargetColorProperties;

                    // Update defender's properties
                    if (targetNewProperties.length === 0) {
                      const newTargetProperties = { ...defender.properties };
                      delete newTargetProperties[targetPropertyColor];
                      updates[`players.${action.playerId}.properties`] =
                        newTargetProperties;
                    } else {
                      updates[
                        `players.${action.playerId}.properties.${targetPropertyColor}`
                      ] = targetNewProperties;
                    }
                    updates[
                      `players.${action.playerId}.properties.${myPropertyColor}`
                    ] = targetNewMyColorProperties;

                    // Recalculate completed sets for both players
                    let attackerCompletedSets = 0;
                    let defenderCompletedSets = 0;

                    // Count attacker's completed sets
                    const attackerUpdatedProperties = {
                      ...attacker.properties,
                      [targetPropertyColor]: myNewTargetColorProperties,
                      ...(myNewProperties.length === 0
                        ? {}
                        : { [myPropertyColor]: myNewProperties }),
                    };
                    if (myNewProperties.length === 0) {
                      delete attackerUpdatedProperties[myPropertyColor];
                    }

                    Object.entries(attackerUpdatedProperties).forEach(
                      ([color, cardIds]) => {
                        const colorInfo =
                          PROPERTY_COLORS[
                            color as keyof typeof PROPERTY_COLORS
                          ];
                        if (colorInfo && cardIds.length === colorInfo.count) {
                          attackerCompletedSets++;
                        }
                      }
                    );

                    // Count defender's completed sets
                    const defenderUpdatedProperties = {
                      ...defender.properties,
                      [myPropertyColor]: targetNewMyColorProperties,
                      ...(targetNewProperties.length === 0
                        ? {}
                        : { [targetPropertyColor]: targetNewProperties }),
                    };
                    if (targetNewProperties.length === 0) {
                      delete defenderUpdatedProperties[targetPropertyColor];
                    }

                    Object.entries(defenderUpdatedProperties).forEach(
                      ([color, cardIds]) => {
                        const colorInfo =
                          PROPERTY_COLORS[
                            color as keyof typeof PROPERTY_COLORS
                          ];
                        if (colorInfo && cardIds.length === colorInfo.count) {
                          defenderCompletedSets++;
                        }
                      }
                    );

                    updates[
                      `players.${originalAction.playerId}.completedSets`
                    ] = attackerCompletedSets;
                    updates[`players.${action.playerId}.completedSets`] =
                      defenderCompletedSets;
                  }
                }
                updates.pendingAction = null;
                break;
            }

            // Set last action for log
            updates.lastAction = {
              type: `${originalCard.name.toUpperCase()}_ACCEPTED`,
              playerId: originalAction.playerId,
              targetId: action.playerId,
              cardId: originalAction.cardIds?.[0],
              timestamp: Date.now(),
            };
          }
        } else {
          console.log("Attacker or defender not found");
          console.log("originalAction.playerId:", originalAction.playerId);
          console.log("action.playerId:", action.playerId);
          // Attacker or defender not found, clear the pending action
          updates.pendingAction = null;
        }
      } else {
        console.log("Validation conditions not met:");
        console.log("- pendingAction exists:", !!gameData.pendingAction);
        console.log(
          "- targetId matches:",
          gameData.pendingAction?.targetId === action.playerId
        );
        console.log("- canSayNo:", gameData.pendingAction?.canSayNo);
        console.log(
          "- originalAction exists:",
          !!gameData.pendingAction?.originalAction
        );
        // Validation conditions not met, clear the pending action
        updates.pendingAction = null;
      }
      break;

    case "PAY_DEBT":
      // Handle debt payment with cards
      if (
        action.cardIds &&
        gameData.pendingAction &&
        gameData.pendingAction.targetId === action.playerId
      ) {
        const creditorId = gameData.pendingAction.playerId;
        const creditor = gameData.players[creditorId];
        const debtor = gameData.players[action.playerId];
        const debtAmount = gameData.pendingAction.debtAmount || 0;

        if (creditor && debtor) {
          // Handle case where debtor has no cards to pay with
          if (action.cardIds.length === 0) {
            // Clear the pending action - debt is forgiven
            updates.pendingAction = null;

            // Check if there are more pending payments in the queue
            if (
              gameData.pendingPayments &&
              gameData.pendingPayments.length > 0
            ) {
              const [nextDebt, ...remainingDebts] = gameData.pendingPayments;
              updates.pendingPayments = remainingDebts;

              // Set up the next debt payment
              updates.pendingAction = {
                type: "PAY_DEBT",
                playerId: nextDebt.creditorId,
                targetId: nextDebt.debtorId,
                canSayNo: false,
                debtAmount: nextDebt.amount,
                debtType: nextDebt.debtType,
              };
            }

            break;
          }

          // Handle case where debtor has cards to pay with
          let totalPaymentValue = 0;
          const cardsToRemove: string[] = [];
          const moneyCards: string[] = [];
          const propertyCards: Array<{ cardId: string; color: string }> = [];

          // Categorize payment cards and calculate total value
          action.cardIds.forEach((cardId) => {
            const card = getCard(cardId);
            if (card && card.value !== undefined) {
              totalPaymentValue += card.value;
              cardsToRemove.push(cardId);

              // Check if it's a money card (from bank) or property card
              if (debtor.bank.includes(cardId)) {
                moneyCards.push(cardId);
              } else {
                // Find which property color this card belongs to
                Object.entries(debtor.properties).forEach(
                  ([color, cardIds]) => {
                    if (cardIds.includes(cardId)) {
                      propertyCards.push({ cardId, color });
                    }
                  }
                );
              }
            }
          });

          // Allow payment if:
          // 1. Total payment value is at least the debt amount, OR
          // 2. Player is paying with all their available cards (can't pay more)
          const totalAvailableValue = [
            ...debtor.bank,
            ...Object.values(debtor.properties).flat(),
          ]
            .map((cardId) => {
              const card = getCard(cardId);
              return card?.value || 0;
            })
            .reduce((sum, value) => sum + value, 0);

          const isPayingEverything = totalPaymentValue === totalAvailableValue;

          if (totalPaymentValue >= debtAmount || isPayingEverything) {
            // Remove cards from debtor's bank
            const newDebtorBank = debtor.bank.filter(
              (cardId) => !moneyCards.includes(cardId)
            );
            let newDebtorBankValue = 0;
            newDebtorBank.forEach((cardId) => {
              const card = getCard(cardId);
              if (card && card.value !== undefined) {
                newDebtorBankValue += card.value;
              }
            });

            // Remove property cards from debtor and prepare for transfer
            const newDebtorProperties = { ...debtor.properties };
            propertyCards.forEach(({ cardId, color }) => {
              newDebtorProperties[color] = newDebtorProperties[color].filter(
                (id) => id !== cardId
              );
              if (newDebtorProperties[color].length === 0) {
                delete newDebtorProperties[color];
              }
            });

            // Transfer money cards to creditor's bank
            const newCreditorBank = [...creditor.bank, ...moneyCards];
            let newCreditorBankValue = creditor.bankValue;
            moneyCards.forEach((cardId) => {
              const card = getCard(cardId);
              if (card && card.value !== undefined) {
                newCreditorBankValue += card.value;
              }
            });

            // Transfer property cards to creditor's properties
            const newCreditorProperties = { ...creditor.properties };
            propertyCards.forEach(({ cardId, color }) => {
              if (!newCreditorProperties[color]) {
                newCreditorProperties[color] = [];
              }
              newCreditorProperties[color].push(cardId);
            });

            // Update debtor
            updates[`players.${action.playerId}.bank`] = newDebtorBank;
            updates[`players.${action.playerId}.bankValue`] =
              newDebtorBankValue;
            updates[`players.${action.playerId}.properties`] =
              newDebtorProperties;

            // Update creditor
            updates[`players.${creditorId}.bank`] = newCreditorBank;
            updates[`players.${creditorId}.bankValue`] = newCreditorBankValue;
            updates[`players.${creditorId}.properties`] = newCreditorProperties;

            // Recalculate completed sets for both players
            let debtorCompletedSets = 0;
            let creditorCompletedSets = 0;

            // Count debtor's completed sets
            Object.entries(newDebtorProperties).forEach(([color, cardIds]) => {
              const colorInfo =
                PROPERTY_COLORS[color as keyof typeof PROPERTY_COLORS];
              if (colorInfo && cardIds.length === colorInfo.count) {
                debtorCompletedSets++;
              }
            });

            // Count creditor's completed sets
            Object.entries(newCreditorProperties).forEach(
              ([color, cardIds]) => {
                const colorInfo =
                  PROPERTY_COLORS[color as keyof typeof PROPERTY_COLORS];
                if (colorInfo && cardIds.length === colorInfo.count) {
                  creditorCompletedSets++;
                }
              }
            );

            updates[`players.${action.playerId}.completedSets`] =
              debtorCompletedSets;
            updates[`players.${creditorId}.completedSets`] =
              creditorCompletedSets;

            // Clear pending action
            updates.pendingAction = null;

            // Check if there are more pending payments in the queue
            if (
              gameData.pendingPayments &&
              gameData.pendingPayments.length > 0
            ) {
              const [nextDebt, ...remainingDebts] = gameData.pendingPayments;

              updates.pendingAction = {
                type: "PAY_DEBT",
                playerId: nextDebt.creditorId,
                targetId: nextDebt.debtorId,
                debtAmount: nextDebt.amount,
                debtType: nextDebt.debtType,
                canSayNo: false,
              };

              // Update the queue
              if (remainingDebts.length > 0) {
                updates.pendingPayments = remainingDebts;
              } else {
                updates.pendingPayments = null;
              }
            }

            // Set last action for log
            updates.lastAction = {
              type: `DEBT_PAID_${gameData.pendingAction.debtType?.toUpperCase()}`,
              playerId: action.playerId,
              targetId: creditorId,
              timestamp: Date.now(),
            };
          }
        }
      }
      break;
  }

  await updateDoc(gameRef, updates);
}
