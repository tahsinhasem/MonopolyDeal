export interface Player {
  uid: string;
  displayName: string;
  hand: string[];
  bank: string[];
  properties: Record<string, string[]>;
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
    | "DISCARD_CARDS"
    | "END_TURN"
    | "SAY_NO"
    | "PAY_DEBT";
  playerId: string;
  cardIds?: string[];
  targetPlayerId?: string;
  propertyColor?: string;
}
