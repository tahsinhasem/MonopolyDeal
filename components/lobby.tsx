"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

interface LobbyProps {
  onCreateGame: (playerName: string) => void
  onJoinGame: (gameCode: string, playerName: string) => void
  isLoading?: boolean
}

export function Lobby({ onCreateGame, onJoinGame, isLoading }: LobbyProps) {
  const [playerName, setPlayerName] = useState("")
  const [gameCode, setGameCode] = useState("")
  const [mode, setMode] = useState<"menu" | "create" | "join">("menu")

  const handleCreateGame = () => {
    if (playerName.trim()) {
      onCreateGame(playerName.trim())
    }
  }

  const handleJoinGame = () => {
    if (playerName.trim() && gameCode.trim()) {
      onJoinGame(gameCode.trim().toUpperCase(), playerName.trim())
    }
  }

  if (mode === "menu") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-600 to-purple-700 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-3xl font-bold text-blue-600">Monopoly Deal</CardTitle>
            <p className="text-gray-600">Fast-paced property trading card game</p>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button onClick={() => setMode("create")} className="w-full h-12 text-lg" disabled={isLoading}>
              Create Game
            </Button>
            <Button
              onClick={() => setMode("join")}
              variant="outline"
              className="w-full h-12 text-lg"
              disabled={isLoading}
            >
              Join Game
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (mode === "create") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-600 to-purple-700 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-center">Create Game</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Your Name</label>
              <Input
                type="text"
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                placeholder="Enter your name"
                maxLength={20}
              />
            </div>
            <div className="flex gap-2">
              <Button onClick={() => setMode("menu")} variant="outline" className="flex-1" disabled={isLoading}>
                Back
              </Button>
              <Button onClick={handleCreateGame} className="flex-1" disabled={!playerName.trim() || isLoading}>
                {isLoading ? "Creating..." : "Create"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 to-purple-700 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-center">Join Game</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Your Name</label>
            <Input
              type="text"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              placeholder="Enter your name"
              maxLength={20}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Game Code</label>
            <Input
              value={gameCode}
              onChange={(e) => setGameCode(e.target.value.toUpperCase())}
              placeholder="Enter game code"
              maxLength={6}
            />
          </div>
          <div className="flex gap-2">
            <Button onClick={() => setMode("menu")} variant="outline" className="flex-1" disabled={isLoading}>
              Back
            </Button>
            <Button
              onClick={handleJoinGame}
              className="flex-1"
              disabled={!playerName.trim() || !gameCode.trim() || isLoading}
            >
              {isLoading ? "Joining..." : "Join"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
