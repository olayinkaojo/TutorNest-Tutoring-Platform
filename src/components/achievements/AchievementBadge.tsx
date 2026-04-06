import React from "react";

export interface AchievementBadgeProps {
  id: string;
  name: string;
  description: string;
  rarity: "common" | "rare" | "epic" | "legendary";
  icon: string;
  unlocked: boolean;
  progress?: number;
  onClick?: () => void;
}

const rarityColors = {
  common: "from-cyan-400 to-cyan-600",
  rare: "from-purple-400 to-purple-600",
  epic: "from-orange-400 to-orange-600",
  legendary: "from-yellow-400 to-yellow-600",
};

const rarityBorders = {
  common: "border-cyan-500",
  rare: "border-purple-500",
  epic: "border-orange-500",
  legendary: "border-yellow-500",
};

export default function AchievementBadge({
  id,
  name,
  description,
  rarity,
  icon,
  unlocked,
  progress = 0,
  onClick,
}: AchievementBadgeProps) {
  return (
    <div
      className={`relative group cursor-pointer transition-transform hover:scale-110 ${
        onClick ? "hover:shadow-lg" : ""
      }`}
      onClick={onClick}
    >
      {/* Badge Container */}
      <div
        className={`relative w-20 h-20 rounded-full flex items-center justify-center text-4xl
        ${
          unlocked
            ? `bg-gradient-to-br ${rarityColors[rarity]} shadow-lg ring-4 ${rarityBorders[rarity]}`
            : "bg-gray-300 shadow-md ring-4 ring-gray-400 opacity-50"
        }
        transition-all duration-300`}
      >
        {icon}

        {/* Progress Ring (for locked badges) */}
        {!unlocked && progress > 0 && (
          <div className="absolute inset-0 rounded-full flex items-center justify-center">
            <svg className="transform -rotate-90" width="80" height="80">
              <circle cx="40" cy="40" r="36" fill="none" stroke="#ddd" strokeWidth="2" />
              <circle
                cx="40"
                cy="40"
                r="36"
                fill="none"
                stroke="#3b82f6"
                strokeWidth="2"
                strokeDasharray={`${(progress / 100) * 226.2} 226.2`}
                className="transition-all duration-500"
              />
            </svg>
            <span className="absolute text-xs font-bold text-white">{Math.round(progress)}%</span>
          </div>
        )}

        {/* NEW Label */}
        {unlocked && (
          <div className="absolute -top-2 -right-2 bg-green-500 text-white text-xs font-bold px-2 py-1 rounded-full animate-bounce">
            NEW
          </div>
        )}
      </div>

      {/* Tooltip */}
      <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
        <div className="bg-gray-900 text-white px-3 py-2 rounded-lg text-center whitespace-nowrap text-sm">
          <div className="font-bold">{name}</div>
          <div className="text-gray-300 text-xs">{description}</div>
          <div
            className={`text-xs mt-1 font-semibold ${
              rarity === "legendary"
                ? "text-yellow-300"
                : rarity === "epic"
                  ? "text-orange-300"
                  : rarity === "rare"
                    ? "text-purple-300"
                    : "text-cyan-300"
            }`}
          >
            {rarity.charAt(0).toUpperCase() + rarity.slice(1)}
          </div>
        </div>
      </div>

      {/* Badge Name */}
      <div className="text-center mt-2 text-xs font-semibold text-gray-700 max-w-[80px] mx-auto truncate">
        {name}
      </div>
    </div>
  );
}
