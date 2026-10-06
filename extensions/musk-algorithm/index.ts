/**
 * Musk-Algorithm pi-extension
 *
 * Single tool: musk_algorithm — executes the 5-step Musk design algorithm:
 *   1. Question — Challenge every requirement.
 *   2. Delete    — Remove anything unnecessary. (Never optimize what shouldn't exist)
 *   3. Simplify  — Optimize what remains.
 *   4. Accelerate — Make it faster.
 *   5. Automate  — Automate only after 1-4.
 *
 * Plus slash command: /run-musk-algo <task> — drives the full 5-step workflow
 * then completes the user task.
 *
 * Load once:  pi --extension ./extensions/musk-algorithm/index.ts
 * As package: pi --extension ./        (package.json pi.extensions discovery)
 * Or install: pi install ./            (copies to ~/.pi)
 */

import { defineTool, type ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { Type } from "@earendil-works/pi-ai";
import { Text } from "@earendil-works/pi-tui";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type MuskPhase = "question" | "delete" | "simplify" | "accelerate" | "automate" | "full";

interface MuskDetails {
  phase: MuskPhase;
  task: string;
  step: number; // 1-5, 0 = full overview
  title: string;
  principle: string;
  checklist: string[];
  questions: string[];
  deliverable: string;
  nextPhase: MuskPhase | null;
  rule: string;
}

// ---------------------------------------------------------------------------
// Phase catalog — the single source of truth for all 5 steps
// ---------------------------------------------------------------------------

const RULE = "Never optimize something that shouldn't exist.";

const PHASES: Record<Exclude<MuskPhase, "full">, Omit<MuskDetails, "task" | "phase" | "nextPhase">> = {
  question: {
    step: 1,
    title: "1 — Question",
    principle: "Challenge every requirement. Every. Single. One.",
    checklist: [
      "List every requirement / assumption behind the task — stated and unstated.",
      "For each requirement ask: Who asked for it? What breaks if we drop it? Is it a real need or a proxy for one?",
      "Run 5 Whys on the core problem — distinguish the need from the proposed solution.",
      "Tag each requirement as Must / Should / Nice — demand proof for Must.",
      "Record the surviving, validated requirements.",
    ],
    questions: [
      "Who is the actual stakeholder and what is their underlying job-to-be-done?",
      "What is the dumbest / simplest way to satisfy the need without this requirement?",
      "If we shipped nothing for this requirement, who would notice and how?",
      "Is this requirement a solution masquerading as a problem statement?",
      "What would the requirement look like if it were 10x cheaper to change later?",
    ],
    deliverable:
      "A pruned requirements list with rationale, rejected-requirements log, and a one-sentence problem statement.",
    rule: RULE,
  },
  delete: {
    step: 2,
    title: "2 — Delete",
    principle: "Remove anything unnecessary. If you're not deleting ~10% you didn't delete enough.",
    checklist: [
      "Take the Question-phase survivors and try to delete each one.",
      "Remove features, steps, files, dependencies, abstractions, or process that add no validated value.",
      "Prefer deletion over refactoring — you can always add it back if proven needed.",
      "If deleting feels risky, add a measurement/revert plan instead of keeping it by default.",
      "Verify build / tests still pass after deletion; record what was removed and why.",
    ],
    questions: [
      "Which part can we delete entirely and still deliver user value?",
      "Which code / file / dependency exists only to support something we just questioned?",
      "What would we NOT build if we started from zero today?",
      "Which approval / handoff / review step is pure overhead?",
      "If we had to cut scope by 50% tomorrow, what survives?",
    ],
    deliverable: "A deletion log (what was removed, why, revert signal) and a leaner scope definition.",
    rule: RULE,
  },
  simplify: {
    step: 3,
    title: "3 — Simplify",
    principle: "Optimize what remains — simplest thing that could work.",
    checklist: [
      "For every remaining part, ask: how can this be simpler, fewer moving parts, less config?",
      "Reduce interfaces, states, branches, and special cases. Unify duplicates.",
      "Prefer boring technology, flat structures, and direct data flow.",
      "Collapse layers: can two components / steps become one?",
      "Document the simplified design and its trade-offs.",
    ],
    questions: [
      "Can this be done in one file / function / call instead of many?",
      "What abstraction is costing more than it saves?",
      "Where are we handling a general case we don't have?",
      "Can we replace a framework / library with 20 lines of straightforward code?",
      "What is the simplest observable behavior that proves we solved the problem?",
    ],
    deliverable: "A simplified design Sketch (components, data flow, interfaces) with complexity explicitly removed.",
    rule: RULE,
  },
  accelerate: {
    step: 4,
    title: "4 — Accelerate",
    principle: "Make it faster — cycle time, not just runtime.",
    checklist: [
      "Map the end-to-end cycle time (idea → shipped → validated).",
      "Identify the bottleneck: waiting, rework, serial dependencies, or slow feedback.",
      "Parallelize, batch, or eliminate waits. Move validation earlier (shift-left).",
      "Optimize hot paths and feedback loops — build, test, deploy, review.",
      "Set a measurable speed target (e.g., p95 latency, build time, PR cycle).",
    ],
    questions: [
      "Where does work sit idle (queue, review, approval, CI) longest?",
      "Which serial dependency can become parallel?",
      "What feedback loop is too slow and how can it be 10x faster?",
      "Which step, if 2x faster, would halve total cycle time?",
      "What would it take to ship and validate this in one day?",
    ],
    deliverable: "A cycle-time map with bottleneck, speed target, and concrete acceleration changes.",
    rule: RULE,
  },
  automate: {
    step: 5,
    title: "5 — Automate",
    principle: "Automate only after Question → Delete → Simplify → Accelerate.",
    checklist: [
      "Confirm steps 1-4 are done — never automate waste.",
      "Identify repetitive, rule-based steps worth automating (high frequency × high cost).",
      "Choose minimal automation: scripts, generators, CI checks, codemods — not over-engineered platforms.",
      "Automate verification (tests, lint, type-check) and deployment; leave judgment to humans.",
      "Add monitoring / rollback so automation is safe and observable.",
    ],
    questions: [
      "Which manual step is repeated enough to justify automation (and survives steps 1-4)?",
      "What is the smallest script that eliminates this toil?",
      "What should stay manual because it needs human judgment?",
      "How will we know automation broke or is no longer needed?",
      "Can automation be removed later as easily as it was added?",
    ],
    deliverable: "An automation plan (what, why, how, guardrails) — or an explicit decision NOT to automate.",
    rule: RULE,
  },
};

const PHASE_ORDER: Exclude<MuskPhase, "full">[] = [
  "question",
  "delete",
  "simplify",
  "accelerate",
  "automate",
];

function nextPhaseOf(phase: Exclude<MuskPhase, "full">): MuskPhase | null {
  const idx = PHASE_ORDER.indexOf(phase);
  if (idx === -1 || idx === PHASE_ORDER.length - 1) return null;
  return PHASE_ORDER[idx + 1];
}

// ---------------------------------------------------------------------------
// Tool definition
// ---------------------------------------------------------------------------

const MuskParams = Type.Object({
  phase: Type.String({
    description:
      "Which Musk step to execute. Use in order: question → delete → simplify → accelerate → automate. Use 'full' for an overview/plan of all 5 steps at once.",
    enum: ["question", "delete", "simplify", "accelerate", "automate", "full"],
  }),
  task: Type.String({
    description:
      "The user task / goal to apply the algorithm to. Be specific: e.g. 'Add dark-mode toggle to the dashboard' not 'fix stuff'.",
  }),
  context: Type.Optional(
    Type.String({
      description:
        "Optional context: repo area, constraints, links, or prior phase findings. Helps ground the step.",
    }),
  ),
  priorFindings: Type.Optional(
    Type.String({
      description:
        "Summary of findings from previous phase(s) when chaining steps. Pass the deliverable of the prior phase.",
    }),
  ),
});

const MuskOutputSchema = Type.Object({
  phase: Type.String(),
  step: Type.Number(),
  title: Type.String(),
  principle: Type.String(),
  task: Type.String(),
  checklist: Type.Array(Type.String()),
  questions: Type.Array(Type.String()),
  deliverable: Type.String(),
  nextPhase: Type.Union([Type.String(), Type.Null()]),
  rule: Type.String(),
});

function buildPhaseResult(phase: Exclude<MuskPhase, "full">, task: string): MuskDetails {
  const base = PHASES[phase];
  return {
    phase,
    task,
    step: base.step,
    title: base.title,
    principle: base.principle,
    checklist: base.checklist,
    questions: base.questions,
    deliverable: base.deliverable,
    nextPhase: nextPhaseOf(phase),
    rule: base.rule,
  };
}

function renderMarkdown(details: MuskDetails, context?: string, priorFindings?: string): string {
  const lines: string[] = [];
  lines.push(`## ${details.title} — ${details.principle}`);
  lines.push("");
  lines.push(`**Task:** ${details.task}`);
  if (context) lines.push(`**Context:** ${context}`);
  if (priorFindings) lines.push(`**Prior findings:** ${priorFindings}`);
  lines.push("");
  lines.push(`> Rule: *${details.rule}*`);
  lines.push("");
  lines.push(`**Step ${details.step} / 5** — ${details.title}`);
  lines.push("");
  lines.push("**Checklist (do these now):**");
  details.checklist.forEach((c, i) => lines.push(`${i + 1}. ${c}`));
  lines.push("");
  lines.push("**Challenge questions (answer explicitly):**");
  details.questions.forEach((q) => lines.push(`- ${q}`));
  lines.push("");
  lines.push(`**Deliverable for this phase:** ${details.deliverable}`);
  lines.push("");
  if (details.nextPhase) {
    lines.push(
      `→ Next: call \`musk_algorithm\` with phase=\`${details.nextPhase}\` (pass this phase's deliverable as \`priorFindings\`).`,
    );
  } else {
    lines.push(
      "→ All 5 phases complete. Now execute the surviving, simplified, accelerated, and (if worthwhile) automated plan to complete the task. Verify with tests / checks.",
    );
  }
  return lines.join("\n");
}

function renderFullOverview(task: string, context?: string): string {
  const lines: string[] = [];
  lines.push("# Musk 5-Step Algorithm — Full Overview");
  lines.push("");
  lines.push(`**Task:** ${task}`);
  if (context) lines.push(`**Context:** ${context}`);
  lines.push("");
  lines.push(`> Rule: *${RULE}* — Never automate, accelerate, or polish what shouldn't exist.`);
  lines.push("");
  lines.push("Execute in strict order. Do not skip ahead. Call `musk_algorithm` once per phase.");
  lines.push("");
  for (const p of PHASE_ORDER) {
    const d = PHASES[p];
    lines.push(`## ${d.title} — ${d.principle}`);
    lines.push("");
    d.checklist.forEach((c, i) => lines.push(`  ${i + 1}. ${c}`));
    lines.push("");
    lines.push(`  Deliverable: ${d.deliverable}`);
    lines.push("");
  }
  lines.push("---");
  lines.push("**Workflow:** `question` → `delete` → `simplify` → `accelerate` → `automate` → implement.");
  lines.push("Pass each phase's deliverable as `priorFindings` to the next call.");
  return lines.join("\n");
}

export const muskAlgorithmTool = defineTool({
  name: "musk_algorithm",
  label: "Musk Algorithm",
  description:
    "Apply the Musk 5-Step Design Algorithm to a task. " +
    "Steps in strict order: (1) Question — challenge every requirement, (2) Delete — remove anything unnecessary [" +
    RULE +
    "], (3) Simplify — optimize what remains, (4) Accelerate — make cycle time faster, (5) Automate — only after 1-4. " +
    "Call once per phase (phase=question|delete|simplify|accelerate|automate) with the same task, chaining priorFindings. " +
    "Use phase=full for a one-shot overview of all 5 steps. " +
    "Use this whenever the user wants rigor, scope control, or explicitly asks for the Musk algorithm.",
  parameters: MuskParams,
  outputSchema: MuskOutputSchema,
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: false,
  },
  promptSnippet:
    "Musk 5-Step Algorithm: Question → Delete → Simplify → Accelerate → Automate. " +
    "Call musk_algorithm phase by phase; never skip order; never automate waste.",
  promptGuidelines: [
    "When the user runs /run-musk-algo or asks for the Musk algorithm, call musk_algorithm phase by phase in order: question → delete → simplify → accelerate → automate. Use phase=full only for planning overview.",
    "Pass the same `task` to every phase and chain `priorFindings` from the previous phase's deliverable.",
    "In each phase actually answer the checklist and questions against the real codebase/task — do not just restate the template. Perform reads/edits that the phase demands.",
    "Respect the rule: Never optimize something that shouldn't exist — deletion before simplification, simplification before acceleration, acceleration before automation.",
    "After phase 5 (automate), implement the surviving plan and verify with tests/checks.",
  ],

  async execute(_toolCallId, params, _signal, _onUpdate, _ctx) {
    const MAX_TASK = 2000;
    const MAX_CONTEXT = 5000;
    const MAX_FINDINGS = 5000;
    const phase = (params.phase ?? "full") as MuskPhase;
    const task = params.task?.trim();
    if (!task) {
      throw new Error("`task` is required — describe the goal to apply the 5-step algorithm to.");
    }
    if (task.length > MAX_TASK) {
      throw new Error(`\`task\` too long (${task.length} > ${MAX_TASK} chars) — be concise (1-2 sentences).`);
    }
    if (params.context && params.context.length > MAX_CONTEXT) {
      throw new Error(`\`context\` too long (${params.context.length} > ${MAX_CONTEXT} chars) — trim to relevant details.`);
    }
    if (params.priorFindings && params.priorFindings.length > MAX_FINDINGS) {
      throw new Error(
        `\`priorFindings\` too long (${params.priorFindings.length} > ${MAX_FINDINGS} chars) — pass a concise deliverable summary.`,
      );
    }

    if (phase === "full") {
      const content = renderFullOverview(task, params.context);
      const details: MuskDetails = {
        phase: "full",
        task,
        step: 0,
        title: "Full Overview (1-5)",
        principle: "Question → Delete → Simplify → Accelerate → Automate (strict order)",
        checklist: PHASE_ORDER.flatMap((p) => PHASES[p].checklist),
        questions: PHASE_ORDER.flatMap((p) => PHASES[p].questions),
        deliverable: "Call musk_algorithm for phase=question next, then chain through all 5.",
        nextPhase: "question",
        rule: RULE,
      };
      return {
        content: [{ type: "text" as const, text: content }],
        details,
        structuredContent: details as unknown as import("@earendil-works/pi-ai").JsonValue,
      };
    }

    if (!(phase in PHASES)) {
      throw new Error(`Unknown phase "${phase}". Use: question, delete, simplify, accelerate, automate, or full.`);
    }

    const details = buildPhaseResult(phase as Exclude<MuskPhase, "full">, task);
    const content = renderMarkdown(details, params.context, params.priorFindings);

    return {
      content: [{ type: "text" as const, text: content }],
      details,
      structuredContent: details as unknown as import("@earendil-works/pi-ai").JsonValue,
    };
  },

  renderCall(args, theme) {
    const phase = (args as { phase?: string }).phase ?? "full";
    const task = (args as { task?: string }).task ?? "";
    const label = phase === "full" ? "overview (1-5)" : `step ${PHASES[phase as Exclude<MuskPhase, "full">]?.step ?? "?"} — ${phase}`;
    const title = theme.fg("toolTitle", theme.bold(`musk_algorithm › ${label}`));
    const truncated = task.length > 80 ? task.slice(0, 77) + "…" : task;
    return new Text(`${title}  ${theme.fg("muted", truncated)}`, 0, 0);
  },

  renderResult(result, { expanded }, theme) {
    const d = result.details as MuskDetails | undefined;
    if (!d) {
      const text = result.content[0];
      return new Text(text?.type === "text" ? text.text.slice(0, 2000) : "", 0, 0);
    }
    if (d.phase === "full") {
      const header = theme.fg("accent", theme.bold("Musk Algorithm — Full Overview (1 → 5)"));
      const taskLine = theme.fg("muted", `Task: ${d.task}`);
      const ruleLine = theme.fg("dim", `Rule: ${d.rule}`);
      const next = theme.fg("success", "→ Next: question");
      if (!expanded) return new Text([header, taskLine, ruleLine, "", next].join("\n"), 0, 0);
      const body = result.content[0];
      return new Text(body?.type === "text" ? body.text.slice(0, 6000) : "", 0, 0);
    }
    const header = theme.fg("accent", theme.bold(d.title));
    const principle = theme.fg("muted", d.principle);
    const rule = theme.fg("dim", `Rule: ${d.rule}`);
    const taskLine = theme.fg("text", `Task: ${d.task}`);
    const next = d.nextPhase
      ? theme.fg("success", `→ Next: ${d.nextPhase}`)
      : theme.fg("success", "→ All 5 steps done — implement now");
    if (!expanded) {
      return new Text([header, principle, "", taskLine, rule, "", next].join("\n"), 0, 0);
    }
    const body = result.content[0];
    return new Text(body?.type === "text" ? body.text.slice(0, 6000) : "", 0, 0);
  },
});

