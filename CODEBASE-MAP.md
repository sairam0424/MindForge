# MindForge Codebase Map

> Superseded — this file was a hand-maintained snapshot dated 2026-05-28 (v11.9.0 era) that
> drifted badly from the live tree (it undercounted commands, skills, and personas by 2-11x by
> the time this note was written). Rather than ship another point-in-time snapshot that will
> drift the same way, this page now points to the sources that are kept accurate on every
> release instead of duplicating them.

**Last verified against `package.json` version 11.9.5:**

| Item | Count | Verify yourself |
|---|---|---|
| Slash commands | 221 | `ls .claude/commands/mindforge/*.md \| wc -l` |
| Engine-tier skills | 232 | `ls .mindforge/skills/ \| wc -l` |
| Extended-tier skills | 123 | `ls .agent/skills/ \| wc -l` |
| Personas | 218 | `find .mindforge/personas -type f \| wc -l` |
| Subagents | 164 | `find subagents/categories -name '*.md' -not -name README.md \| wc -l` |
| Tests | 135 | `find tests -name '*.test.js' \| wc -l` |

**For architecture and behavior, read these instead of a static snapshot:**

- [CLAUDE.md](./CLAUDE.md) — the maintained, per-release-updated architecture description
  (layers, task lifecycle, single-sources-of-truth), including its own explicit caveats about
  what's aspirational vs. what actually runs.
- [docs/commands-reference.md](docs/commands-reference.md) — verified command reference.
- [README.md](./README.md) — *What is actually enforced* section, measured per install channel.
- [docs/research/2026-08-codebase-index.md](docs/research/2026-08-codebase-index.md) — the most
  recent adversarially-verified deep index, if you want subsystem-level detail.
