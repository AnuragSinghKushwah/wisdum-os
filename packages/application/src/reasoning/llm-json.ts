/**
 * Defensive JSON extraction from LLM output. Models frequently wrap JSON in
 * markdown code fences or add stray commentary; a malformed response should
 * make this one step of the reasoning pass a no-op, not crash the whole
 * pipeline.
 */
export function extractJsonArray(text: string): readonly unknown[] {
  const candidate = stripCodeFence(text);
  try {
    const parsed: unknown = JSON.parse(candidate);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function stripCodeFence(text: string): string {
  const trimmed = text.trim();
  const fenced = /^```(?:json)?\s*([\s\S]*?)\s*```$/.exec(trimmed);
  const captured = fenced?.[1];
  return captured ?? trimmed;
}
