export interface Frame { id: number; t: number; file: string; hash?: string; duplicates?: number[] }
export interface ChatMessage { t: number; user: string; text: string; emotes?: string[] }
export interface HypeBucket { t: number; count: number; emotes: number; value: number }
export interface Session { id: string; title: string; startedAt: string; duration: number; frames: Frame[]; status: 'recording' | 'complete'; demo?: boolean; broadcasterId?: string; channel?: string; streamId?: string; vodId?: string; vodStartedAt?: string; chatStatus?: string; captureError?:string }
export interface Sheet { file: string; hash: string; frames: Frame[] }
export interface Hit extends Frame { score: number; visualScore: number; chatScore: number; reason: string; visualStage?:'coarse'|'refined' }
export interface SearchResult { query: string; hits: Hit[]; scores: Hit[]; cached: boolean; mode: 'demo' | 'vision'; stats: { sheets: number; visionCalls: number; cacheHits: number; refined: number; elapsedMs: number; inputTokens?:number; outputTokens?:number } }
export interface SessionView extends Session { hype: HypeBucket[]; chat: ChatMessage[] }
