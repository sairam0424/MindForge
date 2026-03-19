---
name: api-design
version: 1.0.0
triggers: API, endpoint, REST, GraphQL, route, controller, handler, request, response,
          HTTP, POST, GET, PUT, PATCH, DELETE, schema, contract, versioning, OpenAPI
---

# Skill — API Design

## When this skill activates
Any task involving creating or modifying API endpoints, request/response schemas,
or API contracts.

## REST API standards

### URL conventions
- Lowercase, hyphen-separated: `/user-profiles` not `/userProfiles`
- Nouns for resources: `/orders` not `/getOrders`
- Hierarchy shows relationships: `/users/{id}/orders`
- Version in path: `/v1/users`

### HTTP method semantics
- GET: read only, idempotent, no body
- POST: create, non-idempotent, returns 201 + Location header
- PUT: full replace, idempotent
- PATCH: partial update, idempotent
- DELETE: remove, idempotent, returns 204

### Status codes (use precisely)
- 200 OK: successful GET, PUT, PATCH
- 201 Created: successful POST (include Location header)
- 204 No Content: successful DELETE
- 400 Bad Request: client validation error (include error details in body)
- 401 Unauthorized: missing or invalid authentication
- 403 Forbidden: authenticated but not authorised
- 404 Not Found: resource does not exist
- 409 Conflict: state conflict (duplicate, version mismatch)
- 422 Unprocessable Entity: semantic validation error
- 429 Too Many Requests: rate limit exceeded (include Retry-After header)
- 500 Internal Server Error: unexpected server error (never expose internals)

### Error response format (always consistent)
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Human-readable description",
    "details": [
      { "field": "email", "issue": "must be a valid email address" }
    ],
    "requestId": "req_abc123"
  }
}
```

### Request validation
- Validate at the route handler boundary, not deep in business logic
- Return all validation errors at once (not one at a time)
- Validate: type, format, length, range, required fields

### Security headers (add to every response)
```
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
Strict-Transport-Security: max-age=31536000; includeSubDomains
Content-Security-Policy: default-src 'self'
```

## Output
New endpoints must be documented in ARCHITECTURE.md under the API section
with: method, path, auth requirement, request schema, response schema, errors.

## Self-check before task completion

Before marking a task done when this skill was active:

- [ ] Did I read the full SKILL.md before starting? (Not just the triggers)
- [ ] Did I activate the corresponding persona file?
- [ ] Did I apply every mandatory action in this skill, not just the ones
  I remembered off the top of my head?
- [ ] If this skill produced an output file (review, security report, etc.),
  has that file been written to the correct path?

