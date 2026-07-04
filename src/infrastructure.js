import { MOCK_CUSTOMERS, MOCK_ORDERS } from './domain.js';

/**
 * Typed error classes that serve as architectural seams.
 * Callers can programmatically branch on error.type to decide
 * retry / fallback / escalate vs. propagate.
 */
export class AgentError extends Error {
  constructor(message, type, recoverable = false, context = {}) {
    super(message);
    this.name = 'AgentError';
    this.type = type;
    this.recoverable = recoverable;
    this.context = context;
  }
}

export class TransientError extends AgentError {
  constructor(message, context = {}) {
    super(message, 'TRANSIENT', true, context);
    this.name = 'TransientError';
  }
}

export class FatalError extends AgentError {
  constructor(message, context = {}) {
    super(message, 'FATAL', false, context);
    this.name = 'FatalError';
  }
}

export class ToolNotFoundError extends AgentError {
  constructor(toolName, context = {}) {
    super(`Tool '${toolName}' not found in registry`, 'TOOL_NOT_FOUND', false, context);
    this.name = 'ToolNotFoundError';
  }
}

/** Simulate network / I/O latency (40–120ms) */
export function randomLatency() {
  return 40 + Math.random() * 80;
}

/** Simulated downstream API: get_customer */
export async function getCustomerById(customerId) {
  await new Promise(r => setTimeout(r, randomLatency()));
  const record = MOCK_CUSTOMERS[customerId];
  if (!record) throw new TransientError(`Customer ${customerId} not found`, { customerId });
  return { ...record };
}

/** Simulated downstream API: lookup_order */
export async function lookupOrderById(orderId) {
  await new Promise(r => setTimeout(r, randomLatency()));
  const record = MOCK_ORDERS[orderId];
  if (!record) throw new TransientError(`Order ${orderId} not found`, { orderId });
  return { ...record };
}

/** Simulated downstream API: search_orders */
export async function searchOrders(query) {
  await new Promise(r => setTimeout(r, randomLatency()));
  const q = query.toLowerCase();
  const results = Object.values(MOCK_ORDERS).filter(o =>
    o.status.toLowerCase().includes(q) ||
    o.id.toLowerCase().includes(q)
  );
  return results.map(o => ({ ...o }));
}

/** Simulated downstream API: refund_order (destructive!) */
export async function refundOrderById(orderId, amount) {
  await new Promise(r => setTimeout(r, randomLatency()));
  const record = MOCK_ORDERS[orderId];
  if (!record) throw new TransientError(`Order ${orderId} not found for refund`, { orderId, amount });
  if (amount > record.total) throw new FatalError(`Refund amount $${amount} exceeds order total $${record.total}`, { orderId, amount, total: record.total });
  return { refunded: true, orderId, amount, newStatus: 'refunded' };
}

/** Simulate a "destructive command" detection layer */
export function isDestructiveAction(toolName, params) {
  const destructiveTools = ['refund_order'];
  if (destructiveTools.includes(toolName)) {
    return { destructive: true, reason: `${toolName} triggers irreversible payment action` };
  }
  return { destructive: false };
}
