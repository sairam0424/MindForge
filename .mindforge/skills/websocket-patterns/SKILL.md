---
name: websocket-patterns
version: 1.0.0
min_mindforge_version: 0.1.0
status: stable
triggers: websocket pattern, websocket connection lifecycle, heartbeat mechanism, reconnection strategy, websocket rooms, channel subscription, websocket scaling, redis pub sub scaling, backpressure handling, websocket authentication, message ordering, binary protocol
---

# Skill — WebSocket Patterns

## When this skill activates
Any task involving WebSocket connection management, real-time communication,
heartbeat/keepalive mechanisms, reconnection strategies, room/channel design,
or WebSocket scaling across multiple server instances.

## Mandatory actions when this skill is active

### Before writing any code
1. Define the websocket connection lifecycle (upgrade, auth, message flow, close).
2. Choose heartbeat interval and reconnection strategy.
3. Determine scaling approach (Redis pub/sub, sticky sessions, etc.).

### During implementation
- Implement heartbeat mechanism (server ping every 30s).
- Add exponential backoff with jitter for reconnection.
- Handle backpressure (buffer limits, overflow policy).

### After implementation
- Load test concurrent connection capacity.
- Verify reconnection behavior under network partitions.
- Document WebSocket protocol in ARCHITECTURE.md.

## Connection Lifecycle

```
HTTP Upgrade → Open → Authenticate → Subscribe → Message Loop → Ping/Pong → Close
```

### Upgrade
- Client sends HTTP Upgrade request with `Sec-WebSocket-Key`.
- Server responds with 101 Switching Protocols.
- Connection is now bidirectional full-duplex.

### Open
- Connection established, ready for messages.
- Server assigns connection ID for tracking.
- Start heartbeat timer.

### Authenticate
- First message from client must be auth token.
- Server validates token, associates connection with user.
- Reject and close if auth fails (close code 4001).

### Message Loop
- Bidirectional message exchange.
- Messages typed by application protocol (JSON envelope with `type` field).
- Server processes commands, pushes events.

### Close
- Graceful: client/server sends close frame with reason code.
- Ungraceful: TCP connection drops (detected by heartbeat timeout).
- Clean up subscriptions, remove from rooms, release resources.

## Heartbeat Mechanism

### Server-Initiated Ping
- Server sends WebSocket ping frame every 30 seconds.
- Client automatically responds with pong (browser handles this).
- If no pong received within 60 seconds: connection dead, close it.

### Application-Level Heartbeat
- Send JSON `{"type": "ping", "ts": 1234567890}` every 30s.
- Client responds with `{"type": "pong", "ts": 1234567890}`.
- Allows RTT measurement and connection quality monitoring.
- Required when infrastructure (load balancers) strips WebSocket pings.

### Idle Timeout
- Close connections with no activity for 5 minutes.
- Heartbeat keeps connection alive during quiet periods.
- Differentiate: no data vs dead connection.

## Reconnection Strategy

### Exponential Backoff with Jitter
```
attempt 1: wait 1s + random(0-500ms)
attempt 2: wait 2s + random(0-500ms)
attempt 3: wait 4s + random(0-500ms)
attempt 4: wait 8s + random(0-500ms)
...
max wait: 30s + random(0-500ms)
```

### Reconnection Behavior
- On disconnect: immediately attempt reconnect (might be transient).
- On failure: apply exponential backoff.
- On reconnect success: re-authenticate, re-subscribe to channels.
- Resume from last received message sequence number (gap detection).

### Client State During Reconnection
- Show "reconnecting..." indicator to user.
- Buffer outgoing messages (send after reconnect).
- Merge missed messages on reconnection (request gap fill from server).

## Rooms and Channels

### Topic-Based Subscriptions
```json
{"type": "subscribe", "channel": "chat:room-123"}
{"type": "unsubscribe", "channel": "chat:room-123"}
```

### Room Semantics
- Join: add connection to room's subscriber list.
- Leave: remove connection from room's subscriber list.
- Broadcast: send message to all connections in room.
- Presence: track who is currently in room (online/offline).

### Channel Naming Convention
```
{domain}:{resource_type}:{resource_id}
chat:room:abc123
orders:user:user456
notifications:global
```

## Scaling Across Instances

### Problem
- WebSocket connections are stateful (pinned to one server).
- Broadcasting must reach connections on ALL servers.
- Server A has user X, Server B has user Y — both in same room.

### Solution: Redis Pub/Sub
```
Server A publishes → Redis channel → Server B receives → delivers to local connections
```

- Each server subscribes to Redis channels matching its connections' rooms.
- On broadcast: publish to Redis, all servers deliver to their local connections.
- Redis Pub/Sub is fire-and-forget (acceptable for real-time messages).

### Alternative: Sticky Sessions
- Route same user to same server (via cookie or IP hash).
- Simpler but limits horizontal scaling.
- Fails on server restart (all connections drop).

## Authentication

### Token in Query Parameter (During Upgrade)
```
ws://example.com/ws?token=jwt_token_here
```
- Simple, works with browser WebSocket API.
- Risk: token in URL may appear in logs.

### Token in First Message (After Connect)
```json
{"type": "auth", "token": "jwt_token_here"}
```
- More secure (not in URL/logs).
- Requires handling unauthenticated state.
- Close connection if no auth within 5 seconds.

### Token Refresh
- Server sends `{"type": "token_expiring", "expires_in": 60}`.
- Client sends new token before expiration.
- If token expires: close connection, client reconnects with fresh token.

## Backpressure Handling

### Problem
- Server produces messages faster than client can consume.
- Client's buffer grows unbounded, eventually crashes.

### Solutions

#### Buffer with Limit
- Set maximum buffer size per connection (e.g., 1000 messages).
- When buffer full: drop oldest messages.
- Notify client: `{"type": "lag_warning", "dropped": 47}`.

#### Flow Control
- Client sends acknowledgment every N messages.
- Server pauses sending if no ack received.
- Similar to TCP flow control at application level.

#### Priority Queues
- Critical messages (errors, auth) never dropped.
- Real-time data (cursor positions) can be dropped.
- Batch/compress low-priority messages during lag.

## Self-check before task completion

Before marking a task done when this skill was active:

- [ ] Did I read the full SKILL.md before starting? (Not just the triggers)
- [ ] Is heartbeat mechanism implemented (30s ping, 60s timeout)?
- [ ] Is reconnection using exponential backoff with jitter?
- [ ] Is authentication handled (first message or query param)?
- [ ] Is backpressure handled (buffer limit, drop policy)?
- [ ] Is cross-instance scaling addressed (Redis pub/sub or equivalent)?
- [ ] Are rooms/channels properly implemented with join/leave semantics?
