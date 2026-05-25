---
name: tool-design
version: 1.0.0
min_mindforge_version: 10.0.7
status: stable
triggers: tool design, ai tool interface, tool input schema, tool output contract, idempotent tool design, tool batching strategy, tool composition pattern, tool discovery mechanism, tool error semantics, function calling design, zod schema design, json schema tool
---

# Tool Design

## When this skill activates

This skill activates when designing tools (functions, APIs, MCP servers) that AI agents will invoke. It covers input schema design, output contracts, idempotency, error handling, batching, composition, and discoverability. Use this skill whenever building interfaces between AI models and executable capabilities.

## Mandatory actions when this skill is active

### Before

1. **Identify the consumer** — Determine which AI model(s) will use this tool. Different models have different tool-calling behaviors and schema support.
2. **Define the capability boundary** — One tool should do one thing well. If describing the tool requires "and" twice, split it into multiple tools.
3. **Survey existing tools** — Check if an existing tool already covers this capability. Duplicate tools confuse AI selection.
4. **Assess side effects** — Classify the tool as read-only (safe to retry) or write (requires idempotency). This drives the entire error handling strategy.

### During

#### Tool Anatomy

Every tool must define these components:

```typescript
{
  name: string,          // verb_noun format: "search_files", "create_user"
  description: string,   // 1-2 sentences: what it does, when to use it, when NOT to use it
  inputSchema: Schema,   // Typed, validated, documented
  outputSchema: Schema,  // Typed, consistent across success/error
  sideEffects: boolean,  // Does it change state?
  idempotent: boolean    // Safe to call twice with same input?
}
```

- **Name** — Use `verb_noun` format. Be specific: `search_codebase` not `search`. The model uses the name for selection.
- **Description** — This is the most important field for AI tool selection. Include: what it does, when to use it, when NOT to use it, and what it returns.
- **Negative guidance** — Tell the model when NOT to use the tool: "Do not use this for file reads; use read_file instead." Prevents misuse.

#### Schema Design

**TypeScript (Zod):**
```typescript
const inputSchema = z.object({
  query: z.string().min(1).describe("Search query, supports regex"),
  maxResults: z.number().int().min(1).max(100).default(10).describe("Max results to return"),
  filePattern: z.string().optional().describe("Glob pattern to filter files, e.g. '*.ts'")
});
```

**Schema principles:**
- Every field has a `description`. The AI reads descriptions to understand how to populate fields.
- Use constrained types: `min`, `max`, `enum`, `pattern`. Tighter schemas = fewer invalid calls.
- Required fields first, optional fields with sensible defaults after.
- Prefer flat schemas over deeply nested objects. AI models handle flat structures more reliably.
- Use `enum` for fixed option sets. Never rely on the AI guessing valid values from a description alone.

#### Output Contract

```typescript
// Success
{ success: true, data: T, metadata: { duration_ms: number, cached: boolean } }

// Error
{ success: false, error: { code: string, message: string, retryable: boolean, context: object } }
```

- **Consistent shape** — Success and error responses must share a common discriminator field (`success`). The AI parses both paths.
- **Typed error codes** — Use machine-readable codes: `FILE_NOT_FOUND`, `PERMISSION_DENIED`, `RATE_LIMITED`. Not just human messages.
- **Retryable flag** — Tell the AI whether retrying might work. This drives agent retry logic.
- **Context in errors** — Include what was attempted and why it failed: `{ attempted: "read /foo/bar.ts", reason: "file does not exist" }`.

#### Idempotency

- **Read operations** — Inherently idempotent. Safe to retry without side effects.
- **Write operations** — Require explicit idempotency design. Two approaches:
  - **Idempotency key** — Client provides a unique key. Server deduplicates. Same key = same result.
  - **Natural idempotency** — "set X to Y" is idempotent; "increment X" is not.
- **Implementation** — Store idempotency keys with TTL (24hr). Return cached result for duplicates. Critical because AI agents retry on network errors — non-idempotent tools create duplicates.

#### Error Semantics

| Error Category | Retryable | Agent Action |
|---------------|-----------|--------------|
| Validation error (bad input) | No | Fix input, call again |
| Not found | No | Report to user or try alternative |
| Permission denied | No | Escalate, request auth |
| Rate limited | Yes | Wait and retry with backoff |
| Timeout | Yes | Retry with longer timeout |
| Internal error | Maybe | Retry once, then escalate |
| Conflict (optimistic lock) | Yes | Re-read state, retry |

- **Never return bare strings for errors.** Always return typed error objects.
- **Include remediation hints** — If the error is fixable, tell the AI how: `"hint": "File path must be absolute. Received relative path."`.

#### Batching Strategy

- **When to batch** — Multiple independent calls that could be combined (e.g., reading 5 files in one call).
- **Batch input** — Accept arrays: `{ files: ["a.ts", "b.ts", "c.ts"] }` instead of 3 separate calls.
- **Partial success** — Report per-item results. Never all-or-nothing for batches.
- **Size limits** — Max 20 items per batch. Unbounded batches cause timeouts.
- **When NOT to batch** — Items with dependencies on each other's results require sequential calls.

#### Composition (Tools Calling Tools)

- **Max 2-depth** — Tool A can call Tool B, but B should not call C. Deep composition is impossible to debug.
- **Composition contracts** — Inner tools must have strict schemas. Outer tool validates intermediate results.
- **Transparency** — Document when tools call other tools internally.
- **Failure isolation** — Inner tool failures must be handled gracefully, not propagated raw.

#### Discovery Mechanism

- **Tool registry** — Catalog all tools with name, description, capability tags. Group by domain (file, search, git).
- **Descriptions for AI** — Optimize for AI selection ("when to use"), not human documentation.
- **Dynamic registration** — Tools added/removed at runtime must update the AI's available tool list.

### After

1. **Test with AI** — Verify the model selects correctly, provides valid inputs, and handles outputs properly.
2. **Test edge cases** — Invalid, empty, and max-size inputs. Verify error responses are informative.
3. **Measure latency** — Target <5 seconds for interactive use. Document selection criteria vs alternatives.

## Self-check before task completion

- [ ] Tool name follows verb_noun convention and is distinct from existing tools
- [ ] Description includes what, when to use, and when NOT to use
- [ ] Input schema has descriptions on every field with appropriate constraints
- [ ] Output contract is consistent (success/error discriminator, typed error codes)
- [ ] Write operations are idempotent (idempotency key or natural idempotency)
- [ ] Errors include retryable flag and remediation hints
- [ ] Batch operations support partial success/failure reporting
- [ ] Composition depth does not exceed 2 levels
- [ ] Tool tested with an AI model for correct selection and invocation
