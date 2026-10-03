# Musk-Algorithm — pi-extension

A **pi package** that adds the Musk 5-Step Design Algorithm as a native pi tool + slash command.

```
Question → Delete → Simplify → Accelerate → Automate
Rule: Never optimize something that shouldn't exist.
```

## Install

```bash
# Try for one session
pi --extension ./extensions/musk-algorithm/index.ts

# Or as a package (loads extension + skill)
pi -e ./

# Persist (from local checkout)
pi install ./
# or from GitHub (public)
pi install git:github.com/Danu28/Musk-Algorithm
```

After install, verify:
```bash
pi --help        # /run-musk-algo should appear
```

## Usage

### Slash command (recommended)
```
/run-musk-algo Add dark-mode toggle to the dashboard
/run-musk-algo Fix flaky checkout tests
/run-musk-algo Design the new landing page
```

The command injects a workflow instruction and the agent executes the 5 steps **in order**, calling the `musk_algorithm` tool phase by phase, then implements the surviving plan.

### Direct tool use
The LLM can also call the tool directly:

```
musk_algorithm(phase="full",     task="...")  // overview of all 5 steps
musk_algorithm(phase="question",  task="...")  // 1 — challenge requirements
musk_algorithm(phase="delete",    task="...", priorFindings="...") // 2
musk_algorithm(phase="simplify",  task="...", priorFindings="...") // 3
musk_algorithm(phase="accelerate",task="...", priorFindings="...") // 4
musk_algorithm(phase="automate",  task="...", priorFindings="...") // 5
```

Chain `priorFindings` between phases. After phase 5, implement and verify.

## What's inside

```
.
├── package.json                          # pi manifest (extensions + skills)
├── tsconfig.json
├── extensions/
│   └── musk-algorithm/
│       └── index.ts                      # tool + /run-musk-algo command
└── skills/
    └── run-musk-algo/
        └── SKILL.md                      # skill instructions (auto-loaded)
```

- **1 tool:** `musk_algorithm` — read-only, idempotent, with `outputSchema`, `promptSnippet`, and `promptGuidelines` so the LLM uses it correctly.
- **1 command:** `/run-musk-algo <task>` — drives the full workflow.
- **1 skill:** `run-musk-algo` — detailed per-phase instructions, surfaced in the system prompt.

## 5 Steps

1. **Question** — Challenge every requirement. 5 Whys. Must/Should/Nice.
2. **Delete** — Remove anything unnecessary. If you didn't delete ~10%, you didn't delete enough.
3. **Simplify** — Optimize what remains. Fewer parts, boring tech, flat structures.
4. **Accelerate** — Make cycle time faster. Map, bottleneck, parallelize, shift-left.
5. **Automate** — Only after 1-4. Minimal scripts/CI, with guardrails.

## Develop

```bash
npm run check   # tsc --noEmit
```

Loaded via `jiti` — no build step required.

## Uninstall

```bash
pi remove git:github.com/Danu28/Musk-Algorithm
```

## License

MIT
