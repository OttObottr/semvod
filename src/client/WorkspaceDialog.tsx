import { useEffect, useRef, useState } from 'react';
import { ArrowUpRight, Check, ChevronRight, LoaderCircle, Monitor, Radio, ShieldCheck, X } from 'lucide-react';
import { defaultRedirectUri } from '../shared/settings';
import type { Session } from '../shared/types';
import { api, formatTime, frameUrl, type Status } from './ui';

const focusable = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

interface WorkspaceDialogProps {
  mode: 'setup' | 'library' | null;
  status?: Status;
  sessions: (Session & { frameCount: number })[];
  sessionId: string;
  recordBusy: boolean;
  onClose: () => void;
  onSelectSession: (sessionId: string) => void;
  onRecord: () => void;
}

export default function WorkspaceDialog({
  mode, status, sessions, sessionId, recordBusy, onClose, onSelectSession, onRecord,
}: WorkspaceDialogProps) {
  // Keep this component mounted while closed, preserving the last OBS test result.
  const [obsTest, setObsTest] = useState('');
  const dialog = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!mode) return;
    const previous = document.activeElement as HTMLElement | null;
    const focusFirst = () => dialog.current?.querySelector<HTMLElement>(focusable)?.focus();
    const keepFocus = (event: FocusEvent) => {
      if (!dialog.current?.contains(event.target as Node)) focusFirst();
    };
    focusFirst();
    document.addEventListener('focusin', keepFocus);
    return () => {
      document.removeEventListener('focusin', keepFocus);
      if (previous?.isConnected && !previous.matches(':disabled')) previous.focus();
      else document.querySelector<HTMLElement>('[aria-label="Search your stream"]')?.focus();
    };
  }, [mode]);

  async function testObs() {
    setObsTest('Testing…');
    try {
      const result = await api<{ scene: string }>('/api/obs/test', {});
      setObsTest(`Connected · ${result.scene}`);
    } catch (error) {
      setObsTest((error as Error).message);
    }
  }

  if (!mode) return null;

  return (
    <div className="modal-backdrop" onMouseDown={event => {
      if (event.target === event.currentTarget) onClose();
    }}>
      <section ref={dialog} className="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title" onKeyDown={event => {
        event.stopPropagation();
        if (event.key === 'Escape') { event.preventDefault(); onClose(); return; }
        if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') { event.preventDefault(); return; }
        if (event.key !== 'Tab') return;
        const targets = Array.from(event.currentTarget.querySelectorAll<HTMLElement>(focusable));
        const first = targets[0], last = targets.at(-1);
        const target = event.shiftKey
          ? document.activeElement === first ? last : undefined
          : document.activeElement === last ? first : undefined;
        if (target) { event.preventDefault(); target.focus(); }
      }}>
        <button className="modal-close" aria-label="Close" onClick={onClose}><X size={19} /></button>
        <span className="eyebrow">YOUR LOCAL WORKSPACE</span>
        <h2 id="modal-title">{mode === 'setup' ? 'From stream to searchable.' : 'Your session library.'}</h2>
        {mode === 'library' ? (
          <div className="session-list">
            {sessions.map(session => (
              <button key={session.id} onClick={() => onSelectSession(session.id)}>
                {session.frameCount ? <img src={frameUrl(session.id, 0)} alt="" /> : <div className="session-art"><Monitor size={24} aria-hidden="true" /></div>}
                <div>
                  <strong>{session.title}</strong>
                  <span>
                    {session.demo ? 'Illustrated sample' : new Date(session.startedAt).toLocaleString()}
                    {' · '}{session.frameCount} frames · {formatTime(session.duration)}
                  </span>
                </div>
                {sessionId === session.id ? <Check size={17} /> : <ChevronRight size={17} />}
              </button>
            ))}
          </div>
        ) : (
          <>
            <p className="modal-intro">
              Try the sample right away. Connect your tools when you’re ready to capture a real stream.
              Keys stay in your local .env file.
            </p>
            <div className="setup-step">
              <span className="step-number">1</span>
              <div>
                <h3>
                  OpenAI{' '}
                  <span className={status?.openai ? 'connected-label' : 'pending-label'}>
                    {status?.openai ? 'Key configured' : 'Needed for AI search'}
                  </span>
                </h3>
                <p>
                  Create an API key, add <code>OPENAI_API_KEY</code> to <code>.env</code>, then restart.
                  API billing is separate from a ChatGPT subscription.
                </p>
                <a href="https://platform.openai.com/api-keys" target="_blank" rel="noreferrer">
                  Open API keys <ArrowUpRight size={13} />
                </a>
              </div>
            </div>
            <div className="setup-step">
              <span className="step-number">2</span>
              <div>
                <h3>
                  Twitch{' '}
                  <span className={status?.twitch ? 'connected-label' : 'pending-label'}>
                    {status?.twitch ? `Connected as ${status.twitch.login}` : 'Chat + clips'}
                  </span>
                </h3>
                <p>
                  Register a confidential app in the Twitch developer console. Set the redirect to{' '}
                  <code>{status?.redirectUri || defaultRedirectUri}</code>. Put its client ID and secret
                  in <code>.env</code> and restart.
                </p>
                <div className="setup-links">
                  <a href="https://dev.twitch.tv/console/apps" target="_blank" rel="noreferrer">
                    Developer console <ArrowUpRight size={13} />
                  </a>
                  {status?.twitchConfigured && (
                    <a className="connect-link" href="/auth/twitch">
                      {status.twitch ? 'Reconnect' : 'Connect'} Twitch <ArrowUpRight size={13} />
                    </a>
                  )}
                </div>
              </div>
            </div>
            <div className="setup-step">
              <span className="step-number">3</span>
              <div>
                <h3>OBS Studio <span className="pending-label">Frame capture</span></h3>
                <p>
                  In OBS 28+, open Tools → WebSocket Server Settings. Enable the server on port 4455
                  and copy the password into <code>OBS_PASSWORD</code> in <code>.env</code>.
                  Add a screen or window source to your scene.
                </p>
                <button className="test-obs" onClick={() => void testObs()}>
                  <Monitor size={13} /> Test OBS connection
                </button>
                {obsTest && <p className="obs-result">{obsTest}</p>}
              </div>
            </div>
            <div className="setup-tip">
              <ShieldCheck size={17} />
              <p>
                SemVOD listens on your computer only. Sample mode is free. Live search sends compressed
                frames to OpenAI using your key; successful scores are memoized to avoid repeat charges.
              </p>
            </div>
            <button className="button search-submit setup-record" disabled={recordBusy} onClick={onRecord}>
              {recordBusy ? <LoaderCircle size={15} className="spin" /> : <Radio size={15} />}{' '}
              {status?.recording ? 'Stop recording' : 'Start recording'}
              {!status?.twitch && <span>OBS only · chat off</span>}
            </button>
          </>
        )}
      </section>
    </div>
  );
}
