import React, { useState, useEffect } from "react";
import AchievementBadge from "./AchievementBadge";

export interface Achievement {
  id: string;
  name: string;
  description: string;
  rarity: "common" | "rare" | "epic" | "legendary";
  icon: string;
  unlocked: boolean;
  progress?: number;
}

export interface AchievementPanelProps {
  achievements: Achievement[];
  unlockedCount: number;
  totalCount: number;
}

type SortOption = "recent" | "rarest" | "name";
type FilterOption = "all" | "unlocked" | "locked" | "common" | "rare" | "epic" | "legendary";

export default function AchievementPanel({
  achievements = [],
  unlockedCount = 0,
  totalCount = 20,
}: AchievementPanelProps) {
  const [sortBy, setSortBy] = useState<SortOption>("recent");
  const [filterBy, setFilterBy] = useState<FilterOption>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedBadge, setSelectedBadge] = useState<Achievement | null>(null);

  const rarityOrder = { common: 0, rare: 1, epic: 2, legendary: 3 };

  const filtered = achievements.filter((badge) => {
    if (filterBy === "unlocked" && !badge.unlocked) return false;
    if (filterBy === "locked" && badge.unlocked) return false;
    if (
      ["common", "rare", "epic", "legendary"].includes(filterBy) &&
      badge.rarity !== filterBy
    )
      return false;
    if (searchQuery && !badge.name.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }
    return true;
  });

  const sorted = [...filtered].sort((a, b) => {
    switch (sortBy) {
      case "rarest":
        return rarityOrder[b.rarity] - rarityOrder[a.rarity];
      case "name":
        return a.name.localeCompare(b.name);
      default: // recent
        return b.unlocked ? 1 : -1;
    }
  });

  return (
    <div className="w-full max-w-6xl mx-auto p-4 space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg p-6 text-white">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-3xl font-bold">Achievements</h2>
          <div className="text-right">
            <div className="text-4xl font-bold">{unlockedCount}</div>
            <div className="text-sm opacity-90">of {totalCount} badges</div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-white bg-opacity-20 rounded-full h-3">
          <div
            className="bg-gradient-to-r from-green-400 to-blue-500 h-3 rounded-full transition-all duration-500"
            style={{ width: `${(unlockedCount / totalCount) * 100}%` }}
          />
        </div>
        <div className="text-sm mt-2 opacity-90">
          {Math.round((unlockedCount / totalCount) * 100)}% Complete
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-col gap-4 md:gap-0 md:flex-row md:items-center md:justify-between">
        {/* Search */}
        <div className="flex-1 md:mr-4">
          <input
            type="text"
            placeholder="Search badges..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* Sort */}
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as SortOption)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="recent">Sort: Recent</option>
          <option value="rarest">Sort: Rarest</option>
          <option value="name">Sort: Name</option>
        </select>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        {(["all", "unlocked", "locked", "common", "rare", "epic", "legendary"] as FilterOption[]).map(
          (filter) => (
            <button
              key={filter}
              onClick={() => setFilterBy(filter)}
              className={`px-4 py-2 rounded-full font-semibold text-sm transition-all ${
                filterBy === filter
                  ? "bg-blue-600 text-white shadow-lg scale-105"
                  : "bg-gray-200 text-gray-700 hover:bg-gray-300"
              }`}
            >
              {filter === "all" ? "All" : filter === "unlocked" ? "Unlocked" : filter === "locked" ? "Locked" : filter.charAt(0).toUpperCase() + filter.slice(1)}
            </button>
          )
        )}
      </div>

      {/* Badge Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6 p-4 bg-gray-50 rounded-lg">
        {sorted.length > 0 ? (
          sorted.map((badge) => (
            <div key={badge.id} className="flex justify-center">
              <AchievementBadge
                {...badge}
                onClick={() => setSelectedBadge(badge)}
              />
            </div>
          ))
        ) : (
          <div className="col-span-full text-center py-12 text-gray-500">
            <p className="text-lg font-semibold">No badges found</p>
            <p className="text-sm">Try adjusting your search or filters</p>
          </div>
        )}
      </div>

      {/* Rarity Breakdown */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {["common", "rare", "epic", "legendary"].map((rarity) => {
          const count = achievements.filter(
            (b) => b.rarity === rarity && b.unlocked
          ).length;
          const total = achievements.filter((b) => b.rarity === rarity).length;
          const colors = {
            common: "bg-cyan-100 text-cyan-900",
            rare: "bg-purple-100 text-purple-900",
            epic: "bg-orange-100 text-orange-900",
            legendary: "bg-yellow-100 text-yellow-900",
          };

          return (
            <div key={rarity} className={`${colors[rarity as keyof typeof colors]} p-4 rounded-lg`}>
              <div className="text-sm font-semibold capitalize">{rarity}</div>
              <div className="text-2xl font-bold">
                {count}/{total}
              </div>
            </div>
          );
        })}
      </div>

      {/* Selected Badge Detail Modal */}
      {selectedBadge && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-sm w-full p-6 space-y-4">
            <div className="flex justify-between items-start">
              <h3 className="text-2xl font-bold">{selectedBadge.name}</h3>
              <button
                onClick={() => setSelectedBadge(null)}
                className="text-gray-500 hover:text-gray-700 text-2xl"
              >
                ×
              </button>
            </div>

            <div className="text-6xl text-center">{selectedBadge.icon}</div>

            <p className="text-gray-600">{selectedBadge.description}</p>

            <div className="flex gap-4">
              <div className="flex-1">
                <div className="text-sm text-gray-500">Rarity</div>
                <div className="font-bold capitalize">{selectedBadge.rarity}</div>
              </div>
              <div className="flex-1">
                <div className="text-sm text-gray-500">Status</div>
                <div className="font-bold">{selectedBadge.unlocked ? "✓ Unlocked" : "🔒 Locked"}</div>
              </div>
            </div>

            {!selectedBadge.unlocked && selectedBadge.progress && (
              <div>
                <div className="text-sm text-gray-500 mb-2">Progress</div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all"
                    style={{ width: `${selectedBadge.progress}%` }}
                  />
                </div>
                <div className="text-sm text-gray-600 mt-1 text-right">
                  {Math.round(selectedBadge.progress)}%
                </div>
              </div>
            )}

            <button
              onClick={() => setSelectedBadge(null)}
              className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 font-semibold"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
