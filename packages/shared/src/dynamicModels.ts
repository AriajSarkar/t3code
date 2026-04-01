import type { ServerProviderModel } from "@t3tools/contracts";

/**
 * Normalize a raw model list payload from any CLI harness into
 * `ServerProviderModel[]`.
 *
 * Supports:
 * - **Codex** `model/list` JSON-RPC: `{ data: [{ id, displayName, supportedReasoningEfforts, … }] }`
 * - **Claude** SDK `initializationResult().models`: `[{ value, displayName, supportedEffortLevels, … }]`
 * - Any future harness returning an array of model objects (flat or wrapped in a `data`/`models` key)
 */
export function parseDynamicModelList(raw: unknown): ServerProviderModel[] | undefined {
  if (!raw || typeof raw !== "object") return undefined;

  const rawModels = resolveModelArray(raw);
  if (!rawModels) return undefined;

  const models: ServerProviderModel[] = [];
  for (const entry of rawModels) {
    if (!entry || typeof entry !== "object") continue;
    const record = entry as Record<string, unknown>;

    const slug = firstString(record, "id", "model", "value", "slug");
    if (!slug) continue;

    const displayName = firstString(record, "displayName", "display_name", "name");

    const mappedReasoningLevels = parseReasoningEfforts(record);
    const supportsFastMode =
      record.supportsFastMode === true ||
      record.supportVerbosity === true ||
      record.support_verbosity === true;

    const capabilities: ServerProviderModel["capabilities"] = {
      reasoningEffortLevels: mappedReasoningLevels,
      supportsFastMode,
      supportsThinkingToggle: false,
      contextWindowOptions: [],
      promptInjectedEffortLevels: [],
    };

    models.push({
      slug,
      name: displayName && displayName.trim() ? displayName.trim() : slug,
      isCustom: false,
      capabilities,
    });
  }

  return models.length > 0 ? models : undefined;
}

// ── Internal helpers ────────────────────────────────────────────────

/** Unwrap the model array from common envelope shapes. */
function resolveModelArray(raw: unknown): unknown[] | undefined {
  if (globalThis.Array.isArray(raw)) return raw as unknown[];

  if (raw && typeof raw === "object") {
    const record = raw as Record<string, unknown>;
    // Codex wraps in `{ data: [...] }`
    if (globalThis.Array.isArray(record.data)) return record.data as unknown[];
    // Future harnesses may use `{ models: [...] }`
    if (globalThis.Array.isArray(record.models)) return record.models as unknown[];
  }

  return undefined;
}

/** Return the first non-empty string value from the candidate keys. */
function firstString(record: Record<string, unknown>, ...keys: string[]): string | undefined {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim().length > 0) return value.trim();
  }
  return undefined;
}

/**
 * Parse reasoning effort levels from either:
 * - Codex objects: `supportedReasoningEfforts: [{ reasoningEffort, description }]`
 * - Claude string arrays: `supportedEffortLevels: ["low", "medium", "high"]`
 * - Generic objects: `supported_reasoning_levels: [{ effort, description }]`
 */
function parseReasoningEfforts(
  record: Record<string, unknown>,
): { value: string; label: string; isDefault?: boolean }[] {
  const defaultLevel = firstString(record, "defaultReasoningEffort", "default_reasoning_level");
  const result: { value: string; label: string; isDefault?: boolean }[] = [];

  // Strategy 1: Codex-style object array `supportedReasoningEfforts`
  const codexEfforts = record.supportedReasoningEfforts ?? record.supported_reasoning_levels;
  if (globalThis.Array.isArray(codexEfforts)) {
    for (const item of codexEfforts as unknown[]) {
      if (!item || typeof item !== "object") continue;
      const r = item as Record<string, unknown>;
      const effort = firstString(r, "reasoningEffort", "effort");
      if (!effort) continue;
      result.push({
        value: effort,
        label: effortLabel(effort),
        ...(defaultLevel && effort === defaultLevel ? { isDefault: true } : {}),
      });
    }
    if (result.length > 0) return result;
  }

  // Strategy 2: Claude-style string array `supportedEffortLevels`
  const claudeEfforts = record.supportedEffortLevels;
  if (globalThis.Array.isArray(claudeEfforts)) {
    for (const item of claudeEfforts as unknown[]) {
      if (typeof item !== "string") continue;
      result.push({
        value: item,
        label: effortLabel(item),
        ...(defaultLevel && item === defaultLevel ? { isDefault: true } : {}),
      });
    }
    if (result.length > 0) return result;
  }

  return result;
}

/** Convert an effort key like "xhigh" into a human-readable label. */
function effortLabel(effort: string): string {
  switch (effort) {
    case "xhigh":
      return "Extra High";
    case "ultrathink":
      return "Ultrathink";
    default:
      return effort.charAt(0).toUpperCase() + effort.slice(1);
  }
}
