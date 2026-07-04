// Mock entity: tools available to the Customer Support Resolution Agent
// Each function-calling tool has a name, description, and parameter schema.

/**
 * @typedef {Object} ToolDefinition
 * @property {string} name         — unique tool identifier
 * @property {string} description  — semantic description the LLM reads to match user intent
 * @property {Object} parameters   — JSON Schema for the tool's arguments
 */

/** Simulated downstream back-end records */
export class Customer {
  constructor({ id, name, email, tier }) {
    this.id = id;
    this.name = name;
    this.email = email;
    this.tier = tier;
  }
}

export class Order {
  constructor({ id, customerId, status, items, total, createdAt }) {
    this.id = id;
    this.customerId = customerId;
    this.status = status;
    this.items = items;
    this.total = total;
    this.createdAt = createdAt;
  }
}

/** Queries that users might ask the agent */
export class Query {
  /**
   * @param {string} id
   * @param {string} text        — the user's natural-language question
   * @param {string} expectedTool — the tool the agent SHOULD call
   */
  constructor({ id, text, expectedTool }) {
    this.id = id;
    this.text = text;
    this.expectedTool = expectedTool;
  }
}

// ---- Naive tool descriptions (poor, ambiguous) ----
export const NAIVE_TOOLS = [
  {
    name: 'get_customer',
    description: 'Gets a customer record from the system.',
    parameters: {
      type: 'object',
      properties: {
        customer_id: { type: 'string', description: 'The customer ID' }
      },
      required: ['customer_id']
    }
  },
  {
    name: 'lookup_order',
    description: 'Looks up an order.',
    parameters: {
      type: 'object',
      properties: {
        order_id: { type: 'string', description: 'The order ID' }
      },
      required: ['order_id']
    }
  },
  {
    name: 'search_orders',
    description: 'Searches for orders.',
    parameters: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Search query' }
      },
      required: ['query']
    }
  },
  {
    name: 'refund_order',
    description: 'Processes a refund.',
    parameters: {
      type: 'object',
      properties: {
        order_id: { type: 'string', description: 'The order ID' },
        amount: { type: 'number', description: 'Refund amount' }
      },
      required: ['order_id', 'amount']
    }
  }
];

// ---- Resilient tool descriptions (clear, distinct, unambiguous) ----
export const RESILIENT_TOOLS = [
  {
    name: 'get_customer',
    description: 'Retrieves a CUSTOMER profile by customer_id. Use when the user asks about account details, contact info, or subscription tier — NOT for order status or purchase history.',
    parameters: {
      type: 'object',
      properties: {
        customer_id: { type: 'string', description: 'Unique identifier of the customer account' }
      },
      required: ['customer_id']
    }
  },
  {
    name: 'lookup_order',
    description: 'Retrieves a single ORDER by order_id. Use when the user asks about a specific order status, shipping update, or delivery ETA. Returns order status, items, and tracking.',
    parameters: {
      type: 'object',
      properties: {
        order_id: { type: 'string', description: 'Unique identifier of the order to retrieve' }
      },
      required: ['order_id']
    }
  },
  {
    name: 'search_orders',
    description: 'Searches across ALL orders by keyword. Use when the user asks to find orders by date range, status filter, or product name. Returns a list of matching orders.',
    parameters: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Search keyword: order status, product name, or date range' }
      },
      required: ['query']
    }
  },
  {
    name: 'refund_order',
    description: 'Processes a monetary REFUND for an order. Use ONLY when the user explicitly requests a refund or return. Requires order_id and amount. Triggers irreversible payment reversal.',
    parameters: {
      type: 'object',
      properties: {
        order_id: { type: 'string', description: 'The order to refund' },
        amount: { type: 'number', description: 'Amount in USD to refund (must be ≤ order total)' }
      },
      required: ['order_id', 'amount']
    }
  }
];

