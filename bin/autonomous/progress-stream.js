/**
 * MindForge — Progress Streamer
 * Formats AUDIT events for terminal display and report generation.
 */
'use strict';

const fs = require('fs');

/**
 * Generate a summary report from an audit file.
 */
function generateReport(auditPath, phaseNum) {
  if (!fs.existsSync(auditPath)) return '# No audit log found';

  const lines = fs.readFileSync(auditPath, 'utf8').split('\n').filter(Boolean);
  const events = lines.map(JSON.parse);

  let report = `# Autonomous Execution Report — Phase ${phaseNum}\n\n`;

  const start = events.find(e => e.event === 'auto_mode_started');
  const end = events.find(e => e.event === 'auto_mode_completed' || e.event === 'auto_mode_escalated');

  report += '## Summary\n';
  report += `- **Status**: ${end ? end.event.replace('auto_mode_', '').toUpperCase() : 'IN PROGRESS'}\n`;
  report += `- **Started**: ${start ? start.timestamp : 'Unknown'}\n`;
  report += `- **Duration**: ${calculateDuration(start, end)}\n`;
  report += `- **Tasks Completed**: ${events.filter(e => e.event === 'task_completed').length}\n\n`;

  report += '## Audit Log\n';
  events.forEach(e => {
    const time = e.timestamp.split('T')[1].split('.')[0];
    if (e.event === 'task_completed') report += `- [${time}] ✅ Task ${e.plan} completed\n`;
    if (e.event === 'node_repair') report += `- [${time}] 🔧 Repair: ${e.repair_type} on ${e.plan} (${e.repair_outcome})\n`;
    if (e.event === 'stuck_pattern_detected') report += `- [${time}] ⚠️ Stuck Pattern: ${e.pattern} on ${e.file}\n`;
    if (e.event === 'steering_applied') report += `- [${time}] 🚢 Steering: "${e.instruction}"\n`;
  });

  return report;
}

function calculateDuration(start, end) {
  if (!start || !end) return 'Unknown';
  const diff = new Date(end.timestamp) - new Date(start.timestamp);
  const mins = Math.floor(diff / 60000);
  const secs = Math.floor((diff % 60000) / 1000);
  return `${mins}m ${secs}s`;
}

module.exports = { generateReport };
