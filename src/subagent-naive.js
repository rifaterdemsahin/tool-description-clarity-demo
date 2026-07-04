import {
  getCustomerById, lookupOrderById, searchOrders, refundOrderById,
  isDestructiveAction, AgentError
} from './infrastructure.js';

/**
 * Naive subagent.
 *
 * Tool descriptions are vague ("Gets a customer record", "Looks up an order").
 * The agent frequently selects `get_customer` for order-status queries because
 * the descriptions lack distinguishing semantic signals about each tool's
 * specific entity domain and appropriate use-case boundaries.
 *
 * Interface: async process(query, tools) -> Result
 */
export async function processNaive(query, tools) {
  const start = Date.now();
  const attempts = [];
  let toolCalled = null;
  let result = null;
  let destructive = false;

  try {
    // Simulated LLM reasoning (naive): due to ambiguous descriptions,
    // the agent often maps "order status" → get_customer (customer-related) instead of lookup_order.
    // This is a heuristic model of LLM behavior with poor tool descriptions.
    const userAsksAboutOrder = /order|purchase|ship|track|delivery|package/i.test(query.text);
    const userAsksAboutAccount = /email|password|tier|account|subscription/i.test(query.text);
    const userAsksForRefund = /refund|cancel/i.test(query.text);
    const userAsksToSearch = /find all|search|recent|pending/i.test(query.text);

    let selectedTool;
    if (userAsksForRefund) {
      selectedTool = tools.find(t => t.name === 'refund_order');
    } else if (userAsksToSearch) {
      selectedTool = tools.find(t => t.name === 'search_orders');
    } else if (userAsksAboutAccount) {
      selectedTool = tools.find(t => t.name === 'get_customer');
    } else if (userAsksAboutOrder) {
      // NAIVE FLAW: ~60% chance the agent picks get_customer instead of lookup_order
      // because the descriptions are too similar and customer-related words dominate.
      if (Math.random() < 0.60) {
        selectedTool = tools.find(t => t.name === 'get_customer');
      } else {
        selectedTool = tools.find(t => t.name === 'lookup_order');
      }
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

      // Extract an ID from the query text to simulate parameter passing
      const idMatch = query.text.match(/ORD-\d+|CUST-\d+/);
      const param = idMatch ? idMatch[0] : 'unknown';

      switch (toolCalled) {
        case 'get_customer':
          result = await getCustomerById(param.startsWith('CUST') ? param : 'CUST-101');
          break;
        case 'lookup_order':
          result = await lookupOrderById(param.startsWith('ORD') ? param : 'ORD-9012');
          break;
        case 'search_orders':
          result = await searchOrders(query.text);
          break;
        case 'refund_order':
          result = await refundOrderById(param.startsWith('ORD') ? param : 'ORD-1122', 49.99);
          break;
        default:
          result = new AgentError(`Unknown tool ${toolCalled}`, 'UNKNOWN_TOOL');
      }
    }
  } catch (err) {
    result = err;
  }

  const latency = Date.now() - start;
  // Naive token estimate: the ambiguous description leads to longer prompt chains
  // as the agent retries or the coordinator intervenes to correct the selection.
  const tokenUsage = 800 + Math.floor(Math.random() * 400);

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
    agentType: 'naive'
  };
}
