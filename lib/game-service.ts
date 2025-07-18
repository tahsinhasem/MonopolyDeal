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

  if (!player || gameData.currentTurnPlayerId !== action.playerId) return;

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
              // Draw 2 additional cards
              const passGoCards = gameData.drawPile.slice(0, 2);
              const newDrawPilePassGo = gameData.drawPile.slice(2);
              updates[`players.${action.playerId}.hand`] = [
                ...newHand,
                ...passGoCards,
              ];
              updates.drawPile = newDrawPilePassGo;
              break;

            case "It's My Birthday":
              // All other players pay 2M
              Object.keys(gameData.players).forEach((playerId) => {
                if (playerId !== action.playerId) {
                  const targetPlayer = gameData.players[playerId];
                  const payment = Math.min(2, targetPlayer.bankValue);
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
                }
              });
              break;

            case "Debt Collector":
              if (action.targetPlayerId) {
                const targetPlayer = gameData.players[action.targetPlayerId];
                if (targetPlayer) {
                  const payment = Math.min(5, targetPlayer.bankValue);
                  if (payment > 0) {
                    // Transfer 5M from target to current player
                    const targetBankCards = targetPlayer.bank.slice(0, payment);
                    const newTargetBank = targetPlayer.bank.slice(payment);
                    const newTargetBankValue = targetPlayer.bankValue - payment;
                    const newCurrentBank = [...player.bank, ...targetBankCards];
                    const newCurrentBankValue = player.bankValue + payment;

                    updates[`players.${action.targetPlayerId}.bank`] =
                      newTargetBank;
                    updates[`players.${action.targetPlayerId}.bankValue`] =
                      newTargetBankValue;
                    updates[`players.${action.playerId}.bank`] = newCurrentBank;
                    updates[`players.${action.playerId}.bankValue`] =
                      newCurrentBankValue;
                  }
                }
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
                    const rentAmount =
                      colorInfo.rentValues[
                        Math.min(
                          currentPlayerProperties.length - 1,
                          colorInfo.rentValues.length - 1
                        )
                      ];
                    const payment = Math.min(
                      rentAmount,
                      targetPlayer.bankValue
                    );

                    if (payment > 0) {
                      // Transfer rent from target to current player
                      const targetBankCards = targetPlayer.bank.slice(
                        0,
                        payment
                      );
                      const newTargetBank = targetPlayer.bank.slice(payment);
                      const newTargetBankValue =
                        targetPlayer.bankValue - payment;
                      const newCurrentBank = [
                        ...player.bank,
                        ...targetBankCards,
                      ];
                      const newCurrentBankValue = player.bankValue + payment;

                      updates[`players.${action.targetPlayerId}.bank`] =
                        newTargetBank;
                      updates[`players.${action.targetPlayerId}.bankValue`] =
                        newTargetBankValue;
                      updates[`players.${action.playerId}.bank`] =
                        newCurrentBank;
                      updates[`players.${action.playerId}.bankValue`] =
                        newCurrentBankValue;
                    }
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
                    // Steal one property (take the first one)
                    const stolenProperty = targetProperties[0];
                    const newTargetProperties = targetProperties.slice(1);
                    const currentPlayerProperties =
                      player.properties[action.propertyColor] || [];
                    const newCurrentProperties = [
                      ...currentPlayerProperties,
                      stolenProperty,
                    ];

                    if (newTargetProperties.length === 0) {
                      // Remove the color entirely if no properties left
                      const newTargetPropertiesObj = {
                        ...targetPlayer.properties,
                      };
                      delete newTargetPropertiesObj[action.propertyColor];
                      updates[`players.${action.targetPlayerId}.properties`] =
                        newTargetPropertiesObj;
                    } else {
                      updates[
                        `players.${action.targetPlayerId}.properties.${action.propertyColor}`
                      ] = newTargetProperties;
                    }

                    updates[
                      `players.${action.playerId}.properties.${action.propertyColor}`
                    ] = newCurrentProperties;
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

                  // Only steal complete sets
                  if (
                    colorInfo &&
                    targetProperties.length === colorInfo.count
                  ) {
                    // Steal the entire property set
                    const currentPlayerProperties =
                      player.properties[action.propertyColor] || [];
                    const newCurrentProperties = [
                      ...currentPlayerProperties,
                      ...targetProperties,
                    ];

                    // Remove the set from target player
                    const newTargetPropertiesObj = {
                      ...targetPlayer.properties,
                    };
                    delete newTargetPropertiesObj[action.propertyColor];

                    updates[`players.${action.targetPlayerId}.properties`] =
                      newTargetPropertiesObj;
                    updates[`players.${action.targetPlayerId}.completedSets`] =
                      targetPlayer.completedSets - 1;
                    updates[
                      `players.${action.playerId}.properties.${action.propertyColor}`
                    ] = newCurrentProperties;

                    // Check if current player now has a complete set
                    if (newCurrentProperties.length === colorInfo.count) {
                      updates[`players.${action.playerId}.completedSets`] =
                        player.completedSets + 1;
                    }
                  }
                }
              }
              break;

            case "Forced Deal":
              if (
                action.targetPlayerId &&
                action.cardIds &&
                action.cardIds.length === 3
              ) {
                const targetPlayer = gameData.players[action.targetPlayerId];
                const [, myPropertyId, targetPropertyId] = action.cardIds;

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
                    // Remove my property from my collection
                    const myCurrentProperties =
                      player.properties[myPropertyColor] || [];
                    const myNewProperties = myCurrentProperties.filter(
                      (id) => id !== myPropertyId
                    );

                    // Remove target property from target's collection
                    const targetCurrentProperties =
                      targetPlayer.properties[targetPropertyColor] || [];
                    const targetNewProperties = targetCurrentProperties.filter(
                      (id) => id !== targetPropertyId
                    );

                    // Add target's property to my collection
                    const myNewTargetColorProperties = [
                      ...(player.properties[targetPropertyColor] || []),
                      targetPropertyId,
                    ];

                    // Add my property to target's collection
                    const targetNewMyColorProperties = [
                      ...(targetPlayer.properties[myPropertyColor] || []),
                      myPropertyId,
                    ];

                    // Update my properties
                    if (myNewProperties.length === 0) {
                      const newMyProperties = { ...player.properties };
                      delete newMyProperties[myPropertyColor];
                      updates[`players.${action.playerId}.properties`] =
                        newMyProperties;
                    } else {
                      updates[
                        `players.${action.playerId}.properties.${myPropertyColor}`
                      ] = myNewProperties;
                    }
                    updates[
                      `players.${action.playerId}.properties.${targetPropertyColor}`
                    ] = myNewTargetColorProperties;

                    // Update target's properties
                    if (targetNewProperties.length === 0) {
                      const newTargetProperties = {
                        ...targetPlayer.properties,
                      };
                      delete newTargetProperties[targetPropertyColor];
                      updates[`players.${action.targetPlayerId}.properties`] =
                        newTargetProperties;
                    } else {
                      updates[
                        `players.${action.targetPlayerId}.properties.${targetPropertyColor}`
                      ] = targetNewProperties;
                    }
                    updates[
                      `players.${action.targetPlayerId}.properties.${myPropertyColor}`
                    ] = targetNewMyColorProperties;

                    // Recalculate completed sets for both players
                    let myCompletedSets = 0;
                    let targetCompletedSets = 0;

                    // Count my completed sets
                    const myUpdatedProperties = {
                      ...player.properties,
                      [targetPropertyColor]: myNewTargetColorProperties,
                      ...(myNewProperties.length === 0
                        ? {}
                        : { [myPropertyColor]: myNewProperties }),
                    };
                    if (myNewProperties.length === 0) {
                      delete myUpdatedProperties[myPropertyColor];
                    }

                    Object.entries(myUpdatedProperties).forEach(
                      ([color, cardIds]) => {
                        const colorInfo =
                          PROPERTY_COLORS[
                            color as keyof typeof PROPERTY_COLORS
                          ];
                        if (colorInfo && cardIds.length === colorInfo.count) {
                          myCompletedSets++;
                        }
                      }
                    );

                    // Count target's completed sets
                    const targetUpdatedProperties = {
                      ...targetPlayer.properties,
                      [myPropertyColor]: targetNewMyColorProperties,
                      ...(targetNewProperties.length === 0
                        ? {}
                        : { [targetPropertyColor]: targetNewProperties }),
                    };
                    if (targetNewProperties.length === 0) {
                      delete targetUpdatedProperties[targetPropertyColor];
                    }

                    Object.entries(targetUpdatedProperties).forEach(
                      ([color, cardIds]) => {
                        const colorInfo =
                          PROPERTY_COLORS[
                            color as keyof typeof PROPERTY_COLORS
                          ];
                        if (colorInfo && cardIds.length === colorInfo.count) {
                          targetCompletedSets++;
                        }
                      }
                    );

                    updates[`players.${action.playerId}.completedSets`] =
                      myCompletedSets;
                    updates[`players.${action.targetPlayerId}.completedSets`] =
                      targetCompletedSets;
                  }
                }
              }
              break;
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
  }

  await updateDoc(gameRef, updates);
}
