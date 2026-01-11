import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { createProxyMiddleware } from 'http-proxy-middleware';
import { MCP_CONFIG, GATEWAY_PORT, PROXY_TIMEOUT } from './config';

const app = express();

app.use(cors());
app.use(express.json());

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { error: "Too many requests", message: "Please try again later" },
  standardHeaders: true,
  legacyHeaders: false,
});

const VALID_API_KEY = process.env.API_KEY;

if (!VALID_API_KEY) {
  console.error("[Gateway] FATAL: API_KEY environment variable is not configured!");
  console.error("[Gateway] Set API_KEY in Secrets to enable authentication.");
}

function apiKeyAuth(req: Request, res: Response, next: NextFunction) {
  const publicPaths = ["/", "/health", "/api/status"];
  
  if (publicPaths.includes(req.path)) {
    return next();
  }
  
  if (!VALID_API_KEY) {
    return res.status(500).json({
      error: "Server Configuration Error",
      message: "API_KEY not configured on server",
    });
  }
  
  const apiKey = req.headers["x-api-key"] as string || req.query.api_key as string;
  
  if (!apiKey) {
    return res.status(401).json({
      error: "Unauthorized",
      message: "Missing X-API-KEY header or api_key query parameter",
    });
  }
  
  if (apiKey !== VALID_API_KEY) {
    return res.status(403).json({
      error: "Forbidden",
      message: "Invalid API key",
    });
  }
  
  (req as any).validatedApiKey = VALID_API_KEY;
  next();
}

app.use(limiter);
app.use(apiKeyAuth);

app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'API Gateway',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

app.get('/api/status', async (req, res) => {
  const services = [];

  try {
    const contentUrl = `http://${MCP_CONFIG.content.host}:${MCP_CONFIG.content.port}${MCP_CONFIG.content.healthCheck}`;
    const contentResponse = await fetch(contentUrl);
    services.push({
      name: MCP_CONFIG.content.name,
      status: contentResponse.ok ? 'online' : 'offline',
      url: contentUrl,
    });
  } catch (error) {
    services.push({
      name: MCP_CONFIG.content.name,
      status: 'offline',
      error: 'Connection failed',
    });
  }

  try {
    const integrationUrl = `http://${MCP_CONFIG.integration.host}:${MCP_CONFIG.integration.port}${MCP_CONFIG.integration.healthCheck}`;
    const integrationResponse = await fetch(integrationUrl);
    services.push({
      name: MCP_CONFIG.integration.name,
      status: integrationResponse.ok ? 'online' : 'offline',
      url: integrationUrl,
    });
  } catch (error) {
    services.push({
      name: MCP_CONFIG.integration.name,
      status: 'offline',
      error: 'Connection failed',
    });
  }

  res.json({
    gateway: 'online',
    services,
    timestamp: new Date().toISOString(),
  });
});

const contentProxy = createProxyMiddleware({
  target: `http://${MCP_CONFIG.content.host}:${MCP_CONFIG.content.port}`,
  changeOrigin: true,
  pathRewrite: {
    [`^${MCP_CONFIG.content.prefix}`]: '',
  },
  timeout: PROXY_TIMEOUT,
  on: {
    proxyReq: (proxyReq: any, req: any) => {
      if ((req as any).validatedApiKey) {
        proxyReq.setHeader('X-API-KEY', (req as any).validatedApiKey);
      }
    },
    error: (err: Error, req: any, res: any) => {
      console.error('Content MCP Proxy Error:', err);
      if (res && res.status) {
        res.status(503).json({
          error: 'Content MCP unavailable',
          message: err.message,
        });
      }
    },
  },
});

const integrationProxy = createProxyMiddleware({
  target: `http://${MCP_CONFIG.integration.host}:${MCP_CONFIG.integration.port}`,
  changeOrigin: true,
  pathRewrite: {
    [`^${MCP_CONFIG.integration.prefix}`]: '',
  },
  timeout: PROXY_TIMEOUT,
  on: {
    proxyReq: (proxyReq: any, req: any) => {
      if ((req as any).validatedApiKey) {
        proxyReq.setHeader('X-API-KEY', (req as any).validatedApiKey);
      }
    },
    error: (err: Error, req: any, res: any) => {
      console.error('Integration MCP Proxy Error:', err);
      if (res && res.status) {
        res.status(503).json({
          error: 'Integration MCP unavailable',
          message: err.message,
        });
      }
    },
  },
});

app.use(MCP_CONFIG.content.prefix, contentProxy);
app.use(MCP_CONFIG.integration.prefix, integrationProxy);

app.get('/', (req, res) => {
  res.json({
    name: 'API Weaver Gateway',
    version: '1.0.0',
    endpoints: {
      health: '/health',
      status: '/api/status',
      content: MCP_CONFIG.content.prefix,
      integration: MCP_CONFIG.integration.prefix,
    },
  });
});

app.use((req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Route ${req.path} not found`,
  });
});

app.use((err: any, req: any, res: any, next: any) => {
  console.error('Gateway Error:', err);
  res.status(500).json({
    error: 'Internal Server Error',
    message: err.message,
  });
});

app.listen(GATEWAY_PORT, () => {
  console.log(`🚀 API Gateway running on http://localhost:${GATEWAY_PORT}`);
  console.log(`📊 Status: http://localhost:${GATEWAY_PORT}/api/status`);
  console.log(`📡 Content MCP: http://${MCP_CONFIG.content.host}:${MCP_CONFIG.content.port}`);
  console.log(`📡 Integration MCP: http://${MCP_CONFIG.integration.host}:${MCP_CONFIG.integration.port}`);
});
