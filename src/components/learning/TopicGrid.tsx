import React, { useState } from "react";

export interface TopicItem {
  id: string;
  name: string;
  subject: string;
  description: string;
  icon: string;
  color: string;
  userMasteryPercentage?: number;
}

export interface TopicGridProps {
  topics: TopicItem[];
  onTopicClick: (topicId: string) => void;
  loading?: boolean;
}

function getMasteryColor(mastery: number): string {
  if (mastery >= 75) return "#10b981"; // Green
  if (mastery >= 50) return "#eab308"; // Yellow
  if (mastery >= 25) return "#f97316"; // Orange
  return "#ef4444"; // Red
}

function getMasteryStatus(mastery: number): string {
  if (mastery >= 75) return "Mastered ✅";
  if (mastery >= 50) return "Progressing 📈";
  if (mastery >= 25) return "Learning 📚";
  return "Start Now 🆘";
}

export default function TopicGrid({
  topics = [],
  onTopicClick,
  loading = false,
}: TopicGridProps) {
  const [hoveredTopic, setHoveredTopic] = useState<string | null>(null);

  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="bg-gray-200 rounded-lg h-32 animate-pulse" />
        ))}
      </div>
    );
  }

  // Sort topics: recommended first, then by subject
  const sorted = [...topics].sort((a, b) => {
    const masteryA = a.userMasteryPercentage || 0;
    const masteryB = b.userMasteryPercentage || 0;
    
    // Not started topics first (0% mastery)
    if (masteryA === 0 && masteryB !== 0) return -1;
    if (masteryA !== 0 && masteryB === 0) return 1;
    if (masteryA === 0 && masteryB === 0) {
      return a.subject.localeCompare(b.subject);
    }
    
    // Then by progress
    return masteryB - masteryA;
  });

  return (
    <div className="w-full space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg p-6 text-white">
        <h2 className="text-3xl font-bold mb-2">Learning Topics</h2>
        <p className="opacity-90">Organize your learning by subject and master each topic step by step</p>
        <div className="mt-4 text-sm opacity-75">
          {sorted.length} topics available • Master all to become an expert
        </div>
      </div>

      {/* Topic Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {sorted.map((topic) => {
          const mastery = topic.userMasteryPercentage || 0;
          const masteryColor = getMasteryColor(mastery);
          const masteryStatus = getMasteryStatus(mastery);
          const isHovered = hoveredTopic === topic.id;

          return (
            <div
              key={topic.id}
              className={`bg-white rounded-lg shadow-lg border-2 transition-all transform ${
                isHovered ? "scale-105 shadow-xl" : ""
              }`}
              style={{
                borderColor: topic.color,
                cursor: "pointer",
              }}
              onMouseEnter={() => setHoveredTopic(topic.id)}
              onMouseLeave={() => setHoveredTopic(null)}
              onClick={() => onTopicClick(topic.id)}
            >
              <div className="p-4 space-y-4">
                {/* Header */}
                <div className="flex items-start justify-between">
                  <div className="text-4xl">{topic.icon}</div>
                  <div
                    className="px-3 py-1 rounded-full text-white text-xs font-bold"
                    style={{ backgroundColor: masteryColor }}
                  >
                    {Math.round(mastery)}%
                  </div>
                </div>

                {/* Title & Subject */}
                <div>
                  <h3 className="text-lg font-bold text-gray-900">{topic.name}</h3>
                  <p className="text-xs text-gray-500">{topic.subject}</p>
                </div>

                {/* Description */}
                <p className="text-sm text-gray-600 line-clamp-2">{topic.description}</p>

                {/* Progress Bar */}
                <div className="space-y-2">
                  <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${mastery}%`,
                        backgroundColor: topic.color,
                      }}
                    />
                  </div>
                  <div className="text-xs text-gray-600">{masteryStatus}</div>
                </div>

                {/* CTA Button */}
                <button
                  className="w-full py-2 px-4 rounded-lg font-semibold text-white transition-all"
                  style={{
                    backgroundColor: topic.color,
                  }}
                  onMouseDown={(e) => e.stopPropagation()}
                >
                  {mastery === 0 ? "Start Learning" : mastery >= 100 ? "Review" : "Continue"}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Empty State */}
      {sorted.length === 0 && (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <div className="text-4xl mb-2">📚</div>
          <p className="text-lg font-semibold text-gray-700">No topics available</p>
          <p className="text-sm text-gray-500">Check back soon for more learning paths!</p>
        </div>
      )}
    </div>
  );
}
