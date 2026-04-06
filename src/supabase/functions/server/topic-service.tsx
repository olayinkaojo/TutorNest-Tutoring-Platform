import { kv } from "https://deno.land/x/deno_kv_oauthv2@v0.0.2/mod.ts";

export type Difficulty = "beginner" | "intermediate" | "advanced" | "expert";

export interface TopicLevel {
  level: number;
  name: string;
  difficulty: number;
  questions: number;
  minAccuracy: number;
  avgTimePerQuestion: number; // milliseconds
}

export interface Topic {
  id: string;
  name: string;
  subject: string;
  description: string;
  icon: string;
  color: string;
  prerequisites: string[];
  levels: TopicLevel[];
}

export const TOPICS: Record<string, Topic> = {
  // Language Arts
  "reading-comprehension": {
    id: "reading-comprehension",
    name: "Reading Comprehension",
    subject: "Language Arts",
    description: "Master reading skills and text understanding",
    icon: "📖",
    color: "#ec4899",
    prerequisites: [],
    levels: [
      { level: 1, name: "Beginner", difficulty: 1, questions: 10, minAccuracy: 60, avgTimePerQuestion: 30000 },
      { level: 2, name: "Intermediate", difficulty: 2, questions: 12, minAccuracy: 70, avgTimePerQuestion: 25000 },
      { level: 3, name: "Advanced", difficulty: 3, questions: 15, minAccuracy: 80, avgTimePerQuestion: 20000 },
      { level: 4, name: "Expert", difficulty: 4, questions: 20, minAccuracy: 90, avgTimePerQuestion: 15000 },
    ],
  },
  vocabulary: {
    id: "vocabulary",
    name: "Vocabulary",
    subject: "Language Arts",
    description: "Expand your word knowledge and language skills",
    icon: "💬",
    color: "#f97316",
    prerequisites: [],
    levels: [
      { level: 1, name: "Beginner", difficulty: 1, questions: 15, minAccuracy: 60, avgTimePerQuestion: 25000 },
      { level: 2, name: "Intermediate", difficulty: 2, questions: 18, minAccuracy: 70, avgTimePerQuestion: 20000 },
      { level: 3, name: "Advanced", difficulty: 3, questions: 20, minAccuracy: 80, avgTimePerQuestion: 18000 },
      { level: 4, name: "Expert", difficulty: 4, questions: 25, minAccuracy: 90, avgTimePerQuestion: 15000 },
    ],
  },
  "grammar-writing": {
    id: "grammar-writing",
    name: "Grammar & Writing",
    subject: "Language Arts",
    description: "Perfect your grammar and writing techniques",
    icon: "✍️",
    color: "#06b6d4",
    prerequisites: ["vocabulary"],
    levels: [
      { level: 1, name: "Beginner", difficulty: 1, questions: 12, minAccuracy: 60, avgTimePerQuestion: 28000 },
      { level: 2, name: "Intermediate", difficulty: 2, questions: 14, minAccuracy: 70, avgTimePerQuestion: 24000 },
      { level: 3, name: "Advanced", difficulty: 3, questions: 16, minAccuracy: 80, avgTimePerQuestion: 20000 },
      { level: 4, name: "Expert", difficulty: 4, questions: 20, minAccuracy: 90, avgTimePerQuestion: 16000 },
    ],
  },

  // Mathematics
  "algebra-fundamentals": {
    id: "algebra-fundamentals",
    name: "Algebra Fundamentals",
    subject: "Mathematics",
    description: "Master basic algebra concepts and equations",
    icon: "📐",
    color: "#3b82f6",
    prerequisites: [],
    levels: [
      { level: 1, name: "Beginner", difficulty: 1, questions: 10, minAccuracy: 60, avgTimePerQuestion: 30000 },
      { level: 2, name: "Intermediate", difficulty: 2, questions: 12, minAccuracy: 70, avgTimePerQuestion: 25000 },
      { level: 3, name: "Advanced", difficulty: 3, questions: 15, minAccuracy: 80, avgTimePerQuestion: 20000 },
      { level: 4, name: "Expert", difficulty: 4, questions: 20, minAccuracy: 90, avgTimePerQuestion: 15000 },
    ],
  },
  "geometry-shapes": {
    id: "geometry-shapes",
    name: "Geometry & Shapes",
    subject: "Mathematics",
    description: "Explore geometric concepts and spatial reasoning",
    icon: "🔺",
    color: "#8b5cf6",
    prerequisites: [],
    levels: [
      { level: 1, name: "Beginner", difficulty: 1, questions: 10, minAccuracy: 60, avgTimePerQuestion: 32000 },
      { level: 2, name: "Intermediate", difficulty: 2, questions: 12, minAccuracy: 70, avgTimePerQuestion: 27000 },
      { level: 3, name: "Advanced", difficulty: 3, questions: 15, minAccuracy: 80, avgTimePerQuestion: 22000 },
      { level: 4, name: "Expert", difficulty: 4, questions: 20, minAccuracy: 90, avgTimePerQuestion: 17000 },
    ],
  },
  "data-statistics": {
    id: "data-statistics",
    name: "Data & Statistics",
    subject: "Mathematics",
    description: "Understand data analysis and statistical concepts",
    icon: "📊",
    color: "#10b981",
    prerequisites: [],
    levels: [
      { level: 1, name: "Beginner", difficulty: 1, questions: 10, minAccuracy: 60, avgTimePerQuestion: 28000 },
      { level: 2, name: "Intermediate", difficulty: 2, questions: 12, minAccuracy: 70, avgTimePerQuestion: 24000 },
      { level: 3, name: "Advanced", difficulty: 3, questions: 15, minAccuracy: 80, avgTimePerQuestion: 20000 },
      { level: 4, name: "Expert", difficulty: 4, questions: 20, minAccuracy: 90, avgTimePerQuestion: 16000 },
    ],
  },

  // Science
  biology: {
    id: "biology",
    name: "Biology",
    subject: "Science",
    description: "Explore living organisms and biological systems",
    icon: "🧬",
    color: "#06b6d4",
    prerequisites: [],
    levels: [
      { level: 1, name: "Beginner", difficulty: 1, questions: 10, minAccuracy: 60, avgTimePerQuestion: 30000 },
      { level: 2, name: "Intermediate", difficulty: 2, questions: 12, minAccuracy: 70, avgTimePerQuestion: 25000 },
      { level: 3, name: "Advanced", difficulty: 3, questions: 15, minAccuracy: 80, avgTimePerQuestion: 20000 },
      { level: 4, name: "Expert", difficulty: 4, questions: 20, minAccuracy: 90, avgTimePerQuestion: 15000 },
    ],
  },
  chemistry: {
    id: "chemistry",
    name: "Chemistry",
    subject: "Science",
    description: "Understand chemical reactions and elements",
    icon: "⚗️",
    color: "#f59e0b",
    prerequisites: [],
    levels: [
      { level: 1, name: "Beginner", difficulty: 1, questions: 10, minAccuracy: 60, avgTimePerQuestion: 32000 },
      { level: 2, name: "Intermediate", difficulty: 2, questions: 12, minAccuracy: 70, avgTimePerQuestion: 27000 },
      { level: 3, name: "Advanced", difficulty: 3, questions: 15, minAccuracy: 80, avgTimePerQuestion: 22000 },
      { level: 4, name: "Expert", difficulty: 4, questions: 20, minAccuracy: 90, avgTimePerQuestion: 17000 },
    ],
  },
  physics: {
    id: "physics",
    name: "Physics",
    subject: "Science",
    description: "Master forces, motion, and energy concepts",
    icon: "⚛️",
    color: "#ef4444",
    prerequisites: [],
    levels: [
      { level: 1, name: "Beginner", difficulty: 1, questions: 10, minAccuracy: 60, avgTimePerQuestion: 32000 },
      { level: 2, name: "Intermediate", difficulty: 2, questions: 12, minAccuracy: 70, avgTimePerQuestion: 27000 },
      { level: 3, name: "Advanced", difficulty: 3, questions: 15, minAccuracy: 80, avgTimePerQuestion: 22000 },
      { level: 4, name: "Expert", difficulty: 4, questions: 20, minAccuracy: 90, avgTimePerQuestion: 17000 },
    ],
  },

  // General Knowledge
  "world-history": {
    id: "world-history",
    name: "World History",
    subject: "General Knowledge",
    description: "Explore major historical events and civilizations",
    icon: "🏛️",
    color: "#8b5cf6",
    prerequisites: [],
    levels: [
      { level: 1, name: "Beginner", difficulty: 1, questions: 12, minAccuracy: 60, avgTimePerQuestion: 25000 },
      { level: 2, name: "Intermediate", difficulty: 2, questions: 14, minAccuracy: 70, avgTimePerQuestion: 22000 },
      { level: 3, name: "Advanced", difficulty: 3, questions: 16, minAccuracy: 80, avgTimePerQuestion: 18000 },
      { level: 4, name: "Expert", difficulty: 4, questions: 20, minAccuracy: 90, avgTimePerQuestion: 14000 },
    ],
  },
  geography: {
    id: "geography",
    name: "Geography",
    subject: "General Knowledge",
    description: "Discover countries, capitals, and geographical features",
    icon: "🌍",
    color: "#14b8a6",
    prerequisites: [],
    levels: [
      { level: 1, name: "Beginner", difficulty: 1, questions: 12, minAccuracy: 60, avgTimePerQuestion: 24000 },
      { level: 2, name: "Intermediate", difficulty: 2, questions: 14, minAccuracy: 70, avgTimePerQuestion: 21000 },
      { level: 3, name: "Advanced", difficulty: 3, questions: 16, minAccuracy: 80, avgTimePerQuestion: 18000 },
      { level: 4, name: "Expert", difficulty: 4, questions: 20, minAccuracy: 90, avgTimePerQuestion: 14000 },
    ],
  },

  // Social Studies
  civics: {
    id: "civics",
    name: "Civics",
    subject: "Social Studies",
    description: "Understand government, rights, and citizenship",
    icon: "🏢",
    color: "#ec4899",
    prerequisites: [],
    levels: [
      { level: 1, name: "Beginner", difficulty: 1, questions: 10, minAccuracy: 60, avgTimePerQuestion: 26000 },
      { level: 2, name: "Intermediate", difficulty: 2, questions: 12, minAccuracy: 70, avgTimePerQuestion: 23000 },
      { level: 3, name: "Advanced", difficulty: 3, questions: 15, minAccuracy: 80, avgTimePerQuestion: 19000 },
      { level: 4, name: "Expert", difficulty: 4, questions: 20, minAccuracy: 90, avgTimePerQuestion: 15000 },
    ],
  },
};

