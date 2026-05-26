---
name: connection-pooling
version: 1.0.0
min_mindforge_version: 0.1.0
status: stable
compose: database-patterns
triggers: connection pooling, pool sizing, connection lifecycle, pgbouncer, connection leak, pool exhaustion, connection timeout, pool monitoring, connection reuse, max connections, idle connection, pool configuration
---

# Skill — Connection Pooling

## When this skill activates
Any task involving database connection pool configuration, pool sizing,
connection leak debugging, PgBouncer setup, or pool exhaustion issues.

## Mandatory actions when this skill is active

### Before writing any code
1. Determine the workload characteristics (connection duration, concurrency level).
2. Calculate optimal pool size using the sizing formula.
3. Identify whether application-level or external pooling is appropriate.

### During implementation
- Configure connection validation (test-on-borrow or background validation).
- Set appropriate timeouts for checkout, idle eviction, and max lifetime.
- Add leak detection with stack trace logging.

### After implementation
- Monitor pool metrics (active, idle, waiting counts).
- Set alerts for pool exhaustion and high wait times.
- Document pool configuration in ARCHITECTURE.md.

## Pool Sizing Formula

```
optimal_pool_size = (core_count * 2) + effective_disk_spindles
```

- For SSD: effective_spindles = 1 (low seek time).
- Typical range: 20-50 connections per application instance.
- More connections != better performance (context switching overhead).
- PostgreSQL max_connections default is 100 — shared across ALL clients.

### Example Calculations
| Cores | Storage | Formula | Pool Size |
|-------|---------|---------|-----------|
| 4 | SSD | (4*2)+1 | 9 |
| 8 | SSD | (8*2)+1 | 17 |
| 16 | HDD (4 disks) | (16*2)+4 | 36 |

## Connection Lifecycle

```
CREATE → VALIDATE → USE → RETURN → IDLE → EVICT
```

### Create
- Establishing a new connection (expensive: TCP handshake + auth + TLS).
- Pool pre-creates `min_idle` connections at startup.

### Validate
- Test connection is still alive before handing to application.
- Methods: `SELECT 1`, TCP keepalive, driver-level ping.
- Background validation preferred over test-on-borrow (lower latency).

### Use
- Application borrows connection from pool.
- Connection is marked as "active" — not available to others.
- Timeout if application holds too long (leak detection trigger).

### Return
- Application returns connection to pool after query completes.
- Connection reset (clear session state, temp tables, transaction state).

### Idle
- Connection sits in pool waiting for next request.
- `idle_timeout`: evict if unused for too long (default: 10 minutes).
- `max_lifetime`: destroy after absolute age (default: 30 minutes).

### Evict
- Connection destroyed (closed at TCP level).
- Reasons: idle timeout, max lifetime, validation failure, pool shrinking.

## PgBouncer Modes

### Session Pooling
- Connection assigned to client for entire session duration.
- Supports all PostgreSQL features (prepared statements, LISTEN/NOTIFY).
- Least efficient — similar to no pooling.

### Transaction Pooling (Recommended)
- Connection assigned per transaction, returned after COMMIT/ROLLBACK.
- Most common production mode.
- Limitations: no prepared statements, no session-level SET commands.

### Statement Pooling
- Connection assigned per individual statement.
- Most aggressive sharing — highest connection efficiency.
- Limitations: no transactions, no multi-statement operations.

## Leak Detection

### Symptoms
- Pool exhaustion (all connections checked out, waiters queuing).
- Gradually increasing active connection count over time.
- Application hangs waiting for connection from pool.

### Detection
- `checkout_timeout`: fail fast if no connection available within N seconds.
- `leak_detection_threshold`: log stack trace if connection held > N seconds.
- Monitor: connections_active should correlate with request rate.

### Prevention
- Always use try-with-resources / context managers.
- Set aggressive checkout timeouts (5-10 seconds).
- Connection wrapper that auto-returns on GC (safety net, not primary).

## Pool Exhaustion Handling

### DO
- Queue with timeout (wait up to 5s for available connection).
- Return clear error message: "Connection pool exhausted, try again later."
- Alert operations team immediately.
- Log queue depth and wait times.

### DO NOT
- Create unlimited connections (will crash the database).
- Retry immediately in a tight loop (makes it worse).
- Silently wait forever (request hangs, client times out).

## Monitoring Metrics

| Metric | Alert Threshold | Description |
|--------|----------------|-------------|
| `pool.active` | > 80% of max | Connections in use |
| `pool.idle` | < 2 | Available connections |
| `pool.waiting` | > 0 for > 5s | Requests queued for connection |
| `pool.checkout_time_avg` | > 100ms | Time to acquire connection |
| `pool.timeout_count` | > 0 | Failed connection acquisitions |
| `pool.create_count` | Spike detection | New connections being created |

## Self-check before task completion

Before marking a task done when this skill was active:

- [ ] Did I read the full SKILL.md before starting? (Not just the triggers)
- [ ] Is pool size calculated using the formula (not arbitrary)?
- [ ] Are connection timeouts configured (checkout, idle, max lifetime)?
- [ ] Is leak detection enabled with stack trace logging?
- [ ] Are pool metrics instrumented and alerting configured?
- [ ] Is the pooling mode appropriate for the workload?
