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
// In-memory inverted index registry mapping category keys to arrays of matching claims
const CATEGORY_INVERTED_INDEX = new Map();

/**
 * Parses and indexes an array of claims into the high-performance inverted index registry.
 * @param {Array<Object>} claims - Collection of valid memory claims
 */
export function buildCategoryIndex(claims = []) {
  // Clear any existing index data to prevent stale lookups across re-indexes
  CATEGORY_INVERTED_INDEX.clear();

  if (!Array.isArray(claims)) return;

  claims.forEach((claim) => {
    if (!claim) return;
    
    // Extract category dynamically from top-level or metadata groupings
    const rawCategory = claim.category || claim.metadata?.category;
    if (!rawCategory) return;

    const normalizedCategory = String(rawCategory).toLowerCase().trim();

    if (!CATEGORY_INVERTED_INDEX.has(normalizedCategory)) {
      CATEGORY_INVERTED_INDEX.set(normalizedCategory, []);
    }

    CATEGORY_INVERTED_INDEX.get(normalizedCategory).push(claim);
  });
}

/**
 * Performs an O(1) optimized lookup to instantly retrieve all claims matching a given category.
 * @param {string} category - The category to query
 * @returns {Array<Object>} List of matched claims (empty array if no matches found)
 */
export function getClaimsByCategory(category) {
  if (!category) return [];
  const normalizedKey = String(category).toLowerCase().trim();
  return CATEGORY_INVERTED_INDEX.get(normalizedKey) || [];
}

/**
 * Flushes the active lookup cache index state.
 */
export function clearCategoryIndex() {
  CATEGORY_INVERTED_INDEX.clear();
}