---
name: mindforge:security-scan
description: Perform a standalone security scan for OWASP Top 10 vulnerabilities and leaked secrets
argument-hint: [path] [--deep] [--deps] [--secrets]
allowed-tools:
  - run_command
  - view_file
  - write_to_file
  - list_dir
---

<objective>
Execute a rigorous security audit of the codebase, scanning for OWASP vulnerabilities, hardcoded secrets, and vulnerable dependencies to ensure production readiness and compliance.
</objective>

<execution_context>
.claude/commands/mindforge/security-scan.md
</execution_context>

<context>
Mode: Runs entirely under the `security-reviewer.md` persona.
Flags: --deep (all files), --deps (CVE scan), --secrets (fast secret detection).
Output: .planning/SECURITY-SCAN-[timestamp].md
</context>

<process>
1. **Build Scope**: Determine target files using `git diff` or `find` based on flags.
2. **Top 10 Scan**: Audit for Access Control, Crypto failures, Injection, Insecure Design, etc.
3. **Secret Detection**: Run pattern-based grep for high-confidence strings (API keys, connection strings, private keys). Redact values in output.
4. **Dependency Audit**: If `--deps` is set, run `npm audit` or `pip-audit` and parse JSON for HIGH/CRITICAL CVEs.
5. **Generate Report**: Write `SECURITY-SCAN-[timestamp].md` with categorized findings and a final verdict (CLEAN/ISSUES).
6. **Alert**: If CRITICAL findings exist, block merging and display a prominent warning.
7. **Audit**: Log `security_scan_completed` event.
</process>
