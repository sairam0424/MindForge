---
name: writing-skills
version: 1.0.0
min_mindforge_version: 10.0.6
status: stable
triggers: writing skill, skill authoring, skill format, skill schema, skill template, how to write skill, skill frontmatter, skill structure, skill design, skill best practice, reusable skill, skill guide
---

# Skill — Writing Skills

## When this skill activates
Any task involving authoring, designing, or reviewing MindForge skill files.
This includes creating new skills from scratch, refactoring existing skills,
reviewing skill quality, or understanding the skill schema and conventions.

## Mandatory actions when this skill is active

### Before writing any skill
1. **Clarify the skill's purpose.** Answer these three questions:
   - What problem does this skill solve? (One sentence.)
   - When should it activate? (Specific scenarios, not vague categories.)
   - What does it make the agent DO differently? (Observable behavior change.)
2. **Check for conflicts.** Review existing skills in `.mindforge/skills/` to ensure:
   - No trigger overlap (same keyword activating two different skills).
   - No scope overlap (two skills giving contradictory instructions for the same task).
   - Compose relationship is correct (child skill composes parent, not duplicates it).
3. **Determine if this is a standalone skill or a composed skill.**
   - Standalone: activates independently, covers a complete domain.
   - Composed (`compose: parent-skill`): extends a parent skill with specialization.
     The parent's instructions apply AND the child's instructions add specificity.

### During skill authoring

#### Frontmatter Schema (YAML)
```yaml
---
name: skill-name-kebab-case       # Required. Unique identifier.
version: 1.0.0                     # Required. SemVer.
min_mindforge_version: 10.0.6      # Required. Minimum framework version.
status: stable                     # Required. One of: draft, beta, stable, deprecated.
triggers: keyword1, keyword2, compound phrase, another trigger
                                   # Required. Comma-separated. 12+ recommended.
compose: parent-skill-name         # Optional. Name of parent skill this extends.
---
```

**Field rules:**
- `name`: Must match the directory name. Kebab-case. Globally unique across the registry.
- `version`: Follows semantic versioning. Bump minor for new content, major for breaking trigger changes.
- `min_mindforge_version`: The oldest framework version that supports this skill's features.
- `status`:
  - `draft` — Work in progress, may have incomplete sections.
  - `beta` — Functional but not battle-tested. May change.
  - `stable` — Production-ready. Trigger changes require major version bump.
  - `deprecated` — Superseded by another skill. Include migration note in body.
- `triggers`: The activation keywords. See "Trigger Design" section below.
- `compose`: If set, this skill inherits all instructions from the named parent skill.
  The agent applies BOTH the parent and this skill when activated.

#### Body Structure
```markdown
# Skill — [Human-Readable Name]

## When this skill activates
[1-3 sentences describing the exact scenarios. Be specific enough that an agent
can determine yes/no whether this skill applies.]

## Mandatory actions when this skill is active

### Before [writing code / starting the task]
[Numbered list of preparation steps. What must be checked/read/decided first.]

### During [implementation / the task]
[The core instructions. Checklists, patterns, code examples, decision trees.
This is the largest section. Organize with sub-headings.]

### After [implementation / the task]
[Verification steps. What to check, run, or validate before marking done.]

## [Optional: Domain-specific sections]
[Tables, reference data, anti-patterns, decision matrices, etc.]

## Self-check before task completion
[Checkbox list. Every skill MUST end with this section. These are the minimum
criteria that must be true before the agent considers the task complete.]
```

#### Trigger Design (Critical for Activation Accuracy)

**Quantity**: Aim for 12-20 triggers per skill. Fewer = missed activations. More = false positives.

**Types of triggers to include:**
1. **Direct name** — The skill's core concept: `kubernetes deployment`, `react performance`.
2. **Tool/library names** — Specific tools the skill covers: `cProfile`, `React.memo`, `helm chart`.
3. **Problem descriptions** — How users describe the need: `python bottleneck`, `unnecessary re-render`.
4. **Action phrases** — What users ask to do: `write a plan`, `create a skill`.
5. **Compound phrases** — Multi-word to avoid conflicts: `discriminated union` not just `union`.

**Trigger design rules:**
- Use compound phrases (2-3 words) to avoid false positives. `type` alone would fire on
  every TypeScript task. `conditional type` is specific.
- Include both the noun and verb forms: `profiling` AND `profile python`.
- Test mentally: "If a user says this trigger phrase in a prompt, should THIS skill activate?"
  If the answer is "maybe" — the trigger is too vague.
- Never use single common words as triggers (`code`, `fix`, `build`, `test`).
- Avoid triggers that overlap with other skills. Run a mental diff against similar skills.

