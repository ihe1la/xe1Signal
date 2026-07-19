import { z } from "zod";

export const LAB_MAX_RULES = 20;
export const LAB_MAX_PATTERN = 240;
export const LAB_MAX_INPUT = 2000;
export const LAB_MAX_VALUES = 30;

export type LabAction = "BLOCK" | "REMOVE" | "ENCODE" | "REPLACE" | "ALLOW";
export type LabMatchType = "CONTAINS" | "CONTAINS_INSENSITIVE" | "REGEX";
export type LabContext = "HTML text" | "HTML attribute" | "JSON string" | "JavaScript string" | "URL value" | "Plain text";

export const filterRuleSchema = z.object({
  id: z.string().max(80), name: z.string().trim().min(1).max(100), pattern: z.string().min(1).max(LAB_MAX_PATTERN),
  matchType: z.enum(["CONTAINS", "CONTAINS_INSENSITIVE", "REGEX"]), action: z.enum(["BLOCK", "REMOVE", "ENCODE", "REPLACE", "ALLOW"]),
  replacement: z.string().max(500).default(""), enabled: z.boolean(), order: z.number().int().min(0).max(LAB_MAX_RULES - 1),
});
export const filterRunSchema = z.object({ rules: z.array(filterRuleSchema).max(LAB_MAX_RULES), values: z.array(z.string().max(LAB_MAX_INPUT)).max(LAB_MAX_VALUES), context: z.enum(["HTML text", "HTML attribute", "JSON string", "JavaScript string", "URL value", "Plain text"]) });

export function canAccessScenarioLab(enabled: boolean, username?: string | null) { return enabled && username === "ihe1la"; }
export function isTrustedLabOrigin(requestUrl: string, origin: string | null, forwardedProto: string | null, forwardedHost: string | null, host: string | null, production: boolean) {
  if (!origin) return !production;
  try {
    const internalOrigin = new URL(requestUrl).origin;
    const proxyHost = (forwardedHost || host)?.split(",")[0]?.trim();
    const proxyProto = forwardedProto?.split(",")[0]?.trim();
    const publicOrigin = proxyHost ? `${proxyProto || new URL(requestUrl).protocol.replace(":", "")}://${proxyHost}` : null;
    return origin === internalOrigin || origin === publicOrigin;
  } catch { return false; }
}
export function htmlEncode(value: string) { return value.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!); }

export function compileSafeRegex(pattern: string) {
  if (pattern.length > LAB_MAX_PATTERN) throw new Error(`Pattern must be ${LAB_MAX_PATTERN} characters or fewer.`);
  if (/\\[1-9]|\(\?<([=!])|\(\?<[A-Za-z]|\([^)]*[+*][^)]*\)[+*{]|(?:\.\*|\.\+){2}/.test(pattern)) throw new Error("Pattern uses a regex feature that is disabled for safe simulation.");
  try { return new RegExp(pattern, "g"); } catch (error) { throw new Error(`Invalid regular expression: ${error instanceof Error ? error.message : "invalid pattern"}`); }
}

function matcher(rule: z.infer<typeof filterRuleSchema>) {
  if (rule.matchType === "REGEX") return compileSafeRegex(rule.pattern);
  return new RegExp(rule.pattern.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), rule.matchType === "CONTAINS_INSENSITIVE" ? "gi" : "g");
}

export type FilterResult = { input: string; normalized: string; result: "Allowed" | "Blocked" | "Encoded" | "Modified" | "Removed" | "Failed"; output: string; matchedRule: string | null; changed: boolean; occurrences: number; context: LabContext; snippet: string; encodingChanges: string };
export function simulateFilter(input: string, rules: z.infer<typeof filterRuleSchema>[], context: LabContext): FilterResult {
  if (input.length > LAB_MAX_INPUT) return result(input, "Failed", input, null, false, 0, context, "Input exceeded the length limit.");
  let output = input; let matchedRule: string | null = null; let occurrences = 0; let classification: FilterResult["result"] = "Allowed";
  try {
    for (const rule of [...rules].filter((r) => r.enabled).sort((a, b) => a.order - b.order)) {
      const regex = matcher(rule); const matches = [...output.matchAll(regex)];
      if (!matches.length) continue;
      matchedRule = rule.name; occurrences = matches.length;
      if (rule.action === "BLOCK") { output = "[BLOCKED]"; classification = "Blocked"; break; }
      if (rule.action === "REMOVE") { output = output.replace(regex, ""); classification = output ? "Modified" : "Removed"; }
      if (rule.action === "ENCODE") { output = output.replace(regex, (value) => htmlEncode(value)); classification = "Encoded"; }
      if (rule.action === "REPLACE") { output = output.replace(regex, rule.replacement); classification = "Modified"; }
      if (rule.action === "ALLOW") { classification = "Allowed"; break; }
    }
    return result(input, classification, output, matchedRule, output !== input, occurrences, context, output !== input ? "Matched content transformed by the selected action." : "None");
  } catch (error) { return result(input, "Failed", input, matchedRule, false, 0, context, error instanceof Error ? error.message : "Rule failed"); }
}
function result(input: string, classification: FilterResult["result"], output: string, matchedRule: string | null, changed: boolean, occurrences: number, context: LabContext, encodingChanges: string): FilterResult {
  const templates: Record<LabContext, string> = { "HTML text": `<div>${output}</div>`, "HTML attribute": `<div data-value="${output}">`, "JSON string": JSON.stringify({ value: output }), "JavaScript string": `const value = ${JSON.stringify(output)};`, "URL value": `https://local.invalid/?value=${encodeURIComponent(output)}`, "Plain text": output };
  return { input, normalized: input.normalize("NFC"), result: classification, output, matchedRule, changed, occurrences, context, snippet: htmlEncode(templates[context]), encodingChanges };
}

export type OAuthScenario = "valid" | "missing-state" | "modified-state" | "missing-verifier" | "incorrect-verifier" | "different-redirect" | "reused-code" | "expired-code";
export function simulateOAuth(scenario: OAuthScenario) {
  const map: Record<OAuthScenario, [string, string]> = { valid: ["Session created", "Complete"], "missing-state": ["Callback rejected", "Callback"], "modified-state": ["Callback rejected", "Callback"], "missing-verifier": ["Token exchange rejected", "Token exchange"], "incorrect-verifier": ["Token exchange rejected", "Token exchange"], "different-redirect": ["Authorization rejected", "Authorization"], "reused-code": ["Token exchange rejected", "Token exchange"], "expired-code": ["Token exchange rejected", "Token exchange"] };
  const [actual, step] = map[scenario]; return { actual, step, passed: true, mockCode: `mock_code_${scenario.replaceAll("-", "_")}`, explanation: scenario === "valid" ? "All local checks passed." : `The simulator rejected the flow at ${step.toLowerCase()}.` };
}

export function compareAccess(expected: boolean, actual: boolean) { return { expected, actual, match: expected === actual, classification: expected === actual ? "Match" : "Possible access-control mismatch" }; }
