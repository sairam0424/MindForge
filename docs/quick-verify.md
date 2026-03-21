# MindForge Quick Verify (v1.0.0)

Use this after installation to confirm everything works.

## 1. Health check
```
/mindforge:health
```

## 2. Create minimal project state
```
/mindforge:init-project
```

## 3. Verify core files exist
Expected:
- `.planning/PROJECT.md`
- `.planning/STATE.md`
- `.planning/HANDOFF.json`
- `.planning/AUDIT.jsonl`

## 4. Optional repair
If anything looks off:
```
/mindforge:health --repair
```

## 5. Clean success signal
Run:
```
/mindforge:status
```
You should see a valid phase status and next action.
