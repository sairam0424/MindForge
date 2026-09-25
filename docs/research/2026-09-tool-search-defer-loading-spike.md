# Tool Search Tool `defer_loading` — Feasibility Spike for MindForge as a Claude Code Plugin (2026-09-25)

> **Status:** Discovery spike only. No code changed. This document exists to answer one
> question honestly before any Phase 7 implementation task is written for it: can
> `mindforge-cc`, acting purely as a Claude Code *plugin* (a `.claude-plugin/plugin.json`
> manifest plus the commands/agents/skills/hooks/MCP servers it declares), request or
> influence `defer_loading` for its own tools? **Answer: no — there is no request surface
> for it on the plugin side of the interface.** Full reasoning below.

**Scope:** Task 6 of `docs/superpowers/plans/2026-09-25-v13-upgrade-research-adoption.md`
Phase 6. Verified against the live `plugins/mindforge/.claude-plugin/plugin.json` in this
repo and against the JSON Schema it declares, fetched live via two independent methods in
this session (a summarizing fetch and a raw `curl` + `python3 json.load`, cross-checked
against each other because sandboxed fetches have previously been observed returning
mocked/summarized content — the raw byte-level fetch is the load-bearing check here).

## Bottom line

`defer_loading` is a per-tool-definition **boolean field inside the Anthropic Messages API
request body** — it lives on an entry in the `tools` array of a `POST /v1/messages` call
(or, for MCP-sourced tools, on an `mcp_toolset` entry's `default_config`/`configs`). It is
set by whichever piece of software constructs that HTTP request. For a session with the
MindForge plugin enabled, that software is **Claude Code itself** — the harness decides
which tools it passes to the model (its own built-ins, MCP tools from configured servers,
skill-as-tool entries, etc.) get `defer_loading: true`. This very session's own tool list
demonstrates the pattern operationally: a large set of MCP tools appear only by name under
"deferred tools," to be loaded on demand via `ToolSearch` — a decision made entirely on the
harness side of the wire, not by any MCP server or plugin that registered those tools.

MindForge ships as a plugin: a `plugin.json` manifest plus `commands/`, `agents/`, `skills/`,
`hooks/`, and (optionally) an `mcpServers` block telling Claude Code *how to launch* an MCP
server MindForge provides. None of that surface lets a plugin author reach into the Messages
API request Claude Code sends to the model on the plugin's behalf. Confirmed directly: the
plugin manifest's own JSON Schema — the one `plugin.json` itself references — has no
`tools`, `toolSearch`, or `defer_loading`-shaped field anywhere in it.

**Conclusion: not actionable from MindForge's side.** This is not a workaround-needed gap;
it is a boundary that does not exist on the plugin side of the API at all. Recommend closing
this item rather than carrying it into a Phase 7 implementation task.

## What was checked, and how

### 1. The plugin manifest and its declared schema

`plugins/mindforge/.claude-plugin/plugin.json:2` declares:

```json
"$schema": "https://json.schemastore.org/claude-code-plugin-manifest.json",
```

That URL 301-redirects to `https://www.schemastore.org/claude-code-plugin-manifest.json`.
Fetched the schema body directly with `curl -s -L` (raw HTTP, not summarized) and parsed it
with `python3`'s `json` module:

```
$ curl -s -L "https://json.schemastore.org/claude-code-plugin-manifest.json" \
       -o /tmp/plugin-manifest-schema.json -w "HTTP_STATUS:%{http_code}\n"
HTTP_STATUS:200

$ python3 -c "import json; print(list(json.load(open('/tmp/plugin-manifest-schema.json'))['properties'].keys()))"
['$schema', 'name', 'version', 'description', 'author', 'homepage', 'repository', 'license',
 'keywords', 'dependencies', 'hooks', 'commands', 'agents', 'skills', 'outputStyles',
 'themes', 'channels', 'mcpServers', 'lspServers', 'monitors', 'settings', 'userConfig']

$ grep -in "toolSearch\|defer_loading\|deferLoading" /tmp/plugin-manifest-schema.json
(no matches)

$ grep -in '"tools"' /tmp/plugin-manifest-schema.json
(no matches)
```

That is the complete list of top-level properties (21 total) in the ~70 KB schema file.
None is named `tools` or `toolSearch`, and `defer_loading` / `deferLoading` does not appear
anywhere in the document, top-level or nested.

The *only* tool-related field anywhere in the schema is nested three levels down, inside a
`commands[]` array item's definition:

```json
"allowedTools": {
  "description": "Tools allowed when command runs",
  "type": "array",
  "items": { "type": "string" }
}
```

This restricts which tools a specific slash command is permitted to invoke while it runs —
an allow-list of tool names, evaluated per command invocation. It governs *permission*, not
*when a tool definition enters the model's context window*, which is what `defer_loading`
controls. These are unrelated mechanisms that happen to both mention "tools."

A second, independent fetch of the same schema URL (a summarizing WebFetch call) agreed with
the raw `curl` + `json.load` parse verbatim on the full property list and on the absence of
`tools`/`toolSearch`/`defer_loading` — no divergence between the two paths.

### 2. What `defer_loading` actually is, confirmed against Anthropic's current docs

Fetched `https://docs.claude.com/en/docs/agents-and-tools/tool-use/tool-search-tool`
(redirects to `https://platform.claude.com/docs/en/agents-and-tools/tool-use/tool-search-tool`)
via both a summarizing WebFetch and a raw `curl`, and cross-checked the `defer_loading`
sections between the two — byte-consistent. Per that page:

- `defer_loading: true` is a field set **on an individual tool definition inside the `tools`
  array sent in a Messages API request**, e.g.:
  ```json
  {
    "name": "get_weather",
    "description": "Get current weather for a location",
    "input_schema": { "...": "..." },
    "defer_loading": true
  }
  ```
- Quoted directly from the docs: "`defer_loading` controls what enters the context window,
  not what you send in the request... You still send every tool's full definition in the
  `tools` array on every request, including the deferred ones. The API needs them
  server-side to run the search and expand `tool_reference` blocks."
- For tools sourced through the MCP connector specifically: "If your tools come from MCP
  servers through the MCP connector, you don't set `defer_loading` on individual tool
  definitions. Instead, set it once on the `mcp_toolset` entry's `default_config` for the
  whole server, or per tool in its `configs`." That `mcp_toolset` entry is itself a member
  of the Messages API request's `tools` array — still API-caller-side, not MCP-server-side
  and not plugin-manifest-side.
- At least one tool (normally the tool search tool itself, `tool_search_tool_regex_20251119`
  or `tool_search_tool_bm25_20251119`) must remain non-deferred, or the API returns a 400
  ("At least one tool must have `defer_loading=false`. All tools cannot be deferred.").

Every lever named above — the `tools` array, the `mcp_toolset` entry, which tools get
`defer_loading: true` — belongs to whatever code calls `client.messages.create(...)` (or the
raw `POST /v1/messages`). For an interactive Claude Code session, that caller is the Claude
Code application itself, not any plugin it has loaded. A plugin's `mcpServers` block in
`plugin.json` tells Claude Code how to *launch* an MCP server (command, args, env) — it does
not let the plugin author annotate the resulting tool list with `defer_loading`, because the
plugin never constructs the Messages API request; Claude Code does, after aggregating tools
from all sources (built-ins, every configured MCP server, every enabled plugin).

This session is itself a live illustration of the pattern from the harness side: the tool
list surfaced to this session included a large set of MCP tools named but not schema'd,
explicitly described as "deferred tools" requiring a `ToolSearch` call to materialize — a
decision made entirely by Claude Code's own runtime, not by any of the MCP servers or
plugins that registered those tools.

## Answer to the brief's Step 1 question

> Is `defer_loading` a Messages-API-level parameter (controlled by whoever calls the API),
> or something a Claude Code plugin manifest/command can request?

**It is a Messages-API-level parameter for direct control.** The plugin manifest schema has no
field shaped like it, no field named `tools` or `toolSearch` at all, and the one tool-related
field that does exist (`commands[].allowedTools`) governs invocation permission, not
context-loading order. `mindforge-cc` cannot set, hint at, or override `defer_loading` from
inside a plugin — not through `plugin.json`, not through a command's frontmatter.

**Correction after a follow-up review pass:** `http`/`ws`-type MCP server entries (which a
plugin's `mcpServers` block can declare inline) support an `alwaysLoad` field. Its documented
effect isn't fully specified, but it plausibly forces that server's tools to connect/load
upfront rather than lazily on first tool call — i.e. an *indirect* lever over loading order for
a plugin's own MCP tools, distinct from setting the Messages API's `defer_loading` field
directly. So the precise claim is: `mindforge-cc` cannot set `defer_loading` itself from a
plugin, but its own `mcp-server/`'s `.mcp.json`/plugin-inline config could opt into `alwaysLoad`
if MindForge ever wanted its own tools to skip the deferred/first-use-connect path — a much
narrower, already-available lever than the Tool Search Tool capability this document is
actually scoping. Re-verify `alwaysLoad`'s exact semantics against
`https://code.claude.com/docs/en/mcp#scale-with-mcp-tool-search` before building against it.

## Disposition

**Close this item. Do not carry it into Phase 7 as an implementation task.** There is no
honest code change to write here — MindForge has no lever to pull for this specific
optimization. If Anthropic ever exposes a plugin-level hint for this (e.g. a manifest field
Claude Code reads to decide which of a plugin's own declared tools/commands to defer), that
would be a new, separately-verified finding at that time — not something to speculatively
build against today's schema.

A related but distinct and *unrelated-to-this-finding* idea: if MindForge's own MCP server
(`mcp-server/`) ever grows large enough to want tool search *among its own registered MCP
tools* (i.e. MindForge implementing a custom tool-search tool per the "Custom tool search
implementation" section of Anthropic's docs, returning `tool_reference` blocks itself), that
would be a server-side capability MindForge's own code could add — a different question from
"can a plugin manifest request `defer_loading`," which this document answers no to. Worth
flagging as a possible separate future finding, not folded into this one.

## Sources

- Schema checked: `https://json.schemastore.org/claude-code-plugin-manifest.json`
  (redirects to `https://www.schemastore.org/claude-code-plugin-manifest.json`), fetched
  2026-09-25.
- Feature docs checked:
  `https://docs.claude.com/en/docs/agents-and-tools/tool-use/tool-search-tool` (redirects to
  `https://platform.claude.com/docs/en/agents-and-tools/tool-use/tool-search-tool`), fetched
  2026-09-25.
- Repo file checked: `plugins/mindforge/.claude-plugin/plugin.json:2` (`$schema` field).
