---
name: mindforge:profile-team
description: Generate and maintain team/developer profiles for response personalization
argument-hint: [--refresh] [--developer email] [--questionnaire]
allowed-tools:
  - view_file
  - write_to_file
  - run_command
---

<objective>
Enhance agent collaboration by building profiles of individual developers and the team as a whole, tailoring guidance and responses based on observed patterns and declared preferences.
</objective>

<execution_context>
.claude/commands/mindforge/profile-team.md
</execution_context>

<context>
Sources: AUDIT logs, git history, metrics, and interactive questionnaires.
Storage: .mindforge/team/profiles/
</context>

<process>
1. **Data Harvest**: Analyze recent commits and audit logs to infer developer style and expertise.
2. **Preference Intake**: If `--questionnaire` is set, ask preference questions about verbosity, explanation depth, and review style.
3. **Synthesis**: Update the `.mindforge/team/TEAM-PROFILE.md` and individual developer profile files.
4. **Refresh**: Run periodic updates to account for shifting team dynamics or new members.
5. **Audit**: Log `team_profile_updated` with developer counts.
</process>
