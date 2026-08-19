/**
 * MindForge SDK — Server-Sent Events (SSE) stream for real-time progress
 * Enables external tools to subscribe to MindForge execution progress.
 */

import * as http from 'http';
import * as fs from 'fs';
import * as path from 'path';

interface SSEClient {
  id: string;
  response: http.ServerResponse;
}

export class MindForgeEventStream {
  private clients: SSEClient[] = [];
  private server: http.Server | null = null;
  private auditWatcher: fs.FSWatcher | null = null;
  private lastAuditLine = 0;

  /**
   * Start the SSE server on the given port
   */
  start(port = 7337): Promise<void> {
    return new Promise((resolve, reject) => {
      this.server = http.createServer((req, res) => {
        if (req.url !== '/events') {
          res.writeHead(404);
          res.end();
          return;
        }

        // SECURITY: Only allow connections from localhost
        const clientIp = req.socket.remoteAddress;
        const isLocalhost = clientIp === '127.0.0.1' ||
                            clientIp === '::1' ||
                            clientIp === '::ffff:127.0.0.1';
        if (!isLocalhost) {
          res.writeHead(403);
          res.end('Forbidden: MindForge event stream is localhost-only');
          return;
        }

        // CORS: Only allow localhost origins (exact match, not wildcard)
        const origin = req.headers.origin;
        const allowedOriginPattern = /^https?:\/\/localhost(:\d+)?$/;
        const corsOrigin = origin && allowedOriginPattern.test(origin)
          ? origin
          : 'http://localhost';

        res.writeHead(200, {
          'Content-Type':  'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection':    'keep-alive',
          'Access-Control-Allow-Origin': corsOrigin,
          'X-Content-Type-Options': 'nosniff',
        });

        const clientId = Date.now().toString();
        this.clients.push({ id: clientId, response: res });

        // Send initial connection event
        this.sendEvent(res, 'connected', { clientId, timestamp: new Date().toISOString() });

        // Clean up on disconnect
        req.on('close', () => {
          this.clients = this.clients.filter(c => c.id !== clientId);
        });
      });

      // SECURITY: Bind to localhost ONLY — not all interfaces
      this.server.listen(port, '127.0.0.1', () => {
        console.log(`MindForge event stream: http://localhost:${port}/events (localhost only)`);
        resolve();
      });

      this.server.on('error', (err: NodeJS.ErrnoException) => {
        if (err.code === 'EADDRINUSE') {
          reject(new Error(
            `Port ${port} is already in use. Use: new MindForgeEventStream().start(${port + 1})`
          ));
        } else {
          reject(err);
        }
      });
    });
  }

  /**
   * Watch AUDIT.jsonl for new entries and broadcast as SSE events
   */
  watchAuditLog(projectRoot: string): void {
    const auditPath = path.join(projectRoot, '.planning', 'AUDIT.jsonl');

    if (!fs.existsSync(auditPath)) {
      // Create the file if it doesn't exist yet
      fs.writeFileSync(auditPath, '');
    }

    // Set initial line count
    const content = fs.readFileSync(auditPath, 'utf8');
    this.lastAuditLine = content.split('\n').filter(Boolean).length;

    try {
      this.auditWatcher = fs.watch(auditPath, () => {
        const lines = fs.readFileSync(auditPath, 'utf8')
          .split('\n')
          .filter(Boolean);

        // Broadcast new lines
        for (let i = this.lastAuditLine; i < lines.length; i++) {
          try {
            const entry = JSON.parse(lines[i]);
            this.broadcast('audit_entry', entry);
          } catch {
            // Ignore parse errors for incomplete lines
          }
        }

        this.lastAuditLine = lines.length;
      });
    } catch (err: unknown) {
      if ((err as NodeJS.ErrnoException).code === 'ENOSPC') {
        // Linux inotify limit reached — fall back to polling
        console.warn('MindForge: inotify limit reached, falling back to 2s polling');
        setInterval(() => {
          const lines = fs.readFileSync(auditPath, 'utf8').split('\n').filter(Boolean);
          for (let i = this.lastAuditLine; i < lines.length; i++) {
            try { this.broadcast('audit_entry', JSON.parse(lines[i])); } catch { /* ignore */ }
          }
          this.lastAuditLine = lines.length;
        }, 2000);
      } else {
        throw err;
      }
    }
  }

  /**
   * Broadcast an event to all connected clients
   */
  broadcast(eventType: string, data: unknown): void {
    this.clients.forEach(client => {
      this.sendEvent(client.response, eventType, data);
    });
  }

