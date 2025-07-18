interface StoredGameData {
  gameId: string
  gameCode: string
  playerId: string
  playerName: string
  timestamp: number
}

const STORAGE_KEY = "monopoly-deal-game-data"
const STORAGE_EXPIRY = 24 * 60 * 60 * 1000 // 24 hours

export function saveGameData(gameId: string, gameCode: string, playerId: string, playerName: string): void {
  const data: StoredGameData = {
    gameId,
    gameCode,
    playerId,
    playerName,
    timestamp: Date.now(),
  }

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  } catch (error) {
    console.warn("Failed to save game data to localStorage:", error)
  }
}

export function getStoredGameData(): StoredGameData | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (!stored) return null

    const data: StoredGameData = JSON.parse(stored)

    // Check if data is expired
    if (Date.now() - data.timestamp > STORAGE_EXPIRY) {
      clearStoredGameData()
      return null
    }

    return data
  } catch (error) {
    console.warn("Failed to load game data from localStorage:", error)
    clearStoredGameData()
    return null
  }
}

export function clearStoredGameData(): void {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch (error) {
    console.warn("Failed to clear game data from localStorage:", error)
  }
}
