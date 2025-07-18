"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Wifi, WifiOff } from "lucide-react"

interface ReconnectionPromptProps {
  gameCode: string
  playerName: string
  onReconnect: () => void
  onStartNew: () => void
  isReconnecting?: boolean
}

export function ReconnectionPrompt({
  gameCode,
  playerName,
  onReconnect,
  onStartNew,
  isReconnecting,
}: ReconnectionPromptProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 to-purple-700 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="relative">
              <Wifi className="w-12 h-12 text-blue-600" />
              <WifiOff className="w-6 h-6 text-red-500 absolute -top-1 -right-1" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold text-blue-600">Connection Restored</CardTitle>
          <p className="text-gray-600">We found a previous game session</p>
        </CardHeader>

        <CardContent className="space-y-6">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="text-center space-y-2">
              <div className="flex items-center justify-center gap-2">
                <Badge variant="outline" className="text-blue-700 border-blue-300">
                  Game Code: {gameCode}
                </Badge>
              </div>
              <p className="text-sm text-gray-700">
                Playing as: <strong>{playerName}</strong>
              </p>
              <p className="text-xs text-gray-600">You were disconnected from this game. Would you like to rejoin?</p>
            </div>
          </div>

          <div className="space-y-3">
            <Button onClick={onReconnect} className="w-full h-12 text-lg" disabled={isReconnecting}>
              {isReconnecting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Reconnecting...
                </>
              ) : (
                <>
                  <Wifi className="w-4 h-4 mr-2" />
                  Rejoin Game
                </>
              )}
            </Button>

            <Button
              onClick={onStartNew}
              variant="outline"
              className="w-full h-12 text-lg bg-transparent"
              disabled={isReconnecting}
            >
              Start New Game
            </Button>
          </div>

          <div className="text-center">
            <p className="text-xs text-gray-500">Previous session will be cleared if you start a new game</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
