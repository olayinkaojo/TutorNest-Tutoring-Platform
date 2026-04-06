import React, { useState, useEffect } from "react";

export interface LeaderboardEntry {
  userId: string;
  username: string;
  badgesUnlocked: number;
  totalXP: number;
  rank: number;
}

export interface LeaderboardAchievementsProps {
  leaderboard: LeaderboardEntry[];
  currentUserId?: string;
  limit?: number;
}

export default function LeaderboardAchievements({
  leaderboard = [],
  currentUserId,
  limit = 50,
}: LeaderboardAchievementsProps) {
  const [sortBy, setSortBy] = useState<"badges" | "xp">("badges");
  const [filteredLeaderboard, setFilteredLeaderboard] = useState<LeaderboardEntry[]>([]);

  useEffect(() => {
    const sorted = [...leaderboard].sort((a, b) => {
      if (sortBy === "badges") {
        return b.badgesUnlocked - a.badgesUnlocked;
      } else {
        return b.totalXP - a.totalXP;
      }
    });

    setFilteredLeaderboard(sorted.slice(0, limit));
  }, [leaderboard, sortBy, limit]);

  const currentUserRank = filteredLeaderboard.findIndex((entry) => entry.userId === currentUserId);
  const currentUserEntry = filteredLeaderboard[currentUserRank];

  return (
    <div className="w-full max-w-4xl mx-auto p-4 space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-pink-600 rounded-lg p-6 text-white">
        <h2 className="text-3xl font-bold mb-2">Achievement Leaderboard</h2>
        <p className="opacity-90">Top achievers competing for glory</p>
      </div>

      {/* Current User Card */}
      {currentUserEntry && (
        <div className="bg-gradient-to-r from-yellow-400 to-yellow-500 rounded-lg p-4 text-gray-900 font-bold">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="text-4xl">👤</div>
              <div>
                <div className="text-lg">Your Rank: #{currentUserRank + 1}</div>
                <div className="text-sm opacity-75">{currentUserEntry.badgesUnlocked} badges</div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-2xl">{currentUserEntry.totalXP.toLocaleString()} XP</div>
            </div>
          </div>
        </div>
      )}

      {/* Sort Controls */}
      <div className="flex gap-2">
        <button
          onClick={() => setSortBy("badges")}
          className={`px-4 py-2 rounded-lg font-semibold transition-all ${
            sortBy === "badges"
              ? "bg-blue-600 text-white shadow-lg"
              : "bg-gray-200 text-gray-700 hover:bg-gray-300"
          }`}
        >
          Sort by Badges
        </button>
        <button
          onClick={() => setSortBy("xp")}
          className={`px-4 py-2 rounded-lg font-semibold transition-all ${
            sortBy === "xp"
              ? "bg-blue-600 text-white shadow-lg"
              : "bg-gray-200 text-gray-700 hover:bg-gray-300"
          }`}
        >
          Sort by XP
        </button>
      </div>

      {/* Leaderboard Table */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-gray-100 border-b-2 border-gray-300">
              <th className="text-left py-3 px-4 font-bold text-gray-700">Rank</th>
              <th className="text-left py-3 px-4 font-bold text-gray-700">Player</th>
              <th className="text-center py-3 px-4 font-bold text-gray-700">🏆 Badges</th>
              <th className="text-right py-3 px-4 font-bold text-gray-700">⭐ XP</th>
            </tr>
          </thead>
          <tbody>
            {filteredLeaderboard.map((entry, index) => {
              const isCurrentUser = entry.userId === currentUserId;
              const medalEmoji = index === 0 ? "🥇" : index === 1 ? "🥈" : index === 2 ? "🥉" : "";

              return (
                <tr
                  key={entry.userId}
                  className={`border-b border-gray-200 transition-colors ${
                    isCurrentUser
                      ? "bg-yellow-50"
                      : index % 2 === 0
                        ? "bg-white hover:bg-gray-50"
                        : "bg-gray-50 hover:bg-gray-100"
                  }`}
                >
                  <td className="py-4 px-4 text-center font-bold text-lg">
                    {medalEmoji || `#${entry.rank}`}
                  </td>
                  <td className="py-4 px-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-purple-400 to-blue-500 rounded-full flex items-center justify-center text-white font-bold">
                        {entry.username.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="font-semibold text-gray-900">{entry.username}</div>
                        {isCurrentUser && (
                          <div className="text-xs text-yellow-600 font-bold">You</div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="py-4 px-4 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <span className="text-2xl">🎖️</span>
                      <span className="font-bold text-lg">{entry.badgesUnlocked}</span>
                    </div>
                  </td>
                  <td className="py-4 px-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <span className="font-bold text-lg text-blue-600">
                        {entry.totalXP.toLocaleString()}
                      </span>
                      <span className="text-xl">⭐</span>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Empty State */}
      {filteredLeaderboard.length === 0 && (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <div className="text-4xl mb-2">🏜️</div>
          <p className="text-lg font-semibold text-gray-700">No achievements yet</p>
          <p className="text-sm text-gray-500">Start playing trivia to climb the leaderboard!</p>
        </div>
      )}

      {/* Stats Footer */}
      {filteredLeaderboard.length > 0 && (
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-blue-100 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-blue-600">
              {Math.max(...filteredLeaderboard.map((e) => e.badgesUnlocked))}
            </div>
            <div className="text-sm text-blue-800">Max Badges</div>
          </div>
          <div className="bg-purple-100 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-purple-600">
              {(filteredLeaderboard.reduce((sum, e) => sum + e.badgesUnlocked, 0) / filteredLeaderboard.length).toFixed(1)}
            </div>
            <div className="text-sm text-purple-800">Avg Badges</div>
          </div>
          <div className="bg-pink-100 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-pink-600">
              {filteredLeaderboard.length}
            </div>
            <div className="text-sm text-pink-800">Players</div>
          </div>
        </div>
      )}
    </div>
  );
}
