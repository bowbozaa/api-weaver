import { Router, Request, Response } from "express";
import * as aiService from "../services/aiService";
import * as cometService from "../services/cometService";
import * as notionService from "../services/notionService";
import * as fileService from "../services/fileService";
import * as commandService from "../services/commandService";

const router = Router();

router.get("/health", (_req: Request, res: Response) => {
  res.json({ 
    status: "ok", 
    service: "content-mcp",
    timestamp: new Date().toISOString() 
  });
});

router.get("/status", (_req: Request, res: Response) => {
  res.json({
    ai: aiService.getAIServiceStatus(),
    comet: cometService.getCometStatus(),
    notion: notionService.getNotionStatus(),
  });
});

router.post("/ai/claude", async (req: Request, res: Response) => {
  try {
    const result = await aiService.callClaude(req.body);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post("/ai/gpt", async (req: Request, res: Response) => {
  try {
    const result = await aiService.callGPT(req.body);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post("/ai/gemini", async (req: Request, res: Response) => {
  try {
    const result = await aiService.callGemini(req.body);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post("/ai/perplexity", async (req: Request, res: Response) => {
  try {
    const result = await aiService.callPerplexity(req.body);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post("/ai/compare", async (req: Request, res: Response) => {
  try {
    const result = await aiService.compareAllAIs(req.body);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/comet/projects", async (req: Request, res: Response) => {
  try {
    const workspace = req.query.workspace as string | undefined;
    const result = await cometService.listProjects(workspace);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/comet/experiments/:projectId", async (req: Request, res: Response) => {
  try {
    const result = await cometService.listExperiments(req.params.projectId);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/comet/metrics/:experimentKey", async (req: Request, res: Response) => {
  try {
    const result = await cometService.getExperimentMetrics(req.params.experimentKey);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/notion/pages", async (_req: Request, res: Response) => {
  try {
    const result = await notionService.listPages();
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/notion/pages/:pageId", async (req: Request, res: Response) => {
  try {
    const result = await notionService.getPage(req.params.pageId);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post("/notion/pages", async (req: Request, res: Response) => {
  try {
    const { parentId, title, content } = req.body;
    const result = await notionService.createPage(parentId, title, content);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.patch("/notion/pages/:pageId", async (req: Request, res: Response) => {
  try {
    const result = await notionService.updatePage(req.params.pageId, req.body.properties);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post("/notion/databases/:databaseId/query", async (req: Request, res: Response) => {
  try {
    const { filter, sorts } = req.body;
    const result = await notionService.queryDatabase(req.params.databaseId, filter, sorts);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post("/notion/search", async (req: Request, res: Response) => {
  try {
    const result = await notionService.search(req.body.query);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/files", async (req: Request, res: Response) => {
  try {
    const dirPath = (req.query.path as string) || ".";
    const result = await fileService.listFiles(dirPath);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/files/*", async (req: Request, res: Response) => {
  try {
    const filePath = req.params[0];
    const result = await fileService.readFile(filePath);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post("/files", async (req: Request, res: Response) => {
  try {
    const { path, content } = req.body;
    const result = await fileService.writeFile(path, content);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.delete("/files/*", async (req: Request, res: Response) => {
  try {
    const filePath = req.params[0];
    await fileService.deleteFile(filePath);
    res.json({ success: true, message: `Deleted ${filePath}` });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/project", async (req: Request, res: Response) => {
  try {
    const dirPath = (req.query.path as string) || ".";
    const depth = parseInt(req.query.depth as string) || 3;
    const result = await fileService.getProjectStructure(dirPath, depth);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post("/execute", async (req: Request, res: Response) => {
  try {
    const result = await commandService.executeCommand(req.body);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
