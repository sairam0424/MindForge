const fs = require('fs');
const path = require('path');

// Determine project root (CWD is usually the project root)
const projectRoot = process.cwd();
const skillPath = path.join(projectRoot, '.agent', 'skills', 'mindforge-neural-orchestrator', 'SKILL.md');

function run() {
  try {
    if (!fs.existsSync(skillPath)) {
      // Exit silently if the skill isn't there
      return;
    }

    const skillContent = fs.readFileSync(skillPath, 'utf8');
    
    // Check for MindForge registry for additional info if needed
    const registryPath = path.join(projectRoot, 'MINDFORGE.md');
    let registryWarning = "";
    if (!fs.existsSync(registryPath)) {
        registryWarning = "\n\n[WARNING]: MINDFORGE.md Parameter Registry not found. Architectural integrity may be degraded.";
    }

    const sessionContext = "<EXTREMELY_IMPORTANT>\nYou have MindForge Swarm Intelligence.\n\n**Below is the full content of your 'mindforge-neural-orchestrator' skill - your introduction to using skills. For all other skills, use the 'Skill' tool:**\n\n" + skillContent + registryWarning + "\n</EXTREMELY_IMPORTANT>";

    const output = {
      hookSpecificOutput: {
        hookEventName: "SessionStart",
        additionalContext: sessionContext
      },
      // Fallback for other platforms
      additional_context: sessionContext
    };

    console.log(JSON.stringify(output, null, 2));
  } catch (err) {
    // Fail silently in production hooks to avoid blocking the user
    // console.error(err);
  }
}

run();
