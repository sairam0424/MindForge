---
name: mcp-server-patterns
version: 1.0.0
min_mindforge_version: 10.0.6
status: stable
triggers: mcp server, model context protocol, mcp tools, mcp resources, mcp prompts, stdio transport, streamable http, mcp registration, mcp handler, mcp schema, build mcp, mcp patterns
---

# Skill — MCP Server Patterns

## When this skill activates

When designing, building, or debugging Model Context Protocol (MCP) servers that
expose tools, resources, or prompts to AI agents. Use when implementing the server
side of MCP — registering capabilities, handling requests, managing transport, and
following protocol conventions.

MCP is the standard protocol for extending AI agents with external capabilities.
A well-built MCP server is the difference between an agent that can only talk and
one that can act.

## Mandatory actions when this skill is active

### Before building the MCP server

1. **Identify capability types needed:**

   | Type | Purpose | Agent interaction | Example |
   |------|---------|-------------------|---------|
   | **Tools** | Actions agents invoke | Agent calls with args, gets result | `create-file`, `run-query`, `send-email` |
   | **Resources** | Data agents read | Agent requests by URI, gets content | `file://`, `db://schema`, `config://env` |
   | **Prompts** | Reusable templates | Agent fills arguments, gets formatted prompt | `code-review`, `summarize`, `translate` |

2. **Choose transport:**

   | Transport | Use when | Characteristics |
   |-----------|----------|-----------------|
   | **stdio** | Local tools, CLI integration, dev/test | Process-based, simple, synchronous feel |
   | **Streamable HTTP** | Remote servers, multi-client, production | Scalable, stateless, HTTP-based |

3. **Design the schema contract:**
   - Every tool must have a typed input schema (Zod for TypeScript, Pydantic for Python)
   - Every resource must have a URI pattern and content type
   - Every prompt must declare its arguments with descriptions
   - Write the schema FIRST, implement SECOND (contract-first design)

4. **Plan error handling strategy:**
   - Tool errors: return structured error with code and message (never throw unhandled)
   - Resource not found: return appropriate MCP error code
   - Validation failures: return detailed field-level errors
   - Never expose internal stack traces to the client

### During MCP server implementation

**Project structure (TypeScript/Node.js):**
```
mcp-server-[name]/
  src/
    index.ts              # Server initialization and transport setup
    tools/
      index.ts            # Tool registration aggregator
      [tool-name].ts      # One file per tool
    resources/
      index.ts            # Resource registration aggregator
      [resource-name].ts  # One file per resource
    prompts/
      index.ts            # Prompt registration aggregator
      [prompt-name].ts    # One file per prompt
    lib/
      errors.ts           # Custom MCP error classes
      schemas.ts          # Shared Zod schemas
  tests/
    tools/
      [tool-name].test.ts
    integration/
      stdio.test.ts       # Full server integration via stdio
  package.json
  tsconfig.json
```

**Tool registration pattern:**
```typescript
import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

const InputSchema = z.object({
  filePath: z.string().describe("Absolute path to the target file"),
  content: z.string().describe("Content to write to the file"),
  overwrite: z.boolean().default(false).describe("Whether to overwrite existing files"),
});

export function registerCreateFileTool(server: McpServer) {
  server.tool(
    "create-file",
    "Create a new file with the specified content at the given path",
    InputSchema.shape,
    async ({ filePath, content, overwrite }) => {
      // Validate path is within allowed directories
      validatePath(filePath);

      // Check existing file
      if (!overwrite && await fileExists(filePath)) {
        return {
          content: [{ type: "text", text: `Error: File already exists at ${filePath}. Use overwrite: true to replace.` }],
          isError: true,
        };
      }

      await writeFile(filePath, content);

      return {
        content: [{ type: "text", text: `Successfully created file at ${filePath} (${content.length} bytes)` }],
      };
    }
  );
}
```

