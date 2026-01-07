// Pulse Feature Types
// AI-Powered Daily Briefing System

import type { PulseTopic, PulseBriefing, PulseBriefingItem } from '@prisma/client'

// ============================================
// TOPIC TYPES
// ============================================

export type TopicCategory =
  | 'tech'
  | 'business'
  | 'local'
  | 'industry'
  | 'personal'
  | 'general'

export interface TopicTemplate {
  name: string
  description: string
  category: TopicCategory
  keywords: string[]
  icon: string
}

export interface CreateTopicInput {
  name: string
  description?: string
  keywords: string[]
  category: TopicCategory
  priority?: number
}

export interface UpdateTopicInput {
  name?: string
  description?: string
  keywords?: string[]
  category?: TopicCategory
  priority?: number
  isActive?: boolean
}

// ============================================
// BRIEFING TYPES
// ============================================

export type BriefingStatus = 'generating' | 'ready' | 'failed'

export type BriefingItemType =
  | 'article'      // External content summary
  | 'insight'      // AI-generated insight
  | 'action'       // Actionable recommendation
  | 'business_kpi' // Urban Simple business data

export type ItemSentiment = 'positive' | 'neutral' | 'negative'

export interface BriefingWithItems extends PulseBriefing {
  items: (PulseBriefingItem & {
    topic: PulseTopic | null
  })[]
}

export interface BriefingItemWithTopic extends PulseBriefingItem {
  topic: PulseTopic | null
}

// ============================================
// CONTENT GENERATION TYPES
// ============================================

export interface ContentSource {
  title: string
  url: string
  snippet: string
  source: string
  publishedAt?: string
}

export interface GeneratedContent {
  title: string
  summary: string
  content?: string
  imagePrompt?: string // Detailed prompt for AI image generation
  sourceUrl?: string
  sourceName?: string
  category: string
  sentiment: ItemSentiment
  relevanceScore: number
  keywords: string[]
}

export interface ImageGenerationRequest {
  prompt: string
  title: string
  category: string
}

export interface ImageGenerationResult {
  imageUrl?: string
  imageBase64?: string
  prompt: string
  success: boolean
  error?: string
}

// ============================================
// BUSINESS INSIGHTS TYPES
// ============================================

export interface BusinessInsight {
  type: 'revenue' | 'ar_aging' | 'team' | 'clients' | 'schedule'
  title: string
  value: string | number
  change?: number // percentage change
  changeDirection?: 'up' | 'down' | 'neutral'
  description: string
  severity?: 'info' | 'warning' | 'critical' | 'success'
}

export interface BusinessInsightsData {
  revenue: {
    last7Days: number
    previous7Days: number
    change: number
  }
  arAging: {
    current: number
    overdue30: number
    overdue60: number
    overdue90: number
  }
  team: {
    activeAssociates: number
    upcomingShifts: number
    completionRate: number
  }
  clients: {
    total: number
    atRisk: number
    topPerformer?: string
  }
}

// ============================================
// GENERATION PIPELINE TYPES
// ============================================

export interface GenerationOptions {
  userId: string
  date?: Date
  forceRegenerate?: boolean
  topicIds?: string[] // Generate for specific topics only
}

export interface GenerationResult {
  success: boolean
  briefingId?: string
  itemsGenerated: number
  imagesGenerated: number
  duration: number
  errors: string[]
}

export interface WebSearchResult {
  title: string
  url: string
  snippet: string
  source: string
  date?: string
}

export interface NewsAPIResult {
  title: string
  description: string
  url: string
  source: {
    name: string
  }
  publishedAt: string
  urlToImage?: string
}

// ============================================
// API RESPONSE TYPES
// ============================================

export interface PulseTopicResponse extends PulseTopic {
  _count?: {
    briefingItems: number
  }
}

export interface PulseBriefingResponse extends PulseBriefing {
  items: PulseBriefingItemResponse[]
  _count?: {
    items: number
  }
}

export interface PulseBriefingItemResponse extends PulseBriefingItem {
  topic: Pick<PulseTopic, 'id' | 'name' | 'category'> | null
}

// ============================================
// ARCHIVE TYPES
// ============================================

export interface BriefingArchiveEntry {
  date: string // ISO date string
  title: string | null
  status: BriefingStatus
  itemCount: number
  readAt: Date | null
}

export interface ArchiveFilters {
  startDate?: Date
  endDate?: Date
  topicId?: string
  bookmarkedOnly?: boolean
  searchQuery?: string
}

// ============================================
// TOPIC TEMPLATES (Pre-defined)
// ============================================

export const TOPIC_TEMPLATES: TopicTemplate[] = [
  {
    name: 'AI & Machine Learning',
    description: 'Latest developments in artificial intelligence, LLMs, and ML applications',
    category: 'tech',
    keywords: ['artificial intelligence', 'machine learning', 'GPT', 'LLM', 'neural networks', 'AI models', 'generative AI'],
    icon: 'Brain'
  },
  {
    name: 'Austin Tech Scene',
    description: 'Local tech news, startups, and business developments in Austin',
    category: 'local',
    keywords: ['Austin tech', 'Texas startups', 'Austin business', 'Central Texas', 'Austin entrepreneurs'],
    icon: 'MapPin'
  },
  {
    name: 'Commercial Cleaning Industry',
    description: 'Trends and news in the cleaning and janitorial services industry',
    category: 'industry',
    keywords: ['commercial cleaning', 'janitorial services', 'facility management', 'cleaning technology', 'cleaning business'],
    icon: 'Sparkles'
  },
  {
    name: 'Viral Marketing & Ads',
    description: 'Trending ads, viral campaigns, and marketing strategies',
    category: 'business',
    keywords: ['viral ads', 'marketing campaigns', 'advertising trends', 'social media marketing', 'brand campaigns'],
    icon: 'TrendingUp'
  },
  {
    name: 'Leadership & Management',
    description: 'Business leadership, team management, and organizational growth',
    category: 'personal',
    keywords: ['leadership', 'management', 'team building', 'business strategy', 'executive insights'],
    icon: 'Users'
  },
  {
    name: 'SaaS & Business Software',
    description: 'Software as a service trends, tools, and business technology',
    category: 'tech',
    keywords: ['SaaS', 'business software', 'enterprise tools', 'productivity apps', 'cloud services'],
    icon: 'Cloud'
  },
  {
    name: 'Small Business Growth',
    description: 'Tips and strategies for growing small and medium businesses',
    category: 'business',
    keywords: ['small business', 'business growth', 'entrepreneurship', 'SMB', 'business development'],
    icon: 'Rocket'
  },
  {
    name: 'Productivity & Efficiency',
    description: 'Personal and business productivity tips, tools, and techniques',
    category: 'personal',
    keywords: ['productivity', 'efficiency', 'time management', 'workflow', 'automation'],
    icon: 'Zap'
  }
]

export const TOPIC_CATEGORIES: { value: TopicCategory; label: string; icon: string }[] = [
  { value: 'tech', label: 'Technology', icon: 'Cpu' },
  { value: 'business', label: 'Business & Finance', icon: 'TrendingUp' },
  { value: 'local', label: 'Local (Austin)', icon: 'MapPin' },
  { value: 'industry', label: 'Cleaning Industry', icon: 'Sparkles' },
  { value: 'personal', label: 'Personal Growth', icon: 'Heart' },
  { value: 'general', label: 'General', icon: 'Globe' }
]
