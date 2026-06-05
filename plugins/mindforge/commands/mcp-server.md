---
description: "Scaffold MCP server implementation with tools, resources, and prompts. Usage: /mindforge:mcp-server [name] [--transport stdio|http] [--tools list]"
---

<objective>
Scaffold a complete MCP (Model Context Protocol) server implementation with well-designed tools, resources, and prompts — ready for integration with Claude, VS Code, or any MCP-compatible client.
</objective>

<execution_context>
@.mindforge/skills/mcp-server-patterns/SKILL.md
</execution_context>

<context>
Arguments: $ARGUMENTS (server name, optional --transport stdio|http, optional --tools comma-separated list)
Knowledge: MCP specification, existing server patterns, client capabilities, Zod schema patterns.
</context>

<process>
1. **Identify capabilities**: Based on the server name and --tools flag, determine:
   - What domain does this server expose? (database, API, file system, service)
   - What operations should be available as tools? (CRUD, queries, actions)
   - What data should be exposed as resources? (documents, schemas, configs)
   - What prompts would help users interact effectively?
   - What permissions/scopes are needed?

2. **Design tool schemas**: For each tool, define with Zod:
   - Tool name (verb-noun format: `query_database`, `create_issue`)
   - Description (clear, concise, explains when to use it)
   - Input schema (Zod object with descriptions per field)
   - Required vs optional parameters
   - Validation rules (min/max, regex patterns, enums)
   - Example inputs for documentation

3. **Design resources**: For each resource, define:
   - URI pattern (e.g., `myserver://projects/{id}/config`)
   - MIME type (application/json, text/markdown, etc.)
   - Description of what the resource represents
   - Whether it supports subscriptions (live updates)
   - Access pattern (list → read, or direct URI)

4. **Choose transport**: Based on --transport flag or requirements:
   - `stdio`: For local CLI integration (simpler, lower latency, single client)
   - `http`: For remote/multi-client access (SSE for server→client, HTTP POST for client→server)
   - Document the connection lifecycle and reconnection behavior
   - Configure appropriate timeouts and keep-alive settings

5. **Scaffold implementation**: Generate the project structure:
   - `src/index.ts` — Server entry point and transport setup
   - `src/tools/` — One file per tool with handler and schema
   - `src/resources/` — Resource providers with URI routing
   - `src/prompts/` — Prompt templates with argument schemas
   - `package.json` — Dependencies (@modelcontextprotocol/sdk, zod)
   - `tsconfig.json` — Strict TypeScript configuration

6. **Add error handling**: Implement robust error handling:
   - Typed error codes (InvalidParams, MethodNotFound, InternalError)
   - User-friendly error messages (not stack traces)
   - Graceful degradation when external services are unavailable
   - Request validation before processing (fail fast)
   - Timeout handling for long-running operations

7. **Implement tool handlers**: For each tool:
   - Parse and validate input against Zod schema
   - Execute the operation with proper error boundaries
   - Return structured results (content array with type and text/image)
   - Log operations for debugging (structured JSON logs)
   - Handle cancellation for long-running tools

8. **Add prompts**: Design prompt templates that:
   - Guide users toward effective tool usage
   - Include argument schemas for dynamic prompts
   - Provide context about server capabilities
   - Suggest workflows combining multiple tools

9. **Test with MCP Inspector**: Generate test configuration:
   - Inspector connection config (transport settings)
   - Test cases for each tool (valid inputs, edge cases, error cases)
   - Resource listing and read verification
   - Prompt rendering with sample arguments
   - Connection lifecycle testing (connect, disconnect, reconnect)

10. **Output documentation**: Generate:
    - README.md with installation and usage instructions
    - Tool reference (auto-generated from schemas)
    - Resource URI reference
    - Example client configuration for Claude Desktop / VS Code
    - Troubleshooting guide (common connection issues)
</process>
