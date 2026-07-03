import test from "node:test";
import assert from "node:assert";
import { appendCommitLog, getCommitJournal, clearCommitJournal } from "../src/engine.mjs";

test("Journal/Append-Only Commit Log Truncation", async (t) => {

  await t.test("should grow linearly when below the maximum threshold boundary", () => {
    clearCommitJournal();
    
    appendCommitLog("Log Entry 1");
    appendCommitLog("Log Entry 2");
    
    const logs = getCommitJournal();
    assert.strictEqual(logs.length, 2);
    assert.strictEqual(logs[0], "Log Entry 1");
    assert.strictEqual(logs[1], "Log Entry 2");
  });

  await t.test("should rotate and truncate oldest entries once threshold boundary is crossed", () => {
    clearCommitJournal();
    
    // Push 55 sequential entries (5 over our threshold limit of 50)
    for (let i = 1; i <= 55; i++) {
      appendCommitLog(`Log Entry ${i}`);
    }
    
    const logs = getCommitJournal();
    
    // Array length must cap firmly at 50 entries max
    assert.strictEqual(logs.length, 50);
    
    // The oldest 5 entries (1 through 5) must be truncated. First active element should be Entry 6.
    assert.strictEqual(logs[0], "Log Entry 6");
    assert.strictEqual(logs[49], "Log Entry 55");
  });
});