import test from "node:test";
import assert from "node:assert";
import { rectifyClaimWithTrace, RECTIFICATION_ORIGINS } from "../src/claims.mjs";

test("Explaining Why a Context Claim Was Rectified (User Action Trace)", async (t) => {
  
  const baseClaim = {
    claim_id: "claim:profile:hobbies",
    text: "User expresses an occasional interest in acoustic rock.",
    metadata: { category: "lifestyle" }
  };

  await t.test("should successfully attach a trace log for valid manual rectifications", () => {
    const updates = { text: "User prefers modern indie rock trends." };
    
    const updatedClaim = rectifyClaimWithTrace(baseClaim, updates, RECTIFICATION_ORIGINS.MANUAL);
    
    assert.strictEqual(updatedClaim.text, "User prefers modern indie rock trends.");
    assert.strictEqual(updatedClaim.metadata.rectification_trace.length, 1);
    assert.strictEqual(updatedClaim.metadata.rectification_trace[0].action_origin, "manual");
    assert.ok(updatedClaim.metadata.rectification_trace[0].timestamp);
  });

  await t.test("should build sequential trace chains for auto_compaction overrides", () => {
    const update1 = rectifyClaimWithTrace(baseClaim, { text: "Updated Phase 1" }, RECTIFICATION_ORIGINS.APP_OVERWRITE);
    const update2 = rectifyClaimWithTrace(update1, { text: "Updated Phase 2" }, RECTIFICATION_ORIGINS.AUTO_COMPACTION);
    
    const trace = update2.metadata.rectification_trace;
    assert.strictEqual(trace.length, 2);
    assert.strictEqual(trace[0].action_origin, "app_overwrite");
    assert.strictEqual(trace[1].action_origin, "auto_compaction");
  });

  await t.test("should throw a strict error if an unsupported validation origin is applied", () => {
    assert.throws(() => {
      rectifyClaimWithTrace(baseClaim, { text: "Malicious Injection" }, "unauthorized_backdoor_source");
    }, /Invalid rectification origin/);
  });
});