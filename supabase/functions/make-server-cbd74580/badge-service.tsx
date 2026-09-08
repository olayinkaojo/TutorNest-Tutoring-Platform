import * as kv from "./kv_store.tsx";

export type BadgeRarity = "common" | "rare" | "epic" | "legendary";

export interface Badge {
  id: string;
  name: string;
  description: string;
  rarity: BadgeRarity;
  icon: string;
  requirement: string;
  tier: number;
  unlockCondition: (userStats: any) => boolean;
}

export const BADGE_DEFINITIONS: Record<string, Badge> = {
  // Tier 1: Onboarding (4 badges)
  "first-steps": {
    id: "first-steps",
    name: "First Steps",
    description: "Complete your first daily challenge",
    rarity: "common",
    icon: "🎯",
    requirement: "Complete 1 daily challenge",
    tier: 1,
    unlockCondition: (stats) => stats.dailyChallengesCompleted >= 1,
  },
  "speed-demon": {
    id: "speed-demon",
    name: "Speed Demon",
    description: "Answer a trivia question in under 5 seconds",
    rarity: "common",
    icon: "⚡",
    requirement: "Answer <5 seconds",
    tier: 1,
    unlockCondition: (stats) => stats.fastestAnswerTime < 5000,
  },
  "battle-ready": {
    id: "battle-ready",
    name: "Battle Ready",
    description: "Complete your first 1v1 battle",
    rarity: "common",
    icon: "⚔️",
    requirement: "Complete 1 battle",
    tier: 1,
    unlockCondition: (stats) => stats.battlesPlayed >= 1,
  },
  "friends-with-you": {
    id: "friends-with-you",
    name: "Friends with You",
    description: "Win a battle against a friend",
    rarity: "common",
    icon: "👥",
    requirement: "Win 1 friend battle",
    tier: 1,
    unlockCondition: (stats) => stats.friendBattleWins >= 1,
  },

  // Tier 2: Progression (5 badges)
  "on-fire": {
    id: "on-fire",
    name: "On Fire 🔥",
    description: "Maintain a 7-day streak",
    rarity: "rare",
    icon: "🔥",
    requirement: "7-day streak",
    tier: 2,
    unlockCondition: (stats) => stats.currentStreak >= 7,
  },
  "blazing": {
    id: "blazing",
    name: "Blazing 🔥🔥",
    description: "Maintain a 30-day streak",
    rarity: "rare",
    icon: "🌪️",
    requirement: "30-day streak",
    tier: 2,
    unlockCondition: (stats) => stats.currentStreak >= 30,
  },
  "unstoppable": {
    id: "unstoppable",
    name: "Unstoppable 🔥🔥🔥",
    description: "Maintain a 90-day streak",
    rarity: "epic",
    icon: "💥",
    requirement: "90-day streak",
    tier: 2,
    unlockCondition: (stats) => stats.currentStreak >= 90,
  },
  "time-master": {
    id: "time-master",
    name: "Time Master",
    description: "Maintain average answer time under 3 seconds",
    rarity: "rare",
    icon: "⏱️",
    requirement: "Avg <3 seconds",
    tier: 2,
    unlockCondition: (stats) => stats.averageAnswerTime < 3000,
  },
  "battle-champion": {
    id: "battle-champion",
    name: "Battle Champion",
    description: "Win 10 battles",
    rarity: "rare",
    icon: "🏆",
    requirement: "10 battle wins",
    tier: 2,
    unlockCondition: (stats) => stats.battleWins >= 10,
  },

  // Tier 3: Competitiveness (4 badges)
  "rising-star": {
    id: "rising-star",
    name: "Rising Star",
    description: "Rank in top 100 of global leaderboard",
    rarity: "rare",
    icon: "⭐",
    requirement: "Top 100 global",
    tier: 3,
    unlockCondition: (stats) => stats.globalRank <= 100,
  },
  "superstar": {
    id: "superstar",
    name: "Superstar",
    description: "Rank in top 50 of global leaderboard",
    rarity: "epic",
    icon: "✨",
    requirement: "Top 50 global",
    tier: 3,
    unlockCondition: (stats) => stats.globalRank <= 50,
  },
  "legend": {
    id: "legend",
    name: "Legend",
    description: "Rank in top 10 of global leaderboard",
    rarity: "epic",
    icon: "👑",
    requirement: "Top 10 global",
    tier: 3,
    unlockCondition: (stats) => stats.globalRank <= 10,
  },
  "invincible": {
    id: "invincible",
    name: "Invincible",
    description: "Achieve a 20-win battle streak",
    rarity: "legendary",
    icon: "🛡️",
    requirement: "20-win streak",
    tier: 3,
    unlockCondition: (stats) => stats.battleWinStreak >= 20,
  },

  // Tier 4: Mastery (4 badges)
  "collector": {
    id: "collector",
    name: "Collector",
    description: "Unlock 10 badges",
    rarity: "rare",
    icon: "🎖️",
    requirement: "10 badges",
    tier: 4,
    unlockCondition: (stats) => stats.badgesUnlocked >= 10,
  },
  "curator": {
    id: "curator",
    name: "Curator",
    description: "Unlock 15 badges",
    rarity: "epic",
    icon: "🎭",
    requirement: "15 badges",
    tier: 4,
    unlockCondition: (stats) => stats.badgesUnlocked >= 15,
  },
  "connoisseur": {
    id: "connoisseur",
    name: "Connoisseur",
    description: "Unlock all 20 badges",
    rarity: "legendary",
    icon: "🏅",
    requirement: "All 20 badges",
    tier: 4,
    unlockCondition: (stats) => stats.badgesUnlocked >= 20,
  },
  "perfect-game": {
    id: "perfect-game",
    name: "Perfect Game",
    description: "Achieve 100% accuracy in a Time Attack session",
    rarity: "legendary",
    icon: "💯",
    requirement: "100% accuracy",
    tier: 4,
    unlockCondition: (stats) => stats.perfectTimeAttackGames >= 1,
  },

  // Tier 5: Community (3 badges)
  "social-butterfly": {
    id: "social-butterfly",
    name: "Social Butterfly",
    description: "Invite 5 friends to battle",
    rarity: "rare",
    icon: "🦋",
    requirement: "Invite 5 friends",
    tier: 5,
    unlockCondition: (stats) => stats.friendsInvited >= 5,
  },
  "tournament-organizer": {
    id: "tournament-organizer",
    name: "Tournament Organizer",
    description: "Organize 50 battles",
    rarity: "epic",
    icon: "🎪",
    requirement: "50 battles organized",
    tier: 5,
    unlockCondition: (stats) => stats.battlesOrganized >= 50,
  },
  "hall-of-fame": {
    id: "hall-of-fame",
    name: "Hall of Fame",
    description: "Be recognized in achievements leaderboard",
    rarity: "legendary",
    icon: "🎬",
    requirement: "Top achievements",
    tier: 5,
    unlockCondition: (stats) => stats.isInAchievementsLeaderboard,
  },
};

