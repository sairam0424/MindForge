# MindForge — Jenkins Integration

## Purpose
Provide a Jenkins pipeline snippet for MindForge CI mode.

## Example Jenkinsfile

```groovy
pipeline {
  agent any
  environment {
    CI = 'true'
    MINDFORGE_CI = 'true'
    ANTHROPIC_API_KEY = credentials('anthropic-api-key')
  }
  stages {
    stage('Install') {
      steps {
        sh 'npm ci'
        sh 'npx mindforge-cc@latest --claude --local'
      }
    }
    stage('Validate') {
      steps {
        sh 'node bin/validate-config.js'
      }
    }
    stage('MindForge CI') {
      steps {
        sh 'node tests/ci-mode.test.js'
      }
    }
  }
  post {
    always {
      archiveArtifacts artifacts: '.planning/HANDOFF.json,.planning/STATE.md', fingerprint: true
    }
  }
}
```

## Notes
- Jenkins treats any non-zero exit code as failure, so timeouts should exit 0.
- Use Jenkins credentials store for API keys.
