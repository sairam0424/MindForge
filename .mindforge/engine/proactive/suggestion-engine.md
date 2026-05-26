# Proactive Skill Suggestion — Suggestion Engine

## Purpose
Manage the lifecycle of skill suggestions: confidence gating, cooldown enforcement,
deduplication, debounce, and user feedback integration.

## Configuration (from config.json)

```json
{
  "proactive_suggestions": {
    "enabled": true,
    "confidence_threshold": 0.7,
    "cooldown_seconds": 300,
    "debounce_seconds": 30,
    "max_recent": 50,
    "store_path": ".mindforge/engine/proactive/recent-suggestions.json"
  }
}
```

## Suggestion Lifecycle

### Step 1 — Signal Received
Signal detector emits: `{ skill: string, confidence: number, reason: string, signal_type: string }`

### Step 2 — Confidence Gate
- If `confidence < threshold` (0.7): discard silently
- If `confidence >= threshold`: proceed to Step 3

### Step 3 — Cooldown Check
- Read dismissals from `.mindforge/engine/proactive/dismissals.json`
- If this `skill:signal_type` pair was dismissed within `cooldown_seconds` (300s): suppress
- Cooldown format: `{ "skill:signal_type": timestamp_ms }`

### Step 4 — Debounce
- If ANY suggestion was presented within `debounce_seconds` (30s): queue, don't present
- Queue is FIFO; oldest suggestion presented first after debounce expires

### Step 5 — Deduplication
- Check if skill is already loaded in current session (from loader)
- Check if same suggestion was already presented this session
- If either: discard

### Step 6 — Present Suggestion
Format for agent context:
```
💡 Proactive suggestion: Load **[skill-name]** skill
   Reason: [reason from signal]
   Confidence: [0.XX]
   Action: Apply automatically? [yes/dismiss]
```

### Step 7 — User Response
- **Accept**: Load the skill via standard loader pipeline
- **Dismiss**: Record in `dismissals.json` with timestamp, start cooldown

## Storage

### recent-suggestions.json (circular buffer, max 50)
```json
[
  {
    "skill": "testing-anti-patterns",
    "confidence": 0.8,
    "signal_type": "error",
    "reason": "3+ mock-related test failures detected",
    "timestamp": "2026-05-26T10:30:00Z",
    "outcome": "accepted"
  }
]
```

### dismissals.json
```json
{
  "testing-anti-patterns:error": 1748262600000,
  "de-sloppify:task": 1748262300000
}
```

## Metrics

Track suggestion effectiveness:
- **Acceptance rate**: accepted / (accepted + dismissed) — target > 60%
- **Relevance rate**: accepted suggestions that led to skill activation / total accepted
- **False positive rate**: dismissed / total presented — target < 40%

Report in `/mindforge:status` output:
```
Proactive suggestions: 12 presented | 8 accepted (67%) | 4 dismissed
```

## Disable Conditions

Suggestions are automatically disabled when:
- `config.json` has `proactive_suggestions.enabled: false`
- Session is in autonomous mode (too noisy)
- Agent is in a time-critical path (shipping, hotfix)
- Budget is in economy mode (avoid context overhead)
