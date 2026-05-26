---
description: "Design authentication and authorization flow. Usage: /mindforge:auth-flow [--type oauth2|session|jwt] [--mfa] [--authz rbac|abac]"
---

<objective>
Design a complete authentication and authorization flow including authn mechanism selection, token lifecycle, MFA integration, and authz model implementation with security audit considerations.
</objective>

<execution_context>
@.mindforge/skills/auth-patterns/SKILL.md
</execution_context>

<context>
Arguments: $ARGUMENTS (optional --type oauth2|session|jwt, optional --mfa flag, optional --authz rbac|abac)
Knowledge: Current auth implementation, user types, permission requirements, compliance needs (SOC2, GDPR).
</context>

<process>
1. **Identify auth requirements**: Assess the system needs:
   - User types: end-users, service accounts, admin, API consumers
   - Client types: SPA, mobile app, server-to-server, CLI
   - Session requirements: duration, concurrent sessions, device tracking
   - Compliance: SOC2 (audit logs), GDPR (consent, deletion), HIPAA (access controls)
   - Performance: auth check latency budget (< 5ms for hot path)
   - Scale: concurrent users, tokens in circulation, auth checks per second

2. **Select authn flow**: Based on --type flag or client analysis:
   - **OAuth2 + PKCE** (for SPAs/mobile): Authorization Code flow with PKCE, no client secret exposed
   - **Session-based** (for server-rendered): HTTP-only secure cookies, server-side session store
   - **JWT** (for APIs/microservices): Signed tokens with short expiry, refresh token rotation
   - For each: document the full flow (request → redirect → callback → token → validation)
   - Specify token storage location (httpOnly cookie, secure storage, never localStorage)
   - Define logout mechanism (token revocation, session invalidation, cookie clearing)

3. **Design token lifecycle**: Define the token management:
   - Access token: short-lived (15 min), contains minimal claims (sub, scope, exp)
   - Refresh token: longer-lived (7 days), rotated on each use (detect theft via reuse)
   - ID token: user profile claims, validated once at login
   - Token revocation: maintain revocation list or use short expiry + refresh
   - Token validation: signature check → expiry check → issuer check → audience check
   - Clock skew tolerance: 30 seconds maximum

4. **Add MFA if needed**: When --mfa flag is set:
   - Primary factors: password (argon2id hash), social login (OAuth2)
   - Second factors: TOTP (authenticator app), WebAuthn (hardware key), SMS (fallback only)
   - Step-up auth: require MFA for sensitive operations (password change, payment, admin)
   - Recovery: backup codes (10 single-use), admin override with audit log
   - Enrollment flow: optional at signup, required for admin/elevated roles
   - Remember device: trust for 30 days with device fingerprint

5. **Design authz model**: Based on --authz flag:
   - **RBAC** (Role-Based): Define roles (admin, editor, viewer) → map to permissions → assign to users
   - **ABAC** (Attribute-Based): Define policies based on subject attributes, resource attributes, action, and context
   - Permission granularity: resource-level (can edit ANY post) vs instance-level (can edit OWN posts)
   - Inheritance: role hierarchy (admin inherits editor permissions)
   - Deny-by-default: all access denied unless explicitly granted
   - Policy evaluation: eager (at login, cache in token) vs lazy (at access time, check service)
   - Group-based: assign roles to groups, users inherit from groups

6. **Implement**: Translate design to code:
   - Auth middleware: validate token on every request, attach user context
   - Permission check: decorator/middleware pattern at route or controller level
   - Service-to-service: mutual TLS or signed JWT with service identity
   - Rate limiting: per-user and per-IP on auth endpoints (prevent brute force)
   - Audit logging: log every auth event (login, logout, failure, permission denied, MFA challenge)
   - Error responses: generic messages (never reveal "user not found" vs "wrong password")

7. **Audit**: Validate the auth implementation:
   - OWASP Authentication Cheat Sheet compliance
   - Session fixation protection (regenerate session ID on login)
   - CSRF protection on state-changing endpoints (SameSite cookies + CSRF token)
   - Credential stuffing protection (rate limiting, CAPTCHA after N failures)
   - Token leakage vectors (URL parameters, referrer headers, logs)
   - Privilege escalation paths (horizontal: access other user data, vertical: gain admin)
   - Output: security assessment report with findings and remediation
</process>
