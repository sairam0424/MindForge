# Harness Adapter Compliance Matrix

> Generated/validated by `bin/installer/harness-adapter-compliance.js`. The
> matrix block below is rendered from `ADAPTER_RECORDS` — do NOT hand-edit it.
> Run `node bin/installer/harness-adapter-compliance.js --check` (wired into CI)
> to verify this doc has not drifted from the records. Regenerate with
> `node bin/installer/harness-adapter-compliance.js > /tmp/m && ` paste the block.

## Compliance States

| State | Meaning |
| --- | --- |
| Native | MindForge can install or verify the surface directly for this harness. |
| Adapter-backed | MindForge has a thin adapter/transform surface, but parity differs by harness. |
| Instruction-backed | MindForge can provide guidance and files, but the harness does not expose the runtime hook/slash surface MindForge needs for enforcement. |
| Reference-only | Useful as design pressure or external runtime, but MindForge does not ship a direct installer/adapter for it. |

## Support Matrix

<!-- harness-adapter-compliance:matrix-start -->
| Harness or runtime | State | Supported assets | Unsupported or different surfaces | Install or onramp | Verification command | Risk notes |
| --- | --- | --- | --- | --- | --- | --- |
| Claude Code | Native | skills; commands (slash); hooks; MCP config; subagents; settings.json; plugin assets | Claude-native hooks do not imply parity in other harnesses | `npx mindforge-cc@latest --claude --local`; Claude plugin install | `node bin/harness-audit.js`; `node bin/install.js --check` | Do not load every skill by default; keep hooks opt-in and inspectable. |
| Antigravity (Gemini) | Adapter-backed | skills; commands (namespace:prefix); rules; MCP reference config | Command naming uses mindforge: namespace prefix; hook parity differs from Claude | `npx mindforge-cc@latest --antigravity --local` | `node bin/harness-audit.js` | Keep the .agent settings mirror in sync with .claude (Gemini mirror is live, not dead). |
| OpenCode | Adapter-backed | skills; commands (slash); MCP config; event adapter patterns | Event names and command dispatch differ from Claude Code | `npx mindforge-cc@latest --opencode --local` | `node bin/harness-audit.js` | Keep hook logic in shared scripts; adapt only event shape at the edge. |
| Gemini CLI | Instruction-backed | project-local instructions (GEMINI.md); skills; rules | No full hook parity; slash surface differs; ports must document drift | `npx mindforge-cc@latest --gemini --local` | `node bin/harness-audit.js` | Treat Gemini ports as ecosystem adapters until validated end-to-end inside Gemini CLI. |
| Cursor | Instruction-backed | Cursor rules; project-local skills; instruction entry file | No slash-command surface (supportsSlash:false); hook events differ from Claude | `npx mindforge-cc@latest --cursor --local` | `node bin/harness-audit.js` | Cursor adapters must preserve existing project rules and avoid silent overwrite. |
| GitHub Copilot | Instruction-backed | copilot-instructions.md entry; rules; project-local skills | No slash-command surface (supportsSlash:false); no native hook enforcement | `npx mindforge-cc@latest --copilot --local` | `node bin/harness-audit.js` | Treat hooks as policy text; Copilot has no runtime hook surface. |
| Terminal-only | Native | skills; rules; commands; bin/ scripts; harness audit; AUDIT.jsonl | No external UI; no automatic session control unless scripts run explicitly | Clone repo; run bin/ commands directly; use --local for project installs | `node bin/harness-audit.js`; `node tests/run-all.js` | This is the fallback contract; every higher-level adapter should degrade to it. |
<!-- harness-adapter-compliance:matrix-end -->
