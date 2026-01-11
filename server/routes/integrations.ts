import type { Express, Request, Response } from "express";
import { z } from "zod";

import { callClaude, callGPT, callGemini, callPerplexity, compareAllAIs } from "../services/aiService";
import * as github from "../services/githubService";
import { pushToGitHub, getAuthenticatedUser, createRepo, getRepoInfo } from "../services/githubExportService";
import * as supabase from "../services/supabaseService";
import * as notion from "../services/notionService";
import * as vercel from "../services/vercelService";
import * as n8n from "../services/n8nService";
import * as gcloud from "../services/gcloudService";
import * as comet from "../services/cometService";
import { getServiceHealth, getAllServicesHealth } from "../services/healthService";

const aiPromptSchema = z.object({
  prompt: z.string().min(1),
  model: z.string().optional(),
  maxTokens: z.number().min(1).max(8000).optional(),
});

export function registerIntegrationRoutes(app: Express): void {
  
  // ==================== HEALTH CHECKS ====================
  
  app.get("/api/health", async (req: Request, res: Response) => {
    const health = getAllServicesHealth();
    res.json(health);
  });

  app.get("/api/health/:service", async (req: Request, res: Response) => {
    const health = getServiceHealth(req.params.service);
    res.json(health);
  });

  // ==================== AI SERVICES ====================

  app.post("/api/ai/claude", async (req: Request, res: Response) => {
    try {
      const body = aiPromptSchema.parse(req.body);
      const result = await callClaude(body);
      res.json(result);
    } catch (error: any) {
      res.status(400).json({ error: "AI Error", message: error.message });
    }
  });

  app.post("/api/ai/gpt", async (req: Request, res: Response) => {
    try {
      const body = aiPromptSchema.parse(req.body);
      const result = await callGPT(body);
      res.json(result);
    } catch (error: any) {
      res.status(400).json({ error: "AI Error", message: error.message });
    }
  });

  app.post("/api/ai/gemini", async (req: Request, res: Response) => {
    try {
      const body = aiPromptSchema.parse(req.body);
      const result = await callGemini(body);
      res.json(result);
    } catch (error: any) {
      res.status(400).json({ error: "AI Error", message: error.message });
    }
  });

  app.post("/api/ai/perplexity", async (req: Request, res: Response) => {
    try {
      const body = aiPromptSchema.parse(req.body);
      const result = await callPerplexity(body);
      res.json(result);
    } catch (error: any) {
      res.status(400).json({ error: "AI Error", message: error.message });
    }
  });

  app.post("/api/ai/compare", async (req: Request, res: Response) => {
    try {
      const body = aiPromptSchema.parse(req.body);
      const result = await compareAllAIs(body);
      res.json(result);
    } catch (error: any) {
      res.status(400).json({ error: "AI Error", message: error.message });
    }
  });

  // ==================== GITHUB ====================

  app.get("/api/github/repos", async (req: Request, res: Response) => {
    try {
      const repos = await github.listRepos();
      res.json(repos);
    } catch (error: any) {
      res.status(400).json({ error: "GitHub Error", message: error.message });
    }
  });

  app.get("/api/github/repos/:owner/:repo", async (req: Request, res: Response) => {
    try {
      const repo = await github.getRepo(req.params.owner, req.params.repo);
      res.json(repo);
    } catch (error: any) {
      res.status(400).json({ error: "GitHub Error", message: error.message });
    }
  });

  app.get("/api/github/repos/:owner/:repo/contents/*", async (req: Request, res: Response) => {
    try {
      const path = req.params[0] || "";
      const contents = await github.getRepoContents(req.params.owner, req.params.repo, path);
      res.json(contents);
    } catch (error: any) {
      res.status(400).json({ error: "GitHub Error", message: error.message });
    }
  });

  app.post("/api/github/repos/:owner/:repo/contents/*", async (req: Request, res: Response) => {
    try {
      const path = req.params[0] || "";
      const { content, message, sha } = req.body;
      if (!content || !message) {
        return res.status(400).json({ error: "Bad Request", message: "content and message are required" });
      }
      const result = await github.createOrUpdateFile(req.params.owner, req.params.repo, path, content, message, sha);
      res.json(result);
    } catch (error: any) {
      res.status(400).json({ error: "GitHub Error", message: error.message });
    }
  });

  app.delete("/api/github/repos/:owner/:repo/contents/*", async (req: Request, res: Response) => {
    try {
      const path = req.params[0] || "";
      const { message, sha } = req.body;
      if (!message || !sha) {
        return res.status(400).json({ error: "Bad Request", message: "message and sha are required" });
      }
      const result = await github.deleteFile(req.params.owner, req.params.repo, path, message, sha);
      res.json(result);
    } catch (error: any) {
      res.status(400).json({ error: "GitHub Error", message: error.message });
    }
  });

  app.get("/api/github/repos/:owner/:repo/issues", async (req: Request, res: Response) => {
    try {
      const issues = await github.listIssues(req.params.owner, req.params.repo);
      res.json(issues);
    } catch (error: any) {
      res.status(400).json({ error: "GitHub Error", message: error.message });
    }
  });

  app.post("/api/github/repos/:owner/:repo/issues", async (req: Request, res: Response) => {
    try {
      const { title, body, labels } = req.body;
      if (!title) {
        return res.status(400).json({ error: "Bad Request", message: "title is required" });
      }
      const issue = await github.createIssue(req.params.owner, req.params.repo, title, body, labels);
      res.json(issue);
    } catch (error: any) {
      res.status(400).json({ error: "GitHub Error", message: error.message });
    }
  });

  // GitHub Export - Push entire project to repository
  app.get("/api/github/user", async (req: Request, res: Response) => {
    try {
      const user = await getAuthenticatedUser();
      res.json(user);
    } catch (error: any) {
      res.status(400).json({ error: "GitHub Error", message: error.message });
    }
  });

  app.post("/api/github/export/create-repo", async (req: Request, res: Response) => {
    try {
      const { name, description, isPrivate } = req.body;
      if (!name) {
        return res.status(400).json({ error: "Bad Request", message: "name is required" });
      }
      const repo = await createRepo(name, description || "Exported from API Weaver", isPrivate || false);
      res.json(repo);
    } catch (error: any) {
      res.status(400).json({ error: "GitHub Error", message: error.message });
    }
  });

  app.post("/api/github/export/push", async (req: Request, res: Response) => {
    try {
      const { owner, repo, message } = req.body;
      if (!owner || !repo) {
        return res.status(400).json({ error: "Bad Request", message: "owner and repo are required" });
      }
      
      // Check if repo exists
      const repoInfo = await getRepoInfo(owner, repo);
      if (!repoInfo) {
        return res.status(404).json({ error: "Not Found", message: `Repository ${owner}/${repo} not found` });
      }
      
      const result = await pushToGitHub(owner, repo, message || "Update from API Weaver");
      res.json(result);
    } catch (error: any) {
      res.status(400).json({ error: "GitHub Error", message: error.message });
    }
  });

  // ==================== SUPABASE ====================

  app.get("/api/supabase/tables", async (req: Request, res: Response) => {
    try {
      const tables = await supabase.listTables();
      res.json(tables);
    } catch (error: any) {
      res.status(400).json({ error: "Supabase Error", message: error.message });
    }
  });

  app.get("/api/supabase/query", async (req: Request, res: Response) => {
    try {
      const { table, select, ...filter } = req.query as Record<string, string>;
      if (!table) {
        return res.status(400).json({ error: "Bad Request", message: "table is required" });
      }
      const data = await supabase.query(table, select || "*", Object.keys(filter).length ? filter : undefined);
      res.json(data);
    } catch (error: any) {
      res.status(400).json({ error: "Supabase Error", message: error.message });
    }
  });

  app.post("/api/supabase/insert", async (req: Request, res: Response) => {
    try {
      const { table, data } = req.body;
      if (!table || !data) {
        return res.status(400).json({ error: "Bad Request", message: "table and data are required" });
      }
      const result = await supabase.insert(table, data);
      res.json(result);
    } catch (error: any) {
      res.status(400).json({ error: "Supabase Error", message: error.message });
    }
  });

  app.put("/api/supabase/update", async (req: Request, res: Response) => {
    try {
      const { table, data, match } = req.body;
      if (!table || !data || !match) {
        return res.status(400).json({ error: "Bad Request", message: "table, data, and match are required" });
      }
      const result = await supabase.update(table, data, match);
      res.json(result);
    } catch (error: any) {
      res.status(400).json({ error: "Supabase Error", message: error.message });
    }
  });

  app.delete("/api/supabase/delete", async (req: Request, res: Response) => {
    try {
      const { table, match } = req.body;
      if (!table || !match) {
        return res.status(400).json({ error: "Bad Request", message: "table and match are required" });
      }
      const result = await supabase.deleteRows(table, match);
      res.json(result);
    } catch (error: any) {
      res.status(400).json({ error: "Supabase Error", message: error.message });
    }
  });

  // ==================== NOTION ====================

  app.get("/api/notion/pages", async (req: Request, res: Response) => {
    try {
      const pages = await notion.listPages();
      res.json(pages);
    } catch (error: any) {
      res.status(400).json({ error: "Notion Error", message: error.message });
    }
  });

  app.get("/api/notion/pages/:id", async (req: Request, res: Response) => {
    try {
      const page = await notion.getPage(req.params.id);
      res.json(page);
    } catch (error: any) {
      res.status(400).json({ error: "Notion Error", message: error.message });
    }
  });

  app.post("/api/notion/pages", async (req: Request, res: Response) => {
    try {
      const { parentId, title, content } = req.body;
      if (!parentId || !title) {
        return res.status(400).json({ error: "Bad Request", message: "parentId and title are required" });
      }
      const page = await notion.createPage(parentId, title, content);
      res.json(page);
    } catch (error: any) {
      res.status(400).json({ error: "Notion Error", message: error.message });
    }
  });

  app.patch("/api/notion/pages/:id", async (req: Request, res: Response) => {
    try {
      const { properties } = req.body;
      if (!properties) {
        return res.status(400).json({ error: "Bad Request", message: "properties are required" });
      }
      const page = await notion.updatePage(req.params.id, properties);
      res.json(page);
    } catch (error: any) {
      res.status(400).json({ error: "Notion Error", message: error.message });
    }
  });

  app.get("/api/notion/databases/:id/query", async (req: Request, res: Response) => {
    try {
      const result = await notion.queryDatabase(req.params.id);
      res.json(result);
    } catch (error: any) {
      res.status(400).json({ error: "Notion Error", message: error.message });
    }
  });

  app.post("/api/notion/search", async (req: Request, res: Response) => {
    try {
      const { query } = req.body;
      if (!query) {
        return res.status(400).json({ error: "Bad Request", message: "query is required" });
      }
      const result = await notion.search(query);
      res.json(result);
    } catch (error: any) {
      res.status(400).json({ error: "Notion Error", message: error.message });
    }
  });

  // ==================== VERCEL ====================

  app.get("/api/vercel/projects", async (req: Request, res: Response) => {
    try {
      const projects = await vercel.listProjects();
      res.json(projects);
    } catch (error: any) {
      res.status(400).json({ error: "Vercel Error", message: error.message });
    }
  });

  app.get("/api/vercel/deployments", async (req: Request, res: Response) => {
    try {
      const { projectId, limit } = req.query;
      const deployments = await vercel.listDeployments(
        projectId as string,
        limit ? parseInt(limit as string) : undefined
      );
      res.json(deployments);
    } catch (error: any) {
      res.status(400).json({ error: "Vercel Error", message: error.message });
    }
  });

  app.post("/api/vercel/deployments", async (req: Request, res: Response) => {
    try {
      const { name, gitSource } = req.body;
      if (!name) {
        return res.status(400).json({ error: "Bad Request", message: "name is required" });
      }
      const deployment = await vercel.createDeployment(name, gitSource);
      res.json(deployment);
    } catch (error: any) {
      res.status(400).json({ error: "Vercel Error", message: error.message });
    }
  });

  app.get("/api/vercel/deployments/:id", async (req: Request, res: Response) => {
    try {
      const deployment = await vercel.getDeployment(req.params.id);
      res.json(deployment);
    } catch (error: any) {
      res.status(400).json({ error: "Vercel Error", message: error.message });
    }
  });

  app.delete("/api/vercel/deployments/:id", async (req: Request, res: Response) => {
    try {
      const result = await vercel.cancelDeployment(req.params.id);
      res.json(result);
    } catch (error: any) {
      res.status(400).json({ error: "Vercel Error", message: error.message });
    }
  });

  // ==================== N8N ====================

  app.get("/api/n8n/workflows", async (req: Request, res: Response) => {
    try {
      const workflows = await n8n.listWorkflows();
      res.json(workflows);
    } catch (error: any) {
      res.status(400).json({ error: "n8n Error", message: error.message });
    }
  });

  app.get("/api/n8n/workflows/:id", async (req: Request, res: Response) => {
    try {
      const workflow = await n8n.getWorkflow(req.params.id);
      res.json(workflow);
    } catch (error: any) {
      res.status(400).json({ error: "n8n Error", message: error.message });
    }
  });

  app.post("/api/n8n/workflows/:id/execute", async (req: Request, res: Response) => {
    try {
      const result = await n8n.executeWorkflow(req.params.id, req.body);
      res.json(result);
    } catch (error: any) {
      res.status(400).json({ error: "n8n Error", message: error.message });
    }
  });

  app.get("/api/n8n/executions", async (req: Request, res: Response) => {
    try {
      const { workflowId, limit } = req.query;
      const executions = await n8n.listExecutions(
        workflowId as string,
        limit ? parseInt(limit as string) : undefined
      );
      res.json(executions);
    } catch (error: any) {
      res.status(400).json({ error: "n8n Error", message: error.message });
    }
  });

  // ==================== GOOGLE CLOUD ====================

  app.get("/api/gcloud/projects", async (req: Request, res: Response) => {
    try {
      const projects = await gcloud.listProjects();
      res.json(projects);
    } catch (error: any) {
      res.status(400).json({ error: "Google Cloud Error", message: error.message });
    }
  });

  app.get("/api/gcloud/compute/instances", async (req: Request, res: Response) => {
    try {
      const { zone } = req.query;
      const instances = await gcloud.listComputeInstances(zone as string);
      res.json(instances);
    } catch (error: any) {
      res.status(400).json({ error: "Google Cloud Error", message: error.message });
    }
  });

  app.post("/api/gcloud/compute/instances", async (req: Request, res: Response) => {
    try {
      const { name, zone, machineType } = req.body;
      if (!name) {
        return res.status(400).json({ error: "Bad Request", message: "name is required" });
      }
      const instance = await gcloud.createComputeInstance(name, zone, machineType);
      res.json(instance);
    } catch (error: any) {
      res.status(400).json({ error: "Google Cloud Error", message: error.message });
    }
  });

  app.delete("/api/gcloud/compute/instances/:name", async (req: Request, res: Response) => {
    try {
      const { zone } = req.query;
      const result = await gcloud.deleteComputeInstance(req.params.name, zone as string);
      res.json(result);
    } catch (error: any) {
      res.status(400).json({ error: "Google Cloud Error", message: error.message });
    }
  });

  app.get("/api/gcloud/storage/buckets", async (req: Request, res: Response) => {
    try {
      const buckets = await gcloud.listStorageBuckets();
      res.json(buckets);
    } catch (error: any) {
      res.status(400).json({ error: "Google Cloud Error", message: error.message });
    }
  });

  // ==================== COMET ML ====================

  app.get("/api/comet/projects", async (req: Request, res: Response) => {
    try {
      const { workspace } = req.query;
      const projects = await comet.listProjects(workspace as string);
      res.json(projects);
    } catch (error: any) {
      res.status(400).json({ error: "Comet Error", message: error.message });
    }
  });

  app.get("/api/comet/experiments", async (req: Request, res: Response) => {
    try {
      const { projectId } = req.query;
      if (!projectId) {
        return res.status(400).json({ error: "Bad Request", message: "projectId is required" });
      }
      const experiments = await comet.listExperiments(projectId as string);
      res.json(experiments);
    } catch (error: any) {
      res.status(400).json({ error: "Comet Error", message: error.message });
    }
  });

  app.get("/api/comet/experiments/:id/metrics", async (req: Request, res: Response) => {
    try {
      const metrics = await comet.getExperimentMetrics(req.params.id);
      res.json(metrics);
    } catch (error: any) {
      res.status(400).json({ error: "Comet Error", message: error.message });
    }
  });
}
