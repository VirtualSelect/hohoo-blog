// Shared contracts for the build-generated content consumed by the application.
// Markdown and JSON remain the source of truth; these types contain no content.
export const locales = ["zh-CN", "zh-TW", "en"] as const;
export type Locale = (typeof locales)[number];
export function isLocale(value: unknown): value is Locale {
  return value === "zh-CN" || value === "zh-TW" || value === "en";
}
export type LocalizedText = readonly [string, string, string?];
export type Domain = "ai-apps" | "llm" | "embodied-ai";
export type ContentType =
  | "doc"
  | "blog"
  | "note"
  | "paper"
  | "project"
  | "lab"
  | "radar-digest";
export type ContentStatus =
  | "planning"
  | "learning"
  | "building"
  | "experiment"
  | "published"
  | "archived"
  | "production"
  | "completed"
  | "inconclusive"
  | "to-read"
  | "reading"
  | "read";
export type TranslationStatus =
  | "ORIGINAL"
  | "AI_TRANSLATED"
  | "REVIEWED"
  | "OUTDATED"
  | "MISSING";
export type ArticleKind =
  | "tutorial"
  | "case-study"
  | "mechanism"
  | "retrospective"
  | "essay"
  | "note"
  | "paper";
export interface ContentEntry {
  id: string;
  type: ContentType;
  status: ContentStatus;
  title: string;
  description: string;
  href: string;
  locale: Locale;
  sourceLocale: Locale;
  domain?: Domain;
  date?: string;
  updated?: string;
  minutes?: number;
  articleKind?: ArticleKind;
  translationStatus?: TranslationStatus;
  related?: string[];
  prerequisites?: string[];
  stepId?: string;
}
export interface FrontMatter {
  title: string;
  description?: string;
  slug?: string;
  id?: string;
  status?: ContentStatus;
  landing?: boolean;
  draft?: boolean;
  unlisted?: boolean;
  domain?: Domain;
  difficulty?: "beginner" | "intermediate" | "advanced";
  date?: string;
  published_at?: string;
  updated?: string;
  reading_minutes?: number;
  learning_step?: string;
  article_kind?: ArticleKind;
  related?: string[];
  prerequisites?: string[];
}
export interface Heading {
  id: string;
  text: string;
  depth: 2 | 3;
}
export interface SiteDocument {
  route: string;
  kind: "docs" | "blog" | "news/daily";
  metadata: {
    id: string;
    title: string;
    description: string;
    permalink: string;
    frontMatter: FrontMatter;
  };
  frontMatter: FrontMatter;
  headings: Heading[];
  html: string;
  sourceFallback: boolean;
}
export type ClientDocument = Omit<SiteDocument, "html">;
export interface LearningEntry {
  stepId: string;
  title: string;
  description: string;
  permalink: string;
  date?: string;
  minutes?: number;
}
export interface RadarSignal {
  id: string;
  title: string;
  summary: string;
  url: string;
  sourceId: string;
  sourceName: string;
  publishedAt: string;
  collectedAt: string;
}
export interface RadarArchive {
  chunks: string[];
  total: number;
  sources: [string, string][];
  lastCollected?: string;
}
export interface GlobalData {
  "content-index": { entries: ContentEntry[]; activity: ContentEntry[] };
  "learning-index": { entries: LearningEntry[] };
  "radar-pages": { preview: RadarSignal[] };
}
export interface SiteContent {
  locale: Locale;
  routes: string[];
  documents: SiteDocument[];
  globalData: GlobalData;
  items: RadarSignal[];
  radarArchive: RadarArchive;
  searchUrl: string;
}
export type Messages = Record<
  string,
  { message: string; description?: string } | undefined
>;
export interface SiteContextValue {
  locale: Locale;
  route: string;
  globalData: GlobalData;
  items: RadarSignal[];
  searchUrl: string;
  radarArchive: RadarArchive | null;
  messages: Messages;
  document: ClientDocument | null;
}
