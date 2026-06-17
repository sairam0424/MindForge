---
name: "mindforge:gaming"
description: "Design gaming backend architecture. Usage: /mindforge:gaming [feature] [--mode realtime|turn-based] [--scale small|massive]"
argument-hint: "[feature] [--mode realtime|turn-based] [--scale small|massive]"
allowed-tools:
  - list_dir
  - view_file
---

<objective>
Designs high-performance gaming backend architectures for real-time multiplayer, turn-based games, and massively multiplayer systems. Produces designs for matchmaking, game state synchronization, leaderboards, anti-cheat systems, and live operations with low-latency requirements.
</objective>

<execution_context>
@.mindforge/skills/gaming-backend/SKILL.md
</execution_context>

<context>
Skills Directory: `.mindforge/skills/gaming-backend/`
State: Evaluates game type, player concurrency requirements, and produces architecture with real-time communication (WebSocket/UDP), state synchronization, matchmaking algorithms, and operational analytics for live games.
</context>

<process>
1. **Game Type Analysis**: Classify game mode (real-time shooter/MOBA, turn-based strategy, MMO, battle royale) and define latency requirements (<50ms for FPS, <200ms for turn-based), player concurrency (10s, 100s, 10000s), and session duration patterns.
2. **Network Architecture**: Design network topology with dedicated game servers vs P2P hybrid, protocol selection (WebSocket for web, UDP for mobile/console), regional server distribution for latency optimization, and client-side prediction with server reconciliation.
3. **Matchmaking System**: Implement matchmaking algorithms (skill-based rating like ELO/TrueSkill, latency-based region matching), queue management with backfill for in-progress games, and party system for group matchmaking with balanced team composition.
4. **Game State Management**: Design authoritative server architecture with client input validation, tick-based simulation loops, state synchronization patterns (full snapshots, delta compression, interest management for MMOs), and cheat prevention with server-side validation.
5. **Persistence Layer**: Architect player data storage (progression, inventory, achievements) with eventually consistent writes, caching for frequently accessed data (player profiles, loadouts), and leaderboard systems using sorted sets (Redis) or time-series databases.
6. **Live Operations**: Implement event systems for limited-time challenges, A/B testing frameworks for game balance tuning, analytics pipelines for player behavior tracking (retention, engagement, monetization), and operational dashboards for server health monitoring.
7. **Scalability Patterns**: Design horizontal scaling for game servers with auto-scaling based on player concurrency, stateful server migration for maintenance windows, database sharding by player ID or region, and CDN distribution for game assets and patches.
</process>
