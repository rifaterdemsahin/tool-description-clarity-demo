import { TEST_CORPUS, NAIVE_TOOLS, RESILIENT_TOOLS } from './domain.js';
import { processNaive } from './subagent-naive.js';
import { processResilient } from './subagent-resilient.js';
import { aggregateMetrics } from './utils.js';

/**
 * Coordinator runs the same workload through both agent implementations
 * and collects comparable results.
 *
 * Both subagents implement the same duck-typed contract:
 *   async process(query, tools) -> Result
 *
 * The coordinator never needs to know which implementation it's running.
 */
export async function runNaiveScenario() {
  const results = [];
  for (const query of TEST_CORPUS) {
    const r = await processNaive(query, NAIVE_TOOLS);
    results.push(r);
  }
  return { results, metrics: aggregateMetrics(results), agentType: 'naive' };
}

export async function runResilientScenario() {
  const results = [];
  for (const query of TEST_CORPUS) {
    const r = await processResilient(query, RESILIENT_TOOLS);
    results.push(r);
  }
  return { results, metrics: aggregateMetrics(results), agentType: 'resilient' };
}

export async function runBothScenarios() {
  const [naiveOutput, resilientOutput] = await Promise.all([
    runNaiveScenario(),
    runResilientScenario()
  ]);
  return { naive: naiveOutput, resilient: resilientOutput };
}
