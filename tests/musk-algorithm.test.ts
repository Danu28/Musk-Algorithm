import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { muskAlgorithmTool } from "../extensions/musk-algorithm/index.ts";

// helper to invoke tool without pi context
async function call(params: Record<string, unknown>) {
  return (muskAlgorithmTool as any).execute("test-id", params, new AbortController().signal, () => {}, {} as any);
}

describe("musk_algorithm tool", () => {
  it("phase=full returns overview with all 5 phases", async () => {
    const res = await call({ phase: "full", task: "Add dark-mode toggle" });
    assert.equal(res.details.phase, "full");
    assert.equal(res.details.step, 0);
    assert.equal(res.details.nextPhase, "question");
    const text = res.content[0].text as string;
    assert.match(text, /Musk 5-Step Algorithm/);
    assert.match(text, /1 — Question/);
    assert.match(text, /5 — Automate/);
    assert.match(text, /Add dark-mode toggle/);
  });

  it("phase=question returns structured checklist and nextPhase=delete", async () => {
    const res = await call({ phase: "question", task: "Fix flaky checkout tests" });
    assert.equal(res.details.phase, "question");
    assert.equal(res.details.step, 1);
    assert.match(res.details.title, /Question/);
    assert.ok(res.details.checklist.length >= 5);
    assert.ok(res.details.questions.length >= 5);
    assert.equal(res.details.nextPhase, "delete");
    assert.match(res.details.rule, /Never optimize/);
    assert.match(res.content[0].text, /Fix flaky checkout tests/);
  });

  it("chains through all 5 phases with correct nextPhase pointers", async () => {
    const order: Array<[string, string | null]> = [
      ["question", "delete"],
      ["delete", "simplify"],
      ["simplify", "accelerate"],
      ["accelerate", "automate"],
      ["automate", null],
    ];
    for (const [phase, next] of order) {
      const res = await call({ phase, task: "Design landing page" });
      assert.equal(res.details.phase, phase);
      assert.equal(res.details.nextPhase, next);
    }
  });

  it("includes context and priorFindings in rendered markdown", async () => {
    const res = await call({
      phase: "delete",
      task: "Refactor auth",
      context: "repo: auth module",
      priorFindings: "Validated requirements: X",
    });
    const text = res.content[0].text as string;
    assert.match(text, /repo: auth module/);
    assert.match(text, /Validated requirements: X/);
  });

  it("throws on missing task", async () => {
    await assert.rejects(() => call({ phase: "question", task: "" }), /task.*required/i);
    await assert.rejects(() => call({ phase: "question", task: "   " }), /task.*required/i);
  });

  it("throws on unknown phase", async () => {
    await assert.rejects(() => call({ phase: "bad-phase", task: "hello" }), /Unknown phase/i);
  });

  it("enforces max length guardrails", async () => {
    const longTask = "a".repeat(2500);
    await assert.rejects(() => call({ phase: "question", task: longTask }), /too long/i);

    const longContext = "c".repeat(6000);
    await assert.rejects(() => call({ phase: "question", task: "ok", context: longContext }), /too long/i);

    const longFindings = "f".repeat(6000);
    await assert.rejects(() => call({ phase: "delete", task: "ok", priorFindings: longFindings }), /too long/i);
  });

  it("outputSchema shape + idempotent (same task => same structuredContent)", async () => {
    const r1 = await call({ phase: "simplify", task: "Same task" });
    const r2 = await call({ phase: "simplify", task: "Same task" });
    assert.deepEqual(r1.structuredContent, r2.structuredContent);
    assert.ok("phase" in r1.details);
    assert.ok("step" in r1.details);
    assert.ok("checklist" in r1.details);
    assert.ok("deliverable" in r1.details);
  });

  it("tool annotations are correctly set (readOnly, idempotent, not destructive)", () => {
    const ann = (muskAlgorithmTool as any).annotations;
    assert.equal(ann.readOnlyHint, true);
    assert.equal(ann.destructiveHint, false);
    assert.equal(ann.idempotentHint, true);
    assert.equal(ann.openWorldHint, false);
  });

  it("print mode: collapsed renderResult is verbose (checklist + deliverable + progress)", async () => {
    const res = await call({ phase: "question", task: "Print mode visibility" });
    const theme: any = { fg: (_c: string, s: string) => s, bold: (s: string) => s };
    const collapsed = (muskAlgorithmTool as any).renderResult(res, { expanded: false }, theme) as { text: string };
    assert.match(collapsed.text, /\[1\/5\]/);
    assert.match(collapsed.text, /Checklist:/);
    assert.match(collapsed.text, /Deliverable:/);
    assert.match(collapsed.text, /→ Next: delete/);
    assert.match(collapsed.text, /█.*20%/); // progress bar
    const expanded = (muskAlgorithmTool as any).renderResult(res, { expanded: true }, theme) as { text: string };
    assert.match(expanded.text, /Challenge questions/);
  });

  it("print mode: renderCall shows progress dots and step", () => {
    const theme: any = { fg: (_c: string, s: string) => s, bold: (s: string) => s };
    const callView = (muskAlgorithmTool as any).renderCall({ phase: "delete", task: "X" }, theme) as { text: string };
    assert.match(callView.text, /step 2 — delete/);
    assert.match(callView.text, /●●○○○/);
    assert.match(callView.text, /\[2\/5\]/);
  });
});
