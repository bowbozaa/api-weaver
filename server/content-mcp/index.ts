import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import routes from './routes';

const app = express();
const PORT = process.env.CONTENT_MCP_PORT || 3001;

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
  console.error("[Content MCP] FATAL: API_KEY environment variable is not configured!");
  console.error("[Content MCP] Set API_KEY in Secrets to enable authentication.");
}

function apiKeyAuth(req: Request, res: Response, next: NextFunction) {
  const publicPaths = ["/", "/health"];
  
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
  
  next();
}

app.use(limiter);
app.use(apiKeyAuth);

app.use((req, res, next) => {
  console.log(`[Content MCP] ${req.method} ${req.path}`);
  next();
});

app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'Content MCP',
    port: PORT,
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

app.use('/api', routes);

app.get('/', (req, res) => {
  res.json({
    name: 'Content MCP',
    version: '1.0.0',
    description: 'Handles content creation, AI processing, and file operations',
    services: [
      'AI Service (Claude, GPT, Gemini, Perplexity)',
      'Comet ML Service',
      'Notion Service',
      'File Service',
      'Command Service',
    ],
    endpoints: {
      ai: '/api/ai/[claude|gpt|gemini|perplexity|compare]',
      comet: '/api/comet/[projects|experiments|metrics]',
      notion: '/api/notion/[pages|databases|search]',
      files: '/api/files/*',
      project: '/api/project',
      execute: '/api/execute',
    },
  });
});

app.use((err: any, req: any, res: any, next: any) => {
  console.error('[Content MCP Error]:', err);
  res.status(500).json({
    error: 'Internal Server Error',
    message: err.message,
  });
});

app.listen(PORT, () => {
  console.log(`🎨 Content MCP running on http://localhost:${PORT}`);
});
