import { promises as fs } from 'node:fs';
import path from 'node:path';
import { createHash, randomUUID } from 'node:crypto';
import type { Session, ChatMessage } from '../shared/types.js';
export const root = process.cwd();
export const sessionsRoot = path.join(root, 'sessions');
export const hash = (value: string | Buffer) => createHash('sha256').update(value).digest('hex');
export const normalizeQuery = (value: string) => value.normalize('NFKC').trim().replace(/\s+/g, ' ').toLocaleLowerCase('en-US');
export function sessionDir(id: string) {
  if (!/^[a-zA-Z0-9_-]+$/.test(id)) throw new Error('Invalid session ID');
  return id === 'demo' ? path.join(root, 'sample') : path.join(sessionsRoot, id);
}
export async function readJson<T>(file: string): Promise<T> { return JSON.parse(await fs.readFile(file, 'utf8')); }
export async function atomicJson(file: string, value: unknown) {
  await fs.mkdir(path.dirname(file), { recursive: true, mode:0o700 });
  const tmp = `${file}.${randomUUID()}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(value, null, 2), {mode:0o600,flag:'wx'});
  await fs.rename(tmp, file);
}
export async function loadSession(id: string) { return readJson<Session>(path.join(sessionDir(id), 'index.json')); }
export async function listSessions() {
  await fs.mkdir(sessionsRoot, { recursive: true });
  const ids = ['demo', ...(await fs.readdir(sessionsRoot)).filter(x => /^[\w-]+$/.test(x))];
  const sessions = await Promise.all(ids.map(id => loadSession(id).catch(() => null)));
  return sessions.filter((x): x is Session => !!x).sort((a, b) => Number(!!a.demo) - Number(!!b.demo) || b.startedAt.localeCompare(a.startedAt));
}
export async function loadChat(id: string): Promise<ChatMessage[]> {
  const raw = await fs.readFile(path.join(sessionDir(id), 'chat.jsonl'), 'utf8').catch(() => '');
  return raw.split('\n').filter(Boolean).flatMap(line => { try { return [JSON.parse(line)]; } catch { return []; } });
}
export function memoizeAsync<K, V>(fn: (key: K) => Promise<V>) {
  const pending = new Map<K, Promise<V>>();
  return (key: K): Promise<V> => {
    const existing = pending.get(key); if (existing) return existing;
    const work = Promise.resolve().then(() => fn(key)).finally(() => pending.delete(key));
    pending.set(key, work); return work;
  };
}
export function xml(value: string) { return value.replace(/[<>&"']/g, c => ({ '<':'&lt;', '>':'&gt;', '&':'&amp;', '"':'&quot;', "'":'&apos;' }[c]!)); }
