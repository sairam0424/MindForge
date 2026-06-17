---
name: auth-patterns
version: 1.0.0
min_mindforge_version: 0.1.0
status: stable
triggers: auth architecture design, oauth2 flow design, oidc implementation, session strategy design, jwt architecture pattern, token rotation strategy, mfa flow design, social login integration, rbac model design, abac policy engine, authorization architecture, identity provider pattern
compose: guardrails-and-safety
---

# Skill — Auth Patterns

## When this skill activates
Any task involving authentication flow design, authorization model selection,
token lifecycle management, MFA implementation, or identity provider integration.

## Mandatory actions when this skill is active

### Before writing any code
1. Identify the auth requirements: Who are the users? What are the trust boundaries?
2. Select the appropriate OAuth2 flow for the client type.
3. Decide between sessions and JWTs based on revocation requirements.
4. Map out the authorization model (RBAC vs ABAC vs hybrid).

### During implementation
- Never store plain-text credentials anywhere.
- Use short-lived access tokens (15 min max) with long-lived refresh tokens (7 days max).
- Implement token rotation on every refresh (detect reuse = compromised).
- Check permissions in code, never roles directly.
- Log every auth failure with context (IP, user agent, timestamp).

### After implementation
- Verify no auth bypass exists on any protected route.
- Test token expiration and refresh flows end-to-end.
- Confirm MFA cannot be bypassed via API directly.
- Run security scan on auth-related endpoints.

## OAuth2 Flows

### Authorization Code + PKCE (SPAs, Mobile)
```
1. Client generates code_verifier + code_challenge
2. Redirect to /authorize with code_challenge
3. User authenticates, IdP redirects with auth_code
4. Client exchanges auth_code + code_verifier for tokens
5. IdP verifies challenge, returns access + refresh tokens
```
Use for: Browser apps, mobile apps, any public client.

### Client Credentials (Machine-to-Machine)
```
1. Service sends client_id + client_secret to /token
2. IdP returns access token (no refresh token needed)
3. Service uses access token for API calls
```
Use for: Backend services, cron jobs, microservice-to-microservice.

### Device Authorization (CLI, TV)
```
1. Device requests device_code + user_code from /device/authorize
2. User visits verification URL, enters user_code
3. Device polls /token until user completes auth
```
Use for: CLI tools, IoT devices, smart TVs.

## Session vs JWT

### Sessions (Server-Side)
- **Pros**: Instantly revocable, smaller payload, server controls lifetime.
- **Cons**: Requires session store (Redis), sticky sessions or shared store in distributed systems.
- **Use when**: You need instant revocation, have a monolith or can share session store.

### JWT (Stateless)
- **Pros**: No server-side storage, works across services, self-contained claims.
- **Cons**: Cannot revoke until expiry (unless you add a blocklist, negating statelessness).
- **Use when**: Microservices, short-lived tokens acceptable, combined with refresh token rotation.

### Hybrid (Recommended)
- Short-lived JWT access token (15 min) — never stored server-side.
- Long-lived refresh token (7 days) — stored server-side, rotated on each use.
- Revoke by deleting refresh token and waiting for access token expiry.

## Token Rotation
```
1. Client sends refresh_token to /token
2. Server issues NEW access_token + NEW refresh_token
3. Server invalidates the OLD refresh_token
4. If old refresh_token is used again → COMPROMISED
5. Revoke entire token family (all refresh tokens for this session)
```

## MFA Implementation

### TOTP (Time-Based One-Time Password) — Preferred
- Generate shared secret, encode as QR code for authenticator apps.
- Verify with time-window tolerance (±1 step = 30 seconds).
- Store backup codes (hashed) for account recovery.

### WebAuthn / Passkeys — Most Secure
- Phishing-resistant (bound to origin).
- No shared secrets to steal.
- Use as primary or second factor.

### SMS — Last Resort
- Vulnerable to SIM swapping.
- Use only if no alternative and combine with other signals.

## Authorization Models

### RBAC (Role-Based Access Control)
```
User → Role → Permissions → Actions

// In code: check PERMISSION, not ROLE
if (user.hasPermission('posts:delete')) { ... }
// NOT: if (user.role === 'admin') { ... }
```

### ABAC (Attribute-Based Access Control)
```
Policy: user.department === resource.department AND user.clearance >= resource.classification

// More flexible than RBAC, but harder to audit
const allowed = evaluatePolicy(user.attributes, resource.attributes, action);
```

### Hybrid (RBAC + ABAC)
- Use RBAC for coarse-grained access (can this user access this module?).
- Use ABAC for fine-grained rules (can this user edit THIS specific resource?).

## Anti-patterns to avoid
- Storing JWT in localStorage (XSS vulnerable — use httpOnly cookies or memory).
- Checking roles instead of permissions in application code.
- Long-lived access tokens without refresh rotation.
- MFA bypass via direct API calls (always enforce server-side).
- Shared secrets in client-side code.
- Missing auth on internal/admin routes ("it's internal" is not security).

## Self-check before task completion

Before marking a task done when this skill was active:

- [ ] No plain-text credentials stored anywhere?
- [ ] Access tokens are short-lived (≤15 min)?
- [ ] Refresh token rotation implemented and reuse detected?
- [ ] Permissions checked in code (not roles)?
- [ ] Every protected route has auth middleware?
- [ ] Auth failures logged with sufficient context?
- [ ] MFA cannot be bypassed via API?
