"use client";

import { getCard, PROPERTY_COLORS } from "@/lib/cards";
import { Card, CardContent } from "@/components/ui/card";

interface GameCardProps {
  cardId: string;
  isSelected?: boolean;
  onClick?: () => void;
  className?: string;
  size?: "small" | "medium" | "large";
}

const COLOR_STYLES = {
  brown:
    "bg-gradient-to-b from-amber-700 to-amber-900 text-white border-amber-800",
  lightblue:
    "bg-gradient-to-b from-sky-200 to-sky-400 text-black border-sky-500",
  pink: "bg-gradient-to-b from-pink-300 to-pink-500 text-white border-pink-600",
  orange:
    "bg-gradient-to-b from-orange-400 to-orange-600 text-white border-orange-700",
  red: "bg-gradient-to-b from-red-500 to-red-700 text-white border-red-800",
  yellow:
    "bg-gradient-to-b from-yellow-300 to-yellow-500 text-black border-yellow-600",
  green:
    "bg-gradient-to-b from-green-500 to-green-700 text-white border-green-800",
  darkblue:
    "bg-gradient-to-b from-blue-700 to-blue-900 text-white border-blue-900",
  utility:
    "bg-gradient-to-b from-gray-300 to-gray-500 text-black border-gray-600",
  railroad:
    "bg-gradient-to-b from-gray-700 to-gray-900 text-white border-gray-900",
};

