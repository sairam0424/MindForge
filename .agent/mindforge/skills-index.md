---
description: "Browse all available skills by category — discover and activate any skill by name."
---

# MindForge — Skills Index
# Usage: /mindforge:skills-index [optional: category or keyword filter]

Lists all skills available in this MindForge installation. Skills in the **Engine** tier activate automatically via trigger-matching. Skills in the **Extended** tier require explicit invocation.

---

## How to activate a skill

**Engine tier** (auto-triggers from `.mindforge/skills/`): Just describe the task — the skill-loader matches your request against each skill's `triggers:` field and loads the relevant skill automatically.

**Extended tier** (explicit from `.agent/skills/`): Ask Claude to "use the [skill-name] skill" or invoke it by name.

---

## Engine Tier Skills (auto-triggered)

### Software Development
| Skill | Triggers |
|---|---|
| `systematic-debugging` | systematic debugging, root cause analysis, debug methodology, 4-phase debug |
| `test-driven-development` | TDD, red green refactor, write test first, test before code |
| `plan` | write a plan, plan mode, implementation plan, plan before coding |
| `simplify-code` | simplify code, clean up code, refactor for clarity, reduce complexity |
| `requesting-code-review` | request code review, code review protocol, review this PR |
| `spike` | technical spike, time-boxed spike, explore this problem |
| `subagent-driven-development` | subagent driven development, delegate to subagent, multi-agent implementation |
| `code-wiki` | code wiki, document codebase, knowledge wiki, explain codebase |

### DevOps & Orchestration
| Skill | Triggers |
|---|---|
| `kanban-orchestrator` | kanban orchestrator, multi-agent kanban, decompose and route, orchestrate tasks |
| `kanban-worker` | kanban worker, pick up kanban task, complete kanban card |

### GitHub Workflows
| Skill | Triggers |
|---|---|
| `github-code-review` | github code review, review PR, pull request review workflow |
| `github-pr-workflow` | github pr workflow, pull request lifecycle, open PR, merge PR |
| `github-issues` | github issues, create issue, manage issues, issue triage |
| `codebase-inspection` | codebase inspection, explore codebase, understand repository |

### Research & Intelligence
| Skill | Triggers |
|---|---|
| `research-paper-writing` | research paper, academic paper, write paper, arxiv paper |
| `arxiv` | arxiv search, find papers, search arxiv, academic literature |
| `osint-investigation` | OSINT investigation, public records research, entity investigation |
| `domain-intel` | domain intelligence, investigate domain, domain research |
| `duckduckgo-search` | duckduckgo search, DDG search, web search |
| `scrapling` | scrape website, web scraping, extract web content |
| `blogwatcher` | monitor blog, watch blog, track blog updates |

### Creative
| Skill | Triggers |
|---|---|
| `concept-diagrams` | concept diagram, educational diagram, SVG diagram, visual explanation |
| `creative-ideation` | creative ideation, brainstorm ideas, creative ideas, generate concepts |
| `pixel-art` | pixel art, create pixel art, sprite design |
| `meme-generation` | meme generation, create meme, generate meme |

### Security
| Skill | Triggers |
|---|---|
| `web-pentest` | web penetration test, pentest this app, security test web app, OWASP test |
| `oss-forensics` | OSS forensics, open source forensics, supply chain audit |
| `sherlock` | sherlock, username investigation, find accounts, OSINT username |

### Data & Tooling
| Skill | Triggers |
|---|---|
| `jupyter-live-kernel` | jupyter kernel, live jupyter, interactive notebook |
| `obsidian` | obsidian notes, obsidian vault, obsidian workflow |

---

## Extended Tier Skills (`.agent/skills/`, explicit activation)

### Software Development
`node-inspect-debugger` · `python-debugpy` · `skill-authoring` · `rest-graphql-debug`

### GitHub
`github-auth` · `github-repo-management`

### DevOps
`docker-management` · `devops-cli` · `devops-watchers` · `pinggy-tunnel` · `s6-container-supervision`

### Research
`llm-wiki` · `polymarket` · `parallel-cli`

### Security
`godmode` · `1password-skill`

### Creative
`hyperframes` · `article-illustrator` · `comic-creator` · `video-orchestrator`

---

## Usage examples

```
"Debug this null pointer — use systematic debugging"
→ Engine tier: systematic-debugging activates automatically

"I want to do TDD on this new auth module"
→ Engine tier: test-driven-development activates automatically

"Use the docker-management skill to set up my containers"
→ Extended tier: explicit invocation of docker-management

"Run an OSINT investigation on this company"
→ Engine tier: osint-investigation activates automatically
```
