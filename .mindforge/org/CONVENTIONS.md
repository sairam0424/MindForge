# Coding Conventions — [ORG NAME]

<!-- These conventions are loaded by every MindForge agent session -->
<!-- Agents follow these exactly — be precise -->

## Naming conventions
| Element          | Convention      | Example                        |
|------------------|-----------------|--------------------------------|
| Variables        | camelCase        | `userProfile`                  |
| Functions        | camelCase        | `getUserById`                  |
| Classes          | PascalCase       | `UserService`                  |
| Constants        | SCREAMING_SNAKE  | `MAX_LOGIN_ATTEMPTS`           |
| File names       | kebab-case       | `user-service.ts`              |
| DB tables        | snake_case plural| `user_profiles`                |
| DB columns       | snake_case       | `created_at`                   |
| API endpoints    | kebab-case       | `/user-profiles/{id}`          |
| Env variables    | SCREAMING_SNAKE  | `DATABASE_URL`                 |

## File structure
```
src/
  features/          ← Feature-based organisation
    auth/
      auth.controller.ts
      auth.service.ts
      auth.repository.ts
      auth.types.ts
      auth.test.ts
  shared/            ← Shared utilities and types
  config/            ← Configuration and env validation
```

## Import order (enforced by linter)
1. Node.js built-ins
2. External packages
3. Internal absolute imports
4. Internal relative imports
(Blank line between each group)

## Commit message format (Conventional Commits)
```
type(scope): short description

[optional body]

[optional footer: BREAKING CHANGE or closes #issue]
```
Types: feat, fix, chore, docs, test, refactor, perf, security, build, ci

## Forbidden patterns
<!-- Agents will refuse to write code that contains these -->
- No `var` — use `const` or `let`
- No `any` type in TypeScript without a comment explaining why
- No `as unknown as X` type casting without a comment
- No default exports (use named exports)
- No `console.log` in production code
- No empty catch blocks
- No direct database access from route handlers (use service layer)
- No business logic in controllers/handlers (use service layer)
- No hardcoded URLs — use config/environment variables
- No synchronous file I/O in request handlers
```
