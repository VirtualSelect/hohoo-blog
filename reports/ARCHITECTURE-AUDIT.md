# Architecture audit — 2026-09-11

## Current Architecture
Docusaurus 3.4, React 18, npm lockfile, bilingual static builds. Docs and Blog plugins retain ownership of original routes. News collection runs in GitHub Actions independently of page requests.

## Existing Routes
/, /research, /docs/skill, /docs/ai-apps, /docs/llm, /docs/embodied-ai, /learning, /timeline, /lab, /papers, /reading, /news, /news/daily/2026-09-11, /news/weekly, /now, /aboutMe, /subscribe, /blog, /blog/tags, /blog/archive, /blog/a%20new%20milestone; English equivalents.

## Existing Components
HomeProjects, CurrentFocus, TopicNews, TopicPapers, ReadingActions, NewsDigest, LearningNavigation. Native Docusaurus Navbar, mobile menu, TOC, pagination, MDX and code blocks.

## Reusable Components
ReadingActions and native theme wrappers; shared editorial rows, section headings, status and related content only where patterns recur.

## Reusable Data Sources
learning-paths, papers, experiments, news/items, source registry, social; native Blog and Docs metadata via build hooks.

## Duplicate Patterns
Planning warnings across home, topic overview, topic pages and activity; separate hardcoded Now and CurrentFocus; mixed project and experiment listing; repeated cards and empty states.

## Empty / Planning-heavy Pages
Three topic pages; timeline contains no published route article; seven existing planned learning steps in two groups; three experiment proposals without results.

## Visual Inconsistencies
Card density in learning and lab pages; missing explicit widths on flex children; blue About callout; infrastructure and friend links occupy footer columns; no latest original content on home.

## Content Gaps
One real blog essay, three abstract-based paper guides, four external signals, one inspectable blog repository and collection implementation. No published technical lesson, note or completed experiment. Paper source years cannot stand in for personal reading dates.

## SEO / Route Problems
Space-bearing blog slug, camel-case About address, governance files placed in public Docs directory, missing canonical migration policy. Native Tags and Archive already exist.

## Proposed Changes
Current shared data; home latest, radar and activity; three topic landings; application engineering subdirection; real project case study and separately labeled lab proposals; versioned progress; metadata-based reading context; compatible canonical routes; lightweight Radar and weekly routes; Notes empty structure. No P2 modules.

## Files To Modify
Docusaurus config, native topic Markdown, learning data, home/now/about/learning/timeline/lab/news pages, reusable components, CSS and validation workflow.

## Files To Add
content-index and radar route plugins, metadata, content UI and detail layouts, learning progress adapter, DocItem wrapper, redirects, /projects and /labs and /radar and /notes, tests, templates, reports.

## Risks
Route/i18n compatibility, local progress migration, SSR, false publication dates and source attribution. Exclude development docs from public routes. Keep existing crawler behavior and optional translation disabled. Validate native routes and runtime layouts before release.