**Resource registration pattern:**
```typescript
export function registerFileResource(server: McpServer) {
  // Static resource
  server.resource(
    "project-config",
    "config://project",
    "The project's configuration file",
    async (uri) => ({
      contents: [{
        uri: uri.href,
        mimeType: "application/json",
        text: await readFile("./config.json", "utf-8"),
      }],
    })
  );

  // Dynamic resource with URI template
  server.resource(
    "source-file",
    new ResourceTemplate("file:///{path}", { list: undefined }),
    "Read a source file by path",
    async (uri, { path }) => ({
      contents: [{
        uri: uri.href,
        mimeType: getMimeType(path),
        text: await readFile(path, "utf-8"),
      }],
    })
  );
}
```

**Prompt registration pattern:**
```typescript
export function registerCodeReviewPrompt(server: McpServer) {
  server.prompt(
    "code-review",
    "Generate a structured code review for the given diff",
    {
      diff: z.string().describe("The git diff to review"),
      severity: z.enum(["quick", "thorough", "security"]).default("thorough")
        .describe("Review depth level"),
    },
    ({ diff, severity }) => ({
      messages: [{
        role: "user",
        content: {
          type: "text",
          text: `Review this code diff at ${severity} level:\n\n${diff}\n\nProvide findings as: [SEVERITY] file:line - description`,
        },
      }],
    })
  );
}
```

**Transport setup:**
```typescript
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";

const server = new McpServer({
  name: "my-mcp-server",
  version: "1.0.0",
});

// Register all capabilities
registerTools(server);
registerResources(server);
registerPrompts(server);

// stdio transport (local/CLI)
const transport = new StdioServerTransport();
await server.connect(transport);

// OR: Streamable HTTP transport (remote/production)
// const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
// app.post("/mcp", async (req, res) => { await transport.handleRequest(req, res); });
```

**Error handling (mandatory):**
```typescript
import { McpError, ErrorCode } from "@modelcontextprotocol/sdk/types.js";

// In tool handlers:
if (!isValid(input)) {
  throw new McpError(
    ErrorCode.InvalidParams,
    `Invalid input: ${validationErrors.join(", ")}`
  );
}

// For "soft" errors (operation failed but not a protocol error):
return {
  content: [{ type: "text", text: `Operation failed: ${reason}` }],
  isError: true,
};
```

**Security considerations:**
- Validate all file paths against an allowlist of directories
- Sanitize inputs that will be used in shell commands or SQL
- Rate limit tool invocations if exposed over HTTP
- Log all tool invocations for audit trail
- Never expose secrets through resource responses
- Use environment variables for sensitive configuration

### After MCP server implementation

1. **Testing protocol:**
   - Unit test each tool handler with valid inputs, invalid inputs, and edge cases
   - Integration test via stdio transport (spawn server, send requests, verify responses)
   - Use MCP Inspector for interactive testing during development:
     ```bash
     npx @modelcontextprotocol/inspector node dist/index.js
     ```
   - Test error paths: malformed requests, missing required fields, timeout scenarios
   - Verify resource URIs resolve correctly under all template patterns

2. **Documentation requirements:**
   - README with: what the server does, prerequisites, installation, configuration
   - Tool catalog: name, description, input schema, example usage, error cases
   - Resource catalog: URI patterns, content types, access patterns
   - Configuration: all environment variables with types and defaults

3. **Deployment checklist:**
   - `package.json` has correct `bin` entry for stdio servers
   - `"type": "module"` set if using ESM
   - All dependencies are production dependencies (not devDependencies)
   - Server starts cleanly with no warnings or unhandled rejections
   - Graceful shutdown on SIGTERM/SIGINT

## Self-check before task completion

Before marking an MCP server task done:

- [ ] Did I define typed input schemas for every tool (Zod/Pydantic)?
- [ ] Did I implement proper error handling (McpError with codes, isError for soft failures)?
- [ ] Did I validate and sanitize all inputs (especially file paths and shell args)?
- [ ] Did I write integration tests using stdio transport?
- [ ] Did I test with MCP Inspector to verify the server works interactively?
- [ ] Did I document all tools, resources, and prompts with examples?
- [ ] Did I choose the appropriate transport for the deployment context?
- [ ] Does the server start cleanly and shut down gracefully?