export function GameCard({
  cardId,
  isSelected,
  onClick,
  className = "",
  size = "medium",
}: GameCardProps) {
  const card = getCard(cardId);

  if (!card) {
    return (
      <Card
        className={`cursor-pointer ${getSizeClasses(size)} ${className}`}
        onClick={onClick}
      >
        <CardContent className="p-2 h-full flex items-center justify-center bg-gray-200">
          <span className="text-xs">❓ Unknown</span>
        </CardContent>
      </Card>
    );
  }

  const getCardTypeInfo = () => {
    if (card.type === "property" && card.colors) {
      return { emoji: "🌈", label: "WILDCARD", bgColor: "bg-purple-600" };
    }
    if (card.type === "property") {
      return { emoji: "🏠", label: "PROPERTY", bgColor: "bg-blue-600" };
    }
    if (card.type === "money") {
      return { emoji: "💰", label: "MONEY", bgColor: "bg-green-600" };
    }
    if (card.type === "action") {
      return { emoji: "⚡", label: "ACTION", bgColor: "bg-orange-600" };
    }
    if (card.type === "rent") {
      return { emoji: "🏢", label: "RENT", bgColor: "bg-purple-600" };
    }
    if (card.type === "house") {
      return { emoji: "🏡", label: "HOUSE", bgColor: "bg-yellow-600" };
    }
    if (card.type === "hotel") {
      return { emoji: "🏨", label: "HOTEL", bgColor: "bg-red-600" };
    }
    return { emoji: "📄", label: "CARD", bgColor: "bg-gray-600" };
  };

  const getCardStyle = () => {
    if (card.type === "property" && card.color) {
      return (
        COLOR_STYLES[card.color as keyof typeof COLOR_STYLES] ||
        "bg-gray-200 border-gray-300"
      );
    }
    if (card.type === "money")
      return "bg-gradient-to-b from-green-100 to-green-200 text-green-800 border-green-400";
    if (card.type === "action")
      return "bg-gradient-to-b from-orange-100 to-orange-200 text-orange-800 border-orange-400";
    if (card.type === "rent")
      return "bg-gradient-to-b from-purple-100 to-purple-200 text-purple-800 border-purple-400";
    if (card.type === "house")
      return "bg-gradient-to-b from-yellow-100 to-yellow-200 text-yellow-800 border-yellow-400";
    if (card.type === "hotel")
      return "bg-gradient-to-b from-red-100 to-red-200 text-red-800 border-red-400";
    return "bg-gray-100 border-gray-300";
  };

  const getRentInfo = () => {
    if (card.type === "property" && card.color) {
      const colorInfo =
        PROPERTY_COLORS[card.color as keyof typeof PROPERTY_COLORS];
      if (colorInfo) {
        return {
          rentValues: colorInfo.rentValues,
          setSize: colorInfo.count,
          colorName: colorInfo.name,
        };
      }
    }
    return null;
  };

  const rentInfo = getRentInfo();
  const typeInfo = getCardTypeInfo();

  return (
    <Card
      className={`cursor-pointer transition-all border-2 ${
        isSelected
          ? "ring-4 ring-blue-400 transform -translate-y-2 shadow-lg"
          : "hover:shadow-md"
      } ${getSizeClasses(size)} ${className}`}
      onClick={onClick}
    >
      <CardContent className={`p-2 h-full flex flex-col ${getCardStyle()}`}>
        {/* Card Type Badge - Now more prominent */}
        <div className="flex justify-center mb-1">
          <div
            className={`${typeInfo.bgColor} text-white px-1.5 py-0.5 rounded-full text-xs font-bold flex items-center gap-1 shadow-sm`}
          >
            <span className="text-xs">{typeInfo.emoji}</span>
            <span className="text-xs">{typeInfo.label}</span>
          </div>
        </div>

        {/* Card Header */}
        <div className="text-center flex-1 flex flex-col justify-center">
          <div className="text-xs font-bold leading-tight mb-1 px-1">
            {card.name}
          </div>
          {card.value && (
            <div className="text-lg font-bold mb-1">${card.value}M</div>
          )}
        </div>

        {/* Card Bottom Section */}
        <div className="mt-auto">
          {/* Property-specific info */}
          {card.type === "property" && rentInfo && (
            <div className="text-center text-xs space-y-0.5 px-1">
              <div className="font-semibold text-xs">{rentInfo.colorName}</div>
              <div className="text-xs opacity-80">
                Set: {rentInfo.setSize} properties
              </div>
              {size !== "small" && (
                <div className="text-xs opacity-80">
                  Rent:{" "}
                  {rentInfo.rentValues
                    .slice(0, 2)
                    .map((rent, i) => `${i + 1}=${rent}M`)
                    .join(", ")}
                  {rentInfo.rentValues.length > 2 && "..."}
                </div>
              )}
            </div>
          )}

          {/* Wildcard info */}
          {card.type === "property" && card.colors && (
            <div className="text-center text-xs px-1">
              <div className="font-semibold text-xs mb-0.5">
                Wildcard Property
              </div>
              {size !== "small" && (
                <div className="text-xs opacity-80">
                  Can be:{" "}
                  {card.colors
                    .slice(0, 2)
                    .map(
                      (color) =>
                        PROPERTY_COLORS[color as keyof typeof PROPERTY_COLORS]
                          ?.name || color
                    )
                    .join(" or ")}
                  {card.colors.length > 2 && "..."}
                </div>
              )}
            </div>
          )}

          {/* Action card description */}
          {card.type === "action" && card.description && (
            <div className="text-center text-xs px-1">
              <div className="font-semibold text-xs mb-0.5">Action Card</div>
              {size !== "small" && (
                <div className="text-xs opacity-80 leading-tight">
                  {card.description.length > 40
                    ? `${card.description.substring(0, 40)}...`
                    : card.description}
                </div>
              )}
            </div>
          )}

          {/* Rent card info */}
          {card.type === "rent" && (
            <div className="text-center text-xs px-1">
              <div className="font-semibold text-xs mb-0.5">Rent Card</div>
              {size !== "small" && (
                <>
                  {card.colors ? (
                    <div className="text-xs opacity-80">
                      For:{" "}
                      {card.colors
                        .slice(0, 2)
                        .map(
                          (color) =>
                            PROPERTY_COLORS[
                              color as keyof typeof PROPERTY_COLORS
                            ]?.name || color
                        )
                        .join("/")}
                      {card.colors.length > 2 && "..."}
                    </div>
                  ) : (
                    <div className="text-xs opacity-80">
                      Wild Rent - Any Color
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* Money card info */}
          {card.type === "money" && (
            <div className="text-center text-xs">
              <div className="font-semibold text-xs mb-0.5">Money Card</div>
              {size !== "small" && (
                <div className="text-xs opacity-80">Add to bank value</div>
              )}
            </div>
          )}

          {/* House/Hotel info */}
          {(card.type === "house" || card.type === "hotel") && (
            <div className="text-center text-xs px-1">
              <div className="font-semibold text-xs mb-0.5">
                {card.type === "house" ? "House Upgrade" : "Hotel Upgrade"}
              </div>
              {size !== "small" && card.description && (
                <div className="text-xs opacity-80 leading-tight">
                  {card.description.length > 30
                    ? `${card.description.substring(0, 30)}...`
                    : card.description}
                </div>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function getSizeClasses(size: "small" | "medium" | "large"): string {
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
}

export function CardBack({
  className = "",
  size = "medium",
}: {
  className?: string;
  size?: "small" | "medium" | "large";
}) {
  return (
    <Card className={`${getSizeClasses(size)} ${className}`}>
      <CardContent className="p-2 h-full flex flex-col items-center justify-center bg-gradient-to-br from-blue-600 via-purple-600 to-blue-800 border-2 border-blue-700 text-white">
        <div className="text-center">
          <div className="text-2xl mb-2">🎲</div>
          <div className="text-lg font-bold">Monopoly</div>
          <div className="text-sm font-medium">DEAL</div>
          <div className="text-xs mt-2 opacity-80">�</div>
        </div>
      </CardContent>
    </Card>
  );
}
