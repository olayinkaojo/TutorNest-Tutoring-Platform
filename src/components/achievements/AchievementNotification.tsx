import React, { useState, useEffect } from "react";

export interface NotificationBadge {
  id: string;
  name: string;
  icon: string;
  rarity: "common" | "rare" | "epic" | "legendary";
}

export interface AchievementNotificationProps {
  badge: NotificationBadge | null;
  onDismiss: () => void;
  duration?: number;
}

const rarityColors = {
  common: "from-cyan-500 to-cyan-600",
  rare: "from-purple-500 to-purple-600",
  epic: "from-orange-500 to-orange-600",
  legendary: "from-yellow-500 to-yellow-600",
};

export default function AchievementNotification({
  badge,
  onDismiss,
  duration = 4000,
}: AchievementNotificationProps) {
  const [isVisible, setIsVisible] = useState(!!badge);
  const [showConfetti, setShowConfetti] = useState(!!badge);

  useEffect(() => {
    if (badge) {
      setIsVisible(true);
      setShowConfetti(true);

      // Play sound (optional)
      const audio = new Audio("data:audio/wav;base64,UklGRiYAAABXQVZFZm10IBAAAAABAAEAQB8AAAB9AAACABAAZGF0YCIAAAAAAA==");
      audio.play().catch(() => {});

      const timer = setTimeout(() => {
        setIsVisible(false);
        setTimeout(() => {
          onDismiss();
          setShowConfetti(false);
        }, 300);
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [badge, duration, onDismiss]);

  if (!badge) return null;

  return (
    <>
      {/* Confetti Animation */}
      {showConfetti && (
        <div className="fixed inset-0 pointer-events-none overflow-hidden">
          {[...Array(30)].map((_, i) => (
            <div
              key={i}
              className="absolute animate-bounce"
              style={{
                left: `${Math.random() * 100}%`,
                top: `-20px`,
                animation: `fall ${2 + Math.random() * 1}s linear forwards`,
              }}
            >
              {["🎉", "✨", "🌟", "⭐"][Math.floor(Math.random() * 4)]}
            </div>
          ))}
          <style>{`
            @keyframes fall {
              to {
                transform: translateY(100vh) rotate(360deg);
                opacity: 0;
              }
            }
          `}</style>
        </div>
      )}

      {/* Notification Toast */}
      <div
        className={`fixed bottom-6 right-6 z-50 transform transition-all duration-300 ${
          isVisible ? "translate-x-0 opacity-100" : "translate-x-full opacity-0"
        }`}
      >
        <div
          className={`bg-gradient-to-r ${rarityColors[badge.rarity]} rounded-lg shadow-2xl p-4 text-white max-w-sm`}
        >
          <div className="flex items-center gap-4">
            {/* Badge Icon */}
            <div className="text-5xl animate-bounce">{badge.icon}</div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="text-lg font-bold">🎉 New Badge Unlocked!</div>
              <div className="text-sm opacity-90 truncate">{badge.name}</div>
              <div className="text-xs mt-1 capitalize opacity-75 font-semibold">
                {badge.rarity === "legendary"
                  ? "🏆 Legendary"
                  : badge.rarity === "epic"
                    ? "⚔️ Epic"
                    : badge.rarity === "rare"
                      ? "💎 Rare"
                      : "📌 Common"}
              </div>
            </div>

            {/* Close Button */}
            <button
              onClick={() => {
                setIsVisible(false);
                setTimeout(() => {
                  onDismiss();
                  setShowConfetti(false);
                }, 300);
              }}
              className="text-white hover:bg-white hover:bg-opacity-20 rounded-full p-2 flex-shrink-0"
            >
              ×
            </button>
          </div>

          {/* Progress Bar */}
          <div className="mt-3 h-1 bg-white bg-opacity-30 rounded-full overflow-hidden">
            <div
              className="h-full bg-white rounded-full animate-pulse"
              style={{
                animation: `shrink ${duration}ms linear forwards`,
              }}
            />
            <style>{`
              @keyframes shrink {
                from {
                  width: 100%;
                }
                to {
                  width: 0%;
                }
              }
            `}</style>
          </div>
        </div>
      </div>
    </>
  );
}