export async function getUserBadges(userId: string): Promise<string[]> {
  try {
    const data = await kv.get(`user:${userId}:achievements`);
    return data?.achieved || [];
  } catch {
    return [];
  }
}

export async function addBadgeToUser(userId: string, badgeId: string): Promise<boolean> {
  try {
    const achievementKey = `user:${userId}:achievements`;
    const current = await kv.get(achievementKey);
    const achieved = current?.achieved || [];

    if (achieved.includes(badgeId)) return false;

    const updated = {
      achieved: [...achieved, badgeId],
      progress: current?.progress || {},
      unlockDates: {
        ...(current?.unlockDates || {}),
        [badgeId]: new Date().toISOString(),
      },
    };

    await kv.set(achievementKey, updated);
    return true;
  } catch {
    return false;
  }
}

export async function getBadgeStats(badgeId: string): Promise<any> {
  try {
    const data = await kv.get(`badge:${badgeId}:stats`);
    return data || { totalUnlocks: 0, userCount: 0, rarity: "unknown" };
  } catch {
    return { totalUnlocks: 0, userCount: 0, rarity: "unknown" };
  }
}

export async function updateBadgeStats(badgeId: string, stats: any): Promise<void> {
  try {
    await kv.set(`badge:${badgeId}:stats`, stats);
  } catch {
    // Silent fail
  }
}

export async function getBadgeRarity(badgeId: string): Promise<BadgeRarity> {
  const badge = BADGE_DEFINITIONS[badgeId];
  return badge?.rarity || "common";
}

export function calculateBadgeRarityPercentage(rarity: BadgeRarity, userCount: number): number {
  const rarityThresholds = {
    common: 0.5,
    rare: 0.25,
    epic: 0.1,
    legendary: 0.02,
  };
  return rarityThresholds[rarity] * 100;
}

export function getRarityColor(rarity: BadgeRarity): string {
  const colors = {
    common: "#06B6D4",
    rare: "#A855F7",
    epic: "#F97316",
    legendary: "#FBBF24",
  };
  return colors[rarity];
}
