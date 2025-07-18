"use client"

import { useState, useEffect } from "react"
import type { User } from "firebase/auth"
import { onAuthChange, signInAnonymous } from "@/lib/auth"
import { createGame, joinGame, startGame, subscribeToGame, executeGameAction } from "@/lib/game-service"
import type { GameState } from "@/lib/types"
import { Lobby } from "@/components/lobby"
import { GameRoom } from "@/components/game-room"
import { GameBoard } from "@/components/game-board"

export default function Home() {
  const [user, setUser] = useState<User | null>(null)
  const [gameId, setGameId] = useState<string>("")
  const [game, setGame] = useState<GameState | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string>("")
  const [rejoiningMessage, setRejoiningMessage] = useState<string>("")

  useEffect(() => {
    const unsubscribe = onAuthChange((user) => {
      setUser(user)
    })

    return unsubscribe
  }, [])

  useEffect(() => {
    if (gameId) {
      const unsubscribe = subscribeToGame(gameId, (gameData) => {
        setGame(gameData)
        if (!gameData) {
          setGameId("")
          setError("Game not found")
        }
      })

      return unsubscribe
    }
  }, [gameId])

  const handleCreateGame = async (playerName: string) => {
    if (!user) {
      try {
        const newUser = await signInAnonymous()
        setUser(newUser)
      } catch (err) {
        setError("Failed to authenticate")
        return
      }
    }

    setLoading(true)
    setError("")
    setRejoiningMessage("")

    try {
      const newGameId = await createGame(user!.uid, playerName)
      setGameId(newGameId)
    } catch (err) {
      setError("Failed to create game")
    } finally {
      setLoading(false)
    }
  }

  const handleJoinGame = async (gameCode: string, playerName: string) => {
    if (!user) {
      try {
        const newUser = await signInAnonymous()
        setUser(newUser)
      } catch (err) {
        setError("Failed to authenticate")
        return
      }
    }

    setLoading(true)
    setError("")
    setRejoiningMessage("")

    try {
      const result = await joinGame(gameCode, user!.uid, playerName)

      if (result.gameId) {
        setGameId(result.gameId)
        if (result.isRejoining) {
          setRejoiningMessage(`Welcome back, ${playerName}! You have rejoined the game.`)
          // Clear the message after 5 seconds
          setTimeout(() => setRejoiningMessage(""), 5000)
        }
      } else {
        setError("Game not found, full, or already started")
      }
    } catch (err) {
      setError("Failed to join game")
    } finally {
      setLoading(false)
    }
  }

  const handleStartGame = async () => {
    if (!game || !user) return

    try {
      await startGame(game.id, user.uid)
    } catch (err) {
      setError("Failed to start game")
    }
  }

  const handleLeaveGame = () => {
    setGameId("")
    setGame(null)
    setError("")
    setRejoiningMessage("")
  }

  const handleGameAction = async (action: string, cardIds?: string[], targetId?: string, propertyColor?: string) => {
    if (!game || !user) return

    try {
      await executeGameAction(game.id, {
        type: action as any,
        playerId: user.uid,
        cardIds,
        targetPlayerId: targetId,
        propertyColor,
      })
    } catch (err) {
      setError("Failed to execute action")
    }
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-red-50">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Error</h1>
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={() => {
              setError("")
              setGameId("")
              setGame(null)
            }}
            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            Back to Lobby
          </button>
        </div>
      </div>
    )
  }

  if (!game) {
    return <Lobby onCreateGame={handleCreateGame} onJoinGame={handleJoinGame} isLoading={loading} />
  }

  if (game.status === "waiting") {
    return (
      <GameRoom
        game={game}
        currentUserId={user?.uid || ""}
        onStartGame={handleStartGame}
        onLeaveGame={handleLeaveGame}
        rejoiningMessage={rejoiningMessage}
      />
    )
  }

  if (game.status === "playing") {
    return (
      <GameBoard
        game={game}
        currentUserId={user?.uid || ""}
        onDrawCards={() => handleGameAction("DRAW_CARDS")}
        onPlayCard={(cardIds, action, targetId, propertyColor) =>
          handleGameAction(action, cardIds, targetId, propertyColor)
        }
        onEndTurn={() => handleGameAction("END_TURN")}
        onDiscardCards={(cardIds) => handleGameAction("DISCARD_CARDS", cardIds)}
        rejoiningMessage={rejoiningMessage}
      />
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-2xl font-bold mb-4">Game Finished!</h1>
        <button onClick={handleLeaveGame} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
          Back to Lobby
        </button>
      </div>
    </div>
  )
}
