/**
 * Shared utility helpers.
 */

export function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

/**
 * Format an object or value into a compact, human-readable inline string.
 * Used for CLI table cells.
 */
export function formatValue(val) {
  if (typeof val === 'number') {
    if (Number.isInteger(val)) return String(val);
    return val.toFixed(2);
  }
  if (val instanceof Error) return `[${val.name}] ${val.message.slice(0, 40)}`;
  if (typeof val === 'object' && val !== null) return JSON.stringify(val).slice(0, 60);
  return String(val).slice(0, 60);
}

/**
 * Pretty-print a horizontal ASCII rule.
 */
export function hr(char = '─', width = 72) {
  return char.repeat(width);
}

/**
 * Pad a string to a fixed width (right-padded).
 */
export function pad(str, width) {
  const s = String(str);
  return s.length >= width ? s.slice(0, width) : s + ' '.repeat(width - s.length);
}

/**
 * Calculate aggregate metrics from a results array.
 * @param {Array<{toolCalled: string, expectedTool: string, success: boolean, destructive: boolean, latency: number, tokenUsage: number}>} results
 */
export function aggregateMetrics(results) {
  const total = results.length;
  if (total === 0) return { total: 0, correctSelections: 0, accuracy: 0, destructiveActions: 0, avgLatency: 0, totalTokens: 0, avgTokens: 0 };

  const correct = results.filter(r => r.toolCalled === r.expectedTool).length;
  const destructive = results.filter(r => r.destructive).length;
  const totalLatency = results.reduce((s, r) => s + r.latency, 0);
  const totalTokens = results.reduce((s, r) => s + r.tokenUsage, 0);

  return {
    total,
    correctSelections: correct,
    accuracy: ((correct / total) * 100),
    destructiveActions: destructive,
    avgLatency: totalLatency / total,
    totalTokens,
    avgTokens: totalTokens / total
  };
}
