# MindForge Metrics — Schema Reference

## Files
- `session-quality.jsonl`
- `phase-metrics.jsonl`
- `skill-usage.jsonl`
- `compaction-quality.jsonl`

All files are append-only JSONL.

## session-quality.jsonl fields
- session_id, date, phase, developer_id
- tasks_attempted, tasks_completed, tasks_failed
- verify_pass_rate, quality_gates_failed
- security_findings, context_compactions
- skills_loaded_count, antipatterns_detected
- session_quality_score, session_quality_score_raw

Score formula:
- base 100
- minus task/gate/security/antipattern penalties
- bonus for zero gate failures and zero security findings
- keep both raw and clamped (`0-100`) score for trend analysis

## phase-metrics.jsonl fields
- phase lifecycle and delivery coverage
- difficulty score
- security and UAT outcomes
- phase_quality_score

## skill-usage.jsonl fields
- date, phase, plan
- skill_name, skill_version
- trigger_type (`text_match|file_path_match|file_name_match`)
- trigger_keyword
- task_outcome, verify_passed_first_try

## compaction-quality.jsonl fields
- date, compaction_level, context_pct_at_compaction
- decisions_captured, discoveries_captured
- implicit_knowledge_items, quality_signals_captured
- next_session_continuation_success (auto-inferred where possible)
