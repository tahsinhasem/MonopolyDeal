export interface Player {
  uid: string;
  displayName: string;
  hand: string[];
  bank: string[];
  properties: Record<string, string[]>;
  improvements: Record<string, { houses: string[]; hotel?: string }>; // Track houses and hotels on property sets
  bankValue: number;
  completedSets: number;
  isHost: boolean;
}

export interface GameState {
  id: string;
  gameCode: string;
  status: "waiting" | "playing" | "finished";
  players: Record<string, Player>;
  hostId: string;
  currentTurnPlayerId: string;
  drawPile: string[];
  discardPile: string[];
  turnPhase: "draw" | "play" | "discard";
  cardsDrawnThisTurn: number;
  cardsPlayedThisTurn: number;
  lastAction?: {
    type: string;
    playerId: string;
    targetId?: string;
    cardId?: string;
    timestamp: number;
  };
  pendingAction?: {
    type: string;
    playerId: string;
    targetId?: string;
    cardId?: string;
    canSayNo: boolean;
    debtAmount?: number;
    debtType?: string;
    actionType?: string; // The original action type (e.g., "Rent", "Sly Deal")
    actionDescription?: string; // Human readable description
    originalAction?: GameAction; // Store the original action for re-execution
  };
  pendingPayments?: Array<{
    creditorId: string;
    debtorId: string;
    amount: number;
    debtType: string;
  }>;
  version: number;
  createdAt: number;
  updatedAt: number;
}

export interface GameAction {
  type:
    | "DRAW_CARDS"
    | "PLAY_MONEY"
    | "PLAY_PROPERTY"
    | "PLAY_ACTION"
    | "PLAY_IMPROVEMENT"
    | "DISCARD_CARDS"
    | "END_TURN"
    | "SAY_NO"
    | "ACCEPT_ACTION"
    | "PAY_DEBT";
  playerId: string;
  cardIds?: string[];
  targetPlayerId?: string;
  propertyColor?: string;
}
