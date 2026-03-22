# /mindforge:browse

## Usage
`@mindforge browse <url | action>`

## Description
Controls the persistent MindForge browser daemon. 
Maintains session state (cookies/localStorage) for the AI.

## Actions
| Action | Description |
|---|---|
| `--start` | Initialize browser daemon |
| `--stop` | Kill browser daemon |
| `--status` | Show daemon health and active sessions |
| `--session <name>` | Switch browser context |
| `--import-session <name> --from <browser>` | Import cookies from host browser (chrome, arc, etc) |
| `<url>` | Navigate the current page to URL |
| `click <selector>` | Trigger click event |
| `type <sel> <text>` | Fill input field |
| `screenshot` | Capture current viewport |

## Security
- Daemon binds to `127.0.0.1` only.
- Session files are gitignored.
- Use only for debugging and visual verification.
