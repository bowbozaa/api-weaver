import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import rateLimit from "express-rate-limit";
import cors from "cors";
import swaggerUi from "swagger-ui-express";
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

const CONTENT_MCP_URL = `http://${process.env.CONTENT_MCP_HOST || 'localhost'}:${process.env.CONTENT_MCP_PORT || 3001}`;
const INTEGRATION_MCP_URL = `http://${process.env.INTEGRATION_MCP_HOST || 'localhost'}:${process.env.INTEGRATION_MCP_PORT || 3002}`;

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // CORS configuration
  app.use(cors({
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "X-API-KEY", "Authorization"],
    credentials: true,
  }));

  // Rate limiting
  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // 100 requests per window
    message: { error: "Too many requests", message: "Please try again later" },
    standardHeaders: true,
    legacyHeaders: false,
  });

  // Apply rate limiting to API routes
  app.use("/api", limiter);
  app.use("/mcp", limiter);

  // Request logging
  app.use(requestLogger);

  // API Key authentication
  app.use(apiKeyAuth);

  // Swagger documentation
  app.use("/docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: "API Server Documentation",
  }));

  app.get("/api-docs", (req: Request, res: Response) => {
    res.json(swaggerSpec);
  });

  // Register integration routes (AI, GitHub, Supabase, etc.)
  registerIntegrationRoutes(app);

  // MCP Server Proxy Routes
  const validApiKey = process.env.API_KEY;
  
  const contentMcpProxy = createProxyMiddleware({
    target: CONTENT_MCP_URL,
    changeOrigin: true,
    pathRewrite: { '^/api/content': '/api' },
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
        console.error('Content MCP Proxy Error:', err);
        notifyMcpUnavailable('Content MCP', err.message);
        if (res && res.status) {
          res.status(503).json({
            error: 'Content MCP unavailable',
            message: err.message,
          });
        }
      },
    },
  });

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

  app.use('/api/content', contentMcpProxy);
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

  return httpServer;
}