**Trigger conflict resolution:**
- If two skills share a trigger, the more specific skill wins.
- If you cannot determine specificity, add a qualifying word to disambiguate.
- Example conflict: both `performance` and `react-performance` trigger on "performance".
  Resolution: `react-performance` uses `react performance` (compound), the generic
  `performance` skill handles the unqualified keyword.

#### Content Principles

1. **Actionable, not advisory.** Say "Do X" not "Consider doing X" or "It's good practice to X".
   - Bad: "You should consider adding error handling."
   - Good: "Add try/catch around the database call. Log the error with context. Return 500."

2. **Checklists, not essays.** Agents process structured lists faster than paragraphs.
   - Bad: "When working with generics, it's important to think about constraints because
     without them the type parameter is too broad and you lose type safety."
   - Good: "- Always constrain generic parameters: `<T extends Base>` not bare `<T>`."

3. **Complete code examples over descriptions.** Show the pattern, not just name it.
   - Bad: "Use the builder pattern for complex objects."
   - Good: [10-line code example of the builder pattern in the project's language]

4. **Under 500 lines.** If a skill exceeds 500 lines, it is trying to cover too much.
   Split into a parent skill + composed children.
   - Example: `performance` (parent, 120 lines of general principles) +
     `python-performance` (child, composes performance, 400 lines of Python specifics).

5. **Decision trees for conditional logic.** When the right action depends on context,
   provide explicit if/then:
   ```
   - IF the list has > 50 items → use virtualization
   - IF the list has 10-50 items → use React.memo on list items
   - IF the list has < 10 items → no optimization needed
   ```

6. **Anti-patterns section.** Include a list of common mistakes to flag. Agents benefit
   from knowing what NOT to do as much as what to do.

#### Quality Standards for Skill Content

- Every code example must be syntactically valid (could be pasted and would compile).
- All file paths in examples must use the project's actual structure conventions.
- Version numbers in examples must not be outdated (review annually).
- Commands must include expected output or success criteria.
- If a skill references an external tool, include the install command.

### After writing the skill

1. **Validate frontmatter.** Confirm all required fields present, triggers are comma-separated,
   version is valid SemVer.
2. **Trigger evaluation test.** For each trigger, mentally construct a user prompt that
   contains it and verify the skill SHOULD activate:
   ```
   Trigger: "discriminated union"
   Test prompt: "I need to model payment states as a discriminated union"
   Should activate? YES — this is exactly about TypeScript advanced types.
   ```
3. **Conflict scan.** Compare triggers against all existing skills:
   ```bash
   grep -r "^triggers:" .mindforge/skills/*/SKILL.md
   ```
   Flag any overlap and resolve per the rules above.
4. **Register in MANIFEST.md** (if the project maintains one). Add the skill entry
   with name, version, status, and trigger count.
5. **Test via eval harness** (if available):
   ```bash
   mindforge eval-skill --skill=new-skill-name --prompts=20
   ```
   Verify activation precision > 90% and recall > 85%.

## Skill review checklist (for reviewing others' skills)

| Criterion | Pass/Fail |
|---|---|
| Frontmatter has all required fields | |
| 12+ triggers, all compound (2+ words) | |
| No single-word triggers | |
| No trigger conflicts with existing skills | |
| "When this skill activates" is specific (yes/no determinable) | |
| Mandatory actions cover Before/During/After | |
| Self-check section present with checkboxes | |
| Content is actionable (imperatives, not suggestions) | |
| Code examples are syntactically valid | |
| Under 500 lines total | |
| No placeholder language ("as appropriate", "etc.") | |

## Skill lifecycle

| Status | Meaning | Allowed changes |
|---|---|---|
| draft | Under construction | Anything |
| beta | Functional, being tested | Content changes, trigger additions |
| stable | Production | Content patches only. Trigger changes = major version bump |
| deprecated | Being replaced | Only add migration notes pointing to successor |

## Self-check before task completion

Before marking a task done when this skill was active:

- [ ] Frontmatter validates (all required fields, valid SemVer, 12+ triggers).
- [ ] No trigger conflicts with existing skills (grep verified).
- [ ] Body follows the standard structure (activation, Before/During/After, self-check).
- [ ] Content is actionable (imperatives, checklists, code examples).
- [ ] Under 500 lines total.
- [ ] At least one code example included for the primary pattern.
- [ ] Self-check section has 5+ checkboxes covering the skill's key requirements.
- [ ] Trigger evaluation: 5+ test prompts mentally validated.
- [ ] Registered in MANIFEST.md (if applicable).
- [ ] No placeholder language in the body.
