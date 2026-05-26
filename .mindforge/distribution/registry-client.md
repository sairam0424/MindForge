# MindForge Skills Registry — Client Protocol

## Purpose
Define how MindForge discovers, downloads, validates, and installs skills
from the public or private npm-based registry.

## Installation flow

### Step 1 — Resolve package name
```bash
# From skill name to package name:
SKILL_NAME="security-owasp"
PACKAGE_NAME="mindforge-skill-${SKILL_NAME}"

# Or if user provides full package name:
PACKAGE_NAME="mindforge-skill-security-owasp"
```

### Step 2 — Check if already installed
```bash
# Check local MANIFEST.md
grep "| ${SKILL_NAME} |" .mindforge/org/skills/MANIFEST.md && echo "Already installed"

# Check if SKILL.md exists
[ -f ".mindforge/skills/${SKILL_NAME}/SKILL.md" ] && echo "Skill file exists"
```

### Step 3 — Secure temp directory creation
```bash
# Create temp directory with user-only permissions (prevents TOCTOU attacks)
TEMP_DIR=$(mktemp -d)
chmod 700 "${TEMP_DIR}"

# All subsequent operations in this directory are protected
npm pack "${PACKAGE_NAME}@latest" --pack-destination "${TEMP_DIR}" --quiet

# Verify the tarball was downloaded (not empty, not corrupted)
TARBALL=$(ls "${TEMP_DIR}"/*.tgz 2>/dev/null | head -1)
if [ -z "${TARBALL}" ]; then
  rm -rf "${TEMP_DIR}"
  echo "Error: Failed to download ${PACKAGE_NAME} — no tarball produced"
  exit 1
fi

# Verify tarball size is reasonable (not 0 bytes, not suspiciously large)
TARBALL_SIZE=$(wc -c < "${TARBALL}")
if [ "${TARBALL_SIZE}" -lt 100 ]; then
  rm -rf "${TEMP_DIR}"
  echo "Error: Downloaded tarball is suspiciously small (${TARBALL_SIZE} bytes)"
  exit 1
fi

tar -xzf "${TARBALL}" --strip-components=1 -C "${TEMP_DIR}"
```

### Step 4 — Validate the downloaded skill
Run the full skill validator (see `skill-validator.md`) against the downloaded SKILL.md.
If validation fails: abort installation. Never install a skill that fails validation.

For public registry installs: run Level 3 validation as well. Warn on failures but do not
block install. For private registry installs: Level 2 is sufficient.

### Step 4.5 — Dependency audit (optional but recommended)
If the skill package includes scripts with dependencies, run an audit:
```bash
if [ -f "${TEMP_DIR}/package.json" ]; then
  npm audit --prefix "${TEMP_DIR}" --audit-level=high || {
    echo "Warning: HIGH/CRITICAL vulnerabilities detected in skill dependencies"
    SKILL_DEPENDENCY_VULN=true
  }
fi
```
If vulnerabilities were found, warn but allow install. Record in AUDIT:
`"skill_dependency_vulnerability": true`.

### Step 5 — Injection guard check
Run the injection guard from Day 3 (`loader.md`) against the skill content.
If injection patterns detected: abort, write AUDIT entry, alert user.

### Step 6 — Install to correct tier location
```bash
# Determine target tier from user input or package.json tier-recommendation
TIER="${USER_SPECIFIED_TIER:-2}"

if [ "${TIER}" = "1" ]; then
  TARGET_DIR=".mindforge/skills/${SKILL_NAME}"
elif [ "${TIER}" = "2" ]; then
  TARGET_DIR=".mindforge/org/skills/${SKILL_NAME}"
else
  TARGET_DIR=".mindforge/project-skills/${SKILL_NAME}"
fi

mkdir -p "${TARGET_DIR}"
cp "${TEMP_DIR}/SKILL.md" "${TARGET_DIR}/SKILL.md"
[ -d "${TEMP_DIR}/examples" ] && cp -r "${TEMP_DIR}/examples" "${TARGET_DIR}/"
[ -d "${TEMP_DIR}/scripts" ]  && cp -r "${TEMP_DIR}/scripts"  "${TARGET_DIR}/"
```

### Step 7 — Register in MANIFEST.md
```bash
# Add entry to the correct tier section of MANIFEST.md
SKILL_VERSION=$(node -e "console.log(require('${TEMP_DIR}/package.json').version)")

# Insert into MANIFEST.md under the appropriate tier section
# Format: | name | version | stable | min-mf-version | path |
```

### Step 8 — Clean up and report
```bash
rm -rf "${TEMP_DIR}"
```

Report to user:
```
✅ Skill installed: ${SKILL_NAME} v${SKILL_VERSION} (Tier ${TIER})
   Triggers: [list from SKILL.md frontmatter]
   Path: ${TARGET_DIR}/SKILL.md

Run /mindforge:skills validate to confirm installation.
```

### Step 9 — Write AUDIT entry
```json
{
  "event": "skill_installed",
  "skill_name": "security-owasp",
  "skill_version": "1.2.0",
  "package_name": "mindforge-skill-security-owasp",
  "tier": 2,
  "source": "npm-registry | private-registry",
  "validation_passed": true,
  "skill_dependency_vulnerability": false
}
```

## Update protocol

### Check for updates
```bash
# Compare installed version against registry latest
INSTALLED=$(grep "| ${SKILL_NAME} |" MANIFEST.md | awk -F'|' '{print $3}' | tr -d ' ')
LATEST=$(npm info "${PACKAGE_NAME}" version --prefer-offline 2>/dev/null)

if [ "${INSTALLED}" != "${LATEST}" ]; then
  echo "Update available: ${SKILL_NAME} v${INSTALLED} → v${LATEST}"
fi
```

### Update a skill
```bash
# Run install flow for latest version
# If MAJOR version bump: show breaking changes, require confirmation
# If MINOR/PATCH: update silently
```

## Uninstall protocol
```bash
# Remove skill files
rm -rf "${TARGET_DIR}"

# Remove from MANIFEST.md
sed -i "/| ${SKILL_NAME} |/d" .mindforge/org/skills/MANIFEST.md

# Write AUDIT entry
# Commit: "chore(skills): uninstall ${SKILL_NAME}"
```
