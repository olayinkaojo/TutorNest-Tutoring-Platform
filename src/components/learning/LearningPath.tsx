import React from "react";

export interface LevelData {
  level: number;
  name: string;
  difficulty: number;
  questions: number;
  minAccuracy: number;
  avgTimePerQuestion: number;
}

export interface LearningPathProps {
  topicName: string;
  topicIcon: string;
  currentLevel: number;
  levels: LevelData[];
  levelProgress?: Record<number, { completed: boolean; accuracy: number | null; time: number }>;
  masteryScore?: number;
  onStartLevel: (level: number) => void;
}

const levelColors = {
  1: "from-green-400 to-green-600",
  2: "from-blue-400 to-blue-600",
  3: "from-purple-400 to-purple-600",
  4: "from-yellow-400 to-yellow-600",
};

const levelBorders = {
  1: "border-green-500",
  2: "border-blue-500",
  3: "border-purple-500",
  4: "border-yellow-500",
};

export default function LearningPath({
  topicName,
  topicIcon,
  currentLevel,
  levels,
  levelProgress = {},
  masteryScore = 0,
  onStartLevel,
}: LearningPathProps) {
  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg p-6 text-white">
        <div className="flex items-center gap-4 mb-4">
          <div className="text-5xl">{topicIcon}</div>
          <div>
            <h2 className="text-3xl font-bold">{topicName}</h2>
            <p className="opacity-90">Learning Path</p>
          </div>
        </div>

        {/* Mastery Score */}
        <div className="grid grid-cols-2 gap-4 mt-4">
          <div>
            <div className="text-3xl font-bold">{Math.round(masteryScore)}</div>
            <div className="text-sm opacity-75">Mastery Score</div>
          </div>
          <div>
            <div className="text-3xl font-bold">{currentLevel}/4</div>
            <div className="text-sm opacity-75">Current Level</div>
          </div>
        </div>
      </div>

      {/* Progress Path */}
      <div className="space-y-4">
        {levels.map((level, index) => {
          const isCompleted = levelProgress[level.level]?.completed || false;
          const isCurrent = currentLevel === level.level;
          const isLocked = currentLevel < level.level;
          const accuracy = levelProgress[level.level]?.accuracy;

          return (
            <div key={level.level} className="relative">
              {/* Connection Line */}
              {index < levels.length - 1 && (
                <div
                  className={`absolute left-8 top-20 w-0.5 h-12 ${
                    isCompleted ? "bg-green-500" : "bg-gray-300"
                  }`}
                />
              )}

              {/* Level Card */}
              <div
                className={`relative bg-white rounded-lg border-2 p-6 transition-all ${
                  isCurrent
                    ? `${levelBorders[level.level as keyof typeof levelBorders]} shadow-lg ring-2 ring-offset-2`
                    : isCompleted
                      ? `border-green-500 opacity-75`
                      : isLocked
                        ? `border-gray-300 opacity-50`
                        : levelBorders[level.level as keyof typeof levelBorders]
                }`}
                style={{
                  borderColor: isCompleted ? "#10b981" : isLocked ? "#d1d5db" : undefined,
                }}
              >
                <div className="flex items-start justify-between mb-4">
                  {/* Level Info */}
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <div
                        className={`text-3xl font-bold text-white w-12 h-12 rounded-full flex items-center justify-center bg-gradient-to-br ${
                          levelColors[level.level as keyof typeof levelColors]
                        }`}
                      >
                        {level.level}
                      </div>
                      <div>
                        <h3 className="text-lg font-bold">{level.name}</h3>
                        <p className="text-sm text-gray-500">
                          Difficulty: {Array(level.difficulty).fill("⭐").join("")}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Status Badge */}
                  {isCompleted && (
                    <div className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-bold">
                      ✓ Completed
                    </div>
                  )}
                  {isCurrent && (
                    <div className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-bold animate-pulse">
                      Current
                    </div>
                  )}
                  {isLocked && (
                    <div className="bg-gray-100 text-gray-800 px-3 py-1 rounded-full text-sm font-bold">
                      🔒 Locked
                    </div>
                  )}
                </div>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-4 mb-4">
                  <div className="bg-gray-50 rounded p-3 text-center">
                    <div className="text-sm text-gray-600">Questions</div>
                    <div className="text-2xl font-bold text-gray-900">{level.questions}</div>
                  </div>
                  <div className="bg-gray-50 rounded p-3 text-center">
                    <div className="text-sm text-gray-600">Min Accuracy</div>
                    <div className="text-2xl font-bold text-gray-900">{level.minAccuracy}%</div>
                  </div>
                  <div className="bg-gray-50 rounded p-3 text-center">
                    <div className="text-sm text-gray-600">Avg Time</div>
                    <div className="text-2xl font-bold text-gray-900">
                      {Math.round(level.avgTimePerQuestion / 1000)}s
                    </div>
                  </div>
                </div>

                {/* Progress Bar (if in progress or completed) */}
                {(isCompleted || isCurrent) && accuracy !== null && (
                  <div className="mb-4">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-semibold">Accuracy</span>
                      <span className="text-sm font-bold">{Math.round(accuracy * 100)}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                      <div
                        className={`h-full bg-gradient-to-r ${
                          levelColors[level.level as keyof typeof levelColors]
                        } rounded-full transition-all`}
                        style={{ width: `${accuracy * 100}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* CTA Button */}
                {!isLocked && (
                  <button
                    onClick={() => onStartLevel(level.level)}
                    className={`w-full py-3 rounded-lg font-semibold transition-all ${
                      isCurrent || !isCompleted
                        ? `text-white bg-gradient-to-r ${
                            levelColors[level.level as keyof typeof levelColors]
                          } hover:shadow-lg`
                        : "text-gray-600 bg-gray-100 hover:bg-gray-200"
                    }`}
                  >
                    {isCompleted ? "Review Level" : isCurrent ? "Continue" : "Start Level"}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Completion Message */}
      {currentLevel > 4 && (
        <div className="bg-green-50 border-2 border-green-500 rounded-lg p-6 text-center">
          <div className="text-5xl mb-2">🎉</div>
          <h3 className="text-2xl font-bold text-green-900 mb-2">Topic Mastered!</h3>
          <p className="text-green-700">Congratulations! You've completed all levels in this topic.</p>
        </div>
      )}
    </div>
  );
}
