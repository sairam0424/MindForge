# Feature: Real-time Dashboard (v5.10.0)

The MindForge Real-time Dashboard provides a high-fidelity, web-based control center for your agentic workflows. It leverages **Server-Sent Events (SSE)** to push live updates from your codebase directly to your browser with zero performance overhead.

## 🚀 Getting Started

To launch the dashboard:
```bash
/mindforge:dashboard --start --open
```

Default access: `http://localhost:7339` (Strictly bound to `127.0.0.1` for security).

## 🛠 Key Features

### 1. Live Audit Stream
- Real-time rolling feed of all `AUDIT.jsonl` events.
- Color-coded status indicators (Success, Failure, Security Warning).
- Detailed JSON inspection for every action.

### 2. Performance Metrics
- **Token Costs**: Cumulative and session-based cost tracking across all providers.
- **Quality Score**: Real-time graphing of verify-pass-rates.
- **Compaction Health**: Monitoring of context management efficiency.

### 3. Web-based Governance
- **Tier 2/3 Approvals**: Review pending architectural or security changes.
- **Tier 3 Confirmation**: Mandatory plan ID typing for high-risk approvals is enforced in the UI.
- **Decision History**: Interactive timeline of past approvals and rejections.

### 4. Team & Agent Activity
- **Wave Progress**: Track multiple agents executing parallel waves.
- **Persona Context**: See which agent personas are currently active.
- **Steerage Feed**: View steering instructions as they are applied.

### 5. MindForge Nexus (v5.10+)
- **ART Trace Explorer**: Drill down into hierarchical reasoning spans and thought chains.
- **Temporal Control Center**: Dynamic slider-based navigation of reasoning history.
- **Hindsight Injection**: Rollback project state to any previous `auditId` and inject steering instructions to correct drift.
- **Reasoning Heatmaps**: Identifying areas of adversarial disagreement and drift in real-time.

### 6. AgRevOps Financial Hub (v5.10+)
- **ROI Hub**: Real-time tracking of developer-hour value ($100/hr) vs. token expenditure.
- **Velocity Forecaster**: Predictive analytics for milestone completion ETAs based on live task throughput.
- **Security Health Score (SHS)**: Dynamic 0-100 score reflecting governance debt and policy compliance.

## 🛡 Hardened Security
- **Localhost Binding**: The server refuses connections from external IPs.
- **CORS Lock-down**: Only allows requests from the local control plane.
- **Integrity First**: Audit logs are written by the backend *before* changes are committed, ensuring a bulletproof trail.

## 📟 Command Reference

| Flag | Action |
| :--- | :--- |
| `--start` | Launch the dashboard server process. |
| `--stop` | Gracefully shut down the server. |
| `--status` | Check if the dashboard is running and get PID. |
| `--open` | Open the UI in your default browser. |
| `--port [N]` | Change the default port (7339). |

---
*For technical implementation details, see `.mindforge/dashboard/dashboard-spec.md`.*
