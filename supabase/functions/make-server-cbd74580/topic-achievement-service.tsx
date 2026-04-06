import * as kv from "./kv_store.tsx";
import { getUserBadges, addBadgeToUser } from "./badge-service.tsx";
import { getTopicProgress } from "./subject-progress-service.tsx";

export interface TopicAchievement {
  id: string;
  topicId: string;
  name: string;
  description: string;
  icon: string;
  unlockCondition: (topicProgress: any) => boolean;
}

export const TOPIC_ACHIEVEMENTS: Record<string, TopicAchievement> = {
  "subject-expert-reading": {
    id: "subject-expert-reading",
    topicId: "reading-comprehension",
    name: "Reading Expert",
    description: "Master Reading Comprehension (90%+ accuracy)",
    icon: "📚",
    unlockCondition: (progress) => progress && progress.accuracy >= 0.9 && progress.currentLevel >= 4,
  },
  "subject-expert-vocabulary": {
    id: "subject-expert-vocabulary",
    topicId: "vocabulary",
    name: "Vocabulary Master",
    description: "Master Vocabulary (90%+ accuracy)",
    icon: "🔤",
    unlockCondition: (progress) => progress && progress.accuracy >= 0.9 && progress.currentLevel >= 4,
  },
  "subject-expert-grammar": {
    id: "subject-expert-grammar",
    topicId: "grammar-writing",
    name: "Grammar Guru",
    description: "Master Grammar & Writing (90%+ accuracy)",
    icon: "✏️",
    unlockCondition: (progress) => progress && progress.accuracy >= 0.9 && progress.currentLevel >= 4,
  },
  "subject-expert-algebra": {
    id: "subject-expert-algebra",
    topicId: "algebra-fundamentals",
    name: "Algebra Expert",
    description: "Master Algebra Fundamentals (90%+ accuracy)",
    icon: "📐",
    unlockCondition: (progress) => progress && progress.accuracy >= 0.9 && progress.currentLevel >= 4,
  },
  "subject-expert-geometry": {
    id: "subject-expert-geometry",
    topicId: "geometry-shapes",
    name: "Geometry Master",
    description: "Master Geometry & Shapes (90%+ accuracy)",
    icon: "🔺",
    unlockCondition: (progress) => progress && progress.accuracy >= 0.9 && progress.currentLevel >= 4,
  },
  "subject-expert-statistics": {
    id: "subject-expert-statistics",
    topicId: "data-statistics",
    name: "Statistics Pro",
    description: "Master Data & Statistics (90%+ accuracy)",
    icon: "📊",
    unlockCondition: (progress) => progress && progress.accuracy >= 0.9 && progress.currentLevel >= 4,
  },
  "subject-expert-biology": {
    id: "subject-expert-biology",
    topicId: "biology",
    name: "Biology Expert",
    description: "Master Biology (90%+ accuracy)",
    icon: "🧬",
    unlockCondition: (progress) => progress && progress.accuracy >= 0.9 && progress.currentLevel >= 4,
  },
  "subject-expert-chemistry": {
    id: "subject-expert-chemistry",
    topicId: "chemistry",
    name: "Chemistry Master",
    description: "Master Chemistry (90%+ accuracy)",
    icon: "⚗️",
    unlockCondition: (progress) => progress && progress.accuracy >= 0.9 && progress.currentLevel >= 4,
  },
  "subject-expert-physics": {
    id: "subject-expert-physics",
    topicId: "physics",
    name: "Physics Expert",
    description: "Master Physics (90%+ accuracy)",
    icon: "⚛️",
    unlockCondition: (progress) => progress && progress.accuracy >= 0.9 && progress.currentLevel >= 4,
  },
  "speedster-reading": {
    id: "speedster-reading",
    topicId: "reading-comprehension",
    name: "Speed Reader",
    description: "Answer Reading questions averaging <5 sec",
    icon: "⚡",
    unlockCondition: (progress) => {
      const avgTime = progress.questionsAnswered > 0 ? progress.totalTime / progress.questionsAnswered : 0;
      return avgTime < 5000 && progress.questionsAnswered >= 20;
    },
  },
  "completionist-reading": {
    id: "completionist-reading",
    topicId: "reading-comprehension",
    name: "Reading Completionist",
    description: "Complete all Reading Comprehension levels",
    icon: "✅",
    unlockCondition: (progress) => {
      const levelProgress = progress.levelProgress || {};
      return Object.values(levelProgress).every((lp: any) => lp?.completed);
    },
  },
};

export async function checkTopicAchievements(userId: string, topicId: string): Promise<string[]> {
  try {
    const progress = await getTopicProgress(userId, topicId);
    if (!progress) return [];

    const currentBadges = await getUserBadges(userId);
    const newAchievements: string[] = [];

    // Check all topic achievements
    for (const [achievementId, achievement] of Object.entries(TOPIC_ACHIEVEMENTS)) {
      if (
        achievement.topicId === topicId &&
        !currentBadges.includes(achievementId) &&
        achievement.unlockCondition(progress)
      ) {
        const added = await addBadgeToUser(userId, achievementId);
        if (added) {
          newAchievements.push(achievementId);
        }
      }
    }

    return newAchievements;
  } catch {
    return [];
  }
}

export async function getTopicAchievementProgress(userId: string, topicId: string): Promise<any[]> {
  try {
    const progress = await getTopicProgress(userId, topicId);
    const currentBadges = await getUserBadges(userId);

    const achievements = Object.values(TOPIC_ACHIEVEMENTS)
      .filter((a) => a.topicId === topicId)
      .map((achievement) => {
        const isUnlocked = currentBadges.includes(achievement.id);
        const isClose = progress && achievement.unlockCondition(progress);

        return {
          id: achievement.id,
          name: achievement.name,
          description: achievement.description,
          icon: achievement.icon,
          unlocked: isUnlocked,
          close: isClose && !isUnlocked,
        };
      });

    return achievements;
  } catch {
    return [];
  }
}

export async function awardTopicAchievement(userId: string, achievementId: string): Promise<boolean> {
  try {
    return await addBadgeToUser(userId, achievementId);
  } catch {
    return false;
  }
}

export async function getSubjectExpertise(userId: string): Promise<Record<string, number>> {
  try {
    const allBadges = await getUserBadges(userId);
    const expertiseMap: Record<string, number> = {};

    // Count subject expert badges
    for (const badge of allBadges) {
      if (badge.includes("subject-expert-")) {
        const topic = badge.replace("subject-expert-", "");
        expertiseMap[topic] = (expertiseMap[topic] || 0) + 1;
      }
    }

    return expertiseMap;
  } catch {
    return {};
  }
}
