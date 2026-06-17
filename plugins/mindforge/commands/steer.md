---
description: "Injects mid-execution guidance into the running autonomous engine."
---

# /mindforge:steer "[instruction]"

**Purpose**: Injects mid-execution guidance into the running autonomous engine.
Steering guidance is applied at the next task boundary to course-correct MindForge.

## Usage
- `/mindforge:steer "Use the new logger in all created files"`
- `/mindforge:steer --task 3-05 "This plan is too broad, focus on login only"`
- `/mindforge:steer --cancel` (Clears the steering queue)

## Precedence
- Steering instructions take precedence over the original `PLAN-N-MM.md` actions.
- Steering cannot override core security constraints or governance gates.
