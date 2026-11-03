import { ArrowUpRight, Check, Clapperboard, Copy, Download, ExternalLink, Film, LoaderCircle, MessageSquare, Monitor, Search } from 'lucide-react';
import type { Hit, SearchResult, SessionView } from '../shared/types';
import { inputLimits, chatScoreWeight } from '../shared/settings';
import { formatTime, frameUrl, type ClipResult } from './ui';

const CHAT_WINDOW_SECONDS = 10;
const CHAT_PREVIEW_LIMIT = 7;

interface MomentPanelProps {
  sessionId: string;
  session?: SessionView;
  result?: SearchResult;
  selected?: Hit;
  busy: boolean;
  coverTitle: string;
  clip?: ClipResult;
  clipBusy: boolean;
  onCoverTitleChange: (title: string) => void;
  onCreateClip: () => void;
  onCopyLink: () => void;
  onSelect: (hit: Hit) => void;
}

export default function MomentPanel({
  sessionId, session, result, selected, busy, coverTitle, clip, clipBusy,
  onCoverTitleChange, onCreateClip, onCopyLink, onSelect,
}: MomentPanelProps) {
  const active = selected || session?.frames[0];
  const nearby = active
    ? session?.chat.filter(message => Math.abs(message.t - active.t) < CHAT_WINDOW_SECONDS).slice(-CHAT_PREVIEW_LIMIT)
    : [];

  return (
    <>
      <div className="results-header">
        <h2>
          {result ? <>Moments matching <span>“{result.query}”</span></> : 'A moment, waiting to happen.'}
        </h2>
        <span>
          {result ? `${result.hits.length} best matches` : 'Pick a memory above to get started'}
          <span className="tiny-separator" /> {session?.demo ? 'SAMPLE SESSION' : 'YOUR STREAM'}
        </span>
      </div>
      {result && result.hits.length === 0 && (
        <div className="empty-state">
          <Search size={23} />
          <h3>No strong matches found</h3>
          <p>Try a visible object, color, or a phrase that appeared in chat.</p>
        </div>
      )}
      <section className="moment-layout">
        <div className="preview-panel">
          <div className="preview-image">
            {active && <img src={frameUrl(sessionId, active.id)} alt={selected?.reason || 'Illustrated sample game scene'} />}
            <div className="preview-top">
              <span className="preview-tag"><span />{session?.demo ? 'SAMPLE FRAME' : 'CAPTURED FRAME'}</span>
              <span className="preview-time">{formatTime(active?.t || 0)}</span>
            </div>
            <div className="preview-bottom">
              <div className="frame-icon"><Film size={18} /></div>
              <div>
                <strong>{selected ? selected.reason : 'The best parts are already in your stream.'}</strong>
                <span>
                  {selected && result
                    ? `${selected.visualScore.toFixed(1)}/10 visual · ${selected.chatScore.toFixed(1)}/10 chat${selected.visualStage === 'coarse' ? ' · Not individually checked' : ''}`
                    : selected ? 'Captured locally from OBS.' : 'You just need a way to find them.'}
                </span>
              </div>
              {selected && result && (
                <span className="match-percent">{selected.score.toFixed(1)}<small>/10 relevance</small></span>
              )}
            </div>
          </div>
          <div className="preview-caption">
            <span>
              <Monitor size={13} />{session?.demo ? 'Original illustrated footage' : 'OBS program scene'}
              <span className="tiny-separator" />{' '}
              {active ? `Frame ${String(active.id + 1).padStart(3, '0')}` : 'No frame selected'}
            </span>
            <span>Still frame · not video playback</span>
          </div>
        </div>
        <aside className="moment-tools">
          <div className="tools-title"><span className="micro">MAKE IT A MOMENT</span><Clapperboard size={17} /></div>
          <h3>Found it? Make it yours.</h3>
          <p>A share-ready cover and a shortcut back to your stream.</p>
          <label className="cover-label" htmlFor="cover-title">Cover title <span>optional</span></label>
          <input
            className="title-input"
            id="cover-title"
            disabled={busy}
            maxLength={inputLimits.coverTitle}
            value={coverTitle}
            onChange={event => onCoverTitleChange(event.target.value)}
            placeholder="Give this moment a name"
          />
          <a
            className={`button cover-button ${!active || busy ? 'disabled' : ''}`}
            aria-disabled={!active || busy}
            href={active && !busy
              ? `/media/${sessionId}/cover/${active.id}?title=${encodeURIComponent(coverTitle)}`
              : undefined}
            download
          >
            <Download size={15} /> Download cover <span>1280 × 720</span>
          </a>
          <button className="button clip-button" disabled={!selected || session?.demo || busy || clipBusy} onClick={onCreateClip}>
            {clipBusy ? <LoaderCircle size={15} className="spin" /> : <Clapperboard size={15} />}{' '}
            Create Twitch clip <ArrowUpRight size={14} />
          </button>
          <button className="copy-link" disabled={!selected || session?.demo || busy} onClick={onCopyLink}>
            <Copy size={12} /> Copy VOD timestamp link
          </button>
          {session?.demo && <span className="tools-note">Covers work now. Twitch clips unlock with your own recording.</span>}
          {clip && (
            <div className="clip-result" role="status">
              {clip.pending
                ? <span><LoaderCircle size={12} className="spin" /> Twitch is processing your clip…</span>
                : clip.error
                  ? <span>{clip.error}</span>
                  : <a href={clip.url} target="_blank" rel="noreferrer">Clip ready on Twitch <ExternalLink size={12} /></a>}
              {clip.edit_url && (
                <a href={clip.edit_url} target="_blank" rel="noreferrer">Open clip editor <ArrowUpRight size={12} /></a>
              )}
              {clip.fallbackUrl && (
                <a href={clip.fallbackUrl} target="_blank" rel="noreferrer">Open this moment in the VOD <ExternalLink size={12} /></a>
              )}
            </div>
          )}
        </aside>
      </section>
      {result && result.hits.length > 0 && (
        <div className="hit-grid">
          {result.hits.map((hit, index) => (
            <button key={hit.id} className={`hit-card ${selected?.id === hit.id ? 'selected' : ''}`} onClick={() => onSelect(hit)}>
              <div className="hit-thumb">
                <img src={frameUrl(sessionId, hit.id)} alt={hit.reason} />
                <span className="hit-rank">0{index + 1}</span>
                <span className="hit-time">{formatTime(hit.t)}</span>
                {selected?.id === hit.id && <div className="selected-hit"><Check size={14} /></div>}
              </div>
              <div className="hit-info">
                <span>
                  {hit.chatScore * chatScoreWeight > hit.visualScore
                    ? 'Chat match'
                    : hit.visualStage === 'coarse' ? 'Preview candidate' : 'Visual match'}
                </span>
                <strong>{hit.score.toFixed(1)}<span>/10 relevance</span></strong>
              </div>
            </button>
          ))}
        </div>
      )}
      {selected && (
        <section className="chat-strip">
          <MessageSquare size={15} /><strong>Chat around {formatTime(selected.t)}</strong>
          <div>
            {nearby?.length
              ? nearby.map((message, index) => <span key={index}><b>{message.user}</b> {message.text}</span>)
              : <span>No chat messages near this frame.</span>}
          </div>
        </section>
      )}
    </>
  );
}
