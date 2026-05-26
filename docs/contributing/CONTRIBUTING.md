# Contributing to MindForge

Thanks for contributing. MindForge prioritizes reliability, security, and
repeatability. Please follow the guidelines below.

## Workflow
1. Fork the repo and create a branch from `main`
2. Use branch prefix `feat/`, `fix/`, `chore/`, `docs/`, `test/`
3. Make small, focused commits with clear messages
4. Run tests before opening a PR

## Local setup
```bash
npm install
npm test
```

## Commit guidance
- One logical change per commit
- Avoid formatting-only changes mixed with functional changes
- No TODO comments in committed code

## Tests
Run the relevant suite for your change:
```bash
node tests/install.test.js
# plus any affected suites
```

## PR checklist
- [ ] Tests pass locally
- [ ] Docs updated (if behavior changed)
- [ ] New commands added to command reference
- [ ] Security-sensitive changes reviewed

## Security
If you find a vulnerability, do not open a public issue. Report via
`docs/security/SECURITY.md`.
