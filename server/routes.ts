import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import rateLimit from "express-rate-limit";
import cors from "cors";
import { z } from "zod";
import { createProxyMiddleware } from "http-proxy-middleware";
import { storage } from "./storage";
import { apiKeyAuth } from "./middleware/auth";
import { requestLogger } from "./middleware/logging";
import { swaggerSpec } from "./swagger";
import { readFile, writeFile, deleteFile, listFiles, getProjectStructure } from "./services/fileService";
import { executeCommand } from "./services/commandService";
import { handleMCPConnection, processMCPMessage, MCPSession } from "./services/mcpService";
import { registerIntegrationRoutes } from "./routes/integrations";
import * as figmaMakeService from "./services/figmaMakeService";
import { 
  fileOperationSchema, 
  executeCommandSchema, 
  aiPromptSchema,
  mcpToolCallSchema 
} from "@shared/schema";
import {
  getNotificationHistory,
  getNotificationConfig,
  updateNotificationConfig,
  notifyMcpUnavailable,
  notifyRateLimitExceeded,
  notifyServerError,
  clearNotificationHistory,
} from "./services/notificationService";
import { getAuditLogs, getSecuritySummary } from "./services/auditService";
import { getApiKeyStatus, getSecurityRecommendations, generateSecureApiKey } from "./services/apiKeyRotationService";
import { getCacheStats, clearCache } from "./services/cacheService";
import { getQueueStatus, getQueueHistory } from "./services/requestQueueService";
import { getAllTiers, getCurrentTierStatus } from "./services/tieredRateLimitService";
import { listWebhooks, registerWebhook, deleteWebhook, getSupportedEvents, getWebhookLogs } from "./services/webhookService";
import { getAnalytics, getEndpointStats, getTopEndpoints, getErrorAnalytics } from "./services/analyticsService";
import { listTeams, createTeam, getTeam, deleteTeam, addMember, removeMember } from "./services/teamService";
import { getVersions, getCurrentVersion, getVersionInfo, getDeprecatedEndpoints } from "./services/apiVersioningService";
import { getSupportedLanguages, generateSDK } from "./services/sdkGeneratorService";
import { getAvailableEndpoints, getSampleRequests, executePlaygroundRequest } from "./services/playgroundService";
import { getSystemStatus, getServiceStatuses, getIncidents, createIncident, updateIncident, getUptimeHistory } from "./services/statusPageService";
import { getAvailableAgents, startA2AChat, startA2AChatStream, getSession, getAllSessions, deleteSession, clearAllSessions } from "./services/agentOrchestrator";
import contentMcpRouter from "./content-mcp/routes";

