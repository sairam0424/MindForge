/**
 * MindForge dashboard front end.
 *
 * EXTRACTED FROM an inline <script> in index.html. The server sets its own
 * Content-Security-Policy of `script-src 'self'` (bin/dashboard/server.js:165), which blocks inline
 * script execution — so the entire application never ran. Measured in a real headless browser:
 *
 *     [error] Executing inline script violates the following Content Security Policy directive
 *             'script-src 'self''. The action has been blocked.
 *     typeof window.showPage  ->  undefined
 *     GET /api/connections    ->  {"clients":0}
 *
 * while the static HTML displayed "● Connected" and "SSE STREAMING ACTIVE". The page returned HTTP
 * 200 and affirmatively reported health it could not have had, because the only code able to
 * contradict it was the code being blocked.
 *
 * Externalising is the fix that does NOT weaken the policy. Adding 'unsafe-inline', or a hash, or a
 * nonce would each have restored the <script> while leaving the 10 inline on* attribute handlers
 * dead — those are blocked by the same directive and need 'unsafe-hashes' or removal. They are now
 * addEventListener bindings at the end of this file.
 *
 * SECOND LATENT BUG this uncovered: the inline script ended with a top-level `showPage('activity')`,
 * but sat at line 373 of 757 — above the `.page` elements it queries. As an inline script it ran
 * during parsing, found nothing, and silently did nothing. Loaded with `defer` it runs after the
 * document is parsed, so that call now works. The CSP block had been masking it.
 */
/* global document, window, EventSource, getComputedStyle, alert */
// Browser globals, declared file-locally. This file is the only browser-targeted source in the repo;
// eslint.config.mjs configures Node globals and is protected against per-file weakening, which is the
// right trade — a /* global */ comment scopes the declaration here instead of loosening the project.
// These 55 no-undef errors existed the whole time the code was inline in index.html; nothing linted it.
'use strict';

// ── State ─────────────────────────────────────────────────────────────────
let currentApprovals = [];
let state = { costs: [], quality: [] };

