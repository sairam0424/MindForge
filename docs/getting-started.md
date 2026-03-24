# MindForge — Getting Started

This guide gets you from zero to a working MindForge project in under five minutes.

## Install

MindForge is typically installed as a project-local dependency to ensure environment isolation.

```bash
# Antigravity (recommended for local development)
npx mindforge-cc@latest --antigravity --local

# Claude Code (alternative)
npx mindforge-cc@latest --claude --local
```

## Initialise Your Project

Open your agentic runtime (Antigravity or Claude Code) in your repository and run:

```bash
/mindforge:init-project
```

The `init-project` command scaffolds the framework in `.agent/` and creates your core planning files:

- `.planning/PROJECT.md`: Your roadmap and high-level vision.
- `.planning/REQUIREMENTS.md`: Detailed functional and technical specs.
- `.planning/STATE.md`: Real-time tracking of project health and milestones.

## The Standard Workflow

MindForge operates on a high-velocity 4-pillar lifecycle:

1. **Plan**: `/mindforge:plan-phase 1` (Strategic planning and task breakdown)
2. **Execute**: `/mindforge:execute-phase 1` (Autonomous execution in parallel waves)
3. **Verify**: `/mindforge:verify-phase 1` (Automated tests + Human-in-the-loop validation)
4. **Ship**: `/mindforge:ship 1` (Final delivery, PR generation, and release output)

## Next Steps

- Explore the [User Guide](user-guide.md) for advanced features.
- Switch to a specialized [Persona](PERSONAS.md) for target tasks.
- Join the community: `/mindforge:join-discord`.
