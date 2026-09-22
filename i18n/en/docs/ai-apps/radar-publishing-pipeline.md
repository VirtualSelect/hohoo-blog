---
title: Inside AI Radar — from an RSS response to a published page
description: Trace the site's actual collection windows, daily quotas, deduplication and publishing checks, then diagnose a successful run that produced no visible update.
---

“The workflow is green, but the website has no new items.” That observation combines five separate questions: did a request succeed, did any candidate qualify, did files change, did the commit reach the default branch, and did production deploy that commit?

This walkthrough separates those questions using the site's real code. It explains why running every two hours does not imply adding ten items every two hours.

:::note Evidence boundary
This AI-assisted article describes repository commit `558e0a9`, not a new production incident investigation. No production latency or filtering accuracy was measured. Quota examples use illustrative inputs. Follow the [fixed source snapshot](https://github.com/VirtualSelect/hohoo-blog/tree/558e0a9010e3f63a6dd8e03e109339d22554287b).
:::

## 1. Follow the boundaries

```text
RSS source
  → request and parse
  → research-topic and technical-mechanism rules
  → window, duplicates, global quota, source quota
  → public records and related coverage
  → content validation and three-locale build
  → Git commit and push
  → deployment system
  → reader-facing page
```

The first stages select information; later stages deliver it. They need separate evidence.

| Boundary | Repository entry point | Evidence to inspect |
| --- | --- | --- |
| Source configuration | `config/news-sources.json` | Enabled sources, allowed hosts, daily caps |
| Response to candidate | `scripts/news/lib.mjs`: `parseFeed` | Publication date, title, source URL, excerpt |
| Relevance | `scripts/news/relevance.mjs` | Topic, mechanism and rejection reason |
| Batch selection | `selectItems` | `outside-window`, `duplicate`, `daily-limit` and other decisions |
| Public files | `scripts/news/collect.mjs` | Actual changes to `data/news/items.json` |
| Validation and push | `.github/workflows/ai-news.yml` | Build result, commit SHA and push result |

All paths refer to the fixed snapshot. Reading Radar does not initiate RSS collection or a model call. The page consumes prepared data, so a feed outage does not directly block a reader's request.

## 2. Three timestamps, three responsibilities

`publishedAt` is the source's publication time; `collectedAt` is the site's ingestion time; the report also records `runAt`. Backfilled items naturally have different publication and collection dates.

The parser accepts items up to **14 days** old. A normal run selects only from the last **48 hours**. Manual runs can change `window_hours` within the parser's range. A wider window cannot recover entries that the feed no longer returns.

The ten-item daily cap uses the **UTC collection date**, not the publication date or local midnight. UTC midnight is 08:00 in China Standard Time. Runs at 07:50 and 08:10 local time may therefore use different daily quotas.

The current schedule, `35 */2 * * *`, targets minute 35 of even UTC hours. It specifies planned triggers, not guaranteed completion times. Check the [workflow](https://github.com/VirtualSelect/hohoo-blog/blob/558e0a9010e3f63a6dd8e03e109339d22554287b/.github/workflows/ai-news.yml) and [selection code](https://github.com/VirtualSelect/hohoo-blog/blob/558e0a9010e3f63a6dd8e03e109339d22554287b/scripts/news/lib.mjs).

## 3. A cap is not a target

Suppose seven items have already been collected today, including five from AIHOT. The site has three slots left and AIHOT has one. Other sources default to two items per day unless their configuration overrides that limit.

Candidates are ordered by research priority, source priority, publication time and ID, then checked individually. AIHOT's source priority bypasses neither relevance rules nor exhausted quotas.

This runnable arithmetic example illustrates remaining capacity, not the complete selection algorithm:

```javascript
const remaining = (limit, used) => Math.max(0, limit - used);
const siteSlots = remaining(10, 7);
const aihotSlots = remaining(6, 5);
const aihotCanAdd = Math.min(siteSlots, aihotSlots);
console.log({ siteSlots, aihotSlots, aihotCanAdd });
// { siteSlots: 3, aihotSlots: 1, aihotCanAdd: 1 }
```

A consequential tradeoff: quotas are consumed across runs as items arrive. This is **not** an end-of-day selection of the best ten items. An accepted morning item is not replaced when a stronger evening candidate appears. Daily volume control and globally optimal daily selection are different objectives; a delayed candidate pool is not implemented here.

## 4. What the full feed fixes—and what it cannot

A title may say only “new version available,” while the body describes sandbox isolation, test suites or context offloading. AIHOT's full feed supplies those details through transient `relevanceText` for filtering.

`publicNewsItem` removes that field before public storage. Source excerpts are capped at 180 characters. Reading full text for relevance does not mean republishing it. The automated workflow currently disables model summaries, so these excerpts must not be labelled AI summaries.

Rules combine topics with mechanisms, such as context engineering with budgeting or compression, and robotics with trajectories or data alignment. Exclusion rules still remove commercial promotion and ranking-only material. These remain rules rather than full semantic understanding: technical articles can mention commercial background, and advertising can contain technical vocabulary.

Passing selection means meeting collection criteria, not establishing factual accuracy. Improve the [relevance rules](https://github.com/VirtualSelect/hohoo-blog/blob/558e0a9010e3f63a6dd8e03e109339d22554287b/scripts/news/relevance.mjs) using labelled false positives and false negatives instead of simply loosening them.

## 5. Deduplication is not semantic clustering

Collection rejects repeated normalized URLs and titles stripped of punctuation and case. Display-level event grouping also considers identical URLs and, within 72 hours, matching titles or supplied content hashes. See the [Radar adapter](https://github.com/VirtualSelect/hohoo-blog/blob/558e0a9010e3f63a6dd8e03e109339d22554287b/src/utils/radar.cjs).

There is no embedding-based semantic clustering. A Chinese report and its English official announcement can remain separate events. Supporting a content-hash field also does not imply that the RSS parser produces one for every item.

Within a group, original or official sources are preferred. That preference is not verification: verification needs a checker, date and evidence. Multiple sites repeating the same claim do not automatically establish it.

## 6. Diagnose “successful but unchanged”

Open that run's `news-run-report` artifact and proceed in order:

| Observation | Next check | Do not immediately conclude |
| --- | --- | --- |
| Source `failed` | HTTP, timeout, parsing, earlier installation steps | Every source failed |
| Source succeeded, `inWindow = 0` | Latest publication time versus report window | The schedule never ran |
| `selected = 0` | `rejected` and `notSelected` reasons | The feed was empty |
| `selected > 0`, build failed | Content validation and locale build logs | Content was published |
| Build passed, push failed | Remote commits and concurrent updates | Data reached the default branch |
| Push succeeded, page unchanged | Deployment SHA, production domain and built data | Browser caching must be responsible |

Collection can succeed when at least one source works, even if others fail. Publishing can also exit successfully because no files changed. Both cases require reading the report.

The concurrency lock covers collection jobs in the same group, not human pushes. If the branch advances during validation, the final push can fail; this workflow does not automatically recompute and retry. Preserve the last verified boundary rather than forcing a push.

## 7. Apply the pattern elsewhere

Represent a content pipeline as input → selection → storage → publication, with an inspectable artifact at each boundary. Here those are source status, candidate decisions, file changes, commit SHA and deployment.

The next useful engineering step is a small labelled filtering dataset. Daily item count cannot substitute for measuring false inclusions and omissions. Inspect current output in [AI Radar](/radar) or visit the [site project](/projects/hohoo-blog).
