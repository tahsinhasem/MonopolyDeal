"use client";

import { Card, CardContent } from "@/components/ui/card";

interface CardBackProps {
  className?: string;
  size?: "small" | "medium" | "large";
}

export function CardBack({ className = "", size = "medium" }: CardBackProps) {
  const getSizeClasses = (size: "small" | "medium" | "large"): string => {
    switch (size) {
      case "small":
        return "w-16 h-24";
      case "medium":
        return "w-32 h-44";
      case "large":
        return "w-40 h-56";
      default:
        return "w-32 h-44";
    }
  };

  return (
    <Card className={`${getSizeClasses(size)} ${className}`}>
      <CardContent className="p-2 h-full flex items-center justify-center bg-gradient-to-br from-blue-600 to-purple-600 border-2 border-blue-700">
        <div className="text-white text-center">
          <div className="text-lg font-bold">Deal</div>
          <div className="text-xs mt-1">🎲</div>
        </div>
      </CardContent>
    </Card>
  );
}
