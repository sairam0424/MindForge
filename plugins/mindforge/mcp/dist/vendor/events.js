"use strict";
/* eslint-disable */
// @generated — VENDORED from sdk/src by scripts/vendor-sdk-into-mcp.js. DO NOT EDIT.
// Edit the canonical file under sdk/src and re-run the vendoring script.
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.WebSocketEventStream = exports.MindForgeEventStream = void 0;
/**
 * MindForge SDK — Server-Sent Events (SSE) stream for real-time progress
 * Enables external tools to subscribe to MindForge execution progress.
 */
const http = __importStar(require("http"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
class MindForgeEventStream {
    constructor() {
        this.clients = [];
        this.server = null;
        this.auditWatcher = null;
        this.lastAuditLine = 0;
    }
    /**
     * Start the SSE server on the given port
     */
    start(port = 7337) {
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
                    'Content-Type': 'text/event-stream',
                    'Cache-Control': 'no-cache',
                    'Connection': 'keep-alive',
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
            this.server.on('error', (err) => {
                if (err.code === 'EADDRINUSE') {
                    reject(new Error(`Port ${port} is already in use. Use: new MindForgeEventStream().start(${port + 1})`));
                }
                else {
                    reject(err);
                }
            });
        });
    }
    /**
     * Watch AUDIT.jsonl for new entries and broadcast as SSE events
     */
    watchAuditLog(projectRoot) {
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
                    }
                    catch {
                        // Ignore parse errors for incomplete lines
                    }
                }
                this.lastAuditLine = lines.length;
            });
        }
        catch (err) {
            if (err.code === 'ENOSPC') {
                // Linux inotify limit reached — fall back to polling
                console.warn('MindForge: inotify limit reached, falling back to 2s polling');
                setInterval(() => {
                    const lines = fs.readFileSync(auditPath, 'utf8').split('\n').filter(Boolean);
                    for (let i = this.lastAuditLine; i < lines.length; i++) {
                        try {
                            this.broadcast('audit_entry', JSON.parse(lines[i]));
                        }
                        catch { /* ignore */ }
                    }
                    this.lastAuditLine = lines.length;
                }, 2000);
            }
            else {
                throw err;
            }
        }
    }
    /**
     * Broadcast an event to all connected clients
     */
    broadcast(eventType, data) {
        this.clients.forEach(client => {
            this.sendEvent(client.response, eventType, data);
        });
    }
    sendEvent(res, type, data) {
        try {
            res.write(`event: ${type}\n`);
            res.write(`data: ${JSON.stringify(data)}\n\n`);
        }
        catch {
            // Client disconnected
        }
    }
    /**
     * Stop the event stream server
     */
    stop() {
        this.auditWatcher?.close();
        this.server?.close();
        this.clients.forEach(c => c.response.end());
        this.clients = [];
    }
}
exports.MindForgeEventStream = MindForgeEventStream;
class WebSocketEventStream {
    constructor(url = 'ws://127.0.0.1:7337/ws') {
        this.url = url;
        this.ws = null;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        this.listeners = new Map();
    }
    async connect() {
        return new Promise((resolve, reject) => {
            this.ws = new WebSocket(this.url);
            this.ws.onopen = () => {
                this.reconnectAttempts = 0;
                resolve();
            };
            this.ws.onerror = (err) => reject(err);
            this.ws.onmessage = (event) => {
                try {
                    const parsed = JSON.parse(event.data.toString());
                    const handlers = this.listeners.get(parsed.type) || new Set();
                    handlers.forEach(handler => handler(parsed.data));
                }
                catch { /* malformed message */ }
            };
            this.ws.onclose = () => {
                if (this.reconnectAttempts < this.maxReconnectAttempts) {
                    this.reconnectAttempts++;
                    setTimeout(() => this.connect(), 1000 * this.reconnectAttempts);
                }
            };
        });
    }
    on(eventType, handler) {
        if (!this.listeners.has(eventType)) {
            this.listeners.set(eventType, new Set());
        }
        this.listeners.get(eventType).add(handler);
    }
    off(eventType, handler) {
        this.listeners.get(eventType)?.delete(handler);
    }
    disconnect() {
        this.maxReconnectAttempts = 0;
        this.ws?.close();
        this.ws = null;
    }
}
exports.WebSocketEventStream = WebSocketEventStream;