/** Simulated test workload — queries that exercise tool-selection accuracy */
export const TEST_CORPUS = [
  new Query({ id: 'Q1', text: 'What is the status of my order #ORD-9012?', expectedTool: 'lookup_order' }),
  new Query({ id: 'Q2', text: 'Can you tell me the delivery ETA for order ORD-5543?', expectedTool: 'lookup_order' }),
  new Query({ id: 'Q3', text: 'I want to update my email address on my account.', expectedTool: 'get_customer' }),
  new Query({ id: 'Q4', text: 'Where is my package for order ORD-3321?', expectedTool: 'lookup_order' }),
  new Query({ id: 'Q5', text: 'Find all my orders from last month.', expectedTool: 'search_orders' }),
  new Query({ id: 'Q6', text: 'What subscription tier am I on?', expectedTool: 'get_customer' }),
  new Query({ id: 'Q7', text: 'Has order ORD-7890 shipped yet?', expectedTool: 'lookup_order' }),
  new Query({ id: 'Q8', text: 'I need a refund for order ORD-1122.', expectedTool: 'refund_order' }),
  new Query({ id: 'Q9', text: 'Show me my recent purchases.', expectedTool: 'search_orders' }),
  new Query({ id: 'Q10', text: 'Track my order ORD-6678 please.', expectedTool: 'lookup_order' }),
  new Query({ id: 'Q11', text: 'What is my customer ID?', expectedTool: 'get_customer' }),
  new Query({ id: 'Q12', text: 'Cancel my order ORD-9900.', expectedTool: 'refund_order' }),
  new Query({ id: 'Q13', text: 'Find orders that are still pending.', expectedTool: 'search_orders' }),
  new Query({ id: 'Q14', text: 'Is order ORD-4567 out for delivery?', expectedTool: 'lookup_order' }),
  new Query({ id: 'Q15', text: 'Change my account password.', expectedTool: 'get_customer' })
];

/** Mock data store */
export const MOCK_CUSTOMERS = {
  'CUST-101': new Customer({ id: 'CUST-101', name: 'Alice Chen', email: 'alice@example.com', tier: 'premium' }),
  'CUST-202': new Customer({ id: 'CUST-202', name: 'Bob Patel', email: 'bob@example.com', tier: 'basic' }),
  'CUST-303': new Customer({ id: 'CUST-303', name: 'Carol Diaz', email: 'carol@example.com', tier: 'premium' })
};

export const MOCK_ORDERS = {
  'ORD-9012': new Order({ id: 'ORD-9012', customerId: 'CUST-101', status: 'shipped', items: 3, total: 149.97, createdAt: '2026-06-15' }),
  'ORD-5543': new Order({ id: 'ORD-5543', customerId: 'CUST-202', status: 'processing', items: 1, total: 89.99, createdAt: '2026-06-20' }),
  'ORD-3321': new Order({ id: 'ORD-3321', customerId: 'CUST-101', status: 'delivered', items: 2, total: 59.98, createdAt: '2026-05-01' }),
  'ORD-7890': new Order({ id: 'ORD-7890', customerId: 'CUST-303', status: 'pending', items: 4, total: 299.96, createdAt: '2026-06-28' }),
  'ORD-1122': new Order({ id: 'ORD-1122', customerId: 'CUST-202', status: 'delivered', items: 1, total: 49.99, createdAt: '2026-04-10' }),
  'ORD-6678': new Order({ id: 'ORD-6678', customerId: 'CUST-101', status: 'in_transit', items: 2, total: 79.98, createdAt: '2026-06-25' }),
  'ORD-9900': new Order({ id: 'ORD-9900', customerId: 'CUST-303', status: 'processing', items: 1, total: 29.99, createdAt: '2026-06-30' }),
  'ORD-4567': new Order({ id: 'ORD-4567', customerId: 'CUST-202', status: 'out_for_delivery', items: 3, total: 119.97, createdAt: '2026-06-22' })
};
