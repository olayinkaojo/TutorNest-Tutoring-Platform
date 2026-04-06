import React from "react";

export interface SubjectLeaderboardEntry {
  rank: number;
  username: string;
  masteryScore: number;
  accuracy?: number;
  questionsAnswered?: number;
}

export interface SubjectLeaderboardProps {
  topicName: string;
  topicColor: string;
  leaderboard: SubjectLeaderboardEntry[];
  sortBy?: "mastery" | "accuracy" | "speed";
  onSortChange?: (sort: "mastery" | "accuracy" | "speed") => void;
  currentUserRank?: number;
  currentUserStats?: { mastery: number; accuracy: number; speed: number };
}

export default function SubjectLeaderboard({
  topicName,
  topicColor,
  leaderboard = [],
  sortBy = "mastery",
  onSortChange,
  currentUserRank,
  currentUserStats,
}: SubjectLeaderboardProps) {
  const getMedalEmoji = (rank: number): string => {
    if (rank === 1) return "🥇";
    if (rank === 2) return "🥈";
    if (rank === 3) return "🥉";
    return "";
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div
        className="rounded-lg p-6 text-white"
        style={{
          backgroundImage: `linear-gradient(135deg, ${topicColor}, ${topicColor}dd)`,
        }}
      >
        <h2 className="text-3xl font-bold mb-2">{topicName} Leaderboard</h2>
        <p className="opacity-90">See how you stack up against other learners</p>
      </div>

      {/* Current User Card */}
      {currentUserRank && currentUserStats && (
        <div
          className="rounded-lg p-4 text-white font-bold"
          style={{ backgroundColor: topicColor }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="text-3xl">👤</div>
              <div>
                <div className="text-lg">Your Rank: #{currentUserRank}</div>
                <div className="text-sm opacity-75">
                  {Math.round(currentUserStats.mastery)}% Mastery • {Math.round(currentUserStats.accuracy)}% Accuracy
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Sort Controls */}
      <div className="flex gap-2">
        {(["mastery", "accuracy", "speed"] as const).map((sort) => (
          <button
            key={sort}
            onClick={() => onSortChange?.(sort)}
            className={`px-4 py-2 rounded-lg font-semibold transition-all ${
              sortBy === sort
                ? "text-white shadow-lg"
                : "bg-gray-200 text-gray-700 hover:bg-gray-300"
            }`}
            style={{
              backgroundColor: sortBy === sort ? topicColor : undefined,
            }}
          >
            {sort === "mastery" && "By Mastery"}
            {sort === "accuracy" && "By Accuracy"}
            {sort === "speed" && "By Speed"}
          </button>
        ))}
      </div>

      {/* Leaderboard Table */}
      <div className="overflow-x-auto">
        {leaderboard.length > 0 ? (
          <table className="w-full border-collapse">
            <thead>
              <tr
                className="text-white"
                style={{ backgroundColor: topicColor }}
              >
                <th className="text-left py-4 px-4 font-bold">Rank</th>
                <th className="text-left py-4 px-4 font-bold">Player</th>
                <th className="text-center py-4 px-4 font-bold">🎯 Mastery</th>
                {sortBy === "accuracy" && (
                  <th className="text-center py-4 px-4 font-bold">📊 Accuracy</th>
                )}
                {sortBy === "speed" && (
                  <th className="text-center py-4 px-4 font-bold">⚡ Speed</th>
                )}
              </tr>
            </thead>
            <tbody>
              {leaderboard.map((entry, index) => {
                const isCurrentUser = currentUserRank === entry.rank;

                return (
                  <tr
                    key={entry.rank}
                    className={`border-b border-gray-200 transition-colors ${
                      isCurrentUser
                        ? `bg-yellow-50`
                        : index % 2 === 0
                          ? "bg-white hover:bg-gray-50"
                          : "bg-gray-50 hover:bg-gray-100"
                    }`}
                  >
                    <td className="py-4 px-4 text-center font-bold text-lg">
                      {getMedalEmoji(entry.rank) || `#${entry.rank}`}
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold"
                          style={{ backgroundColor: topicColor }}
                        >
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
                        <span
                          className="font-bold text-lg"
                          style={{ color: topicColor }}
                        >
                          {Math.round(entry.masteryScore)}%
                        </span>
                      </div>
                    </td>
                    {sortBy === "accuracy" && entry.accuracy !== undefined && (
                      <td className="py-4 px-4 text-center">
                        <span className="font-bold text-blue-600">
                          {Math.round(entry.accuracy * 100)}%
                        </span>
                      </td>
                    )}
                    {sortBy === "speed" && (
                      <td className="py-4 px-4 text-center">
                        <span className="font-bold text-purple-600">
                          ~{Math.round(entry.questionsAnswered || 0) > 0 ? 10 : 0}s
                        </span>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          <div className="text-center py-12 bg-gray-50 rounded-lg">
            <div className="text-4xl mb-2">🏜️</div>
            <p className="text-lg font-semibold text-gray-700">No leaderboard data yet</p>
            <p className="text-sm text-gray-500">Be the first to master this topic!</p>
          </div>
        )}
      </div>

      {/* Stats Footer */}
      {leaderboard.length > 0 && (
        <div className="grid grid-cols-3 gap-4">
          <div
            className="rounded-lg p-4 text-center text-white"
            style={{ backgroundColor: topicColor }}
          >
            <div className="text-2xl font-bold">
              {Math.max(...leaderboard.map((e) => e.masteryScore))}%
            </div>
            <div className="text-sm opacity-75">Max Mastery</div>
          </div>
          <div
            className="rounded-lg p-4 text-center text-white"
            style={{ backgroundColor: topicColor, opacity: 0.7 }}
          >
            <div className="text-2xl font-bold">
              {Math.round(
                leaderboard.reduce((sum, e) => sum + e.masteryScore, 0) / leaderboard.length
              )}%
            </div>
            <div className="text-sm opacity-75">Avg Mastery</div>
          </div>
          <div
            className="rounded-lg p-4 text-center text-white"
            style={{ backgroundColor: topicColor, opacity: 0.5 }}
          >
            <div className="text-2xl font-bold">{leaderboard.length}</div>
            <div className="text-sm opacity-75">Players</div>
          </div>
        </div>
      )}
    </div>
  );
}
