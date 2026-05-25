---
name: k8s-deployment
version: 1.0.0
min_mindforge_version: 10.0.6
status: stable
triggers: kubernetes deployment, helm chart, rolling update, HPA autoscaling, pod disruption budget, network policy, resource quota, liveness probe, readiness probe, ingress controller, k8s manifest, container orchestration
---

# Skill — Kubernetes Deployment

## When this skill activates
Any task involving Kubernetes deployments: writing or modifying manifests, Helm charts,
configuring autoscaling, probes, network policies, ingress, resource management,
or deployment strategies for containerized workloads.

## Mandatory actions when this skill is active

### Before writing any code
1. Identify the deployment requirements:
   - Target environment (dev/staging/production)
   - Availability requirements (SLA target, max acceptable downtime)
   - Scale expectations (baseline replicas, peak load multiplier)
   - Network exposure (internal only, public ingress, specific CIDR allowlists)
2. Check existing cluster state:
   ```bash
   kubectl get nodes -o wide          # Cluster capacity
   kubectl top nodes                   # Current resource usage
   kubectl get namespaces              # Available namespaces
   kubectl get resourcequotas -A       # Existing quotas
   ```
3. Determine if Helm or raw manifests are appropriate:
   - **Helm**: Multiple environments, parameterized configs, community chart availability.
   - **Raw manifests + Kustomize**: Simpler apps, GitOps with ArgoCD/Flux, overlay-based config.

### During implementation

#### Deployment Strategies
- **RollingUpdate** (default, recommended for most services):
  ```yaml
  apiVersion: apps/v1
  kind: Deployment
  metadata:
    name: my-service
  spec:
    replicas: 3
    strategy:
      type: RollingUpdate
      rollingUpdate:
        maxSurge: 1          # Max extra pods during update
        maxUnavailable: 0    # Zero downtime: never kill before new is ready
    selector:
      matchLabels:
        app: my-service
    template:
      metadata:
        labels:
          app: my-service
      spec:
        containers:
        - name: my-service
          image: registry.example.com/my-service:v1.2.3
          # ... rest of spec
  ```
- **Recreate** (only for stateful apps that cannot run two versions simultaneously):
  ```yaml
  strategy:
    type: Recreate
  ```
- **Blue/Green** (via service selector swap or Argo Rollouts):
  Deploy new version as separate deployment, switch service selector when healthy.
- **Canary** (via Argo Rollouts or Istio traffic splitting):
  Route percentage of traffic to new version, promote or rollback based on metrics.

#### Helm Chart Structure
```
my-chart/
  Chart.yaml          # Chart metadata (name, version, appVersion)
  values.yaml         # Default configuration values
  values-staging.yaml # Environment-specific overrides
  values-prod.yaml
  templates/
    _helpers.tpl      # Template helpers and labels
    deployment.yaml
    service.yaml
    hpa.yaml
    ingress.yaml
    configmap.yaml
    secret.yaml       # Reference to external secrets, not raw values
    pdb.yaml
    networkpolicy.yaml
    serviceaccount.yaml
  tests/
    test-connection.yaml
```

- **Chart.yaml** must include:
  ```yaml
  apiVersion: v2
  name: my-service
  version: 1.0.0       # Chart version (bump on chart changes)
  appVersion: "1.2.3"  # Application version (matches container tag)
  ```
- **values.yaml** conventions:
  ```yaml
  replicaCount: 3
  image:
    repository: registry.example.com/my-service
    tag: ""            # Overridden per environment
    pullPolicy: IfNotPresent
  resources:
    requests:
      cpu: 100m
      memory: 128Mi
    limits:
      cpu: 500m
      memory: 512Mi
  ```

#### HPA (Horizontal Pod Autoscaler)
```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: my-service
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: my-service
  minReplicas: 3         # Never go below 3 for production
  maxReplicas: 20        # Cap to prevent runaway scaling
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70    # Scale up at 70% CPU
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80
  behavior:
    scaleDown:
      stabilizationWindowSeconds: 300   # Wait 5min before scaling down
      policies:
      - type: Percent
        value: 25
        periodSeconds: 60               # Max 25% reduction per minute
    scaleUp:
      stabilizationWindowSeconds: 30
      policies:
      - type: Percent
        value: 100
        periodSeconds: 30               # Can double pods in 30s
```

- Custom metrics (requests per second, queue depth) via Prometheus adapter:
  ```yaml
  - type: Pods
    pods:
      metric:
        name: http_requests_per_second
      target:
        type: AverageValue
        averageValue: "1000"
  ```

#### Pod Disruption Budget (PDB)
```yaml
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: my-service-pdb
spec:
  minAvailable: 2        # Always keep at least 2 pods running
  # OR: maxUnavailable: 1  # At most 1 pod can be down
  selector:
    matchLabels:
      app: my-service
```
- **Always create a PDB for production workloads.** Without one, cluster upgrades and
  node drains can take down all pods simultaneously.
- Rule of thumb: `minAvailable` = `replicas - 1` or use `maxUnavailable: 1`.

