# MindForge — GitLab CI Integration

## Purpose
Define a GitLab CI template that runs MindForge in CI mode.

## Example `.gitlab-ci.yml`

```yaml
stages:
  - mindforge

mindforge:
  stage: mindforge
  image: node:20
  variables:
    CI: "true"
    MINDFORGE_CI: "true"
  script:
    - npx mindforge-cc@latest --claude --local
    - node bin/validate-config.js
    - node tests/ci-mode.test.js
  artifacts:
    when: always
    paths:
      - .planning/HANDOFF.json
      - .planning/STATE.md
```

## Notes
- Add secrets (ANTHROPIC_API_KEY, SLACK_BOT_TOKEN, etc.) to GitLab CI variables.
- If CI times out, MindForge exits 0 and preserves HANDOFF.json for the next run.
