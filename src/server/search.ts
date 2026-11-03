import { promises as fs } from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import { inputLimits } from '../shared/settings.js';
import type { Frame, Hit, SearchResult } from '../shared/types.js';
import { config, searchConfig, visionConfig } from './config.js';
import { buildSheets, chatRelevance } from './indexer.js';
import { atomicJson, hash, loadChat, loadSession, memoizeAsync, normalizeQuery, readJson, sessionDir } from './store.js';
import { cachedScore, moderate, type ScoredCell } from './vision.js';

function rank(frames: Frame[], visual: Map<number, ScoredCell>, query: string, chat: Awaited<ReturnType<typeof loadChat>>): Hit[] {
  return frames.map(frame => {
    const cell = visual.get(frame.id);
    const visualScore = cell?.score ?? 0;
    const match = chatRelevance(query, frame.t, chat);
    const weightedChat = match.score * searchConfig.chatWeight;
    return {
      ...frame,
      visualScore,
      visualStage: cell ? (cell.refined ? 'refined' : 'coarse') : undefined,
      chatScore: match.score,
      score: Math.max(visualScore, weightedChat),
      reason: weightedChat > visualScore
        ? `Chat: “${match.reason}”`
        : cell?.reason || (cell ? 'Visual candidate' : 'No strong match'),
    };
  });
}

export function distinctHits(scores: Hit[], limit: number = searchConfig.maxHits, gap: number = searchConfig.hitGapSeconds): Hit[] {
  const hits: Hit[] = [];
  for (const hit of [...scores].sort((a, b) => b.score - a.score || a.t - b.t)) {
    if (hit.score >= searchConfig.minScore && hits.every(previous => Math.abs(previous.t - hit.t) >= gap)) {
      hits.push(hit);
      if (hits.length === limit) break;
    }
  }
  return hits;
}

export async function search(id: string, rawQuery: string, liveDemo = false): Promise<SearchResult> {
  const started = Date.now();
  const query = normalizeQuery(rawQuery);
  if (!query || query.length > inputLimits.query) throw new Error(`Enter a search between 1 and ${inputLimits.query} characters.`);
  const [session, chat] = await Promise.all([loadSession(id), loadChat(id)]);
  if (!session.frames.length) throw new Error('This session has no frames yet. Record a stream or choose another session.');
  const stats = { sheets: 0, visionCalls: 0, cacheHits: 0, refined: 0, elapsedMs: 0, inputTokens: 0, outputTokens: 0 };
  if (session.demo && !liveDemo) {
    const fixture = await readJson<Record<string, SearchResult>>(path.join(sessionDir(id), 'searches.json'));
    const result = fixture[query];
    if (!result) throw new Error('This offline sample supports the suggested searches. Add an OpenAI key and enable AI search for any query.');
    return { ...result, query: rawQuery, cached: true, mode: 'demo', stats: { ...stats, cacheHits: 1, elapsedMs: Date.now() - started } };
  }

  await moderate(query);
  const sheets = await buildSheets(id);
  stats.sheets = sheets.length;
  const visual = new Map<number, ScoredCell>();
  const aliases = new Map<number, number[]>();
  // Bound parallel requests while retaining per-image progress on interruption.
  for (let start = 0; start < sheets.length; start += searchConfig.parallelSheets) {
    await Promise.all(sheets.slice(start, start + searchConfig.parallelSheets).map(async sheet => {
      const image = await fs.readFile(path.join(sessionDir(id), sheet.file));
      for (const score of await cachedScore(query, image, sheet.frames.length, stats)) {
        const frame = sheet.frames[score.cell - 1];
        const ids = [frame.id, ...frame.duplicates ?? []];
        for (const id of ids) { visual.set(id, score); aliases.set(id, ids); }
      }
    }));
  }

  // Chat already supplies literal evidence; spend visual checks on the strongest visual candidates.
  const candidates = distinctHits(
    rank(session.frames, visual, query, []).filter(hit => hit.visualScore >= searchConfig.minScore && aliases.get(hit.id)?.[0] === hit.id),
    searchConfig.maxRefinements,
    searchConfig.refinementGapSeconds,
  );
  for (const frame of candidates) {
    const image = await sharp(path.join(sessionDir(id), frame.file))
      .resize({ width: visionConfig.refinementWidth, withoutEnlargement: true })
      .jpeg({ quality: visionConfig.jpegQuality }).toBuffer();
    const [score] = await cachedScore(query, image, 1, stats);
    for (const id of aliases.get(frame.id) ?? [frame.id]) visual.set(id, { ...score, refined: true });
    stats.refined++;
  }

  const scores = rank(session.frames, visual, query, chat);
  stats.elapsedMs = Date.now() - started;
  const result: SearchResult = { query: rawQuery, hits: distinctHits(scores), scores, cached: stats.visionCalls === 0, mode: 'vision', stats };
  // Human-readable query receipt; paid scores are cached by image content in vision.ts.
  const key = hash(`${query}:${config.model}:${visionConfig.coarseVersion}`);
  await atomicJson(path.join(sessionDir(id), 'cache', `${key}.json`), result);
  return result;
}

export const runSearch = memoizeAsync(async (key: string) => {
  const { id, query, liveDemo } = JSON.parse(key);
  return search(id, query, liveDemo);
});
