---
name: run-musk-algo
description: Run the Musk 5-Step Algorithm (Question → Delete → Simplify → Accelerate → Automate) on any task. Use when the user runs /run-musk-algo, asks for the Musk algorithm, or wants rigorous scope/design discipline before implementation.
---

# Musk 5-Step Algorithm — Skill

> **Rule:** *Never optimize something that shouldn't exist.*

This skill drives the `musk_algorithm` extension tool. Execute the phases **in strict order**. Do not skip, reorder, or combine phases. Chain `priorFindings` between calls.

## Command

```
/run-musk-algo <User Task>
```

Example: `/run-musk-algo Add dark-mode toggle to the dashboard`

The command handler injects the task and the workflow instruction. Follow it.

## Workflow

### Phase 0 — Overview (optional)
If you need a plan before diving in, call:
```
musk_algorithm(phase="full", task="<task>")
```
Then proceed phase by phase anyway.

### Phase 1 — Question (phase="question")
- Call `musk_algorithm(phase="question", task="<task>", context="<repo/context>")`
- **Do the work:** list every requirement, run 5 Whys, tag Must/Should/Nice, produce the pruned requirements + rejected log + one-sentence problem statement.
- Use real codebase evidence (read/grep) — don't invent requirements.

### Phase 2 — Delete (phase="delete")
- Call `musk_algorithm(phase="delete", task="<task>", priorFindings="<phase 1 deliverable>")`
- **Do the work:** try to delete each survivor. Remove code, deps, steps, or process that adds no validated value. Prefer deletion over refactoring. Verify build/tests still pass.
- Output a deletion log (what, why, revert signal) and a leaner scope.

### Phase 3 — Simplify (phase="simplify")
- Call `musk_algorithm(phase="simplify", task="<task>", priorFindings="<phase 2 deliverable>")`
- **Do the work:** reduce interfaces, states, branches, layers. Prefer boring tech and flat structures. Collapse two components into one where possible.
- Output a simplified design sketch (components, data flow, interfaces) and trade-offs.

### Phase 4 — Accelerate (phase="accelerate")
- Call `musk_algorithm(phase="accelerate", task="<task>", priorFindings="<phase 3 deliverable>")`
- **Do the work:** map end-to-end cycle time, find the bottleneck (waiting/rework/serial deps/slow feedback), set a measurable speed target, propose parallelization / shift-left changes.
- Output cycle-time map + bottleneck + speed target + acceleration changes.

### Phase 5 — Automate (phase="automate")
- Call `musk_algorithm(phase="automate", task="<task>", priorFindings="<phase 4 deliverable>")`
- **Do the work:** confirm 1-4 are done. Identify repetitive, rule-based steps worth automating. Choose minimal automation (scripts, CI checks, generators). Add monitoring/rollback. Explicitly decide NOT to automate where judgment is needed.
- Output automation plan (what/why/how/guardrails) or a justified "do not automate" decision.

### After Phase 5 — Implement
Implement the surviving, simplified, accelerated (and only-where-justified automated) plan. Use edit/write/bash tools as needed. Verify with tests, type-check, and build.

## Guidelines

- **One tool call per phase**, same `task` each time, chain `priorFindings`.
- Never automate, accelerate, or polish what you haven't questioned and pruned.
- Each phase must produce its **deliverable** grounded in the actual task/codebase — not just the template text.
- If a phase reveals the task is unnecessary or can be satisfied more simply, say so and propose the simpler alternative.

## Tool Reference

- Tool: `musk_algorithm`
- Params:
  - `phase`: `question | delete | simplify | accelerate | automate | full`
  - `task`: string (required)
  - `context`: string (optional — repo area, constraints)
  - `priorFindings`: string (optional — prior phase deliverable when chaining)
- The tool is read-only and idempotent; it returns the checklist, questions, and next-phase pointer. You still do the analysis and file work.
