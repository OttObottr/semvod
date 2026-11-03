import { useMemo } from 'react';
import { MessageSquare, Search, Zap } from 'lucide-react';
import type { Hit, SearchResult, SessionView } from '../shared/types';
import { formatTime, timelineBins } from './ui';

const MAX_BINS = 160;
const EMPTY_BINS = 96;
const TIME_LABELS = 7;

interface TimelineProps {
  session?: SessionView;
  result?: SearchResult;
  selected?: number;
  onSelect: (hit: Hit) => void;
  busy: boolean;
}

export default function Timeline({ session, result, selected, onSelect, busy }: TimelineProps) {
  const duration = session?.duration || 1;
  const count = Math.min(MAX_BINS, session?.frames.length || EMPTY_BINS);
  const bins = useMemo(() => timelineBins(result?.scores || [], duration, count), [result?.scores, duration, count]);
  const frames = session?.frames || [];
  const frameIndex = Math.max(0, frames.findIndex(frame => frame.t === selected));
  const points = session?.hype
    .map(bucket => `${bucket.t / duration * 1000},${42 - bucket.value * 34}`)
    .join(' ') || '';

  function selectFrame(index: number) {
    const frame = frames[index];
    if (busy || !frame) return;
    onSelect(result?.scores.find(hit => hit.id === frame.id) || {
      ...frame, score: 0, visualScore: 0, chatScore: 0, reason: 'Selected timeline frame',
    });
  }

  function selectTime(t: number) {
    if (busy || !frames.length) return;
    const hit = bins[Math.min(count - 1, Math.floor(t / duration * count))];
    if (hit) onSelect(hit);
    else selectFrame(frames.reduce((nearest, frame, index) =>
      Math.abs(frame.t - t) < Math.abs(frames[nearest].t - t) ? index : nearest, 0));
  }

  return (
    <section className="timeline-panel">
      <div className="panel-heading">
        <div><span className="micro">THE WHOLE STORY</span><h2>Find your signal.</h2></div>
        <div className="timeline-key">
          <span><i className="key-lime" /> Search match</span>
          <span><i className="key-teal" /> Chat energy</span>
        </div>
      </div>
      <div className="timeline">
        <div className="heat-row">
          <div className="timeline-label"><Search size={12} /><span>RELEVANCE</span></div>
          <div className="heat-track">
            {bins.map((hit, index) => (
              <span
                key={index}
                aria-hidden="true"
                style={{ background: hit ? `rgba(203,235,147,${.08 + hit.score / 10 * .92})` : undefined }}
              />
            ))}
            <input
              type="range" min={0} max={duration} step="any" value={selected || 0}
              disabled={busy || !frames.length}
              aria-label="Explore stream timeline"
              aria-valuetext={formatTime(selected || 0)}
              onChange={event => selectTime(Number(event.currentTarget.value))}
              onPointerUp={event => selectTime(Number(event.currentTarget.value))}
              onKeyDown={event => {
                const jump = Math.max(1, Math.ceil(frames.length / 10));
                const moves: Record<string, number> = {
                  ArrowRight: 1, ArrowUp: 1, ArrowLeft: -1, ArrowDown: -1, PageUp: jump, PageDown: -jump,
                  Home: -frames.length, End: frames.length,
                };
                if (event.key in moves) {
                  event.preventDefault();
                  selectFrame(Math.max(0, Math.min(frames.length - 1, frameIndex + moves[event.key])));
                }
              }}
            />
            {selected !== undefined && (
              <span className="playhead" style={{ left: `${Math.min(99.8, selected / duration * 100)}%` }}>
                <i />
              </span>
            )}
          </div>
        </div>
        <div className="hype-row">
          <div className="timeline-label"><MessageSquare size={12} /><span>CHAT ENERGY</span></div>
          <div className="hype-track">
            <svg viewBox="0 0 1000 48" preserveAspectRatio="none" aria-label="Chat energy over time">
              <defs>
                <linearGradient id="hype-fill" x1="0" y1="0" x2="0" y2="1">
                  <stop stopColor="#70b9b4" stopOpacity=".25" />
                  <stop offset="1" stopColor="#70b9b4" stopOpacity="0" />
                </linearGradient>
              </defs>
              <polygon points={`0,48 ${points} 1000,48`} fill="url(#hype-fill)" />
              <polyline points={points} fill="none" stroke="#76b4b0" strokeWidth="1.6" vectorEffect="non-scaling-stroke" />
            </svg>
          </div>
        </div>
        <div className="time-axis">
          <span />
          {Array.from({ length: TIME_LABELS }, (_, index) => (
            <span key={index}>{formatTime(index / (TIME_LABELS - 1) * duration)}</span>
          ))}
        </div>
      </div>
      <div className="timeline-foot">
        <span>
          <span className="key-dot" />{' '}
          {busy
            ? 'Scoring small contact sheets, then refining the best matches…'
            : result
              ? `${result.hits.length} moments surfaced · click any peak to explore`
              : 'Your next great clip is somewhere in here. Search to find it.'}
        </span>
        {result && (
          <span className="cache-badge">
            <Zap size={12} />
            {result.mode === 'demo'
              ? 'Bundled sample results'
              : result.cached
                ? 'Memoized · 0 vision calls'
                : `${result.stats.visionCalls} vision calls · ${result.stats.cacheHits} cache hits`}
          </span>
        )}
      </div>
    </section>
  );
}
