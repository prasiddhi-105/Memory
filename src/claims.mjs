import {
  normalizeInfluenceClaim,
  validateInfluenceClaim,
} from "./core-schemas.mjs";

function normalize(value, maxLength = 0) {
  const text = String(value ?? "").replace(/\s+/g, " ").trim();
  if (!text) return "";
  return maxLength && text.length > maxLength
    ? `${text.slice(0, maxLength - 3).trim()}...`
    : text;
}

function unique(values = []) {
  return [...new Set(values.map((value) => normalize(value)).filter(Boolean))];
}

export const CLAIM_TYPES = Object.freeze({
  POSSIBLE_ORIGIN: "possible_origin",
  POSSIBLE_INFLUENCE: "possible_influence",
  UNKNOWN_ORIGIN: "unknown_origin",
  SELF_REPORTED_ORIGIN: "self_reported_origin",
  CONTRADICTED_ORIGIN: "contradicted_origin",
});

export function createClaim(input = {}) {
  const claim = normalizeInfluenceClaim(input);
  const result = validateInfluenceClaim(claim);
  return {
    ok: result.ok,
    claim: result.ok ? result.value : null,
    errors: result.errors,
  };
}

export function createUnknownOriginClaim(thought, reason = "No strong digital origin was found.") {
  return createClaim({
    claim_id: `claim:unknown:${normalize(thought).toLowerCase().replace(/[^a-z0-9]+/g, "_")}`,
    claim_type: CLAIM_TYPES.UNKNOWN_ORIGIN,
    text: reason,
    uncertainty: "unknown",
    supporting_evidence_ids: [],
    confidence: 0,
  });
}

export function linkClaimEvidence(claim = {}, evidenceIds = [], options = {}) {
  return normalizeInfluenceClaim({
    ...claim,
    supporting_evidence_ids: unique([
      ...(claim.supporting_evidence_ids || []),
      ...evidenceIds,
    ]),
    contradicted_by_evidence_ids: unique([
      ...(claim.contradicted_by_evidence_ids || []),
      ...(options.contradicted_by_evidence_ids || []),
    ]),
  });
}

export function claimFromInfluencePath(path = {}) {
  const text = normalize(path.summary) ||
    `A possible influence path is ${path.steps?.map((step) => step.label).filter(Boolean).join(" -> ")}.`;
  return createClaim({
    claim_id: `claim:path:${normalize(path.path_id).replace(/^influence_path:/, "")}`,
    claim_type: CLAIM_TYPES.POSSIBLE_INFLUENCE,
    text,
    uncertainty: path.uncertainty || "possible",
    supporting_evidence_ids: path.evidence_ids || [],
    confidence: path.confidence,
    metadata: {
      path_id: path.path_id,
      category: path.category,
    },
  });
}

export function indexClaims(claims = []) {
  return new Map(
    (Array.isArray(claims) ? claims : [])
      .map((claim) => createClaim(claim))
      .filter((result) => result.ok)
      .map((result) => [result.claim.claim_id, result.claim])
  );
}

export function claimsForEvidence(evidenceId, claims = []) {
  const id = normalize(evidenceId);
  if (!id) return [];
  return (Array.isArray(claims) ? claims : [])
    .map((claim) => createClaim(claim))
    .filter((result) => result.ok)
    .map((result) => result.claim)
    .filter((claim) =>
      claim.supporting_evidence_ids.includes(id) ||
      claim.contradicted_by_evidence_ids.includes(id)
    );
}
// Allowed action origins for trace logging
export const RECTIFICATION_ORIGINS = Object.freeze({
  MANUAL: "manual",
  AUTO_COMPACTION: "auto_compaction",
  APP_OVERWRITE: "app_overwrite"
});

/**
 * Rectifies an existing context claim and attaches a historical trace log 
 * detailing the action origin reason.
 * 
 * @param {Object} existingClaim - The original claim object
 * @param {Object} updates - The new fields to apply to the claim
 * @param {string} origin - Why it was rectified ('manual', 'auto_compaction', 'app_overwrite')
 * @returns {Object} The updated claim object with complete rectification trace metadata
 */
export function rectifyClaimWithTrace(existingClaim = {}, updates = {}, origin) {
  const verifiedOrigin = String(origin || "").toLowerCase().trim();
  
  // Validate that the provided origin is one of our strict allowed tracking channels
  const allowedOrigins = Object.values(RECTIFICATION_ORIGINS);
  if (!allowedOrigins.includes(verifiedOrigin)) {
    throw new Error(`Invalid rectification origin: '${origin}'. Must be one of: ${allowedOrigins.join(', ')}`);
  }

  // Build the historical trace log entry
  const traceEntry = {
    timestamp: new Date().toISOString(),
    action_origin: verifiedOrigin,
    previous_state: { ...existingClaim.metadata, text: existingClaim.text }
  };

  // Compile the new claim state with the injected trace array
  return {
    ...existingClaim,
    ...updates,
    metadata: {
      ...(existingClaim.metadata || {}),
      ...(updates.metadata || {}),
      rectification_trace: [
        ...(existingClaim.metadata?.rectification_trace || []),
        traceEntry
      ]
    }
  };
}