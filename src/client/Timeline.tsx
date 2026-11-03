import { MessageSquare, Search, Zap } from 'lucide-react';
import type { Hit, SearchResult, SessionView } from '../shared/types';
import { formatTime } from './ui';

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
  const bins = Array.from({ length: count }, (_, index) => {
    const from = index / count * duration;
    const to = (index + 1) / count * duration;
    const items = result?.scores.filter(score => score.t >= from && score.t < to) || [];
    return items.sort((a, b) => b.score - a.score)[0];
  });
  const points = session?.hype
    .map(bucket => `${bucket.t / duration * 1000},${42 - bucket.value * 34}`)
    .join(' ') || '';

  function selectBin(hit: Hit | undefined, index: number) {
    if (hit) {
      onSelect(hit);
    } else if (session?.frames.length) {
      const frameIndex = Math.min(
        session.frames.length - 1,
        Math.floor(index / count * session.frames.length),
      );
      onSelect({
        ...session.frames[frameIndex],
        score: 0,
        visualScore: 0,
        chatScore: 0,
        reason: 'Selected timeline frame',
      });
    }
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
              <button
                key={index}
                disabled={busy}
                aria-label={hit
                  ? `Explore ${formatTime(hit.t)}, ${hit.score.toFixed(1)} out of 10 relevance`
                  : `Timeline ${formatTime(index / count * duration)}`}
                title={hit
                  ? `${formatTime(hit.t)} · ${hit.score.toFixed(1)}/10`
                  : formatTime(index / count * duration)}
                style={{ background: hit ? `rgba(203,235,147,${.08 + hit.score / 10 * .92})` : undefined }}
                onClick={() => selectBin(hit, index)}
              />
            ))}
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
