import test from "node:test";
import assert from "node:assert";
import { buildCategoryIndex, getClaimsByCategory, clearCategoryIndex } from "../src/claims.mjs";

test("High-Performance Indexing for Context Category Fields", async (t) => {

  const sampleClaims = [
    { claim_id: "c_01", text: "Recorded tracking entry for metric indicators.", category: "health" },
    { claim_id: "c_02", text: "Completed user project structure initialization.", metadata: { category: "productivity" } },
    { claim_id: "c_03", text: "Routine seasonal health metrics tracking.", category: "Health" }, // Test case normalization
    { claim_id: "c_04", text: "Random uncorrelated data slice without category." }
  ];

  await t.test("should successfully index and retrieve records using O(1) category fields", () => {
    clearCategoryIndex();
    buildCategoryIndex(sampleClaims);

    // Test case-insensitive health indexing aggregation
    const healthClaims = getClaimsByCategory("health");
    assert.strictEqual(healthClaims.length, 2);
    assert.strictEqual(healthClaims[0].claim_id, "c_01");
    assert.strictEqual(healthClaims[1].claim_id, "c_03");

    // Test top-level and metadata category normalization matching
    const productivityClaims = getClaimsByCategory("PRODUCTIVITY");
    assert.strictEqual(productivityClaims.length, 1);
    assert.strictEqual(productivityClaims[0].claim_id, "c_02");
  });

  await t.test("should return an empty array gracefully if a category does not exist in index maps", () => {
    clearCategoryIndex();
    buildCategoryIndex(sampleClaims);

    const nonExistent = getClaimsByCategory("finance");
    assert.ok(Array.isArray(nonExistent));
    assert.strictEqual(nonExistent.length, 0);
  });
});