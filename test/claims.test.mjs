import test from "node:test";
import assert from "node:assert";
import { createClaim, verifyAndProcessClaim, clearQuarantineRegistry, CLAIM_TYPES } from "../src/claims.mjs";

test("Multi-App Source Verification Rule Verification", async (t) => {
  
  await t.test("should pass standard non-sensitive claims immediately", () => {
    clearQuarantineRegistry();
    const claimInput = {
      claim_id: "claim:productivity:task_done",
      claim_type: CLAIM_TYPES.POSSIBLE_ORIGIN,
      text: "Completed user project structure initialization.",
      uncertainty: "certain",
      supporting_evidence_ids: ["ev_01"],
      confidence: 0.9,
      metadata: { category: "productivity" }
    };
    
    const result = createClaim(claimInput);
    const verification = verifyAndProcessClaim(result, "App_A");
    
    assert.strictEqual(verification.verified, true);
    assert.strictEqual(verification.quarantined, false);
    assert.notStrictEqual(verification.claim, null);
  });

  await t.test("should quarantine a sensitive health claim on first app report", () => {
    clearQuarantineRegistry();
    const sensitiveInput = {
      claim_id: "claim:health:blood_pressure",
      claim_type: CLAIM_TYPES.POSSIBLE_ORIGIN,
      text: "Recorded tracking entry for metric indicators.",
      uncertainty: "possible",
      supporting_evidence_ids: ["ev_02"],
      confidence: 0.8,
      metadata: { category: "health" }
    };
    
    const result = createClaim(sensitiveInput);
    const verification = verifyAndProcessClaim(result, "FitnessTrackerApp");
    
    assert.strictEqual(verification.verified, false);
    assert.strictEqual(verification.quarantined, true);
    assert.strictEqual(verification.claim, null);
  });

  await t.test("should release sensitive claim from quarantine once a second independent app verifies it", () => {
    clearQuarantineRegistry();
    const sensitiveInput = {
      claim_id: "claim:health:blood_pressure",
      claim_type: CLAIM_TYPES.POSSIBLE_ORIGIN,
      text: "Recorded tracking entry for metric indicators.",
      uncertainty: "possible",
      supporting_evidence_ids: ["ev_02"],
      confidence: 0.8,
      metadata: { category: "health" }
    };
    
    const result = createClaim(sensitiveInput);
    
    // First app submission -> Quarantines
    const step1 = verifyAndProcessClaim(result, "FitnessTrackerApp");
    assert.strictEqual(step1.verified, false);
    assert.strictEqual(step1.quarantined, true);
    
    // Duplicate app submission -> Remains quarantined
    const step2 = verifyAndProcessClaim(result, "FitnessTrackerApp");
    assert.strictEqual(step2.verified, false);
    assert.strictEqual(step2.quarantined, true);
    
    // Second independent app submission -> Releases successfully!
    const step3 = verifyAndProcessClaim(result, "MedicalPortalApp");
    assert.strictEqual(step3.verified, true);
    assert.strictEqual(step3.quarantined, false);
    assert.notStrictEqual(step3.claim, null);
  });
});