// ---------------------------------------------------------------------------
// Extension factory
// ---------------------------------------------------------------------------

export default function (pi: ExtensionAPI) {
  pi.registerTool(muskAlgorithmTool);

  pi.registerCommand("run-musk-algo", {
    description:
      "Run the Musk 5-Step Algorithm on a task: Question → Delete → Simplify → Accelerate → Automate, then complete it. Usage: /run-musk-algo <task>",
    handler: async (args, ctx) => {
      const task = args.trim();

      if (!task) {
        ctx.ui.notify(
          "Usage: /run-musk-algo <task>\nExample: /run-musk-algo Add dark-mode toggle to the dashboard",
          "warning",
        );
        return;
      }

      // Drive the workflow via the LLM — inject an instruction that forces
      // phase-by-phase use of the musk_algorithm tool. The command itself
      // does not do work; it orchestrates the agent.
      const instruction = [
        `[Musk-Algorithm] User task: "${task}"`,
        "",
        "Execute the Musk 5-Step Algorithm in STRICT order. Do not skip steps.",
        "For each phase call the `musk_algorithm` tool with the SAME task:",
        "  1. phase=question  → challenge every requirement",
        "  2. phase=delete    → remove anything unnecessary (log deletions)",
        "  3. phase=simplify  → simplest design that survives",
        "  4. phase=accelerate → bottleneck + speed target",
        "  5. phase=automate  → automate only what survives 1-4 (or decide not to)",
        "Chain `priorFindings` between phases. After phase 5, implement the surviving plan and verify (tests/build).",
        `Rule: ${RULE}`,
        "",
        `Begin now with phase=question for task: "${task}"`,
      ].join("\n");

      if (ctx.isIdle()) {
        pi.sendUserMessage(instruction);
      } else {
        pi.sendUserMessage(instruction, { deliverAs: "steer" });
        ctx.ui.notify("Musk workflow steered into current turn", "info");
      }
    },
  });
}
