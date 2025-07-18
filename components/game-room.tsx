"use client"

import type { GameState } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Copy, Users, Crown } from "lucide-react"
import { CardBack } from "@/components/card-back"

interface GameRoomProps {
  game: GameState
  currentUserId: string
  onStartGame: () => void
  onLeaveGame: () => void
  rejoiningMessage?: string
}

export function GameRoom({ game, currentUserId, onStartGame, onLeaveGame, rejoiningMessage }: GameRoomProps) {
  const players = Object.values(game.players)
  const isHost = game.hostId === currentUserId
  const canStart = players.length >= 2 && isHost

  const copyGameCode = async () => {
    try {
      await navigator.clipboard.writeText(game.gameCode)
    } catch (err) {
      // Fallback for older browsers
      const textArea = document.createElement("textarea")
      textArea.value = game.gameCode
      document.body.appendChild(textArea)
      textArea.select()
      document.execCommand("copy")
      document.body.removeChild(textArea)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 to-purple-700 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">Game Room</CardTitle>
          <div className="flex items-center justify-center gap-2 mt-2">
            <span className="text-lg font-mono bg-gray-100 px-3 py-1 rounded">{game.gameCode}</span>
            <Button onClick={copyGameCode} variant="outline" size="sm" className="p-2 bg-transparent">
              <Copy className="w-4 h-4" />
            </Button>
          </div>
          <p className="text-sm text-gray-600 mt-2">Share this code with friends to join the game</p>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Rejoining Message */}
          {rejoiningMessage && (
            <div className="bg-green-100 border border-green-300 rounded-lg p-4">
              <p className="text-green-800 text-center font-medium">{rejoiningMessage}</p>
            </div>
          )}

          <div>
            <div className="flex items-center gap-2 mb-4">
              <Users className="w-5 h-5" />
              <h3 className="text-lg font-semibold">Players ({players.length}/5)</h3>
            </div>

            <div className="grid gap-2">
              {players.map((player) => (
                <div key={player.uid} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{player.displayName}</span>
                    {player.isHost && <Crown className="w-4 h-4 text-yellow-500" />}
                    <div className="flex items-center">
                      {Array.from({ length: Math.min(player.hand.length, 5) }).map((_, i) => (
                        <CardBack key={i} size="small" />
                      ))}
                      {player.hand.length > 5 && (
                        <span className="text-xs text-gray-600 ml-1">+{player.hand.length - 5}</span>
                      )}
                    </div>
                  </div>
                  {player.uid === currentUserId && <span className="text-sm text-blue-600 font-medium">You</span>}
                </div>
              ))}
            </div>
          </div>

          <div className="flex gap-3">
            <Button onClick={onLeaveGame} variant="outline" className="flex-1 bg-transparent">
              Leave Game
            </Button>

            <Button onClick={onStartGame} disabled={!canStart} className="flex-1">
              {isHost ? (players.length < 2 ? "Need 2+ Players" : "Start Game") : "Waiting for Host"}
            </Button>
          </div>

          {!isHost && (
            <p className="text-sm text-center text-gray-600">
              Waiting for {players.find((p) => p.isHost)?.displayName} to start the game...
            </p>
          )}

          {/* Instructions for rejoining */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-xs text-blue-700 text-center">
              <strong>Tip:</strong> If you get disconnected, you can rejoin by entering the same name and game code
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
