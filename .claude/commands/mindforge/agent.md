---
name: mindforge:agent
description: Spawn or invoke a specialized enterprise persona from the MindForge library
argument-hint: "[persona-name] [prompt]"
allowed-tools:
  - list_dir
  - view_file
---

<objective>
Provide an on-demand mechanism to "spawn" any of the 13+ standardized MindForge personas. This allows the user to switch the AI assistant's context, role, and process to a specific specialized mode (e.g., Roadmapper, Security Reviewer, Analyst).
</objective>

<execution_context>
.claude/commands/mindforge/agent.md
</execution_context>

<context>
Personas Directory: `.mindforge/personas/`
State: Loads the persona's XML-tagged structure into the active system context.
</context>

<process>
1. **List Personas**: If no arguments are provided, list all available `.md` files in `.mindforge/personas/` with their name and description (parsed from YAML).
2. **Load Persona**: If a name is provided:
    - Locate `.mindforge/personas/[name].md`.
    - Read the file content.
    - Present the persona's role and success criteria to the user.
3. **Switch Mode**: Instruct the AI (through the current session context) to adopt the role, philosophy, and process defined in the loaded file.
4. **Initial Task**: If a prompt is provided as the second argument, immediately execute that prompt using the newly adopted persona.
</process>
