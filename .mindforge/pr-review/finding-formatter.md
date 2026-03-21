# MindForge — PR Review Finding Formatter

## Purpose
Convert AI review output into structured findings for GitHub, JSON, or Markdown.

## Supported outputs

### GitHub Markdown
```
## 🤖 MindForge AI Code Review

### Summary
...

### Findings
**[HIGH]** `src/api/auth.ts:47` — Missing token expiry validation
> Add expiry validation before accepting the token.
```

### JSON
```json
{
  "summary": "...",
  "findings": [
    {
      "severity": "HIGH",
      "file": "src/api/auth.ts",
      "line": 47,
      "description": "Missing token expiry validation",
      "recommendation": "Add expiry validation before accepting the token"
    }
  ],
  "verdict": "REQUEST_CHANGES"
}
```

### GitHub annotations
```
::warning file=src/api/auth.ts,line=47::Missing token expiry validation
```

## Formatting rules
- Always preserve severity (CRITICAL/HIGH/MEDIUM/LOW)
- Include file and line number when present
- Do not auto-invent line numbers
- Keep recommendations actionable and specific
