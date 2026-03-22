# MindForge v2 — Model Router
# Version: v2.0.0-alpha.3

## Routing Logic

The MindForge router resolves which model to use at task dispatch time using this algorithm:

1. **Check Persona:** Map the task `<persona>` to a setting key.
   - `developer` → `EXECUTOR_MODEL`
   - `architect` → `PLANNER_MODEL`
   - `security-reviewer` → `SECURITY_MODEL`
   - `qa-engineer` → `QA_MODEL`
   - `research-agent` → `RESEARCH_MODEL`
   - `debug-specialist` → `DEBUG_MODEL`
   - `unknown` → `EXECUTOR_MODEL`

2. **Check Tier Override:**
   - If `tier == 3` (Security/Privacy), force `SECURITY_MODEL` regardless of persona.

3. **Check Budget Bias:**
   - If `difficulty < 2.0` and `MODEL_PREFER_CHEAP_BELOW_DIFFICULTY` is set:
     - Use `QUICK_MODEL` instead of the resolved model.

4. **Resolve Model ID:**
   - Read the setting key from `MINDFORGE.md`.
   - Use baked-in defaults if not present.

5. **Verify Availability:**
   - Check if matching `[PROVIDER]_API_KEY` is present in environment.
   - If missing: Apply fallback chain from `model-registry.md`.