const CONTENT_MCP_URL = `http://${process.env.CONTENT_MCP_HOST || 'localhost'}:${process.env.CONTENT_MCP_PORT || 3001}`;
const INTEGRATION_MCP_URL = `http://${process.env.INTEGRATION_MCP_HOST || 'localhost'}:${process.env.INTEGRATION_MCP_PORT || 3002}`;

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // CORS configuration - restrict in production, allow in development
  const allowedOrigins = process.env.NODE_ENV === "production"
    ? [
        /\.replit\.dev$/,
        /\.replit\.app$/,
        /\.replit\.com$/,
      ]
    : true;
  
  app.use(cors({
    origin: allowedOrigins,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "X-API-KEY", "Authorization"],
    credentials: process.env.NODE_ENV !== "production",
  }));

  // Rate limiting with audit logging
  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // 100 requests per window
    message: { error: "Too many requests", message: "Please try again later" },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
      const ip = req.ip || req.socket.remoteAddress || "unknown";
      notifyRateLimitExceeded(ip, req.path);
      import("./services/auditService").then(({ logAuditEvent }) => {
        logAuditEvent({
          eventType: "api.rate_limited",
          severity: "warning",
          ip,
          userAgent: req.get("User-Agent"),
          path: req.path,
          method: req.method,
        });
      });
      res.status(429).json({ error: "Too many requests", message: "Please try again later" });
    },
  });

  // Apply rate limiting to API routes
  app.use("/api", limiter);
  app.use("/mcp", limiter);

  // Request logging
  app.use(requestLogger);

  // API Key authentication
  app.use(apiKeyAuth);

  // Swagger documentation - serve custom HTML with CDN assets to avoid Vite middleware conflicts
  app.get("/docs", (req: Request, res: Response) => {
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>API Weaver Documentation</title>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5.31.0/swagger-ui.css" />
  <style>
    html { box-sizing: border-box; overflow-y: scroll; }
    *, *:before, *:after { box-sizing: inherit; }
    body { margin: 0; background: #fafafa; }
    .swagger-ui .topbar { display: none; }
  </style>
</head>
<body>
  <div id="swagger-ui"></div>
  <script src="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5.31.0/swagger-ui-bundle.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5.31.0/swagger-ui-standalone-preset.js"></script>
  <script>
    window.onload = function() {
      SwaggerUIBundle({
        url: '/api-docs-spec',
        dom_id: '#swagger-ui',
        deepLinking: true,
        presets: [SwaggerUIBundle.presets.apis, SwaggerUIStandalonePreset],
        plugins: [SwaggerUIBundle.plugins.DownloadUrl],
        layout: "StandaloneLayout"
      });
    };
  </script>
</body>
</html>`;
    res.set("Content-Type", "text/html");
    res.send(html);
  });

  app.get("/api-docs-spec", (req: Request, res: Response) => {
    res.json(swaggerSpec);
  });

  // Register integration routes (AI, GitHub, Supabase, etc.)
  registerIntegrationRoutes(app);

  // MCP Server Proxy Routes
  const validApiKey = process.env.API_KEY;
  
  // content-mcp is mounted directly (no separate process). The standalone
  // content-mcp server (port 3001) was never started in dev/prod, so the old
  // proxy returned 503 (ECONNREFUSED). Mounting the router in-process fixes it;
  // the main app's middleware (cors/json/apiKeyAuth/rate-limit) already applies.

  const integrationMcpProxy = createProxyMiddleware({
    target: INTEGRATION_MCP_URL,
    changeOrigin: true,
    pathRewrite: { '^/api/integration': '/api' },
    timeout: 30000,
    on: {
      proxyReq: (proxyReq: any, req: any) => {
        const clientApiKey = req.headers["x-api-key"] || req.query.api_key;
        if (clientApiKey) {
          proxyReq.setHeader('X-API-KEY', clientApiKey);
        } else if (validApiKey) {
          proxyReq.setHeader('X-API-KEY', validApiKey);
        }
      },
      error: (err: Error, req: any, res: any) => {
        console.error('Integration MCP Proxy Error:', err);
        notifyMcpUnavailable('Integration MCP', err.message);
        if (res && res.status) {
          res.status(503).json({
            error: 'Integration MCP unavailable',
            message: err.message,
          });
        }
      },
    },
  });

  app.use('/api/content', contentMcpRouter);
  app.use('/api/integration', integrationMcpProxy);

  // ============================================
  // Figma Make API Routes
  // ============================================

  /**
   * @swagger
   * /api/figma-make/generate:
   *   post:
   *     summary: Generate a new design
   *     tags: [Figma Make]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required: [name]
   *             properties:
   *               name:
   *                 type: string
   *               description:
   *                 type: string
   *               template:
   *                 type: string
   *               components:
   *                 type: array
   *                 items:
   *                   type: string
   *     responses:
   *       200:
   *         description: Design created successfully
   */
  app.post("/api/figma-make/generate", async (req: Request, res: Response) => {
    try {
      const design = await figmaMakeService.generateDesign(req.body);
      res.json(design);
    } catch (error: any) {
      res.status(400).json({ error: "Bad Request", message: error.message });
    }
  });

  /**
   * @swagger
   * /api/figma-make/designs:
   *   get:
   *     summary: List all designs
   *     tags: [Figma Make]
   *     responses:
   *       200:
   *         description: List of designs
   */
  app.get("/api/figma-make/designs", async (req: Request, res: Response) => {
    try {
      const designs = await figmaMakeService.listDesigns();
      res.json(designs);
    } catch (error: any) {
      res.status(500).json({ error: "Internal Error", message: error.message });
    }
  });

  /**
   * @swagger
   * /api/figma-make/designs/{id}:
   *   get:
   *     summary: Get a design by ID
   *     tags: [Figma Make]
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *     responses:
   *       200:
   *         description: Design details
   *       404:
   *         description: Design not found
   */
  app.get("/api/figma-make/designs/:id", async (req: Request, res: Response) => {
    try {
      const design = await figmaMakeService.getDesign(req.params.id);
      if (!design) {
        return res.status(404).json({ error: "Not Found", message: "Design not found" });
      }
      res.json(design);
    } catch (error: any) {
      res.status(500).json({ error: "Internal Error", message: error.message });
    }
  });

  /**
   * @swagger
   * /api/figma-make/designs/{id}:
   *   put:
   *     summary: Update a design
   *     tags: [Figma Make]
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               name:
   *                 type: string
   *               description:
   *                 type: string
   *               content:
   *                 type: object
   *     responses:
   *       200:
   *         description: Design updated
   *       404:
   *         description: Design not found
   */
  app.put("/api/figma-make/designs/:id", async (req: Request, res: Response) => {
    try {
      const design = await figmaMakeService.updateDesign(req.params.id, req.body);
      if (!design) {
        return res.status(404).json({ error: "Not Found", message: "Design not found" });
      }
      res.json(design);
    } catch (error: any) {
      res.status(400).json({ error: "Bad Request", message: error.message });
    }
  });

  /**
   * @swagger
   * /api/figma-make/export:
   *   post:
   *     summary: Export design to code
   *     tags: [Figma Make]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required: [designId, format]
   *             properties:
   *               designId:
   *                 type: string
   *               format:
   *                 type: string
   *               framework:
   *                 type: string
   *                 enum: [react, vue, html]
   *     responses:
   *       200:
   *         description: Exported code
   */
  app.post("/api/figma-make/export", async (req: Request, res: Response) => {
    try {
      const result = await figmaMakeService.exportDesign(req.body);
      res.json(result);
    } catch (error: any) {
      res.status(400).json({ error: "Bad Request", message: error.message });
    }
  });

  /**
   * @swagger
   * /api/figma-make/components:
   *   post:
   *     summary: Create a new component
   *     tags: [Figma Make]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required: [name, type]
   *             properties:
   *               name:
   *                 type: string
   *               type:
   *                 type: string
   *               props:
   *                 type: object
   *               styles:
   *                 type: object
   *     responses:
   *       200:
   *         description: Component created
   */
  app.post("/api/figma-make/components", async (req: Request, res: Response) => {
    try {
      const component = await figmaMakeService.createComponent(req.body);
      res.json(component);
    } catch (error: any) {
      res.status(400).json({ error: "Bad Request", message: error.message });
    }
  });

  /**
   * @swagger
   * /api/figma-make/components:
   *   get:
   *     summary: List all components
   *     tags: [Figma Make]
   *     responses:
   *       200:
   *         description: List of components
   */
  app.get("/api/figma-make/components", async (req: Request, res: Response) => {
    try {
      const components = await figmaMakeService.listComponents();
      res.json(components);
    } catch (error: any) {
      res.status(500).json({ error: "Internal Error", message: error.message });
    }
  });

  /**
   * @swagger
   * /api/figma-make/components/{id}:
   *   get:
   *     summary: Get a component by ID
   *     tags: [Figma Make]
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *     responses:
   *       200:
   *         description: Component details
   *       404:
   *         description: Component not found
   */
  app.get("/api/figma-make/components/:id", async (req: Request, res: Response) => {
    try {
      const component = await figmaMakeService.getComponent(req.params.id);
      if (!component) {
        return res.status(404).json({ error: "Not Found", message: "Component not found" });
      }
      res.json(component);
    } catch (error: any) {
      res.status(500).json({ error: "Internal Error", message: error.message });
    }
  });

  /**
   * @swagger
   * /api/figma-make/components/{id}:
   *   delete:
   *     summary: Delete a component
   *     tags: [Figma Make]
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *     responses:
   *       200:
   *         description: Component deleted
   *       404:
   *         description: Component not found
   */
  app.delete("/api/figma-make/components/:id", async (req: Request, res: Response) => {
    try {
      const deleted = await figmaMakeService.deleteComponent(req.params.id);
      if (!deleted) {
        return res.status(404).json({ error: "Not Found", message: "Component not found" });
      }
      res.json({ success: true, message: "Component deleted" });
    } catch (error: any) {
      res.status(500).json({ error: "Internal Error", message: error.message });
    }
  });

  /**
   * @swagger
   * /api/figma-make/connect-backend:
   *   post:
   *     summary: Connect design to backend endpoint
   *     tags: [Figma Make]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required: [designId, endpoint]
   *             properties:
   *               designId:
   *                 type: string
   *               endpoint:
   *                 type: string
   *               method:
   *                 type: string
   *                 enum: [GET, POST, PUT, DELETE]
   *     responses:
   *       200:
   *         description: Backend connected
   */
  app.post("/api/figma-make/connect-backend", async (req: Request, res: Response) => {
    try {
      const connection = await figmaMakeService.connectBackend(req.body);
      res.json(connection);
    } catch (error: any) {
      res.status(400).json({ error: "Bad Request", message: error.message });
    }
  });

  /**
   * @swagger
   * /api/figma-make/preview:
   *   post:
   *     summary: Create a preview for a design
   *     tags: [Figma Make]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required: [designId]
   *             properties:
   *               designId:
   *                 type: string
   *               options:
   *                 type: object
   *     responses:
   *       200:
   *         description: Preview URL
   */
  app.post("/api/figma-make/preview", async (req: Request, res: Response) => {
    try {
      const preview = await figmaMakeService.createPreview(req.body);
      res.json(preview);
    } catch (error: any) {
      res.status(400).json({ error: "Bad Request", message: error.message });
    }
  });

  /**
   * @swagger
   * /api/figma-make/versions/{designId}:
   *   get:
   *     summary: Get version history for a design
   *     tags: [Figma Make]
   *     parameters:
   *       - in: path
   *         name: designId
   *         required: true
   *         schema:
   *           type: string
   *     responses:
   *       200:
   *         description: Version history
   */
  app.get("/api/figma-make/versions/:designId", async (req: Request, res: Response) => {
    try {
      const versions = await figmaMakeService.getVersionHistory(req.params.designId);
      res.json(versions);
    } catch (error: any) {
      res.status(400).json({ error: "Bad Request", message: error.message });
    }
  });

  /**
   * @swagger
   * /api/figma-make/restore:
   *   post:
   *     summary: Restore a design to a previous version
   *     tags: [Figma Make]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required: [designId, versionId]
   *             properties:
   *               designId:
   *                 type: string
   *               versionId:
   *                 type: string
   *     responses:
   *       200:
   *         description: Design restored
   *       404:
   *         description: Design or version not found
   */
  app.post("/api/figma-make/restore", async (req: Request, res: Response) => {
    try {
      const design = await figmaMakeService.restoreVersion(req.body);
      if (!design) {
        return res.status(404).json({ error: "Not Found", message: "Design not found" });
      }
      res.json(design);
    } catch (error: any) {
      res.status(400).json({ error: "Bad Request", message: error.message });
    }
  });

  // Stats endpoint (public)
  /**
   * @swagger
   * /api/stats:
   *   get:
   *     summary: Get API statistics
   *     tags: [Monitoring]
   *     security: []
   *     responses:
   *       200:
   *         description: API statistics
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/APIStats'
   */
  app.get("/api/stats", async (req: Request, res: Response) => {
    const stats = await storage.getStats();
    res.json(stats);
  });

  /**
   * @swagger
   * /api/ws/status:
   *   get:
   *     summary: Get WebSocket connection status
   *     tags: [Monitoring]
   *     security: []
   *     responses:
   *       200:
   *         description: WebSocket status
   */
  app.get("/api/ws/status", async (req: Request, res: Response) => {
    const { getConnectedClientsCount } = await import("./services/websocketService");
    res.json({
      enabled: true,
      path: "/ws",
      connectedClients: getConnectedClientsCount(),
    });
  });

  // Logs endpoint (public)
  /**
   * @swagger
   * /api/logs:
   *   get:
   *     summary: Get API request logs
   *     tags: [Monitoring]
   *     security: []
   *     parameters:
   *       - in: query
   *         name: limit
   *         schema:
   *           type: integer
   *           default: 100
   *         description: Maximum number of logs to return
   *     responses:
   *       200:
   *         description: List of API logs
   *         content:
   *           application/json:
   *             schema:
   *               type: array
   *               items:
   *                 $ref: '#/components/schemas/APILog'
   */
  app.get("/api/logs", async (req: Request, res: Response) => {
    const limit = parseInt(req.query.limit as string) || 100;
    const logs = await storage.getLogs(limit);
    res.json(logs);
  });

  /**
   * @swagger
   * /api/notifications:
   *   get:
   *     summary: Get notification history
   *     tags: [Monitoring]
   *     security: []
   *     parameters:
   *       - in: query
   *         name: limit
   *         schema:
   *           type: integer
   *           default: 100
   *         description: Maximum number of notifications to return
   *     responses:
   *       200:
   *         description: List of notifications
   */
  app.get("/api/notifications", (req: Request, res: Response) => {
    const limit = parseInt(req.query.limit as string) || 100;
    const notifications = getNotificationHistory(limit);
    res.json(notifications);
  });

  /**
   * @swagger
   * /api/notifications/config:
   *   get:
   *     summary: Get notification configuration
   *     tags: [Monitoring]
   *     responses:
   *       200:
   *         description: Notification configuration
   */
  app.get("/api/notifications/config", (req: Request, res: Response) => {
    res.json(getNotificationConfig());
  });

  /**
   * @swagger
   * /api/notifications/config:
   *   put:
   *     summary: Update notification configuration
   *     tags: [Monitoring]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *     responses:
   *       200:
   *         description: Updated configuration
   */
  app.put("/api/notifications/config", (req: Request, res: Response) => {
    const updatedConfig = updateNotificationConfig(req.body);
    res.json(updatedConfig);
  });

  /**
   * @swagger
   * /api/notifications:
   *   delete:
   *     summary: Clear notification history
   *     tags: [Monitoring]
   *     responses:
   *       200:
   *         description: History cleared
   */
  app.delete("/api/notifications", (req: Request, res: Response) => {
    clearNotificationHistory();
    res.json({ message: "Notification history cleared" });
  });

  /**
   * @swagger
   * /api/audit/logs:
   *   get:
   *     summary: Get audit logs
   *     tags: [Security]
   *     security: []
   *     parameters:
   *       - in: query
   *         name: limit
   *         schema:
   *           type: integer
   *           default: 100
   *         description: Maximum number of logs to return
   *       - in: query
   *         name: eventType
   *         schema:
   *           type: string
   *         description: Filter by event type
   *     responses:
   *       200:
   *         description: List of audit logs
   */
  app.get("/api/audit/logs", async (req: Request, res: Response) => {
    const limit = parseInt(req.query.limit as string) || 100;
    const eventType = req.query.eventType as string | undefined;
    const logs = await getAuditLogs(limit, eventType as any);
    res.json(logs);
  });

  /**
   * @swagger
   * /api/audit/summary:
   *   get:
   *     summary: Get security audit summary
   *     tags: [Security]
   *     security: []
   *     responses:
   *       200:
   *         description: Security summary with event counts
   */
  app.get("/api/audit/summary", async (req: Request, res: Response) => {
    const summary = await getSecuritySummary();
    res.json(summary);
  });

  /**
   * @swagger
   * /api/security/status:
   *   get:
   *     summary: Get overall security status
   *     tags: [Security]
   *     security: []
   *     responses:
   *       200:
   *         description: Security status with recommendations
   */
  app.get("/api/security/status", async (req: Request, res: Response) => {
    const apiKeyStatus = getApiKeyStatus();
    const auditSummary = await getSecuritySummary();
    const recommendations = getSecurityRecommendations();
    
    const isProduction = process.env.NODE_ENV === "production";
    
    res.json({
      apiKey: apiKeyStatus,
      audit: auditSummary,
      recommendations,
      environment: {
        nodeEnv: process.env.NODE_ENV || "development",
        isProduction,
      },
      securityHeaders: {
        csp: true,
        cspStrict: isProduction,
        hsts: isProduction,
        xFrameOptions: true,
        xContentTypeOptions: true,
        referrerPolicy: true,
        permissionsPolicy: true,
      },
      protections: {
        csrfProtection: true,
        csrfStrict: isProduction,
        rateLimiting: true,
        rateLimitWindow: "15 minutes",
        rateLimitMax: 100,
        inputValidation: true,
        pathSanitization: true,
        commandWhitelist: true,
      },
      cors: {
        restrictedOrigins: isProduction,
        credentials: !isProduction,
      },
    });
  });

  /**
   * @swagger
   * /api/security/generate-key:
   *   get:
   *     summary: Generate a new secure API key suggestion
   *     tags: [Security]
   *     security: []
   *     responses:
   *       200:
   *         description: A new secure API key
   */
  app.get("/api/security/generate-key", (req: Request, res: Response) => {
    const newKey = generateSecureApiKey();
    res.json({
      suggestedKey: newKey,
      note: "This is a suggested key. Update your API_KEY environment variable with this value.",
    });
  });

  /**
   * @swagger
   * /api/security/events:
   *   get:
   *     summary: Get security events
   *     tags: [Monitoring]
   *     security: []
   *     parameters:
   *       - in: query
   *         name: limit
   *         schema:
   *           type: integer
   *           default: 50
   *         description: Maximum number of events to return
   *     responses:
   *       200:
   *         description: List of security events
   */
  app.get("/api/security/events", async (req: Request, res: Response) => {
    const limit = parseInt(req.query.limit as string) || 50;
    const summary = await getSecuritySummary();
    res.json(summary.recentSecurityEvents);
  });

  // ============================================
  // 2FA (Two-Factor Authentication) Endpoints
  // ============================================

  /**
   * @swagger
   * /api/2fa/setup:
   *   post:
   *     summary: Setup 2FA for a user
   *     tags: [Security]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               userId:
   *                 type: string
   *               email:
   *                 type: string
   *     responses:
   *       200:
   *         description: 2FA setup information including QR code
   */
  app.post("/api/2fa/setup", async (req: Request, res: Response) => {
    try {
      const { userId, email } = req.body;
      if (!userId || !email) {
        return res.status(400).json({ error: "userId and email are required" });
      }
      const { setup2FA } = await import("./services/twoFactorService");
      const result = await setup2FA(userId, email);
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * @swagger
   * /api/2fa/verify:
   *   post:
   *     summary: Verify 2FA token and enable 2FA
   *     tags: [Security]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               userId:
   *                 type: string
   *               token:
   *                 type: string
   *     responses:
   *       200:
   *         description: Verification result
   */
  app.post("/api/2fa/verify", async (req: Request, res: Response) => {
    try {
      const { userId, token } = req.body;
      if (!userId || !token) {
        return res.status(400).json({ error: "userId and token are required" });
      }
      const { verify2FA } = await import("./services/twoFactorService");
      const isValid = await verify2FA(userId, token);
      res.json({ valid: isValid, message: isValid ? "2FA enabled successfully" : "Invalid token" });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * @swagger
   * /api/2fa/status/{userId}:
   *   get:
   *     summary: Get 2FA status for a user
   *     tags: [Security]
   *     parameters:
   *       - in: path
   *         name: userId
   *         required: true
   *         schema:
   *           type: string
   *     responses:
   *       200:
   *         description: 2FA status
   */
  app.get("/api/2fa/status/:userId", async (req: Request, res: Response) => {
    try {
      const { get2FAStatus } = await import("./services/twoFactorService");
      const status = await get2FAStatus(req.params.userId);
      res.json(status);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * @swagger
   * /api/2fa/disable:
   *   post:
   *     summary: Disable 2FA for a user
   *     tags: [Security]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               userId:
   *                 type: string
   *     responses:
   *       200:
   *         description: 2FA disabled
   */
  app.post("/api/2fa/disable", async (req: Request, res: Response) => {
    try {
      const { userId } = req.body;
      if (!userId) {
        return res.status(400).json({ error: "userId is required" });
      }
      const { disable2FA } = await import("./services/twoFactorService");
      const success = await disable2FA(userId);
      res.json({ success, message: success ? "2FA disabled" : "2FA not found for user" });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * @swagger
   * /api/2fa/backup-codes:
   *   post:
   *     summary: Regenerate backup codes
   *     tags: [Security]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               userId:
   *                 type: string
   *     responses:
   *       200:
   *         description: New backup codes
   */
  app.post("/api/2fa/backup-codes", async (req: Request, res: Response) => {
    try {
      const { userId } = req.body;
      if (!userId) {
        return res.status(400).json({ error: "userId is required" });
      }
      const { regenerateBackupCodes } = await import("./services/twoFactorService");
      const codes = await regenerateBackupCodes(userId);
      res.json({ backupCodes: codes });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ============================================
  // IP Whitelist Endpoints
  // ============================================

  /**
   * @swagger
   * /api/ip-whitelist:
   *   get:
   *     summary: Get all whitelisted IPs
   *     tags: [Security]
   *     responses:
   *       200:
   *         description: List of whitelisted IPs
   */
  app.get("/api/ip-whitelist", async (req: Request, res: Response) => {
    try {
      const { getAllWhitelistedIPs, isWhitelistEnabled } = await import("./services/ipWhitelistService");
      const ips = await getAllWhitelistedIPs();
      const enabled = await isWhitelistEnabled();
      res.json({ enabled, entries: ips });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * @swagger
   * /api/ip-whitelist:
   *   post:
   *     summary: Add IP to whitelist
   *     tags: [Security]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               ip:
   *                 type: string
   *               description:
   *                 type: string
   *     responses:
   *       200:
   *         description: IP added
   */
  app.post("/api/ip-whitelist", async (req: Request, res: Response) => {
    try {
      const { ip, description } = req.body;
      if (!ip) {
        return res.status(400).json({ error: "IP address is required" });
      }
      const userId = (req as any).user?.claims?.sub;
      const { addIPToWhitelist } = await import("./services/ipWhitelistService");
      const entry = await addIPToWhitelist(ip, description, userId);
      res.json(entry);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * @swagger
   * /api/ip-whitelist/{id}:
   *   delete:
   *     summary: Remove IP from whitelist
   *     tags: [Security]
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *     responses:
   *       200:
   *         description: IP removed
   */
  app.delete("/api/ip-whitelist/:id", async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user?.claims?.sub;
      const { removeIPFromWhitelist } = await import("./services/ipWhitelistService");
      const success = await removeIPFromWhitelist(req.params.id, userId);
      res.json({ success });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ============================================
  // Request Signing Endpoints
  // ============================================

  /**
   * @swagger
   * /api/request-signing/status:
   *   get:
   *     summary: Get request signing status and configuration
   *     tags: [Security]
   *     responses:
   *       200:
   *         description: Request signing status
   */
  app.get("/api/request-signing/status", async (req: Request, res: Response) => {
    try {
      const { isSigningEnabled, getSignatureHeaders } = await import("./services/requestSigningService");
      res.json({
        enabled: isSigningEnabled(),
        headers: getSignatureHeaders(),
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * @swagger
   * /api/request-signing/example:
   *   post:
   *     summary: Generate example request signing code
   *     tags: [Security]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               method:
   *                 type: string
   *               path:
   *                 type: string
   *     responses:
   *       200:
   *         description: Example code
   */
  app.post("/api/request-signing/example", async (req: Request, res: Response) => {
    try {
      const { method = "POST", path = "/api/example" } = req.body;
      const { generateClientSigningExample } = await import("./services/requestSigningService");
      const example = generateClientSigningExample(method, path);
      res.json({ example });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ============================================
  // Encrypted Audit Logs Endpoints
  // ============================================

  /**
   * @swagger
   * /api/audit/encrypted:
   *   get:
   *     summary: Get decrypted audit logs
   *     tags: [Monitoring]
   *     parameters:
   *       - in: query
   *         name: limit
   *         schema:
   *           type: integer
   *           default: 100
   *       - in: query
   *         name: severity
   *         schema:
   *           type: string
   *     responses:
   *       200:
   *         description: Decrypted audit logs
   */
  app.get("/api/audit/encrypted", async (req: Request, res: Response) => {
    try {
      const limit = parseInt(req.query.limit as string) || 100;
      const severity = req.query.severity as string;
      const { getDecryptedAuditLogs, getDecryptedAuditLogsBySeverity } = await import("./services/encryptedAuditService");
      
      const logs = severity 
        ? await getDecryptedAuditLogsBySeverity(severity, limit)
        : await getDecryptedAuditLogs(limit);
      
      res.json({ logs });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * @swagger
   * /api/audit/encryption-status:
   *   get:
   *     summary: Get audit log encryption status
   *     tags: [Monitoring]
   *     responses:
   *       200:
   *         description: Encryption status
   */
  app.get("/api/audit/encryption-status", async (req: Request, res: Response) => {
    try {
      const { getEncryptionStatus } = await import("./services/encryptedAuditService");
      res.json(getEncryptionStatus());
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ============================================
  // Auto API Key Rotation Endpoints
  // ============================================

  /**
   * @swagger
   * /api/key-rotation/status:
   *   get:
   *     summary: Get API key rotation status
   *     tags: [Security]
   *     responses:
   *       200:
   *         description: Rotation status
   */
  app.get("/api/key-rotation/status", async (req: Request, res: Response) => {
    try {
      const { getRotationStatus, getNextRotationDate } = await import("./services/autoKeyRotationService");
      const status = getRotationStatus();
      const nextRotation = await getNextRotationDate();
      res.json({ ...status, nextRotation });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * @swagger
   * /api/key-rotation/history:
   *   get:
   *     summary: Get API key rotation history
   *     tags: [Security]
   *     responses:
   *       200:
   *         description: Rotation history
   */
  app.get("/api/key-rotation/history", async (req: Request, res: Response) => {
    try {
      const { getRotationHistory } = await import("./services/autoKeyRotationService");
      const history = await getRotationHistory();
      res.json({ history });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * @swagger
   * /api/key-rotation/rotate:
   *   post:
   *     summary: Manually rotate API key
   *     tags: [Security]
   *     responses:
   *       200:
   *         description: New API key generated
   */
  app.post("/api/key-rotation/rotate", async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user?.claims?.sub;
      const { rotateAPIKey } = await import("./services/autoKeyRotationService");
      const result = await rotateAPIKey(userId);
      res.json({ 
        message: "API key rotated successfully",
        newKey: result.newKey,
        expiresAt: result.expiresAt,
        note: "Update your API_KEY environment variable with this new key"
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * @swagger
   * /api/key-rotation/interval:
   *   post:
   *     summary: Set rotation interval
   *     tags: [Security]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               days:
   *                 type: integer
   *                 minimum: 7
   *                 maximum: 365
   *     responses:
   *       200:
   *         description: Interval updated
   */
  app.post("/api/key-rotation/interval", async (req: Request, res: Response) => {
    try {
      const { days } = req.body;
      if (!days || days < 7 || days > 365) {
        return res.status(400).json({ error: "Days must be between 7 and 365" });
      }
      const { setRotationInterval, getRotationStatus } = await import("./services/autoKeyRotationService");
      setRotationInterval(days);
      res.json({ message: `Rotation interval set to ${days} days`, status: getRotationStatus() });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ============================================
  // Security Alerts Endpoints
  // ============================================

  /**
   * @swagger
   * /api/security-alerts:
   *   get:
   *     summary: Get configured security alerts
   *     tags: [Security]
   *     responses:
   *       200:
   *         description: List of alerts
   */
  app.get("/api/security-alerts", async (req: Request, res: Response) => {
    try {
      const { getConfiguredAlerts } = await import("./services/securityAlertService");
      const alerts = await getConfiguredAlerts();
      res.json({ alerts });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * @swagger
   * /api/security-alerts:
   *   post:
   *     summary: Configure a new security alert
   *     tags: [Security]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               alertType:
   *                 type: string
   *                 enum: [critical, error, warning, all]
   *               channel:
   *                 type: string
   *                 enum: [email, sms, webhook, slack]
   *               destination:
   *                 type: string
   *     responses:
   *       200:
   *         description: Alert configured
   */
  app.post("/api/security-alerts", async (req: Request, res: Response) => {
    try {
      const { alertType, channel, destination } = req.body;
      if (!alertType || !channel || !destination) {
        return res.status(400).json({ error: "alertType, channel, and destination are required" });
      }
      const userId = (req as any).user?.claims?.sub;
      const { configureAlert } = await import("./services/securityAlertService");
      const alert = await configureAlert({ userId, alertType, channel, destination });
      res.json(alert);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * @swagger
   * /api/security-alerts/{id}:
   *   delete:
   *     summary: Remove a security alert
   *     tags: [Security]
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *     responses:
   *       200:
   *         description: Alert removed
   */
  app.delete("/api/security-alerts/:id", async (req: Request, res: Response) => {
    try {
      const { removeAlert } = await import("./services/securityAlertService");
      const success = await removeAlert(req.params.id);
      res.json({ success });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * @swagger
   * /api/security-alerts/{id}/test:
   *   post:
   *     summary: Test a security alert
   *     tags: [Security]
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *     responses:
   *       200:
   *         description: Test sent
   */
  app.post("/api/security-alerts/:id/test", async (req: Request, res: Response) => {
    try {
      const { testAlert } = await import("./services/securityAlertService");
      const success = await testAlert(req.params.id);
      res.json({ success, message: success ? "Test alert sent" : "Alert not found" });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * @swagger
   * /api/security-alerts/history:
   *   get:
   *     summary: Get alert history
   *     tags: [Security]
   *     parameters:
   *       - in: query
   *         name: limit
   *         schema:
   *           type: integer
   *           default: 50
   *     responses:
   *       200:
   *         description: Alert history
   */
  app.get("/api/security-alerts/history", async (req: Request, res: Response) => {
    try {
      const limit = parseInt(req.query.limit as string) || 50;
      const { getAlertHistory } = await import("./services/securityAlertService");
      const history = await getAlertHistory(limit);
      res.json({ history });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * @swagger
   * /api/email/status:
   *   get:
   *     summary: Check email service status
   *     tags: [Security]
   *     responses:
   *       200:
   *         description: Email service status
   */
  app.get("/api/email/status", async (req: Request, res: Response) => {
    try {
      const { isResendConfigured } = await import("./services/resendService");
      const configured = await isResendConfigured();
      res.json({ 
        configured, 
        service: "Resend",
        message: configured ? "Email service is configured and ready" : "Email service not configured"
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message, configured: false });
    }
  });

  /**
   * @swagger
   * /api/email/test:
   *   post:
   *     summary: Send a test email
   *     tags: [Security]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               to:
   *                 type: string
   *               subject:
   *                 type: string
   *     responses:
   *       200:
   *         description: Test email sent
   */
  app.post("/api/email/test", async (req: Request, res: Response) => {
    try {
      const { to, subject } = req.body;
      if (!to) {
        return res.status(400).json({ error: "Recipient email (to) is required" });
      }
      const { sendSecurityAlertEmail } = await import("./services/resendService");
      const result = await sendSecurityAlertEmail(
        to,
        "info",
        "test_email",
        subject || "This is a test email from API Weaver to verify your email notification setup.",
        { testTime: new Date().toISOString(), sentBy: (req as any).user?.claims?.sub || "anonymous" }
      );
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message, success: false });
    }
  });

  // Session Management
  /**
   * @swagger
   * /api/sessions:
   *   get:
   *     summary: Get all active sessions for the current user
   *     tags: [Sessions]
   *     responses:
   *       200:
   *         description: List of active sessions
   *       401:
   *         description: Unauthorized
   */
  app.get("/api/sessions", async (req: Request, res: Response) => {
    try {
      const user = (req as any).user;
      if (!user?.claims?.sub) {
        return res.status(401).json({ error: "Unauthorized", message: "Not authenticated" });
      }

      const currentSessionId = (req as any).sessionID;
      const { getUserSessions } = await import("./services/sessionService");
      const sessions = await getUserSessions(user.claims.sub, currentSessionId);
      
      res.json({ sessions });
    } catch (error: any) {
      res.status(500).json({ error: "Server Error", message: error.message });
    }
  });

  /**
   * @swagger
   * /api/sessions/{sid}:
   *   delete:
   *     summary: Revoke a specific session
   *     tags: [Sessions]
   *     parameters:
   *       - in: path
   *         name: sid
   *         required: true
   *         schema:
   *           type: string
   *     responses:
   *       200:
   *         description: Session revoked successfully
   *       401:
   *         description: Unauthorized
   *       404:
   *         description: Session not found
   */
  app.delete("/api/sessions/:sid", async (req: Request, res: Response) => {
    try {
      const user = (req as any).user;
      if (!user?.claims?.sub) {
        return res.status(401).json({ error: "Unauthorized", message: "Not authenticated" });
      }

      const { sid } = req.params;
      const currentSessionId = (req as any).sessionID;
      
      if (sid === currentSessionId) {
        return res.status(400).json({ error: "Bad Request", message: "Cannot revoke current session. Use logout instead." });
      }

      const { deleteSession } = await import("./services/sessionService");
      const success = await deleteSession(sid, user.claims.sub);
      
      if (success) {
        res.json({ success: true, message: "Session revoked" });
      } else {
        res.status(404).json({ error: "Not Found", message: "Session not found" });
      }
    } catch (error: any) {
      res.status(500).json({ error: "Server Error", message: error.message });
    }
  });

  /**
   * @swagger
   * /api/sessions/revoke-all:
   *   post:
   *     summary: Revoke all other sessions except current
   *     tags: [Sessions]
   *     responses:
   *       200:
   *         description: All other sessions revoked
   *       401:
   *         description: Unauthorized
   */
  app.post("/api/sessions/revoke-all", async (req: Request, res: Response) => {
    try {
      const user = (req as any).user;
      if (!user?.claims?.sub) {
        return res.status(401).json({ error: "Unauthorized", message: "Not authenticated" });
      }

      const currentSessionId = (req as any).sessionID;
      const { deleteAllOtherSessions } = await import("./services/sessionService");
      const count = await deleteAllOtherSessions(user.claims.sub, currentSessionId);
      
      res.json({ success: true, message: `Revoked ${count} session(s)`, revokedCount: count });
    } catch (error: any) {
      res.status(500).json({ error: "Server Error", message: error.message });
    }
  });

  // File operations
  /**
   * @swagger
   * /api/files:
   *   post:
   *     summary: Create or update a file
   *     tags: [Files]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/FileOperation'
   *     responses:
   *       200:
   *         description: File created/updated successfully
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/FileResponse'
   *       400:
   *         description: Invalid request
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Error'
   */
  app.post("/api/files", async (req: Request, res: Response) => {
    try {
      const body = fileOperationSchema.parse(req.body);
      if (body.content === undefined) {
        return res.status(400).json({ error: "Bad Request", message: "Content is required" });
      }
      const result = await writeFile(body.path, body.content);
      res.json(result);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Validation Error", message: error.errors[0].message });
      }
      res.status(400).json({ error: "Bad Request", message: error.message });
    }
  });

  /**
   * @swagger
   * /api/files/{path}:
   *   get:
   *     summary: Read file content
   *     tags: [Files]
   *     parameters:
   *       - in: path
   *         name: path
   *         required: true
   *         schema:
   *           type: string
   *         description: File path (use URL encoding for paths with slashes)
   *     responses:
   *       200:
   *         description: File content
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/FileResponse'
   *       404:
   *         description: File not found
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Error'
   */
  app.get("/api/files/*", async (req: Request, res: Response) => {
    try {
      const filePath = req.params[0];
      if (!filePath) {
        const files = await listFiles(".");
        return res.json(files);
      }
      const result = await readFile(filePath);
      res.json(result);
    } catch (error: any) {
      const status = error.message.includes("not found") ? 404 : 400;
      res.status(status).json({ error: status === 404 ? "Not Found" : "Bad Request", message: error.message });
    }
  });

  /**
   * @swagger
   * /api/files/{path}:
   *   delete:
   *     summary: Delete a file or directory
   *     tags: [Files]
   *     parameters:
   *       - in: path
   *         name: path
   *         required: true
   *         schema:
   *           type: string
   *         description: File path to delete
   *     responses:
   *       200:
   *         description: File deleted successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                 message:
   *                   type: string
   *       404:
   *         description: File not found
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Error'
   */
  app.delete("/api/files/*", async (req: Request, res: Response) => {
    try {
      const filePath = req.params[0];
      if (!filePath) {
        return res.status(400).json({ error: "Bad Request", message: "File path is required" });
      }
      await deleteFile(filePath);
      res.json({ success: true, message: `Deleted ${filePath}` });
    } catch (error: any) {
      const status = error.message.includes("not found") ? 404 : 400;
      res.status(status).json({ error: status === 404 ? "Not Found" : "Bad Request", message: error.message });
    }
  });

  /**
   * @swagger
   * /api/execute:
   *   post:
   *     summary: Execute a shell command
   *     tags: [Commands]
   *     description: Execute safe shell commands. Only whitelisted commands are allowed.
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/ExecuteCommand'
   *     responses:
   *       200:
   *         description: Command execution result
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/ExecuteResponse'
   *       400:
   *         description: Invalid or blocked command
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Error'
   */
  app.post("/api/execute", async (req: Request, res: Response) => {
    try {
      const body = executeCommandSchema.parse(req.body);
      const result = await executeCommand(body);
      res.json(result);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Validation Error", message: error.errors[0].message });
      }
      res.status(400).json({ error: "Bad Request", message: error.message });
    }
  });

  /**
   * @swagger
   * /api/project:
   *   get:
   *     summary: Get project structure
   *     tags: [Project]
   *     parameters:
   *       - in: query
   *         name: depth
   *         schema:
   *           type: integer
   *           default: 3
   *         description: Maximum depth of directory tree
   *     responses:
   *       200:
   *         description: Project structure tree
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/ProjectStructure'
   */
  app.get("/api/project", async (req: Request, res: Response) => {
    try {
      const depth = parseInt(req.query.depth as string) || 3;
      const structure = await getProjectStructure(".", depth);
      res.json(structure);
    } catch (error: any) {
      res.status(500).json({ error: "Internal Error", message: error.message });
    }
  });

  /**
   * @swagger
   * /api/ai:
   *   post:
   *     summary: Send an AI prompt for processing
   *     tags: [AI]
   *     description: Process prompts with AI. Note - this is a placeholder endpoint that echoes the prompt.
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/AIPrompt'
   *     responses:
   *       200:
   *         description: AI response
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/AIResponse'
   */
  app.post("/api/ai", async (req: Request, res: Response) => {
    try {
      const body = aiPromptSchema.parse(req.body);
      // Placeholder AI response - in production, integrate with an AI service
      const response = {
        response: `Received prompt: "${body.prompt}"${body.context ? ` with context: "${body.context}"` : ""}. This is a placeholder response. Integrate with OpenAI, Anthropic, or another AI service for actual functionality.`,
        tokensUsed: body.prompt.length + (body.context?.length || 0),
      };
      res.json(response);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Validation Error", message: error.errors[0].message });
      }
      res.status(400).json({ error: "Bad Request", message: error.message });
    }
  });

  /**
   * @swagger
   * /mcp:
   *   get:
   *     summary: MCP Server (SSE Connection)
   *     tags: [MCP]
   *     description: |
   *       Establishes a Server-Sent Events connection for MCP (Model Context Protocol) communication.
   *       
   *       ## Available Tools:
   *       - `read_file`: Read file contents
   *       - `write_file`: Create or update files
   *       - `list_files`: List directory contents
   *       - `delete_file`: Delete files or directories
   *       - `execute_command`: Run safe shell commands
   *       - `get_project_structure`: Get file tree
   *       - `create_directory`: Create new directories
   *       
   *       ## Usage:
   *       Connect via SSE and send JSON-RPC 2.0 messages.
   *     responses:
   *       200:
   *         description: SSE stream established
   *         content:
   *           text/event-stream:
   *             schema:
   *               type: string
   */
  app.get("/mcp", async (req: Request, res: Response) => {
    // Set SSE headers
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no");
    res.flushHeaders();

    // Create MCP session with SSE connection
    const session = handleMCPConnection(res);

    // Handle client disconnect
    req.on("close", () => {
      session.disconnect();
    });
  });

  /**
   * @swagger
   * /mcp:
   *   post:
   *     summary: Send MCP tool call
   *     tags: [MCP]
   *     description: Send a JSON-RPC 2.0 tool call to the MCP server
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required: [jsonrpc, id, method]
   *             properties:
   *               jsonrpc:
   *                 type: string
   *                 enum: ["2.0"]
   *               id:
   *                 oneOf:
   *                   - type: string
   *                   - type: number
   *               method:
   *                 type: string
   *                 enum: [initialize, tools/list, tools/call, ping]
   *               params:
   *                 type: object
   *     responses:
   *       200:
   *         description: Tool call result
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   */
  app.post("/mcp", async (req: Request, res: Response) => {
    try {
      const message = mcpToolCallSchema.parse(req.body);
      
      // Process MCP message and return response directly (HTTP mode, no SSE session)
      const response = await processMCPMessage(message);

      res.json(response);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          jsonrpc: "2.0",
          id: null,
          error: { code: -32600, message: "Invalid Request" },
        });
      }
      res.status(400).json({
        jsonrpc: "2.0",
        id: req.body?.id || null,
        error: { code: -32000, message: error.message },
      });
    }
  });

  // ============================================
  // Cache Routes
  // ============================================
  app.get("/api/cache/stats", (req: Request, res: Response) => {
    try {
      const stats = getCacheStats();
      res.json(stats);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/cache/clear", (req: Request, res: Response) => {
    try {
      const apiKey = req.headers["x-api-key"];
      if (!apiKey) {
        return res.status(401).json({ error: "X-API-KEY header required" });
      }
      clearCache();
      res.json({ message: "Cache cleared" });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ============================================
  // Request Queue Routes
  // ============================================
  app.get("/api/queue/status", (req: Request, res: Response) => {
    try {
      const status = getQueueStatus();
      res.json(status);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/queue/history", (req: Request, res: Response) => {
    try {
      const history = getQueueHistory();
      res.json(history);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ============================================
  // Tiered Rate Limit Routes
  // ============================================
  app.get("/api/rate-tiers", (req: Request, res: Response) => {
    try {
      const tiers = getAllTiers();
      res.json(tiers);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/rate-tiers/status", (req: Request, res: Response) => {
    try {
      const userId = (req.query.userId as string) || "anonymous";
      const status = getCurrentTierStatus(userId);
      res.json(status);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ============================================
  // Webhook Routes
  // ============================================
  app.get("/api/webhooks/events", (req: Request, res: Response) => {
    try {
      const events = getSupportedEvents();
      res.json(events);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/webhooks/logs", (req: Request, res: Response) => {
    try {
      const logs = getWebhookLogs();
      res.json(logs);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/webhooks", (req: Request, res: Response) => {
    try {
      const webhooks = listWebhooks();
      res.json(webhooks);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/webhooks", (req: Request, res: Response) => {
    try {
      const { url, events, secret } = req.body;
      const webhook = registerWebhook(url, events, secret);
      res.json(webhook);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/webhooks/:id", (req: Request, res: Response) => {
    try {
      const deleted = deleteWebhook(req.params.id);
      res.json({ success: deleted });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ============================================
  // Analytics Routes
  // ============================================
  app.get("/api/analytics", (req: Request, res: Response) => {
    try {
      const range = (req.query.range as string) || "24h";
      const analytics = getAnalytics(range as any);
      res.json(analytics);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/analytics/endpoints", (req: Request, res: Response) => {
    try {
      const stats = getEndpointStats();
      res.json(stats);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/analytics/top", (req: Request, res: Response) => {
    try {
      const limit = parseInt(req.query.limit as string) || 10;
      const top = getTopEndpoints(limit);
      res.json(top);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/analytics/errors", (req: Request, res: Response) => {
    try {
      const errors = getErrorAnalytics();
      res.json(errors);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ============================================
  // Team Routes
  // ============================================
  app.get("/api/teams", (req: Request, res: Response) => {
    try {
      const teams = listTeams();
      res.json(teams);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/teams", (req: Request, res: Response) => {
    try {
      const { name, ownerId } = req.body;
      const team = createTeam(name, ownerId);
      res.json(team);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/teams/:id", (req: Request, res: Response) => {
    try {
      const team = getTeam(req.params.id);
      res.json(team);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/teams/:id", (req: Request, res: Response) => {
    try {
      const deleted = deleteTeam(req.params.id);
      res.json({ success: deleted });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/teams/:id/members", (req: Request, res: Response) => {
    try {
      const { userId, role } = req.body;
      const member = addMember(req.params.id, userId, role);
      res.json(member);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/teams/:id/members/:userId", (req: Request, res: Response) => {
    try {
      const removed = removeMember(req.params.id, req.params.userId);
      res.json({ success: removed });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ============================================
  // API Versioning Routes
  // ============================================
  app.get("/api/versions", (req: Request, res: Response) => {
    try {
      const versions = getVersions();
      res.json(versions);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/versions/current", (req: Request, res: Response) => {
    try {
      const current = getCurrentVersion();
      res.json(current);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/versions/:version/deprecated", (req: Request, res: Response) => {
    try {
      const deprecated = getDeprecatedEndpoints();
      res.json(deprecated);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/versions/:version", (req: Request, res: Response) => {
    try {
      const info = getVersionInfo(req.params.version);
      res.json(info);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ============================================
  // SDK Generator Routes
  // ============================================
  app.get("/api/sdk/languages", (req: Request, res: Response) => {
    try {
      const languages = getSupportedLanguages();
      res.json(languages);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/sdk/generate", (req: Request, res: Response) => {
    try {
      const { language } = req.body;
      const sdk = generateSDK(language, swaggerSpec as Record<string, unknown>);
      res.json({ language, code: sdk, generatedAt: new Date().toISOString() });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ============================================
  // Playground Routes
  // ============================================
  app.get("/api/playground/endpoints", (req: Request, res: Response) => {
    try {
      const endpoints = getAvailableEndpoints();
      res.json(endpoints);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/playground/samples", (req: Request, res: Response) => {
    try {
      const samples = getSampleRequests();
      res.json(samples);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/playground/execute", async (req: Request, res: Response) => {
    try {
      const { method, url, headers, body } = req.body;
      const result = await executePlaygroundRequest({ method, path: url, headers, body });
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ============================================
  // Status Page Routes
  // ============================================
  app.get("/api/status", (req: Request, res: Response) => {
    try {
      const status = getSystemStatus();
      res.json(status);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/status/services", (req: Request, res: Response) => {
    try {
      const services = getServiceStatuses();
      res.json(services);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/status/incidents", (req: Request, res: Response) => {
    try {
      const incidents = getIncidents();
      res.json(incidents);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/status/incidents", (req: Request, res: Response) => {
    try {
      const { title, description, severity } = req.body;
      const incident = createIncident(title, description, severity);
      res.json(incident);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.put("/api/status/incidents/:id", (req: Request, res: Response) => {
    try {
      const { status } = req.body;
      const incident = updateIncident(req.params.id, status);
      res.json(incident);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/status/uptime", (req: Request, res: Response) => {
    try {
      const uptime = getUptimeHistory();
      res.json(uptime);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ============================================
  // A2A (Agent-to-Agent) Routes
  // ============================================

  app.get("/api/a2a/agents", (req: Request, res: Response) => {
    try {
      const agents = getAvailableAgents();
      res.json(agents);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/a2a/chat/stream", async (req: Request, res: Response) => {
    try {
      const { topic, mode, agents, maxRounds, maxTokensPerAgent } = req.body;

      if (!topic || typeof topic !== "string" || topic.trim().length === 0) {
        return res.status(400).json({ error: "Topic is required" });
      }
      if (!mode || !["chain", "debate", "consensus", "sub-agent"].includes(mode)) {
        return res.status(400).json({ error: "Invalid mode. Use: chain, debate, consensus, or sub-agent" });
      }
      if (!agents || !Array.isArray(agents) || agents.length < 2) {
        return res.status(400).json({ error: "At least 2 agents are required" });
      }

      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");
      res.flushHeaders();

      let clientDisconnected = false;
      req.on("close", () => {
        clientDisconnected = true;
      });

      await startA2AChatStream(
        {
          topic: topic.trim(),
          mode,
          agents,
          maxRounds: maxRounds || undefined,
          maxTokensPerAgent: maxTokensPerAgent || undefined,
        },
        (event) => {
          if (!clientDisconnected) {
            res.write(`data: ${JSON.stringify(event)}\n\n`);
          }
        }
      );

      if (!clientDisconnected) {
        res.write(`data: [DONE]\n\n`);
        res.end();
      }
    } catch (error: any) {
      if (!res.headersSent) {
        res.status(500).json({ error: error.message });
      } else {
        res.write(`data: ${JSON.stringify({ type: 'error', data: { message: error.message } })}\n\n`);
        res.write(`data: [DONE]\n\n`);
        res.end();
      }
    }
  });

  app.post("/api/a2a/chat", async (req: Request, res: Response) => {
    try {
      const { topic, mode, agents, maxRounds, maxTokensPerAgent } = req.body;

      if (!topic || typeof topic !== "string" || topic.trim().length === 0) {
        return res.status(400).json({ error: "Topic is required" });
      }
      if (!mode || !["chain", "debate", "consensus", "sub-agent"].includes(mode)) {
        return res.status(400).json({ error: "Invalid mode. Use: chain, debate, consensus, or sub-agent" });
      }
      if (!agents || !Array.isArray(agents) || agents.length < 2) {
        return res.status(400).json({ error: "At least 2 agents are required" });
      }

      const session = await startA2AChat({
        topic: topic.trim(),
        mode,
        agents,
        maxRounds: maxRounds || undefined,
        maxTokensPerAgent: maxTokensPerAgent || undefined,
      });

      res.json(session);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/a2a/sessions", (req: Request, res: Response) => {
    try {
      const sessions = getAllSessions();
      res.json(sessions);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/a2a/sessions/:id", (req: Request, res: Response) => {
    try {
      const session = getSession(req.params.id);
      if (!session) {
        return res.status(404).json({ error: "Session not found" });
      }
      res.json(session);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/a2a/sessions/:id", (req: Request, res: Response) => {
    try {
      const deleted = deleteSession(req.params.id);
      if (!deleted) {
        return res.status(404).json({ error: "Session not found" });
      }
      res.json({ message: "Session deleted" });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/a2a/sessions", (req: Request, res: Response) => {
    try {
      const count = clearAllSessions();
      res.json({ message: `Cleared ${count} sessions`, count });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  return httpServer;
}