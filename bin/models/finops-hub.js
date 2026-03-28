/**
 * MindForge — FinOps Hub (Pillar V: Autonomous FinOps Hub)
 * Enterprise-grade monitoring and budget enforcement for agentic workloads.
 */

const fs = require('fs');
const path = require('path');

class FinOpsHub {
  constructor(config = {}) {
    this.projectRoot = config.projectRoot || process.cwd();
    this.budgetLimit = config.budgetLimit || 100.00; // $100.00 USD Default
    this.monthlyUsage = 0.00;
  }

  /**
   * Initializes the FinOps state and budget monitoring.
   */
  async init() {
    const roiPath = path.join(this.projectRoot, '.planning', 'ROI.jsonl');
    if (fs.existsSync(roiPath)) {
      const logs = fs.readFileSync(roiPath, 'utf8').split('\n').filter(Boolean);
      logs.forEach(line => {
        try {
          const entry = JSON.parse(line);
          this.monthlyUsage += entry.estimatedCostUSD || 0;
        } catch (e) {
          // Skip malformed lines
        }
      });
    }
  }

  /**
   * Checks if the task is within budget constraints.
   * @param {Object} task - Task details (difficulty, priority)
   * @returns {Object} - Budget check result (status, reasoning)
   */
  checkBudget(task) {
    if (this.monthlyUsage >= this.budgetLimit) {
      return { status: 'DENIED', reason: `Monthly budget limit ($${this.budgetLimit}) reached.` };
    }

    if (this.monthlyUsage >= this.budgetLimit * 0.9) {
      return { status: 'WARNING', reason: `Project has consumed 90% of the allocated budget ($${this.monthlyUsage.toFixed(2)} / $${this.budgetLimit.toFixed(2)}).` };
    }

    return { status: 'APPROVED', usage: this.monthlyUsage };
  }

  /**
   * Generates a "Spending Profile" for the project.
   * Used for the Nexus Dashboard to visualize ROI.
   */
  getSpendingProfile() {
    const roiPath = path.join(this.projectRoot, '.planning', 'ROI.jsonl');
    if (!fs.existsSync(roiPath)) return { totalSpend: 0, goalsAchieved: 0, roi: 0 };

    const logs = fs.readFileSync(roiPath, 'utf8').split('\n').filter(Boolean).map(JSON.parse);
    const totalSpend = logs.reduce((acc, l) => acc + (l.estimatedCostUSD || 0), 0);
    const goalsAchieved = logs.reduce((acc, l) => acc + (l.goalAchieved || 0), 0);

    return {
      totalSpend: totalSpend.toFixed(2),
      goalsAchieved,
      roi: totalSpend > 0 ? (goalsAchieved / totalSpend).toFixed(2) : 0,
      tokenEfficiency: logs.length > 0 ? (totalSpend / logs.length).toFixed(4) : 0,
    };
  }

  /**
   * Resets the usage counter (system-level call).
   */
  resetMonthlyUsage() {
    this.monthlyUsage = 0.00;
  }
}

module.exports = FinOpsHub;
