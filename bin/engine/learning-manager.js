/**
 * MindForge Learning Manager — v1.0.0
 * Part of the Sovereign Intelligence Engine (v8.1.0)
 * Manages the lifecycle of AGENTS_LEARNING.md and its integration with the distributed mesh.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');

class LearningManager {
  constructor(options = {}) {
    this.rootDir = options.rootDir || process.cwd();
    this.templateDir = options.templateDir || path.join(__dirname, '../../docs/templates/Project');
    this.learningFile = path.join(this.rootDir, 'AGENTS_LEARNING.md');
  }

  /**
   * Initialize a new learning file from the template.
   */
  async init(projectInfo = {}) {
    if (fs.existsSync(this.learningFile)) {
      throw new Error(`Learning file already exists at ${this.learningFile}`);
    }

    const templatePath = path.join(this.templateDir, 'AGENTS_LEARNING.md');
    if (!fs.existsSync(templatePath)) {
      throw new Error(`Template not found at ${templatePath}`);
    }

    let content = fs.readFileSync(templatePath, 'utf8');

    // Basic hydration
    content = content
      .replace(/\[Project Name\]/g, projectInfo.name || path.basename(this.rootDir))
      .replace(/\[Project Type\]/g, projectInfo.type || 'Fullstack')
      .replace(/\[Tech Stack\]/g, projectInfo.techStack || 'Node.js, ESM')
      .replace(/\[Short description of the system\]/g, projectInfo.description || 'Distributed agentic ecosystem.')
      .replace(/\[Date\]/g, new Date().toISOString().split('T')[0])
      .replace(/0x\[Identity\]/g, projectInfo.systemDid || '0xenterprise');

    fs.writeFileSync(this.learningFile, content, 'utf8');
    return this.learningFile;
  }

  /**
   * Append a new Learning Entry to the Evolution Log.
   */
  async record(entry) {
    if (!fs.existsSync(this.learningFile)) {
      throw new Error(`Learning file not found at ${this.learningFile}. Run 'mindforge learning init' first.`);
    }

    const timestamp = new Date().toISOString();
    const formattedEntry = `
### [Learning Entry - ${timestamp}]

**Context:**
${entry.context || 'Autonomous execution wave'}

**Mistake:**
${entry.mistake || 'None (Best Practice Discovery)'}

**Root Cause:**
${entry.rootCause || 'N/A'}

**Fix:**
${entry.fix || 'N/A'}

**Prevention Rule:**
${entry.preventionRule || 'No specific rule defined.'}

**Category:**
- ${entry.category || 'General Learning'}

---
**Document Status:** Updated
**Root Identity:** \`${entry.did || 'did:mindforge:enclave:0xenterprise'}\`
**Last Verified:** ${timestamp.split('T')[0]}
`;

    fs.appendFileSync(this.learningFile, formattedEntry, 'utf8');
    return true;
  }

  /**
   * Read and summarize the top-level learnings (Best Practices & Anti-Patterns).
   */
  async getStatus() {
    if (!fs.existsSync(this.learningFile)) {
      return { initialized: false };
    }

    const content = fs.readFileSync(this.learningFile, 'utf8');
    const entryMatches = content.match(/### \[Learning Entry -/g) || [];
    
    return {
      initialized: true,
      entryCount: entryMatches.length,
      path: this.learningFile
    };
  }

  /**
   * Extract context-specific learnings to prevent repeating mistakes.
   * In a future version, this will use embeddings/semantic search.
   * v1.0.0 uses keyword matching on task description.
   */
  async summarizeRelevantLearnings(currentTask = '') {
    if (!fs.existsSync(this.learningFile)) return 'N/A (Learning memory not initialized)';

    const content = fs.readFileSync(this.learningFile, 'utf8');
    
    // Extract sections
    const bestPractices = this._extractSection(content, '4. Best Practices');
    const antiPatterns = this._extractSection(content, '5. Anti-Patterns');
    const mistakes = this._extractSection(content, '1. Mistakes Observed');

    let summary = '### 🧠 AGENTIC LEARNING CONTEXT\n';
    
    if (bestPractices) summary += `\n**Verified Best Practices:**\n${bestPractices}\n`;
    if (antiPatterns) summary += `\n**Anti-Patterns to Avoid:**\n${antiPatterns}\n`;
    
    if (mistakes && currentTask) {
      // Very simple keyword matching for relevance
      const relevantMistakes = mistakes.split('\n')
        .filter(m => {
          const words = currentTask.toLowerCase().split(/\s+/);
          return words.some(w => w.length > 3 && m.toLowerCase().includes(w));
        })
        .join('\n');
      
      if (relevantMistakes) {
        summary += `\n**Potentially Relevant Past Mistakes:**\n${relevantMistakes}\n`;
      }
    }

    return summary;
  }

  _extractSection(content, sectionName) {
    const startIdx = content.indexOf(`## ${sectionName}`);
    if (startIdx === -1) return null;
    
    const nextSectionIdx = content.indexOf('---', startIdx + 1);
    const endIdx = nextSectionIdx !== -1 ? nextSectionIdx : content.length;
    
    return content.substring(startIdx, endIdx).trim();
  }
}

module.exports = LearningManager;

// CLI Support for internal testing
if (require.main === module) {
  (async () => {
    const manager = new LearningManager();
    const args = process.argv.slice(2);
    const cmd = args[0];

    try {
      if (cmd === 'init') {
        const path = await manager.init();
        console.log(`✅ Initialized learning at ${path}`);
      } else if (cmd === 'record') {
        // Simple interactive mock
        await manager.record({
          context: 'CLI Manual Test',
          category: 'Architecture'
        });
        console.log('✅ Recorded manual learning entry.');
      } else {
        const status = await manager.getStatus();
        console.log('📊 Learning System Status:', status);
      }
    } catch (err) {
      console.error(`❌ Error: ${err.message}`);
    }
  })();
}
