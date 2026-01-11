import { Router, Request, Response } from "express";
import * as githubService from "../services/githubService";
import * as vercelService from "../services/vercelService";
import * as supabaseService from "../services/supabaseService";
import * as gcloudService from "../services/gcloudService";
import * as n8nService from "../services/n8nService";
import { handleMCPConnection, processMCPMessage, MCP_TOOLS } from "../services/mcpService";

const router = Router();

router.get("/health", (_req: Request, res: Response) => {
  res.json({ 
    status: "ok", 
    service: "integration-mcp",
    timestamp: new Date().toISOString() 
  });
});

router.get("/status", (_req: Request, res: Response) => {
  res.json({
    github: githubService.getGitHubStatus(),
    vercel: vercelService.getVercelStatus(),
    supabase: supabaseService.getSupabaseStatus(),
    gcloud: gcloudService.getGCloudStatus(),
    n8n: n8nService.getN8nStatus(),
  });
});

router.get("/github/repos", async (_req: Request, res: Response) => {
  try {
    const result = await githubService.listRepos();
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/github/repos/:owner/:repo", async (req: Request, res: Response) => {
  try {
    const result = await githubService.getRepo(req.params.owner, req.params.repo);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/github/repos/:owner/:repo/contents/*", async (req: Request, res: Response) => {
  try {
    const path = req.params[0] || "";
    const result = await githubService.getRepoContents(req.params.owner, req.params.repo, path);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.put("/github/repos/:owner/:repo/contents/*", async (req: Request, res: Response) => {
  try {
    const path = req.params[0] || "";
    const { content, message, sha } = req.body;
    const result = await githubService.createOrUpdateFile(
      req.params.owner, req.params.repo, path, content, message, sha
    );
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.delete("/github/repos/:owner/:repo/contents/*", async (req: Request, res: Response) => {
  try {
    const path = req.params[0] || "";
    const { message, sha } = req.body;
    const result = await githubService.deleteFile(
      req.params.owner, req.params.repo, path, message, sha
    );
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/github/repos/:owner/:repo/issues", async (req: Request, res: Response) => {
  try {
    const result = await githubService.listIssues(req.params.owner, req.params.repo);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post("/github/repos/:owner/:repo/issues", async (req: Request, res: Response) => {
  try {
    const { title, body, labels } = req.body;
    const result = await githubService.createIssue(
      req.params.owner, req.params.repo, title, body, labels
    );
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/vercel/projects", async (_req: Request, res: Response) => {
  try {
    const result = await vercelService.listProjects();
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/vercel/deployments", async (req: Request, res: Response) => {
  try {
    const projectId = req.query.projectId as string | undefined;
    const limit = parseInt(req.query.limit as string) || 20;
    const result = await vercelService.listDeployments(projectId, limit);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post("/vercel/deployments", async (req: Request, res: Response) => {
  try {
    const { name, gitSource } = req.body;
    const result = await vercelService.createDeployment(name, gitSource);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/vercel/deployments/:deploymentId", async (req: Request, res: Response) => {
  try {
    const result = await vercelService.getDeployment(req.params.deploymentId);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.patch("/vercel/deployments/:deploymentId/cancel", async (req: Request, res: Response) => {
  try {
    const result = await vercelService.cancelDeployment(req.params.deploymentId);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/supabase/tables", async (_req: Request, res: Response) => {
  try {
    const result = await supabaseService.listTables();
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/supabase/query/:table", async (req: Request, res: Response) => {
  try {
    const select = req.query.select as string || "*";
    const filter = req.query.filter ? JSON.parse(req.query.filter as string) : undefined;
    const result = await supabaseService.query(req.params.table, select, filter);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post("/supabase/:table", async (req: Request, res: Response) => {
  try {
    const result = await supabaseService.insert(req.params.table, req.body);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.patch("/supabase/:table", async (req: Request, res: Response) => {
  try {
    const { data, match } = req.body;
    const result = await supabaseService.update(req.params.table, data, match);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.delete("/supabase/:table", async (req: Request, res: Response) => {
  try {
    const match = req.body.match || req.body;
    const result = await supabaseService.deleteRows(req.params.table, match);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/gcloud/projects", async (_req: Request, res: Response) => {
  try {
    const result = await gcloudService.listProjects();
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/gcloud/instances", async (req: Request, res: Response) => {
  try {
    const zone = req.query.zone as string || "us-central1-a";
    const result = await gcloudService.listComputeInstances(zone);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post("/gcloud/instances", async (req: Request, res: Response) => {
  try {
    const { name, zone, machineType } = req.body;
    const result = await gcloudService.createComputeInstance(name, zone, machineType);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.delete("/gcloud/instances/:name", async (req: Request, res: Response) => {
  try {
    const zone = req.query.zone as string || "us-central1-a";
    const result = await gcloudService.deleteComputeInstance(req.params.name, zone);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/gcloud/buckets", async (_req: Request, res: Response) => {
  try {
    const result = await gcloudService.listStorageBuckets();
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/n8n/workflows", async (_req: Request, res: Response) => {
  try {
    const result = await n8nService.listWorkflows();
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/n8n/workflows/:workflowId", async (req: Request, res: Response) => {
  try {
    const result = await n8nService.getWorkflow(req.params.workflowId);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post("/n8n/workflows/:workflowId/execute", async (req: Request, res: Response) => {
  try {
    const result = await n8nService.executeWorkflow(req.params.workflowId, req.body);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/n8n/executions", async (req: Request, res: Response) => {
  try {
    const workflowId = req.query.workflowId as string | undefined;
    const limit = parseInt(req.query.limit as string) || 20;
    const result = await n8nService.listExecutions(workflowId, limit);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/mcp/tools", (_req: Request, res: Response) => {
  res.json({ tools: MCP_TOOLS });
});

router.get("/mcp", (req: Request, res: Response) => {
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    "Connection": "keep-alive",
  });

  const session = handleMCPConnection(res);

  req.on("close", () => {
    session.disconnect();
  });
});

router.post("/mcp", async (req: Request, res: Response) => {
  try {
    const message = req.body;
    const response = await processMCPMessage(message);
    res.json(response);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
