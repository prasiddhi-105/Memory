import test from "node:test";
import assert from "node:assert";
import { purgeExpiredRecords } from "../src/engine.mjs";

test("Auto-Expiration of Temporary Travel Context Records", async (t) => {
  
  await t.test("should retain records that do not have an expiration attribute", () => {
    const records = [
      { id: "mem_01", text: "Permanent yellow fever vaccination card certified.", category: "health" }
    ];
    
    const activeRecords = purgeExpiredRecords(records);
    assert.strictEqual(activeRecords.length, 1);
    assert.strictEqual(activeRecords[0].id, "mem_01");
  });

  await t.test("should retain a temporary travel record if it has not expired yet", () => {
    // Set expiration to 1 hour in the future
    const futureTime = new Date(Date.now() + 60 * 60 * 1000).toISOString();
    
    const records = [
      { 
        id: "mem_02", 
        text: "Temporary transit entry visa requirements for stay.", 
        selfDestructAt: futureTime 
      }
    ];
    
    const activeRecords = purgeExpiredRecords(records);
    assert.strictEqual(activeRecords.length, 1);
  });

  await t.test("should automatically filter out records that have passed their self-destruct timestamp", () => {
    // Set expiration to 1 hour in the past
    const pastTime = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    
    const records = [
      { 
        id: "mem_03", 
        text: "Temporary PCR test requirement for outbound weekend flight.", 
        selfDestructAt: pastTime 
      },
      {
        id: "mem_04",
        text: "Routine seasonal health metrics tracking.",
        category: "health" // No expiration attributes
      }
    ];
    
    const activeRecords = purgeExpiredRecords(records);
    
    // mem_03 should be completely removed, leaving only mem_04
    assert.strictEqual(activeRecords.length, 1);
    assert.strictEqual(activeRecords[0].id, "mem_04");
  });
});