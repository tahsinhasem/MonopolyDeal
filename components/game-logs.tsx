"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronUp } from "lucide-react";

interface GameLogsProps {
  logs: Array<{
    id: string;
    timestamp: number;
    type: string;
    playerName: string;
    message: string;
    emoji: string;
  }>;
}

export function GameLogs({ logs }: GameLogsProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  return (
    <Card className={isExpanded ? "h-80" : "h-auto"}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            📋 Game Log
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            className="h-8 w-8 p-0"
          >
            {isExpanded ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </Button>
        </div>
      </CardHeader>
      {isExpanded && (
        <CardContent className="p-0">
          <ScrollArea className="h-64 px-4">
            <div className="space-y-2">
              {logs.length === 0 ? (
                <p className="text-gray-500 text-sm text-center py-4">
                  Game actions will appear here...
                </p>
              ) : (
                logs
                  .slice()
                  .reverse()
                  .map((log) => (
                    <div
                      key={log.id}
                      className="flex items-start gap-2 p-2 rounded-lg bg-gray-50 text-sm"
                    >
                      <span className="text-lg flex-shrink-0">{log.emoji}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-semibold text-blue-600 truncate">
                            {log.playerName}
                          </span>
                          <span className="text-xs text-gray-500 flex-shrink-0">
                            {formatTime(log.timestamp)}
                          </span>
                        </div>
                        <p className="text-gray-700 leading-tight">
                          {log.message}
                        </p>
                      </div>
                    </div>
                  ))
              )}
            </div>
          </ScrollArea>
        </CardContent>
      )}
    </Card>
  );
}
