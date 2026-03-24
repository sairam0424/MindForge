# Instructions for MindForge

- Use the get-shit-done skill when the user asks for MindForge or uses a `mindforge-*` command.
- Treat `/mindforge-...` or `mindforge-...` as command invocations and load the matching file from `.github/skills/mindforge-*`.
- When a command says to spawn a subagent, prefer a matching custom agent from `.github/agents`.
- Do not apply MindForge workflows unless the user explicitly asks for them.
- After completing any `mindforge-*` command (or any deliverable it triggers: feature, bug fix, tests, docs, etc.), ALWAYS: (1) offer the user the next step by prompting via `ask_user`; repeat this feedback loop until the user explicitly indicates they are done.
