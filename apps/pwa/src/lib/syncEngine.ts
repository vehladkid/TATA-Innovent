// syncEngine.ts — WebSocket + IndexedDB offline sync (Owner: Dhruv, deliverable #7)
//
// Streams RiskEvents to Tejvir's backend. When offline, buffers them in
// IndexedDB and drains the queue on reconnect.
//
//   send(event) ─▶ socket open?  ── yes ─▶ ws.send({type:'risk_event', data})
//                                └─ no  ─▶ IndexedDB 'pending_events'
//   on reconnect ─▶ drain queue (oldest first) ─▶ ws.send each ─▶ delete
//
// Rules (build doc):
//   • Only RiskEvent JSON crosses the wire — never raw frames/detections.
//   • Reconnect with exponential backoff 1s → 2s → 4s → … capped at 30s.
//   • Store name 'pending_events', key 'eventId', capped at 500 (drop oldest).

import type { RiskEvent, WSMessage } from '@suraksha/shared/contracts';

// ============================================================
// Config
// ============================================================

const DB_NAME = 'suraksha';
const DB_VERSION = 1;
const STORE = 'pending_events';
const MAX_PENDING = 500;

const BACKOFF_BASE_MS = 1000;
const BACKOFF_MAX_MS = 30_000;
const HEARTBEAT_MS = 25_000;

export type SyncStatus = 'connecting' | 'online' | 'offline' | 'closed';

export type SyncEngineOptions = {
  url?: string; // defaults to NEXT_PUBLIC_WS_URL
  onStatus?: (status: SyncStatus) => void;
};

// ============================================================
// SyncEngine
// ============================================================

export class SyncEngine {
  private readonly url: string;
  private readonly onStatus?: (s: SyncStatus) => void;

  private ws: WebSocket | null = null;
  private dbPromise: Promise<IDBDatabase> | null = null;
  private backoffMs = BACKOFF_BASE_MS;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  private closedByUser = false;
  private draining = false;

  constructor(opts: SyncEngineOptions = {}) {
    this.url = opts.url ?? import.meta.env.VITE_WS_URL ?? '';
    this.onStatus = opts.onStatus;
  }

  /** Open the connection. Safe to call once at app start. */
  connect(): void {
    if (!this.url) throw new Error('SyncEngine: no WebSocket URL (set NEXT_PUBLIC_WS_URL).');
    this.closedByUser = false;
    this.openSocket();
  }

  /** Permanently stop syncing and close the socket. */
  close(): void {
    this.closedByUser = true;
    this.clearTimers();
    this.ws?.close();
    this.ws = null;
    this.emit('closed');
  }

  /**
   * Send a RiskEvent. Delivered immediately if online, otherwise queued in
   * IndexedDB for the next drain. Never throws on the offline path.
   */
  async send(event: RiskEvent): Promise<void> {
    if (this.isOpen()) {
      try {
        this.ws!.send(this.encode(event));
        return;
      } catch {
        // fall through to queue if the send races a disconnect
      }
    }
    await this.enqueue(event);
  }

  get status(): SyncStatus {
    if (this.closedByUser) return 'closed';
    if (this.isOpen()) return 'online';
    return this.ws && this.ws.readyState === WebSocket.CONNECTING ? 'connecting' : 'offline';
  }

  // --- socket lifecycle -----------------------------------------

  private openSocket(): void {
    this.emit('connecting');
    const ws = new WebSocket(this.url);
    this.ws = ws;

    ws.onopen = () => {
      this.backoffMs = BACKOFF_BASE_MS;
      this.emit('online');
      this.startHeartbeat();
      void this.drainQueue();
    };

    ws.onclose = () => {
      this.stopHeartbeat();
      this.ws = null;
      if (!this.closedByUser) this.scheduleReconnect();
      else this.emit('closed');
    };

    // Errors are followed by close; let onclose handle reconnect.
    ws.onerror = () => ws.close();
  }

