# CIVIC COMPASS — JSDoc Documentation Standard

## Purpose

This document defines the documentation standard for every exported function,
class, interface, and type in the CIVIC COMPASS codebase. It is designed
for the specific needs of an AI civic application where functions interact
with Gemini, Firestore, and real election data.

A code reviewer who has never seen this codebase should be able to read
the JSDoc for any function and immediately understand:
1. What it does
2. Why it exists in a civic context
3. What can go wrong
4. What safety constraints apply

---

## Standard Template

```typescript
/**
 * [One-line summary in present tense: what this function does.]
 *
 * [2-4 sentences covering:]
 * - The specific civic problem it solves
 * - How it fits into the anti-hallucination pipeline
 * - Important behavioral constraints (timeouts, retries, caching)
 * - Side effects (Firestore writes, API calls, cache mutations)
 *
 * @param paramName - What this is. Valid range/format.
 *   What happens if the value is invalid (does it throw? return err?).
 *   For jurisdiction params: which invariants are assumed.
 *
 * @returns What is returned. Shape of the object.
 *   When it can be null/undefined. What the Result error
 *   variant will be on failure.
 *
 * @throws {ErrorClass} ONLY if the function throws (not Result-based).
 *   Most functions should return Result instead of throwing.
 *
 * @civic-safety [Required for Gemini-calling functions]
 *   What prevents hallucination in this specific call.
 *   What grounding sources are used.
 *   What happens if confidence is below threshold.
 *
 * @privacy [Required for functions handling voter data]
 *   What PII is accessed. What is logged (and what is NOT).
 *   What is stored in Firestore vs. kept in memory only.
 *
 * @perf [Required for functions with non-trivial performance]
 *   Expected latency range. Caching behavior. Firestore read count.
 *   Whether this function is safe to call in a hot loop.
 *
 * @example
 * // Typical usage
 * const result = await functionName(validInput);
 * match(result, {
 *   ok: (value) => console.log(value),
 *   err: (error) => console.error(error.code),
 * });
 *
 * // Error case
 * const bad = await functionName(invalidInput);
 * // bad.ok === false, bad.error.code === 'SPECIFIC_ERROR'
 */
```

---

## Category-Specific Rules

### Functions That Call Gemini

Every function that makes a Gemini API call MUST document:

1. **Model used** — Flash vs Pro and why.
2. **Thinking level** — minimal/low/moderate/deep and why.
3. **Grounding tools** — Google Search, URL Context, or neither.
4. **Structured output** — whether response uses JSON schema enforcement.
5. **Confidence threshold** — what happens below 60%.
6. **Prompt injection defense** — how the function protects against it.

```typescript
/**
 * ...
 * @civic-safety
 *   - Model: Gemini 3.1 Pro (deep reasoning needed for legal accuracy).
 *   - Grounding: Google Search + URL Context for real-time civic data.
 *   - Structured Output: JSON schema enforces verdict enum.
 *   - Anti-hallucination: Verdict defaults to "Unverifiable" if
 *     grounding metadata contains zero .gov sources.
 *   - Confidence < 60: Response is prefixed with warning banner.
 */
```

### Functions That Handle Election Dates

Every function that processes election dates MUST document:

1. **Jurisdiction assumption** — what state/county is expected to be resolved.
2. **Date format** — ISO 8601 (YYYY-MM-DD).
3. **Timezone handling** — are dates local or UTC?
4. **Deadline semantics** — does "October 5" mean end-of-day or start-of-day?

### Functions That Process Voter Data

Every function that accesses voter profile data MUST document:

1. **PII classification** — what fields are considered PII.
2. **Logging policy** — what is logged to console/monitoring (never PII).
3. **Storage policy** — what goes to Firestore (never raw addresses).
4. **Retention** — how long data is kept.

### Repository Methods

Every repository method MUST document:

1. **Firestore path** — exact collection/document path.
2. **Operation type** — read, write, batch, transaction.
3. **Indexes required** — compound indexes needed.
4. **Read cost** — expected document reads per call.
5. **Caching** — whether the result is cached and for how long.

---

## Anti-Patterns to Avoid

| ❌ Don't | ✅ Do |
|----------|-------|
| `@returns The result` | `@returns Result containing the voter's checklist items sorted by deadline, or JURISDICTION_NOT_FOUND if the state code is unrecognized.` |
| `@param data - The data` | `@param jurisdiction - A resolved Jurisdiction. The state field must be a 2-letter uppercase abbreviation. The fips field is validated but not used for the Firestore query.` |
| `@throws Error` | `@throws This function does not throw. All failures are returned as Result.err with a specific AppError variant.` |
| No safety docs | `@civic-safety Grounded via Google Search. Verdict defaults to UNVERIFIABLE if confidence < 60.` |