#### Probes (Health Checks)
```yaml
containers:
- name: my-service
  livenessProbe:           # Is the process alive? Restart if failing.
    httpGet:
      path: /healthz
      port: 8080
    initialDelaySeconds: 15
    periodSeconds: 10
    failureThreshold: 3    # 3 failures = restart
    timeoutSeconds: 3
  readinessProbe:          # Is it ready for traffic? Remove from LB if failing.
    httpGet:
      path: /readyz
      port: 8080
    initialDelaySeconds: 5
    periodSeconds: 5
    failureThreshold: 2
    timeoutSeconds: 3
  startupProbe:            # For slow starters. Disables liveness/readiness until passing.
    httpGet:
      path: /healthz
      port: 8080
    initialDelaySeconds: 0
    periodSeconds: 5
    failureThreshold: 30   # 30 * 5s = 150s max startup time
    timeoutSeconds: 3
```
- **liveness**: "Is the process stuck?" Triggers container restart. Keep simple (not DB-dependent).
- **readiness**: "Can it serve requests?" Controls load balancer membership. Can check dependencies.
- **startup**: Use for apps that take > 30s to initialize (JVM warmup, large model loading).

#### Resource Requests and Limits
```yaml
resources:
  requests:              # Scheduling guarantee (must be available)
    cpu: 100m           # 0.1 CPU cores
    memory: 256Mi       # 256 MiB RAM
  limits:               # Hard ceiling (OOMKilled if exceeded for memory)
    cpu: 1000m          # 1 CPU core (throttled, not killed)
    memory: 512Mi       # OOMKilled if exceeded
```
- **Requests**: Set to observed p50 usage. Cluster scheduler uses this for placement.
- **Limits**: Set to observed p99 + 20% headroom. Too tight = OOMKills. Too loose = noisy neighbors.
- **CPU limits debate**: Some teams remove CPU limits (use only requests) to avoid throttling.
  This is acceptable if the cluster has sufficient headroom and resource quotas protect namespaces.
- Always set memory limits (OOM without limits can crash the node).

#### Network Policies
```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: default-deny-all
  namespace: my-namespace
spec:
  podSelector: {}          # Applies to all pods in namespace
  policyTypes:
  - Ingress
  - Egress
---
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-my-service-ingress
  namespace: my-namespace
spec:
  podSelector:
    matchLabels:
      app: my-service
  policyTypes:
  - Ingress
  ingress:
  - from:
    - namespaceSelector:
        matchLabels:
          name: ingress-nginx
    ports:
    - protocol: TCP
      port: 8080
```
- **Default deny first**, then allow specific traffic paths.
- Minimum for production: deny all ingress/egress, then whitelist:
  1. Ingress controller to service pods.
  2. Service pods to database pods.
  3. Egress to external APIs (specific IPs/CIDRs if possible).

#### Ingress Configuration
```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: my-service-ingress
  annotations:
    cert-manager.io/cluster-issuer: letsencrypt-prod
    nginx.ingress.kubernetes.io/rate-limit: "100"
    nginx.ingress.kubernetes.io/rate-limit-window: "1m"
spec:
  ingressClassName: nginx
  tls:
  - hosts:
    - api.example.com
    secretName: api-tls-cert
  rules:
  - host: api.example.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: my-service
            port:
              number: 80
```
- Always configure TLS termination (use cert-manager for automatic certificate management).
- Add rate limiting annotations to prevent abuse.
- Use path-based routing to split traffic to different services under one domain.

### After implementation
1. Validate manifests before applying:
   ```bash
   helm template my-chart ./chart -f values-prod.yaml | kubectl apply --dry-run=client -f -
   kubectl diff -f manifest.yaml    # Show what would change
   ```
2. Verify rollout health:
   ```bash
   kubectl rollout status deployment/my-service --timeout=300s
   kubectl get pods -l app=my-service -o wide
   kubectl top pods -l app=my-service
   ```
3. Test probes manually:
   ```bash
   kubectl exec -it <pod> -- curl -s localhost:8080/healthz
   kubectl exec -it <pod> -- curl -s localhost:8080/readyz
   ```
4. Verify network policies:
   ```bash
   # From a test pod, confirm blocked traffic is actually blocked
   kubectl run test --rm -it --image=busybox -- wget -qO- --timeout=3 http://my-service:8080
   ```
5. Test PDB during a drain:
   ```bash
   kubectl drain <node> --ignore-daemonsets --dry-run=client
   ```

## Common mistakes to flag

- No PDB on production deployments (cluster upgrades will cause downtime).
- Liveness probe checks database connectivity (cascading restarts on DB issues).
- No resource limits (one pod can starve the entire node).
- `latest` tag in production (non-reproducible deployments).
- Secrets in ConfigMaps or values.yaml (use sealed-secrets, external-secrets, or vault).
- No network policies (all pods can communicate with all other pods by default).
- HPA and VPA both active on the same resource (they conflict).

## Self-check before task completion

Before marking a task done when this skill was active:

- [ ] All manifests pass `kubectl apply --dry-run=client`.
- [ ] Deployment has both readiness and liveness probes configured.
- [ ] Resource requests and memory limits are set on all containers.
- [ ] PDB exists for production deployments (minAvailable or maxUnavailable).
- [ ] Network policies enforce least-privilege communication.
- [ ] No secrets stored in plain text in manifests or values files.
- [ ] Image tags are pinned to specific versions (not `latest`).
- [ ] HPA configured with appropriate min/max and scale-down stabilization.
- [ ] Ingress has TLS termination configured.
- [ ] Rollout tested with `kubectl rollout status`.
