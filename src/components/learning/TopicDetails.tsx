import React, { useState } from "react";

export interface TopicDetailsProps {
  topicName: string;
  topicIcon: string;
  description: string;
  subject: string;
  color: string;
  userStats?: {
    questionsAnswered: number;
    accuracy: number;
    avgTime: number;
    masteryScore: number;
    currentLevel: number;
  };
  achievements?: any[];
  leaderboard?: any[];
  onStart?: () => void;
}

export default function TopicDetails({
  topicName,
  topicIcon,
  description,
  subject,
  color,
  userStats,
  achievements = [],
  leaderboard = [],
  onStart,
}: TopicDetailsProps) {
  const [activeTab, setActiveTab] = useState<"overview" | "achievements" | "leaderboard">("overview");

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div
        className="bg-gradient-to-r rounded-lg p-8 text-white"
        style={{
          backgroundImage: `linear-gradient(135deg, ${color}, ${color}dd)`,
        }}
      >
        <div className="flex items-center gap-4 mb-4">
          <div className="text-6xl">{topicIcon}</div>
          <div>
            <p className="text-sm opacity-75">{subject}</p>
            <h1 className="text-4xl font-bold">{topicName}</h1>
          </div>
        </div>

        <p className="text-lg opacity-90 mb-6">{description}</p>

        {userStats && (
          <div className="grid grid-cols-4 gap-4">
            <div className="bg-white bg-opacity-20 rounded p-4 text-center">
              <div className="text-2xl font-bold">{userStats.questionsAnswered}</div>
              <div className="text-sm opacity-75">Questions</div>
            </div>
            <div className="bg-white bg-opacity-20 rounded p-4 text-center">
              <div className="text-2xl font-bold">{Math.round(userStats.accuracy * 100)}%</div>
              <div className="text-sm opacity-75">Accuracy</div>
            </div>
            <div className="bg-white bg-opacity-20 rounded p-4 text-center">
              <div className="text-2xl font-bold">{Math.round(userStats.avgTime / 1000)}s</div>
              <div className="text-sm opacity-75">Avg Time</div>
            </div>
            <div className="bg-white bg-opacity-20 rounded p-4 text-center">
              <div className="text-2xl font-bold">{Math.round(userStats.masteryScore)}</div>
              <div className="text-sm opacity-75">Mastery</div>
            </div>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 flex gap-4">
        {(["overview", "achievements", "leaderboard"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-3 font-semibold transition-all border-b-2 ${
              activeTab === tab
                ? "text-blue-600 border-blue-600"
                : "text-gray-600 border-transparent hover:text-gray-900"
            }`}
          >
            {tab === "overview" && "Overview"}
            {tab === "achievements" && "Achievements"}
            {tab === "leaderboard" && "Leaderboard"}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div>
        {/* Overview Tab */}
        {activeTab === "overview" && (
          <div className="space-y-6">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
              <h3 className="text-xl font-bold text-blue-900 mb-2">About This Topic</h3>
              <p className="text-blue-800">{description}</p>
            </div>

            {userStats && userStats.questionsAnswered > 0 && (
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white border border-gray-200 rounded-lg p-6">
                  <h4 className="font-bold text-gray-700 mb-4">Accuracy Trend</h4>
                  <div className="text-4xl font-bold text-blue-600 mb-2">
                    {Math.round(userStats.accuracy * 100)}%
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all`}
                      style={{
                        width: `${userStats.accuracy * 100}%`,
                        backgroundColor: color,
                      }}
                    />
                  </div>
                </div>

                <div className="bg-white border border-gray-200 rounded-lg p-6">
                  <h4 className="font-bold text-gray-700 mb-4">Speed Progress</h4>
                  <div className="text-4xl font-bold text-purple-600 mb-2">
                    {Math.round(userStats.avgTime / 1000)}s
                  </div>
                  <p className="text-sm text-gray-600">Average time per question</p>
                </div>
              </div>
            )}

            {onStart && (
              <button
                onClick={onStart}
                className="w-full py-4 rounded-lg font-bold text-white text-lg"
                style={{ backgroundColor: color }}
              >
                {userStats?.questionsAnswered ? "Continue Learning" : "Start Learning"}
              </button>
            )}
          </div>
        )}

        {/* Achievements Tab */}
        {activeTab === "achievements" && (
          <div className="space-y-4">
            {achievements.length > 0 ? (
              achievements.map((achievement) => (
                <div
                  key={achievement.id}
                  className={`border-2 rounded-lg p-4 ${
                    achievement.unlocked
                      ? "bg-green-50 border-green-500"
                      : "bg-gray-50 border-gray-300 opacity-60"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="text-3xl">{achievement.icon}</div>
                      <div>
                        <h4 className="font-bold">{achievement.name}</h4>
                        <p className="text-sm text-gray-600">{achievement.description}</p>
                      </div>
                    </div>
                    {achievement.unlocked && (
                      <div className="bg-green-500 text-white px-3 py-1 rounded-full text-sm font-bold">
                        ✓
                      </div>
                    )}
                    {achievement.close && (
                      <div className="bg-yellow-500 text-white px-3 py-1 rounded-full text-sm font-bold">
                        ⚡
                      </div>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-gray-500">
                <p>No achievements available for this topic yet</p>
              </div>
            )}
          </div>
        )}

        {/* Leaderboard Tab */}
        {activeTab === "leaderboard" && (
          <div className="overflow-x-auto">
            {leaderboard.length > 0 ? (
              <table className="w-full">
                <thead>
                  <tr className="border-b-2 border-gray-300">
                    <th className="text-left py-3 px-4 font-bold">Rank</th>
                    <th className="text-left py-3 px-4 font-bold">Player</th>
                    <th className="text-center py-3 px-4 font-bold">Mastery</th>
                  </tr>
                </thead>
                <tbody>
                  {leaderboard.map((entry, index) => (
                    <tr key={entry.userId} className="border-b border-gray-200 hover:bg-gray-50">
                      <td className="py-3 px-4 text-center font-bold">
                        {index === 0 ? "🥇" : index === 1 ? "🥈" : index === 2 ? "🥉" : `#${index + 1}`}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-semibold">{entry.username || `User ${index + 1}`}</div>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <div className="font-bold" style={{ color }}>
                          {Math.round(entry.masteryScore)}%
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <p>No leaderboard data available yet</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
