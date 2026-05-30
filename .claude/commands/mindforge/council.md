---
description: Invoke the 4-voice decision council (Architect, Skeptic, Pragmatist, Critic) for ambiguous architectural decisions. Usage - /mindforge:council [decision description] [--id decision-id]
---

<objective>
Run a structured multi-voice debate to resolve an ambiguous decision. Four specialist
voices (Architect, Skeptic, Pragmatist, Critic) analyze the decision via the
council-runtime engine, producing a verdict with consensus scoring and documented dissent.
</objective>

<execution_context>
@bin/engine/council-runtime.js
@bin/council-cli.js
@.mindforge/engine/council/council-protocol.md
@.mindforge/engine/council/council-templates.md
</execution_context>

<context>
$ARGUMENTS
</context>

<process>
1. Parse the decision description from $ARGUMENTS. Extract --id if provided.

2. **Execute the council runtime** by running:
   ```bash
   node bin/council-cli.js --id "<decision-id>" "<the full question>"
   ```
   - If no --id is provided, omit it (the runtime defaults to "council-latest").
   - The CLI outputs structured JSON to stdout and a human-readable summary to stderr.
   - Capture the JSON output for formatting.

3. **Parse the JSON result** which has this shape:
   ```json
   {
     "question": "...",
     "positions": [
       { "voice": "architect", "recommendation": "PROCEED|REVISE", "confidence": 0.0-1.0, "rationale": "..." },
       ...
     ],
     "consensus": 0.0-1.0,
     "verdict": "PROCEED|REVISE|NO_CONSENSUS",
     "dissent": [...]
   }
   ```

4. **Present the structured result** to the user in this format:

   ### Council Verdict

   **Question:** <the question>

   #### Positions

   For each position:
   - **[VOICE]** — <RECOMMENDATION> (confidence: <N.NN>)
     > <rationale>

   #### Consensus: <X.X%>

   #### Verdict: <PROCEED / REVISE / NO_CONSENSUS>

   If NO_CONSENSUS — show the full dissent split (all voices with their stances).
   If PROCEED or REVISE — show only the dissenting voices.

5. **Decision record** — The runtime automatically writes the decision to
   `.planning/decisions/council-<id>.json`. Confirm the file path to the user.

6. Log council invocation in AUDIT with: decision, voices, consensus, verdict.

7. Remind user: "Council is advisory — you have final say."

**Exit codes from the CLI:**
- 0 = PROCEED
- 1 = REVISE
- 2 = NO_CONSENSUS
- 3 = Error (show the error message)

**If the CLI fails** (exit code 3 or missing API keys), fall back to the prose-based
council protocol: run the debate manually using the 4 voice personas and synthesize
a verdict using the consensus algorithm (mean approval signal where PROCEED contributes
confidence and REVISE contributes 1-confidence; threshold 0.75).
</process>
