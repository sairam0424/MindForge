# Approved Tools & Libraries — [ORG NAME]

<!-- Reference for all agents when making dependency and tooling decisions -->

## Approved libraries (use these — do not use alternatives without approval)

### Authentication & security
| Purpose              | Library              | Version  | Notes                    |
|----------------------|----------------------|----------|--------------------------|
| Password hashing     | bcrypt               | ^5.1     | Cost factor 12 minimum   |
| JWT                  | jose                 | ^5.0     | NOT jsonwebtoken (CJS issues) |
| Crypto               | Node.js built-in     | —        | No third-party for basics |

### HTTP & API
| Purpose              | Library              | Version  | Notes                    |
|----------------------|----------------------|----------|--------------------------|
| HTTP server          | [e.g. Fastify]       | [^4.0]   |                          |
| Validation           | [e.g. Zod]           | [^3.0]   |                          |
| HTTP client          | [e.g. ky]            | [^1.0]   | Not axios                |

### Database
| Purpose              | Library              | Version  | Notes                    |
|----------------------|----------------------|----------|--------------------------|
| ORM                  | [e.g. Prisma]        | [^5.0]   |                          |
| Migrations           | [included in ORM]    | —        |                          |

### Testing
| Purpose              | Library              | Version  | Notes                    |
|----------------------|----------------------|----------|
| Test runner          | [e.g. Vitest]        | [^1.0]   |                          |
| Mocking              | [e.g. vitest mock]   | —        | Built-in preferred       |
| E2E                  | [e.g. Playwright]    | [^1.40]  |                          |

## Forbidden libraries (never use these)
| Library              | Reason                              | Use instead            |
|----------------------|-------------------------------------|------------------------|
| jsonwebtoken         | CommonJS, maintenance concerns      | jose                   |
| moment               | Large bundle, deprecated            | date-fns or Temporal   |
| lodash               | Unnecessary in modern JS/TS         | Native array methods   |
| request              | Deprecated                          | ky or fetch            |
| node-uuid            | Deprecated                          | crypto.randomUUID()    |

## MCP servers (for MindForge integrations)
| Service              | URL                                 | Purpose                |
|----------------------|-------------------------------------|------------------------|
| [e.g. Jira]          | [mcp url]                           | Issue tracking         |
| [e.g. Confluence]    | [mcp url]                           | Wiki                   |

## CI/CD tool versions
| Tool                 | Version  | Config file          |
|----------------------|----------|----------------------|
| Node.js              | 20 LTS   | .nvmrc               |
| [package manager]    | [ver]    |                      |