  private sendEvent(res: http.ServerResponse, type: string, data: unknown): void {
    try {
      res.write(`event: ${type}\n`);
      res.write(`data: ${JSON.stringify(data)}\n\n`);
    } catch {
      // Client disconnected
    }
  }

  /**
   * Stop the event stream server
   */
  stop(): void {
    this.auditWatcher?.close();
    this.server?.close();
    this.clients.forEach(c => c.response.end());
    this.clients = [];
  }
}

/**
 * WebSocket-based event stream client for real-time bidirectional communication.
 * Requires Node 22+ (global WebSocket) or the 'ws' package for older versions.
 */

// Minimal structural type for the WebSocket we use — the global type isn't guaranteed
// across Node versions / the optional 'ws' fallback, so we declare only the surface this
// client touches rather than depending on lib.dom or pulling @types/ws.
interface WebSocketLike {
  onopen: (() => void) | null;
  onerror: ((err: unknown) => void) | null;
  onmessage: ((event: { data: unknown }) => void) | null;
  onclose: (() => void) | null;
  send(data: string): void;
  close(): void;
}
declare const WebSocket: { new (url: string): WebSocketLike };

// Socket payloads are untyped JSON off the wire; callers narrow as needed.
type EventHandler = (data: unknown) => void;

export class WebSocketEventStream {
  private ws: WebSocketLike | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private listeners: Map<string, Set<EventHandler>> = new Map();

  constructor(private url: string = 'ws://127.0.0.1:7337/ws') {}

  /**
   * Dispatch to registered listeners. One dispatch path for messages, reconnect failures and
   * stream death, so those three cannot drift apart in how they treat a throwing listener.
   *
   * A missing 'error' listener does NOT mean silence: a reconnect that fails invisibly leaves the
   * consumer believing the stream is live, which is the failure mode this class was already in.
   */
  private emit(eventType: string, data: unknown): void {
    const handlers = this.listeners.get(eventType);
    if (!handlers || handlers.size === 0) {
      if (eventType === 'error' && typeof process !== 'undefined' && process.stderr) {
        const message = data instanceof Error ? data.message : String(data);
        process.stderr.write(`[MindForge SDK] event stream error: ${message}\n`);
      }
      return;
    }
    // A listener that throws must not take the stream — or the process — with it.
    handlers.forEach((handler) => { try { handler(data); } catch { /* listener fault */ } });
  }

  async connect(): Promise<void> {
    // Fail fast and legibly. `WebSocket` is declared, not imported, and sdk/package.json has NO
    // dependencies while engines.node is >=18.0.0 — so on Node 18 or 20 the constructor below is a
    // bare `ReferenceError: WebSocket is not defined`, which tells the caller nothing about why.
    if (typeof WebSocket === 'undefined') {
      throw new Error(
        'WebSocketEventStream requires a global WebSocket: Node 22+, a browser, or the optional '
        + '\'ws\' package installed and assigned to globalThis.WebSocket. This SDK declares no '
        + 'runtime dependencies, so it does not install one for you.',
      );
    }
    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(this.url);
      this.ws.onopen = () => {
        this.reconnectAttempts = 0;
        resolve();
      };
      this.ws.onerror = (err: unknown) => reject(err);
      this.ws.onmessage = (event: { data: unknown }) => {
        try {
          const parsed = JSON.parse(String(event.data));
          this.emit(parsed.type, parsed.data);
        } catch { /* malformed message */ }
      };
      this.ws.onclose = () => {
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
          this.reconnectAttempts++;
          setTimeout(() => {
            // A scheduled reconnect is fire-and-forget, so nothing awaits the promise it returns.
            // Without this .catch(), `connect()` rejecting via onerror is an UNHANDLED REJECTION —
            // and under Node's default mode that is fatal: it TERMINATES THE CALLER'S PROCESS.
            // Reproduced against the compiled module with a stub socket whose reconnect calls
            // onerror: exit code 1, and the line after the wait never ran.
            this.connect().catch((err: unknown) => this.emit('error', err));
          }, 1000 * this.reconnectAttempts);
        } else {
          // Attempts exhausted. This branch did not exist: the stream simply went quiet, leaving
          // the consumer with no way to learn it was dead.
          this.emit('close', {
            reason: 'reconnect attempts exhausted',
            attempts: this.reconnectAttempts,
          });
        }
      };
    });
  }

  on(eventType: string, handler: EventHandler): void {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, new Set());
    }
    this.listeners.get(eventType)!.add(handler);
  }

  off(eventType: string, handler: EventHandler): void {
    this.listeners.get(eventType)?.delete(handler);
  }

  disconnect(): void {
    this.maxReconnectAttempts = 0;
    this.ws?.close();
    this.ws = null;
  }
}
