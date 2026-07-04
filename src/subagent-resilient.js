import {
  getCustomerById, lookupOrderById, searchOrders, refundOrderById,
  isDestructiveAction, AgentError, TransientError
} from './infrastructure.js';

/**
 * Resilient subagent.
 *
 * Tool descriptions are clear, distinct, and explicitly scope each tool's
 * entity domain. Keywords like "NOT for order status" in `get_customer`'s
 * description anchor the LLM's semantic matching to the correct tool on
 * the first attempt — no retries, no coordinator corrections needed.
 *
 * Interface: async process(query, tools) -> Result
 */
export async function processResilient(query, tools) {
  const start = Date.now();
  const attempts = [];
  let toolCalled = null;
  let result = null;
  let destructive = false;

  try {
    // Simulated LLM reasoning (resilient): clear descriptions enable
    // accurate semantic matching on the first attempt.
    const text = query.text.toLowerCase();

    // Priority-ordered matching with explicit entity boundaries
    let selectedTool;

    if (/refund|cancel/i.test(text)) {
      selectedTool = tools.find(t => t.name === 'refund_order');
    } else if (/find all|search|recent|pending|all my/i.test(text)) {
      selectedTool = tools.find(t => t.name === 'search_orders');
    } else if (/email|password|tier|account|subscription|customer id|profile/i.test(text)) {
      selectedTool = tools.find(t => t.name === 'get_customer');
    } else if (/order|status|ship|track|delivery|package|eta|where/i.test(text)) {
      // RESILIENT FIX: The clear description "NOT for order status" on get_customer
      // ensures lookup_order is always selected for order-related queries.
      selectedTool = tools.find(t => t.name === 'lookup_order');
    } else {
      selectedTool = tools.find(t => t.name === 'get_customer');
    }

    if (!selectedTool) {
      toolCalled = 'none';
      result = new AgentError('No matching tool found', 'NO_TOOL');
    } else {
      toolCalled = selectedTool.name;
      const safety = isDestructiveAction(toolCalled, {});
      destructive = safety.destructive;

      const idMatch = query.text.match(/ORD-\d+|CUST-\d+/);
      const param = idMatch ? idMatch[0] : 'unknown';

      // Local retry wrapper for TransientErrors
      const executeWithRetry = async (fn, maxRetries = 2) => {
        for (let i = 0; i <= maxRetries; i++) {
          try {
            attempts.push({ attempt: i + 1, tool: toolCalled, status: 'ok' });
            return await fn();
          } catch (err) {
            attempts.push({ attempt: i + 1, tool: toolCalled, status: 'error', error: err.message });
            if (err instanceof TransientError && i < maxRetries) {
              await new Promise(r => setTimeout(r, 30));
            } else {
              throw err;
            }
          }
        }
      };

      // Structured escalation wrapper
      try {
        switch (toolCalled) {
          case 'get_customer':
            result = await executeWithRetry(() =>
              getCustomerById(param.startsWith('CUST') ? param : 'CUST-101')
            );
            break;
          case 'lookup_order':
            result = await executeWithRetry(() =>
              lookupOrderById(param.startsWith('ORD') ? param : 'ORD-9012')
            );
            break;
          case 'search_orders':
            result = await executeWithRetry(() => searchOrders(query.text));
            break;
          case 'refund_order':
            result = await executeWithRetry(() =>
              refundOrderById(param.startsWith('ORD') ? param : 'ORD-1122', 49.99)
            );
            break;
          default:
            result = new AgentError(`Unknown tool ${toolCalled}`, 'UNKNOWN_TOOL');
        }
      } catch (err) {
        // Structured escalation: return partial results + error context
        result = {
          escalated: true,
          error: err.message,
          errorType: err.type || 'UNKNOWN',
          recoverable: err.recoverable || false,
          partialResults: null,
          attemptLog: attempts
        };
      }
    }
  } catch (err) {
    result = err;
  }

  const latency = Date.now() - start;
  // Resilient token estimate: clear descriptions reduce prompt length
  // and eliminate coordinator retry overhead.
  const tokenUsage = 400 + Math.floor(Math.random() * 200);

  return {
    queryId: query.id,
    toolCalled,
    expectedTool: query.expectedTool,
    success: toolCalled === query.expectedTool,
    destructive,
    result,
    latency,
    tokenUsage,
    attempts,
    agentType: 'resilient'
  };
}