export async function getTopic(topicId: string): Promise<Topic | null> {
  try {
    const topic = TOPICS[topicId];
    return topic || null;
  } catch {
    return null;
  }
}

export async function getAllTopics(): Promise<Topic[]> {
  return Object.values(TOPICS);
}

export async function getTopicsBySubject(subject: string): Promise<Topic[]> {
  return Object.values(TOPICS).filter((topic) => topic.subject === subject);
}

export async function getTopicMastery(userId: string, topicId: string): Promise<number> {
  try {
    const key = [`user:${userId}:topic:${topicId}:progress`];
    const data = await kv.get(key);
    return data?.value?.masteryScore || 0;
  } catch {
    return 0;
  }
}

export async function getUserTopicsList(userId: string): Promise<string[]> {
  try {
    const key = [`user:${userId}:learning-paths`];
    const data = await kv.get(key);
    return data?.value?.active || [];
  } catch {
    return [];
  }
}

export async function getRecommendedTopics(userId: string, limit: number = 3): Promise<string[]> {
  try {
    const key = [`user:${userId}:learning-paths`];
    const data = await kv.get(key);
    return (data?.value?.recommended || []).slice(0, limit);
  } catch {
    return Object.keys(TOPICS).slice(0, limit);
  }
}

export async function getTopicLeaderboard(topicId: string, limit: number = 10): Promise<any[]> {
  try {
    const key = [`topic:${topicId}:leaderboard`];
    const data = await kv.get(key);
    if (data?.value?.entries) {
      return data.value.entries.slice(0, limit).map((entry: any, index: number) => ({
        ...entry,
        rank: index + 1,
      }));
    }
    return [];
  } catch {
    return [];
  }
}

export async function updateTopicLeaderboard(topicId: string, userId: string, masteryScore: number): Promise<void> {
  try {
    const key = [`topic:${topicId}:leaderboard`];
    const data = await kv.get(key);
    const entries = data?.value?.entries || [];

    // Remove old entry if exists
    const filtered = entries.filter((e: any) => e.userId !== userId);

    // Add new entry and sort
    const updated = [...filtered, { userId, masteryScore }].sort(
      (a: any, b: any) => b.masteryScore - a.masteryScore
    );

    await kv.set(key, { entries: updated, lastUpdated: new Date().toISOString() });
  } catch {
    // Silent fail
  }
}
