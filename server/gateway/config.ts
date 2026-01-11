export const MCP_CONFIG = {
  content: {
    name: 'Content MCP',
    host: process.env.CONTENT_MCP_HOST || 'localhost',
    port: process.env.CONTENT_MCP_PORT || 3001,
    healthCheck: '/health',
    prefix: '/api/content',
  },
  integration: {
    name: 'Integration MCP',
    host: process.env.INTEGRATION_MCP_HOST || 'localhost',
    port: process.env.INTEGRATION_MCP_PORT || 3002,
    healthCheck: '/health',
    prefix: '/api/integration',
  },
};

export const GATEWAY_PORT = process.env.GATEWAY_PORT || 3000;
export const PROXY_TIMEOUT = 30000;