function showPage(id) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  document.getElementById(id).classList.add('active');
  const tab = Array.from(document.querySelectorAll('.tab')).find(t => t.innerText.toLowerCase() === id.toLowerCase());
  if (tab) tab.classList.add('active');
  
  if (id === 'metrics') drawCharts();
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str).replace(/[&<>"']/g, m => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', '\'':'&#39;' }[m]));
}

// ── WebSocket / SSE ───────────────────────────────────────────────────────
const es = new EventSource('/events');
const feed = document.getElementById('audit-feed');

es.onopen = () => {
  const el = document.getElementById('connection-status');
  el.textContent = '● Connected';
  el.style.color = 'var(--green)';
  refreshData();
};

es.onerror = () => {
  const el = document.getElementById('connection-status');
  el.textContent = '● Disconnected';
  el.style.color = 'var(--red)';
};

es.addEventListener('status:update', (e) => {
  const data = JSON.parse(e.data);
  updateStatusUI(data);
});

es.addEventListener('audit:new', (e) => {
  const data = JSON.parse(e.data);
  appendAuditEvent(data);
});

es.addEventListener('approval:new', (e) => {
  const data = JSON.parse(e.data);
  refreshApprovals();
});

// ── API Interactions ──────────────────────────────────────────────────────
async function refreshData() {
  try {
    const res = await fetch('/api/metrics');
    const data = await res.json();
    state = data;
    updateMetricsUI(data);
    refreshCosts();
    refreshApprovals();
    refreshMemory();
    refreshTeam();
    refreshRevOps();
    if (document.getElementById('temporal').classList.contains('active')) {
        refreshTemporal();
    }
  } catch(e) { console.error('Refresh fail', e); }
}

async function refreshRevOps() {
  try {
    const res = await fetch('/api/revops/overview');
    const data = await res.json();
    if (data.success) {
        updateRevOpsUI(data);
    }
  } catch { /* one panel failing must not abort the rest of the refresh; it keeps its last value */ }
}

let temporalHistory = [];
async function refreshTemporal() {
  try {
    const res = await fetch('/api/temporal/history');
    const data = await res.json();
    temporalHistory = data;
    renderTemporalTimeline();
  } catch { /* one panel failing must not abort the rest of the refresh; it keeps its last value */ }
}

async function refreshApprovals() {
  try {
    const res = await fetch('/api/approvals');
    const data = await res.json();
    currentApprovals = data;
    renderApprovals();
  } catch { /* one panel failing must not abort the rest of the refresh; it keeps its last value */ }
}

async function refreshMemory() {
  try {
    const res = await fetch('/api/memory');
    const data = await res.json();
    document.getElementById('memory-map').innerHTML = `<pre>${escapeHtml(JSON.stringify(data.graph || {}, null, 2))}</pre>`;
    document.getElementById('memory-stats-list').innerHTML = `<div class="stat-value">${data.count || 0} <span class="stat-unit">Items Indexed</span></div>`;
  } catch { /* one panel failing must not abort the rest of the refresh; it keeps its last value */ }
}

async function refreshTeam() {
  try {
    const res = await fetch('/api/team');
    const data = await res.json();
    renderTeam(data);
  } catch { /* one panel failing must not abort the rest of the refresh; it keeps its last value */ }
}

// decide() and submitDecision() are removed along with POST /api/approve/:id. They sent
// `approver: 'admin-dash'` from the client, which the route already had to discard as
// forgeable. There is now no endpoint that writes an approval record at all, so that
// attribution problem is gone by construction rather than mitigated. Records are minted only
// by bin/governance/approve.js, which takes identity from git and fails closed without a GPG
// key unless MINDFORGE_ALLOW_UNVERIFIED_APPROVAL=1.


function closeConfirm() {
  document.getElementById('confirm-overlay').style.display = 'none';
}

// ── UI Rendering ──────────────────────────────────────────────────────────
function updateStatusUI(data) {
  document.getElementById('project-name').textContent = `PROJ: ${data.project_name || 'UNSET'}`;
  document.getElementById('stat-phase').textContent = data.phase || '0';
  document.getElementById('stat-status').textContent = (data.auto_status || 'IDLE').toUpperCase();
  document.getElementById('stat-tasks').textContent = `${data.tasks_completed || 0}/${data.tasks_total || 0}`;
  document.getElementById('stat-elapsed').textContent = data.elapsed_ms ? (data.elapsed_ms / 1000).toFixed(1) + 's' : '0s';
}

function updateMetricsUI(data) {
  // /api/metrics returns { sessions, avg_quality, avg_cost_usd, ... } — see
  // bin/dashboard/metrics-aggregator.js getMetrics(). It has never returned
  // `costs` or `quality`, so these tiles used to render "$0.0000" and "NaN".
  document.getElementById('stat-avg-quality').textContent = (data.avg_quality ?? 0).toFixed(1);
}

// Cumulative spend comes from the usage ledger via /api/costs (already wired
// in bin/dashboard/api-router.js but never fetched until now).
async function refreshCosts() {
  try {
    const res = await fetch('/api/costs?window=7');
    // sendServerError returns a well-formed JSON body, so res.json() would
    // SUCCEED on a 500 and `total_usd ?? 0` would render "$0.00" — an outage
    // and genuine zero spend look identical under the "Cost (7d)" label.
    if (!res.ok) throw new Error(`/api/costs ${res.status}`);
    const data = await res.json();
    document.getElementById('stat-total-cost').textContent = `${(data.total_usd ?? 0).toFixed(2)}`;
  } catch (e) { console.error('Cost refresh failed', e); }
}

function appendAuditEvent(data) {
  const div = document.createElement('div');
  div.className = `event type-${data.event}`;
  const time = new Date(data.timestamp).toLocaleTimeString([], { hour12:false, hour:'2-digit', minute:'2-digit', second:'2-digit' });
  div.innerHTML = `<span class="event-time">${time}</span><span class="event-type type-${data.event}">${data.event}</span><span class="event-msg">${escapeHtml(data.message || data.task || '')}</span>`;
  feed.prepend(div);
  if (feed.children.length > 200) feed.lastChild.remove();
}

// Read-only. The Approve/Reject buttons that were here posted to /api/approve/:id, an
// endpoint that could never succeed and has now been removed: it decided on pending
// REQUESTS, which nothing in MindForge produces. This panel shows the records that exist,
// with the integrity state the shared verifier reports.
//
// It also rendered a.phase, a.plan and a.summary — three fields no producer has ever
// written — and called .length/.map() on an object, which threw a TypeError.
function renderApprovals() {
  const list = document.getElementById('approval-list');
  const records = Array.isArray(currentApprovals) ? currentApprovals : [];
  if (records.length === 0) {
    list.innerHTML = '<div style="text-align:center; padding: 40px; color:var(--muted)">'
      + 'No approval records. Tier-3 review is a recorded human acknowledgement; '
      + 'authorization is enforced by branch protection, not from here.</div>';
    return;
  }

  const colour = { valid: 'var(--green)', stale: 'var(--purple)', corrupt: 'var(--red)' };
  list.innerHTML = records.map(a => {
    const hrs = a.hours_remaining;
    const life = (hrs === null || hrs === undefined) ? ''
      : hrs > 0 ? `${hrs.toFixed(1)}h remaining` : `expired ${Math.abs(hrs).toFixed(1)}h ago`;
    const problems = (a.problems || []).length
      ? '<ul style="margin:8px 0 0 16px; font-size:11px; color:var(--red)">'
        + a.problems.map(x => `<li>${escapeHtml(x)}</li>`).join('') + '</ul>'
      : '';
    return `
    <div class="card approval-card">
      <div class="card-body">
        <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:12px;">
          <div>
            <span class="tier-badge tier-${escapeHtml(String(a.tier ?? '?'))}">Tier ${escapeHtml(String(a.tier ?? '?'))}</span>
            <span style="font-weight:700">${escapeHtml(a.id || a.file || 'unknown')}</span>
            <span style="font-size:11px; color:${colour[a.state] || 'var(--muted)'}; margin-left:8px; text-transform:uppercase">${escapeHtml(a.state || '')}</span>
          </div>
          <div style="font-size:11px; color:var(--muted)">${escapeHtml(life)}</div>
        </div>
        <div style="font-size:11px; color:var(--muted); margin-bottom:6px">
          ${escapeHtml(a.approved_by || 'unknown')} &middot; v${escapeHtml(a.version || '?')}
        </div>
        <p style="margin:0; font-size:12px; line-height:1.4">${escapeHtml(a.reason || 'No reason recorded')}</p>
        ${problems}
      </div>
    </div>`;
  }).join('');
}

function renderTeam(data) {
  const list = document.getElementById('team-activity-list');
  if (!data || data.length === 0) {
    list.innerHTML = '<div style="text-align:center; padding: 40px; color:var(--muted)">No recent team activity</div>';
    return;
  }
  list.innerHTML = data.map(ev => `
    <div class="activity-row">
      <div class="avatar">${(ev.user || '?').charAt(0).toUpperCase()}</div>
      <div class="activity-info">
        <div><span class="activity-user">${escapeHtml(ev.user)}</span> <span class="activity-action">${escapeHtml(ev.action)}</span></div>
        <div class="activity-time">${new Date(ev.timestamp).toLocaleString()}</div>
      </div>
    </div>
  `).join('');
}

// ── Simple Charts Implementation ──────────────────────────────────────────
function drawCharts() {
  drawCanvasChart('chart-costs', state.costs?.map(c => c.cost) || [], varColor('--accent'));
  drawCanvasChart('chart-quality', state.quality?.map(q => q.score) || [], varColor('--green'), 100);
}

function varColor(name) { return getComputedStyle(document.documentElement).getPropertyValue(name).trim(); }

function drawCanvasChart(id, data, color, maxVal = null) {
  const canvas = document.getElementById(id);
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const dpr = window.devicePixelRatio || 1;
  canvas.width = canvas.offsetWidth * dpr;
  canvas.height = canvas.offsetHeight * dpr;
  ctx.scale(dpr, dpr);

  const w = canvas.offsetWidth;
  const h = canvas.offsetHeight;
  ctx.clearRect(0,0,w,h);
  
  if (data.length < 2) return;
  
  const max = maxVal || Math.max(...data) * 1.2 || 1;
  const step = w / (data.length - 1);
  
  ctx.beginPath();
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.lineJoin = 'round';
  
  data.forEach((val, i) => {
    const x = i * step;
    const y = h - (val / max) * h;
    if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  });
  ctx.stroke();

  // Area fill
  ctx.lineTo(w, h); ctx.lineTo(0, h); ctx.closePath();
  ctx.fillStyle = color.replace(')', ', 0.1)').replace('rgb', 'rgba');
  ctx.fill();
}

// ── Temporal Steering Logic ────────────────────────────────────────────────
function renderTemporalTimeline() {
  const slider = document.getElementById('temporal-slider');
  const count = document.getElementById('timeline-count');
  
  if (temporalHistory.length === 0) {
    slider.max = 0;
    count.textContent = '0 Snapshots';
    return;
  }

  slider.max = temporalHistory.length - 1;
  count.textContent = `${temporalHistory.length} Snapshots`;
  
  // Default to latest if not touching
  if (slider.value == 0 && temporalHistory.length > 0) {
      onSliderChange(temporalHistory.length - 1);
      slider.value = temporalHistory.length - 1;
  }
}

let selectedSnapshot = null;
async function onSliderChange(index) {
  const snap = temporalHistory[temporalHistory.length - 1 - index]; // reversed for chronological range
  if (!snap) return;

  selectedSnapshot = snap;
  document.getElementById('slider-current').textContent = `Point: ${snap.id.slice(0, 8)} (${new Date(snap.timestamp).toLocaleTimeString()})`;
  document.getElementById('inject-btn').disabled = false;

  // Fetch sample audit file for this snapshot
  try {
    const res = await fetch(`/api/temporal/snapshot/${snap.id}/AUDIT.jsonl`);
    const content = await res.text();
    document.getElementById('snapshot-viewer').textContent = content || 'No audit log available for this point.';
  } catch(e) {
    document.getElementById('snapshot-viewer').textContent = 'Failed to load snapshot details.';
  }
}

async function injectHindsight() {
  if (!selectedSnapshot) return;
  const instruction = document.getElementById('steering-input').value;
  if (!instruction) {
      alert('Please provide a steering instruction for the hindsight injection.');
      return;
  }

  const btn = document.getElementById('inject-btn');
  btn.disabled = true;
  btn.textContent = 'Injecting Steering Vector...';

  try {
    const res = await fetch('/api/temporal/inject', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        auditId: selectedSnapshot.id,
        fixDescription: instruction
      })
    });
    const result = await res.json();
    if (result.success) {
        alert('Hindsight Injection Successful. Agent state rolled back and awaiting re-optimization.');
        showPage('activity');
    } else {
        alert('Injection failed: ' + result.error);
    }
  } catch(e) {
      alert('Failed to connect to temporal engine.');
  } finally {
      btn.disabled = false;
      btn.textContent = 'Rewind & Inject Fix';
  }
}

