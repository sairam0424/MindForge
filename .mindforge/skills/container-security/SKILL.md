---
name: container-security
version: 1.0.0
min_mindforge_version: 10.1.1
status: stable
triggers: container security, image scanning, runtime policy, rootless container, secrets injection, container network policy, pod security standard, image provenance, base image hardening, container isolation, runtime detection, supply chain container
compose: security-review
---

# Skill — Container Security

## When this skill activates
Any task involving container image security, runtime hardening,
Kubernetes security policies, container secret management,
or supply chain integrity for containerized workloads.

## Mandatory actions when this skill is active

### Before writing any code
1. Select base image strategy (distroless preferred, Alpine acceptable, Ubuntu last resort).
2. Identify secrets required and injection mechanism (never env vars in manifests).
3. Define network policy requirements (default-deny baseline).
4. Determine Pod Security Standard level (restricted > baseline > privileged).

### During implementation
- Pin base images by digest (not just tag) for reproducibility.
- Run as non-root user (UID > 10000).
- Set filesystem to read-only where possible.
- Drop all Linux capabilities, add back only what's needed.
- Never store secrets in image layers or environment variables in manifests.
- Use multi-stage builds to exclude build tools from runtime image.

### After implementation
- Run Trivy/Grype scan — block on CRITICAL or HIGH CVEs.
- Sign image with cosign and generate SBOM.
- Verify Pod Security Standard compliance.
- Test NetworkPolicy blocks unauthorized traffic.
- Confirm secrets are injected at runtime (not baked in).

## Image Scanning

### CI Pipeline Integration
```yaml
# Block deployment if critical CVEs found
- trivy image --severity CRITICAL,HIGH --exit-code 1 $IMAGE
```

### Scan Frequency
- On every build (CI gate).
- Weekly scheduled scan of running images (new CVEs discovered post-deploy).
- Before promotion between environments.

### Vulnerability Management
- CRITICAL: Block deployment, fix immediately.
- HIGH: Block deployment, fix within 48 hours.
- MEDIUM: Track, fix within sprint.
- LOW: Backlog, fix opportunistically.

## Base Image Strategy

| Priority | Image Type | Use Case |
|----------|-----------|----------|
| 1 | `gcr.io/distroless/static` | Go binaries, no shell needed |
| 2 | `gcr.io/distroless/base` | C/C++ apps needing libc |
| 3 | `alpine:3.x` | When shell/package manager needed |
| 4 | `ubuntu:22.04-minimal` | Complex runtime dependencies |

### Rules
- Pin by digest: `FROM alpine@sha256:abc123...`
- Rebuild weekly to pick up base image security patches.
- Never use `latest` tag in production.

## Runtime Hardening

### Pod Security Standards (Kubernetes)

**Restricted (target for all workloads):**
```yaml
securityContext:
  runAsNonRoot: true
  runAsUser: 10001
  readOnlyRootFilesystem: true
  allowPrivilegeEscalation: false
  capabilities:
    drop: ["ALL"]
  seccompProfile:
    type: RuntimeDefault
```

### Container Isolation
- Use gVisor or Kata Containers for untrusted workloads.
- Separate namespaces for different trust levels.
- Resource limits (CPU, memory) to prevent DoS.

## Secrets Management

### Injection Methods (Ranked)
1. **External Secrets Operator** → syncs from Vault/AWS SM to K8s Secret → volume mount.
2. **Vault Agent Sidecar** → injects secrets into shared volume at runtime.
3. **CSI Secret Store Driver** → mounts secrets as files.
4. **Sealed Secrets** → encrypted in Git, decrypted in cluster.

### Anti-patterns (NEVER do)
- Secrets as environment variables in Pod spec/Deployment manifest.
- Secrets baked into container image.
- Secrets in ConfigMaps.
- Secrets committed to Git (even "encrypted" without proper tooling).

## Network Policies

### Default Deny Baseline
```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: default-deny-all
spec:
  podSelector: {}
  policyTypes:
    - Ingress
    - Egress
```

Then explicitly allow required flows:
- Ingress: only from specific services/namespaces.
- Egress: only to required databases, APIs, DNS.

## Supply Chain Integrity

### Image Provenance
1. Sign all images with `cosign` in CI.
2. Generate SBOM (Software Bill of Materials) with `syft`.
3. Enforce signature verification in admission controller (Kyverno/OPA).
4. Use deterministic builds for reproducibility.

### Admission Control
- Reject unsigned images.
- Reject images from untrusted registries.
- Reject images with known critical CVEs.
- Reject pods violating security context requirements.

## Self-check
- [ ] Base image pinned by digest.
- [ ] Non-root user configured.
- [ ] Read-only filesystem enabled.
- [ ] All capabilities dropped (add back minimally).
- [ ] Image scanned with zero CRITICAL/HIGH CVEs.
- [ ] Secrets injected at runtime (not in manifest or image).
- [ ] NetworkPolicy default-deny applied.
- [ ] Image signed and SBOM generated.
- [ ] Pod Security Standard: restricted level.