  private scheduleReconnect(): void {
    this.emit('offline');
    if (this.reconnectTimer) return;
    const delay = this.backoffMs;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.openSocket();
    }, delay);
    // Exponential backoff, capped.
    this.backoffMs = Math.min(this.backoffMs * 2, BACKOFF_MAX_MS);
  }

  private startHeartbeat(): void {
    this.stopHeartbeat();
    this.heartbeatTimer = setInterval(() => {
      if (this.isOpen()) {
        const msg: WSMessage = { type: 'heartbeat', data: { ts: Date.now() } };
        try {
          this.ws!.send(JSON.stringify(msg));
        } catch {
          /* ignore — close handler will reconnect */
        }
      }
    }, HEARTBEAT_MS);
  }

  private stopHeartbeat(): void {
    if (this.heartbeatTimer) clearInterval(this.heartbeatTimer);
    this.heartbeatTimer = null;
  }

  private clearTimers(): void {
    this.stopHeartbeat();
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.reconnectTimer = null;
  }

  // --- queue drain ----------------------------------------------

  /** Send all buffered events oldest-first, deleting each on success. */
  private async drainQueue(): Promise<void> {
    if (this.draining || !this.isOpen()) return;
    this.draining = true;
    try {
      const pending = await this.allPending();
      // Oldest first so the dashboard sees events in order.
      pending.sort((a, b) => a.timestamp - b.timestamp);
      for (const event of pending) {
        if (!this.isOpen()) break;
        this.ws!.send(this.encode(event));
        await this.deletePending(event.eventId);
      }
    } finally {
      this.draining = false;
    }
  }

  // --- helpers --------------------------------------------------

  private encode(event: RiskEvent): string {
    const msg: WSMessage = { type: 'risk_event', data: event };
    return JSON.stringify(msg);
  }

  private isOpen(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }

  private emit(status: SyncStatus): void {
    this.onStatus?.(status);
  }

  // --- IndexedDB ------------------------------------------------

  private db(): Promise<IDBDatabase> {
    if (this.dbPromise) return this.dbPromise;
    this.dbPromise = new Promise<IDBDatabase>((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(STORE)) {
          db.createObjectStore(STORE, { keyPath: 'eventId' });
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    return this.dbPromise;
  }

  private async enqueue(event: RiskEvent): Promise<void> {
    const db = await this.db();
    // Enforce the cap: if full, drop the oldest before inserting.
    const count = await this.tx(db, 'readonly', store => store.count());
    if (count >= MAX_PENDING) await this.dropOldest(db, count - MAX_PENDING + 1);
    await this.tx(db, 'readwrite', store => store.put(event));
  }

  private async allPending(): Promise<RiskEvent[]> {
    const db = await this.db();
    return this.tx(db, 'readonly', store => store.getAll() as IDBRequest<RiskEvent[]>);
  }

  private async deletePending(eventId: string): Promise<void> {
    const db = await this.db();
    await this.tx(db, 'readwrite', store => store.delete(eventId));
  }

  /** Delete the N oldest queued events (by timestamp) to honour MAX_PENDING. */
  private async dropOldest(db: IDBDatabase, n: number): Promise<void> {
    const all = await this.tx(db, 'readonly', store => store.getAll() as IDBRequest<RiskEvent[]>);
    all.sort((a, b) => a.timestamp - b.timestamp);
    const victims = all.slice(0, n);
    for (const v of victims) {
      await this.tx(db, 'readwrite', store => store.delete(v.eventId));
    }
  }

  /** Promise wrapper around a single-store transaction. */
  private tx<T>(
    db: IDBDatabase,
    mode: IDBTransactionMode,
    op: (store: IDBObjectStore) => IDBRequest<T>,
  ): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const transaction = db.transaction(STORE, mode);
      const request = op(transaction.objectStore(STORE));
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }
}
