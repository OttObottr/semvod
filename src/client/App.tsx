import { useEffect, useRef, useState } from 'react';
import {
  ArrowUpRight, AudioLines, Check, ChevronDown, ChevronRight, Clock3, Film,
  FolderOpen, HelpCircle, LoaderCircle, MessageSquare, Radio, Search, Settings2,
  ShieldCheck, Sparkles, Square, X,
} from 'lucide-react';
import type { Hit, SearchResult, Session, SessionView } from '../shared/types';
import { defaultClipTitle, inputLimits, sampleQueries } from '../shared/settings';
import { api, formatTime, frameUrl, latestRequest, type ClipResult, type Status } from './ui';
import MomentPanel from './MomentPanel';
import Timeline from './Timeline';
import WorkspaceDialog from './WorkspaceDialog';

const RECORDING_POLL_MS = 5_000;
const CLIP_POLL_MS = 3_000;
const CLIP_POLL_ATTEMPTS = 20;

export default function App() {
  const [status, setStatus] = useState<Status>();
  const [sessions, setSessions] = useState<(Session & { frameCount: number })[]>([]);
  const [session, setSession] = useState<SessionView>();
  const [sessionId, setSessionId] = useState('demo');
  const [query, setQuery] = useState('');
  const [result, setResult] = useState<SearchResult>();
  const [selected, setSelected] = useState<Hit>();
  const [searchBusy, setSearchBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [modal, setModal] = useState<'setup' | 'library' | null>(null);
  const [coverTitle, setCoverTitle] = useState('');
  const [clip, setClip] = useState<ClipResult>();
  const [clipBusy, setClipBusy] = useState(false);
  const [liveDemo, setLiveDemo] = useState(false);
  const [recordBusy, setRecordBusy] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);
  const sessionGeneration = useRef(0);
  const clipRequests = useRef(latestRequest()).current;
  const linkRequests = useRef(latestRequest()).current;

  async function refresh() {
    const [nextStatus, nextSessions] = await Promise.all([
      api<Status>('/api/status'),
      api<(Session & { frameCount: number })[]>('/api/sessions'),
    ]);
    setStatus(nextStatus);
    setSessions(nextSessions);
  }

  useEffect(() => {
    void refresh().catch(error => setError(error.message));
    const focusSearch = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key === 'k') {
        event.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener('keydown', focusSearch);
    return () => {
      window.removeEventListener('keydown', focusSearch);
      clipRequests.invalidate();
      linkRequests.invalidate();
    };
  }, []);

  useEffect(() => {
    sessionGeneration.current++;
    selectMoment();
    let current = true;
    setSearchBusy(false);
    setSession(undefined);
    setResult(undefined);
    setError('');
    setQuery('');
    setLiveDemo(false);
    void api<SessionView>(`/api/session?id=${sessionId}`)
      .then(session => { if (current) setSession(session); })
      .catch(error => { if (current) setError(error.message); });
    return () => { current = false; };
  }, [sessionId]);

  useEffect(() => {
    if (!status?.recording) return;
    let current = true;
    const timer = setInterval(() => {
      void api<SessionView>(`/api/session?id=${status.recording}`)
        .then(session => {
          if (current && sessionId === session.id) {
            setSession(previous => previous?.id === session.id && previous.status === 'complete' && session.status === 'recording' ? previous : session);
          }
        })
        .catch(error => { if (current) setError(error.message); });
    }, RECORDING_POLL_MS);
    return () => {
      current = false;
      clearInterval(timer);
    };
  }, [status?.recording, sessionId]);

  useEffect(() => {
    if (!clip?.id || !clip.pending) return;
    let cancelled = false;
    let attempts = 0;
    const updatePendingClip = (update: Partial<ClipResult>) => {
      setClip(previous => previous && previous.id === clip.id && previous.pending
        ? { ...previous, ...update }
        : previous);
    };
    const timer = setInterval(() => {
      void api<{ id: string; url: string } | null>(`/api/clip/status?id=${clip.id}`)
        .then(found => {
          if (cancelled) return;
          if (found) {
            updatePendingClip({ url: found.url, pending: false });
            clearInterval(timer);
          } else if (++attempts >= CLIP_POLL_ATTEMPTS) {
            updatePendingClip({
              pending: false,
              error: `Twitch has not confirmed the clip after ${CLIP_POLL_MS * CLIP_POLL_ATTEMPTS / 1000} seconds. Use the VOD link below.`,
            });
            clearInterval(timer);
          }
        })
        .catch(error => {
          if (!cancelled) {
            updatePendingClip({ error: error.message, pending: false });
            clearInterval(timer);
          }
        });
    }, CLIP_POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [clip?.id, clip?.pending]);

  function selectMoment(hit?: Hit) {
    clipRequests.invalidate();
    linkRequests.invalidate();
    setNotice('');
    setClipBusy(false);
    setSelected(hit);
    setCoverTitle('');
    setClip(undefined);
  }

  async function runSearch(nextQuery = query) {
    if (!nextQuery.trim() || searchBusy || !session) return;
    setQuery(nextQuery);
    setSearchBusy(true);
    setError('');
    setResult(undefined);
    selectMoment();
    const generation = sessionGeneration.current;
    try {
      const nextResult = await api<SearchResult>('/api/search', { query: nextQuery, sessionId, liveDemo });
      if (generation !== sessionGeneration.current) return;
      setResult(nextResult);
      selectMoment(nextResult.hits[0]);
    } catch (error) {
      if (generation === sessionGeneration.current) setError((error as Error).message);
    } finally {
      if (generation === sessionGeneration.current) setSearchBusy(false);
    }
  }

  async function toggleRecording() {
    setRecordBusy(true);
    setError('');
    const generation = sessionGeneration.current;
    try {
      if (status?.recording) {
        const recordingId = status.recording;
        await api('/api/record/stop', {});
        await refresh();
        const saved = await api<SessionView>(`/api/session?id=${recordingId}`);
        if (generation === sessionGeneration.current && sessionId === saved.id) {
          setSession(saved);
          setNotice('Recording saved. Your moments are ready to search.');
        }
      } else {
        const session = await api<Session>('/api/record/start', { chat: !!status?.twitch });
        setSessionId(session.id);
        setModal(null);
        await refresh();
      }
    } catch (error) {
      setError((error as Error).message);
    } finally {
      setRecordBusy(false);
    }
  }

  async function copyVodLink() {
    if (!selected || searchBusy) return;
    await linkRequests.run(
      async current => {
        const result = await api<{ url: string }>('/api/vod-link', { sessionId, t: selected.t });
        if (current()) await navigator.clipboard.writeText(result.url);
      },
      () => setNotice('VOD timestamp link copied.'),
      error => setError((error as Error).message),
    );
  }

  async function createClip() {
    if (!selected || searchBusy || clipBusy) return;
    setClipBusy(true);
    setError('');
    await clipRequests.run(
      () => api<ClipResult>('/api/clip', {
        sessionId,
        t: selected.t,
        title: (coverTitle || result?.query || defaultClipTitle).slice(0, inputLimits.clipTitle),
      }),
      setClip,
      error => setError((error as Error).message),
      () => setClipBusy(false),
    );
  }

  return (
    <div className="app-shell">
      <aside className="rail">
        <a className="brand-mark" href="/" aria-label="SemVOD home"><AudioLines size={25} /></a>
        <div className="rail-items">
          <button className={!modal ? 'rail-button active' : 'rail-button'} aria-label="Stream search" onClick={() => {
            setModal(null);
            searchRef.current?.focus();
          }}><Search size={21} /></button>
          <button className={modal === 'library' ? 'rail-button active' : 'rail-button'} aria-label="Session library" onClick={() => setModal('library')}>
            <FolderOpen size={21} />
          </button>
          <button className="rail-button" aria-label="Setup" onClick={() => setModal('setup')}><Settings2 size={21} /></button>
        </div>
        <div className="rail-bottom">
          <button className="rail-button" onClick={() => setModal('setup')} aria-label="Help"><HelpCircle size={20} /></button>
          <span className="avatar">S</span>
        </div>
      </aside>
      <div className="workspace">
        <header className="topbar">
          <div className="wordmark">sem<span>vod</span><span className="beta">BETA</span></div>
          <div className="breadcrumb"><span>Workspace</span><ChevronRight size={13} /><strong>Stream search</strong></div>
          <div className="top-actions">
            <span className="local-badge"><span />Local workspace</span>
            <button className="text-button" onClick={() => setModal('setup')}><Settings2 size={14} /> Setup</button>
          </div>
        </header>
        <main>
          <div className="intro">
            <div>
              <div className="eyebrow"><span className="little-line" /> LESS SCRUBBING. MORE CREATING.</div>
              <h1>Your stream. <span>Search your moments.</span></h1>
              <p>Find the thing you remember. Turn it into something worth sharing.</p>
            </div>
            <button
              className={`button record-button ${status?.recording ? 'recording' : ''}`}
              disabled={recordBusy}
              onClick={() => status?.recording || status?.obsConfigured ? void toggleRecording() : setModal('setup')}
            >
              {recordBusy
                ? <LoaderCircle size={15} className="spin" />
                : status?.recording ? <Square size={13} /> : <Radio size={16} />}{' '}
              {status?.recording ? 'Stop recording' : 'Record a stream'}
            </button>
          </div>
          <section className="session-strip">
            <div className="session-art">
              <img src={frameUrl(sessionId, session?.frames[Math.floor((session?.frames.length || 1) / 3)]?.id || 0)} alt="Current session thumbnail" />
            </div>
            <div className="session-label">
              <span className="micro">CURRENT SESSION {session?.demo && <span className="sample-pill">ILLUSTRATED SAMPLE</span>}</span>
              <button className="session-name" onClick={() => setModal('library')}>
                {session?.title || 'Loading session…'}<ChevronDown size={15} />
              </button>
              <div className="session-meta">
                <span>{session?.demo ? 'Wander Valley · Original sample' : session?.channel || 'OBS capture'}</span>
                <span>·</span>
                <span>{session ? new Date(session.startedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : '—'}</span>
              </div>
            </div>
            <div className="session-metrics">
              <div><Film size={15} /><strong>{session?.frames.length || 0}</strong><span>frames</span></div>
              <div><Clock3 size={15} /><strong>{formatTime(session?.duration || 0)}</strong><span>duration</span></div>
              <div><MessageSquare size={15} /><strong>{session?.chat.length || 0}</strong><span>messages</span></div>
            </div>
            <span className="ready-badge"><span />{session?.status === 'recording' ? 'Recording' : 'Ready to explore'}</span>
          </section>
          <section className="search-section">
            <form className={`search-box ${searchBusy ? 'searching' : ''}`} onSubmit={event => {
              event.preventDefault();
              void runSearch();
            }}>
              <Search size={21} />
              <input
                ref={searchRef}
                aria-label="Search your stream"
                placeholder="What are you looking for in your stream?"
                maxLength={inputLimits.query}
                value={query}
                onChange={event => setQuery(event.target.value)}
              />
              <kbd>⌘ K</kbd>
              <button className="search-submit" disabled={searchBusy || !query.trim()}>
                {searchBusy ? <LoaderCircle size={16} className="spin" /> : <Sparkles size={16} />}
                <span>{searchBusy ? 'Finding moments…' : 'Find moments'}</span>
                {!searchBusy && <span className="enter-key">↵</span>}
              </button>
            </form>
            <div className="search-hints">
              <span>Example searches</span>
              {sampleQueries.map(query => (
                <button key={query} disabled={searchBusy} onClick={() => void runSearch(query)}>
                  {query}<ArrowUpRight size={11} />
                </button>
              ))}
              <div className="search-mode">
                {session?.demo
                  ? <><span className="sample-dot" /> {liveDemo ? 'Live AI on sample frames' : 'Offline sample · $0'}</>
                  : <><ShieldCheck size={12} /> Your key. Your frames.</>}
              </div>
            </div>
            {session?.demo && (
              <div className="sample-note">
                {liveDemo
                  ? 'Search sample frames with OpenAI using your key. API charges apply; Twitch clips are unavailable.'
                  : 'Sample searches use bundled results. No AI calls or Twitch clips are made.'}
                {status?.openai && (
                  <label>
                    <input type="checkbox" disabled={searchBusy} checked={liveDemo} onChange={event => {
                      setLiveDemo(event.target.checked);
                      setResult(undefined);
                      selectMoment();
                    }} /> Use my key for real AI search
                  </label>
                )}
              </div>
            )}
          </section>
          {session?.captureError && (
            <div className="alert" role="alert">OBS capture interrupted: {session.captureError}. Check OBS; capture retries automatically.</div>
          )}
          {error && (
            <div className="alert" role="alert">
              <span>{error}</span>
              <button aria-label="Dismiss error" onClick={() => setError('')}><X size={15} /></button>
            </div>
          )}
          {notice && (
            <div className="notice" role="status">
              <Check size={15} />{notice}
              <button aria-label="Dismiss notification" onClick={() => setNotice('')}><X size={15} /></button>
            </div>
          )}
          <Timeline
            session={session}
            result={result}
            selected={(selected || session?.frames[0])?.t}
            onSelect={selectMoment}
            busy={searchBusy}
          />
          <MomentPanel
            sessionId={sessionId}
            session={session}
            result={result}
            selected={selected}
            busy={searchBusy}
            coverTitle={coverTitle}
            clip={clip}
            clipBusy={clipBusy}
            onCoverTitleChange={setCoverTitle}
            onCreateClip={() => void createClip()}
            onCopyLink={() => void copyVodLink()}
            onSelect={selectMoment}
          />
          <footer>
            <span><AudioLines size={14} /> Built for the moments you almost missed.</span>
            <span>Made with Codex <span className="tiny-separator" /> {session?.demo ? 'Original sample assets' : 'Captured locally'} <ShieldCheck size={12} /></span>
          </footer>
        </main>
      </div>
      <WorkspaceDialog
        mode={modal}
        status={status}
        sessions={sessions}
        sessionId={sessionId}
        recordBusy={recordBusy}
        onClose={() => setModal(null)}
        onSelectSession={sessionId => { setSessionId(sessionId); setModal(null); }}
        onRecord={() => void toggleRecording()}
      />
    </div>
  );
}
