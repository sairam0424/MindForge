# MindForge Nexus: Observability Dashboard

## Vision
The Nexus Dashboard provides real-time visibility into the "thought chains" of the agentic mesh. It transforms the linear `AUDIT.jsonl` into a hierarchical, interactive visualization of reasoning and execution waves.

## Core Views

### 1. Mesh Trace View (Gantt/Waterfall)
- **Trace Visualization:** Displays hierarchical spans (Waves -> Clusters -> Tasks).
- **Critical Path Highlighting:** Identifies bottlenecks in parallel wave execution.
- **Span Metadata:** Hovering over a span reveals the agent persona, trust tier, and execution time.

### 2. Reasoning Heatmap (ART)
- **Density Maps:** Visualizes where the agents are performing the most "Thinking" (debate cycles).
- **ADS Breakdown:** Highlights Adversarial Decision Synthesis debates between specialists (e.g., Security vs Dev).
- **Thought Stream:** Real-time feed of `reasoning_trace` events.

### 3. ZTAI Trust Heatmap
- **Security Posture:** Real-time visibility into which tasks are running in which Trust Tier (0-3).
- **Policy Violations:** Instant alerts when an agent attempts to bypass a HITL decision gate.

## Technical Stack
- **Engine:** Next.js (React) + D3.js for complex tree visualizations.
- **Data Source:** Tail-following parser for `.planning/AUDIT.jsonl`.
- **State Management:** Zustand for real-time trace aggregation.

## API Hooks
```javascript
// Example Dashboard Feed Hook
const useNexusFeed = () => {
  // Listen for new AUDIT.jsonl entries
  // Reconstruct span hierarchy on the fly
  // Return nodes and edges for D3 renderer
};
```