// ── RevOps Logic ─────────────────────────────────────────────────────────
function updateRevOpsUI(data) {
    const { roi, velocity, debt } = data;
    
    document.getElementById('rev-roi').textContent = `${roi.roi_percentage}%`;
    document.getElementById('rev-net').textContent = `$${roi.net_value}`;
    document.getElementById('rev-velocity').innerHTML = `${velocity.avg_seconds_per_task} <span class="stat-unit">sec/task</span>`;
    document.getElementById('rev-eta').textContent = `ETA: ${velocity.eta}`;
    document.getElementById('rev-health').textContent = debt.security_health_score;
    
    const healthStatus = document.getElementById('rev-health-status');
    healthStatus.textContent = `STATUS: ${debt.governance_status.toUpperCase()}`;
    healthStatus.style.background = debt.security_health_score > 80 ? 'rgba(63, 185, 80, 0.15)' : 'rgba(248, 81, 73, 0.15)';
    healthStatus.style.color = debt.security_health_score > 80 ? 'var(--green)' : 'var(--red)';

    document.getElementById('roi-hours').textContent = `${roi.hours_saved}h`;
    document.getElementById('roi-gross').textContent = `$${roi.gross_value}`;
    document.getElementById('roi-burn').textContent = `$${roi.token_cost}`;
    document.getElementById('roi-total-pct').textContent = `${roi.roi_percentage}%`;

    document.getElementById('debt-critical').textContent = debt.critical_findings;
    document.getElementById('debt-tier3').textContent = debt.tier3_approvals;
    const riskBadge = document.getElementById('debt-risk');
    riskBadge.textContent = debt.debt_level.toUpperCase();
    riskBadge.className = `badge ${debt.debt_level === 'Minimal' ? 'badge-live' : ''}`;
    if (debt.debt_level !== 'Minimal') riskBadge.style.color = 'var(--yellow)';
}

window.onresize = drawCharts;
setInterval(refreshData, 10000); // More frequent refresh for live dashboard
showPage('activity');

// ── Event wiring ────────────────────────────────────────────────────────────
// These listeners replace 10 inline on* attributes. Inline handlers are blocked by the server's own
// Content-Security-Policy (script-src 'self') exactly as an inline <script> is, so converting the
// script to an external file without also converting these would have left every control dead.
document.querySelectorAll('nav .tab[data-page]').forEach((btn) => {
  btn.addEventListener('click', () => showPage(btn.dataset.page));
});
const __slider = document.getElementById('temporal-slider');
if (__slider) __slider.addEventListener('input', (e) => onSliderChange(e.target.value));
document.querySelectorAll('[data-action]').forEach((el) => {
  const fns = { 'inject-hindsight': () => injectHindsight(), 'close-confirm': () => closeConfirm() };
  const fn = fns[el.dataset.action];
  if (fn) el.addEventListener('click', fn);
});
