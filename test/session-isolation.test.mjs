import test from "node:test";
import assert from "node:assert";
import { trainMediaBaseline, detectSessionAnomaly, clearMediaBaseline } from "../src/engine.mjs";

test("Context Isolation for Shared Family Device Playback Sessions", async (t) => {
  
  await t.test("should process standard profile music into default partition", () => {
    clearMediaBaseline();
    
    // Establish a clear baseline profile for a Lo-Fi / Indie listener
    trainMediaBaseline(["lo-fi", "indie", "chillhop"]);
    trainMediaBaseline(["lo-fi", "chillhop"]);
    
    const incomingTrack = {
      title: "Rainy Nights",
      artist: "Chill Producer",
      genres: ["lo-fi", "chillhop"]
    };
    
    const partition = detectSessionAnomaly(incomingTrack);
    assert.strictEqual(partition, "default");
  });

  await t.test("should quarantine completely divergent music genres under 'shared-session'", () => {
    clearMediaBaseline();
    
    // Train a consistent user preference profile (e.g., Classical / Jazz)
    trainMediaBaseline(["classical", "piano", "jazz"]);
    trainMediaBaseline(["classical", "orchestral"]);
    
    // An unexpected stream signature arrives (e.g., Heavy Metal / Deathcore)
    const suddenDivergence = {
      title: "Thundershock Blast",
      artist: "Metal Shredders",
      genres: ["heavy-metal", "deathcore", "rock"]
    };
    
    const partition = detectSessionAnomaly(suddenDivergence);
    
    // The sudden signature shift must trigger the isolation quarantine partition
    assert.strictEqual(partition, "shared-session");
  });
});