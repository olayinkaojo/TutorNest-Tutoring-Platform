import React from "react";

export interface ActivePath {
  topicId: string;
  topic?: { name: string; icon: string; color: string };
  currentLevel: number;
  completedLevels: number[];
  timeToMastery: number;
  estimatedCompletionDate: string;
}

export interface LearningPathProgressProps {
  activePaths: ActivePath[];
  recommendedTopics?: any[];
  onPathClick: (topicId: string) => void;
  onRecommendedClick: (topicId: string) => void;
}

export default function LearningPathProgress({
  activePaths = [],
  recommendedTopics = [],
  onPathClick,
  onRecommendedClick,
}: LearningPathProgressProps) {
  const formatTime = (ms: number): string => {
    const hours = Math.floor(ms / 3600000);
    const minutes = Math.floor((ms % 3600000) / 60000);

    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  return (
    <div className="w-full max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-pink-600 rounded-lg p-6 text-white">
        <h2 className="text-3xl font-bold mb-2">Your Learning Dashboard</h2>
        <p className="opacity-90">Track your progress across all topics and continue learning</p>
      </div>

      {/* Active Paths */}
      {activePaths.length > 0 ? (
        <div className="space-y-4">
          <h3 className="text-2xl font-bold text-gray-900">Active Learning Paths</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {activePaths.map((path) => {
              const completion = (path.completedLevels.length / 4) * 100;
              const topicName = path.topic?.name || `Topic ${path.topicId}`;
              const topicIcon = path.topic?.icon || "📚";
              const topicColor = path.topic?.color || "#3b82f6";

              return (
                <div
                  key={path.topicId}
                  className="bg-white border-2 rounded-lg p-4 cursor-pointer transition-transform hover:scale-105 hover:shadow-lg"
                  style={{ borderColor: topicColor }}
                  onClick={() => onPathClick(path.topicId)}
                >
                  {/* Header */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="text-3xl">{topicIcon}</div>
                      <div>
                        <h4 className="font-bold text-gray-900">{topicName}</h4>
                        <p className="text-xs text-gray-500">Level {path.currentLevel}/4</p>
                      </div>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="mb-3">
                    <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${completion}%`,
                          backgroundColor: topicColor,
                        }}
                      />
                    </div>
                    <p className="text-xs text-gray-600 mt-1">{Math.round(completion)}% Complete</p>
                  </div>

                  {/* Completed Levels */}
                  <div className="flex gap-2 mb-3">
                    {[1, 2, 3, 4].map((level) => (
                      <div
                        key={level}
                        className={`w-full py-2 rounded text-center text-xs font-bold text-white transition-all ${
                          path.completedLevels.includes(level)
                            ? ""
                            : "bg-gray-200 text-gray-600"
                        }`}
                        style={{
                          backgroundColor: path.completedLevels.includes(level)
                            ? topicColor
                            : undefined,
                        }}
                      >
                        {path.completedLevels.includes(level) ? "✓" : level}
                      </div>
                    ))}
                  </div>

                  {/* Time to Mastery */}
                  <div className="bg-gray-50 rounded p-2 text-center">
                    <p className="text-xs text-gray-600">Time to Mastery</p>
                    <p className="text-sm font-bold text-gray-900">
                      {formatTime(path.timeToMastery)}
                    </p>
                  </div>

                  {/* CTA Button */}
                  <button
                    className="w-full mt-3 py-2 rounded font-semibold text-white transition-all text-sm"
                    style={{ backgroundColor: topicColor }}
                    onMouseDown={(e) => e.stopPropagation()}
                  >
                    Continue Learning
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-6 text-center">
          <p className="text-blue-900 font-semibold mb-2">No active learning paths</p>
          <p className="text-blue-700">Start a topic below to begin your learning journey!</p>
        </div>
      )}

      {/* Recommended Topics */}
      {recommendedTopics.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-2xl font-bold text-gray-900">Recommended for You</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {recommendedTopics.slice(0, 4).map((topic) => (
              <div
                key={topic.id}
                className="bg-white border border-gray-200 rounded-lg p-4 cursor-pointer transition-all hover:shadow-lg"
                onClick={() => onRecommendedClick(topic.id)}
              >
                <div className="flex items-center gap-3">
                  <div className="text-3xl">{topic.icon}</div>
                  <div className="flex-1">
                    <h4 className="font-bold text-gray-900">{topic.name}</h4>
                    <p className="text-xs text-gray-500">{topic.subject}</p>
                    <p className="text-xs text-gray-600 mt-1 line-clamp-2">{topic.description}</p>
                  </div>
                  <div className="text-2xl">→</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {activePaths.length === 0 && recommendedTopics.length === 0 && (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <div className="text-4xl mb-2">📚</div>
          <p className="text-lg font-semibold text-gray-700">No learning paths yet</p>
          <p className="text-sm text-gray-500">Explore topics to start your learning journey!</p>
        </div>
      )}
    </div>
  );
}
