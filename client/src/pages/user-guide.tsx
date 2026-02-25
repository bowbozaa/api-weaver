import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  ArrowLeft, 
  BookOpen, 
  Code, 
  Terminal, 
  FileCode,
  Zap,
  Shield,
  Cloud,
  Bot,
  Database,
  GitBranch,
  Workflow,
  Key,
  Server,
  Layers,
  CheckCircle2,
  AlertCircle
} from "lucide-react";
import { Link } from "wouter";
import { usePageTitle } from "@/hooks/use-page-title";

export default function UserGuide() {
  usePageTitle("User Guide");
  return (
    <div className="min-h-screen bg-background">
      <div className="border-b">
        <div className="container mx-auto px-4 py-4 flex items-center gap-4">
          <Link href="/">
            <Button variant="ghost" size="icon" data-testid="button-back-home">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div className="flex items-center gap-2">
            <BookOpen className="h-6 w-6 text-primary" />
            <h1 className="text-xl font-semibold">User Guide</h1>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <Tabs defaultValue="getting-started" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5 gap-1">
            <TabsTrigger value="getting-started" data-testid="tab-getting-started">Getting Started</TabsTrigger>
            <TabsTrigger value="architecture" data-testid="tab-architecture">Architecture</TabsTrigger>
            <TabsTrigger value="services" data-testid="tab-services">Services</TabsTrigger>
            <TabsTrigger value="api-reference" data-testid="tab-api-reference">API Reference</TabsTrigger>
            <TabsTrigger value="deployment" data-testid="tab-deployment">Deployment</TabsTrigger>
          </TabsList>

          <TabsContent value="getting-started" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="h-5 w-5 text-yellow-500" />
                  Quick Start
                </CardTitle>
                <CardDescription>Get up and running with API Weaver in minutes</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <Badge variant="outline" className="mt-1">1</Badge>
                    <div>
                      <h4 className="font-medium">Configure API Keys</h4>
                      <p className="text-sm text-muted-foreground">Add your API keys for the services you want to use. Go to Settings and configure the required environment variables.</p>
                    </div>
                  </div>
                  <Separator />
                  <div className="flex items-start gap-3">
                    <Badge variant="outline" className="mt-1">2</Badge>
                    <div>
                      <h4 className="font-medium">Access the Dashboard</h4>
                      <p className="text-sm text-muted-foreground">The main dashboard provides an overview of all connected services, request statistics, and monitoring tools.</p>
                    </div>
                  </div>
                  <Separator />
                  <div className="flex items-start gap-3">
                    <Badge variant="outline" className="mt-1">3</Badge>
                    <div>
                      <h4 className="font-medium">Make API Requests</h4>
                      <p className="text-sm text-muted-foreground">Use the documented endpoints to interact with AI services, manage files, and integrate external services.</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Key className="h-5 w-5 text-amber-500" />
                  Authentication
                </CardTitle>
                <CardDescription>How to authenticate API requests</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Protected endpoints require an API key passed via the <code className="bg-muted px-1 py-0.5 rounded">X-API-KEY</code> header or <code className="bg-muted px-1 py-0.5 rounded">api_key</code> query parameter.
                </p>
                <div className="bg-muted p-4 rounded-md">
                  <code className="text-sm">
                    curl -H "X-API-KEY: your-api-key" https://api.example.com/api/files
                  </code>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="architecture" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Layers className="h-5 w-5 text-blue-500" />
                  MCP Architecture
                </CardTitle>
                <CardDescription>Model Context Protocol server architecture</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-3">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base flex items-center gap-2">
                        <Server className="h-4 w-4 text-purple-500" />
                        Gateway MCP
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground">Port 3000 - Routes requests to Content and Integration MCPs</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base flex items-center gap-2">
                        <FileCode className="h-4 w-4 text-green-500" />
                        Content MCP
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground">Port 3001 - Handles AI, files, and content operations</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base flex items-center gap-2">
                        <Workflow className="h-4 w-4 text-orange-500" />
                        Integration MCP
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground">Port 3002 - Handles external service integrations</p>
                    </CardContent>
                  </Card>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5 text-green-500" />
                  Security Features
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-3 md:grid-cols-2">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    <span className="text-sm">API Key Authentication</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    <span className="text-sm">Rate Limiting (100 req/15min)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    <span className="text-sm">Path Sanitization</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    <span className="text-sm">Command Whitelist</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    <span className="text-sm">Input Validation (Zod)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    <span className="text-sm">Path Boundary Check</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="services" className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Bot className="h-5 w-5 text-blue-500" />
                    AI Services
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Claude (Anthropic)</span>
                    <Badge variant="outline">ANTHROPIC_API_KEY</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">GPT (OpenAI)</span>
                    <Badge variant="outline">OPENAI_API_KEY</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Gemini (Google)</span>
                    <Badge variant="outline">GOOGLE_AI_API_KEY</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Perplexity</span>
                    <Badge variant="outline">PERPLEXITY_API_KEY</Badge>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Cloud className="h-5 w-5 text-purple-500" />
                    Cloud Services
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Google Cloud</span>
                    <Badge variant="outline">GOOGLE_CLOUD_*</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Vercel</span>
                    <Badge variant="outline">VERCEL_API_KEY</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Supabase</span>
                    <Badge variant="outline">SUPABASE_*</Badge>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <GitBranch className="h-5 w-5 text-gray-700" />
                    Development Tools
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">GitHub</span>
                    <Badge variant="outline">GITHUB_TOKEN</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Notion</span>
                    <Badge variant="outline">NOTION_API_KEY</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Comet ML</span>
                    <Badge variant="outline">COMET_API_KEY</Badge>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Workflow className="h-5 w-5 text-orange-500" />
                    Automation
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">n8n Workflows</span>
                    <Badge variant="outline">N8N_*</Badge>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="api-reference" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Terminal className="h-5 w-5 text-green-500" />
                  Direct Routes
                </CardTitle>
                <CardDescription>Endpoints on the main server (Port 5000)</CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-64">
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">GET</Badge>
                      <code className="text-sm">/api/stats</code>
                      <span className="text-sm text-muted-foreground">- API statistics</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">GET</Badge>
                      <code className="text-sm">/api/logs</code>
                      <span className="text-sm text-muted-foreground">- Request logs</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">GET</Badge>
                      <code className="text-sm">/api/health</code>
                      <span className="text-sm text-muted-foreground">- Services health</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">POST</Badge>
                      <code className="text-sm">/api/files</code>
                      <span className="text-sm text-muted-foreground">- Create/update file</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">GET</Badge>
                      <code className="text-sm">/api/files/*</code>
                      <span className="text-sm text-muted-foreground">- Read file</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">DELETE</Badge>
                      <code className="text-sm">/api/files/*</code>
                      <span className="text-sm text-muted-foreground">- Delete file</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">POST</Badge>
                      <code className="text-sm">/api/execute</code>
                      <span className="text-sm text-muted-foreground">- Execute command</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">GET</Badge>
                      <code className="text-sm">/api/project</code>
                      <span className="text-sm text-muted-foreground">- Project structure</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">POST</Badge>
                      <code className="text-sm">/api/ai</code>
                      <span className="text-sm text-muted-foreground">- AI prompt</span>
                    </div>
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Layers className="h-5 w-5 text-blue-500" />
                  MCP Proxy Routes
                </CardTitle>
                <CardDescription>Proxied through /api/content/* and /api/integration/*</CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-48">
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">POST</Badge>
                      <code className="text-sm">/api/content/ai/claude</code>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">POST</Badge>
                      <code className="text-sm">/api/content/ai/gpt</code>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">POST</Badge>
                      <code className="text-sm">/api/content/ai/gemini</code>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">POST</Badge>
                      <code className="text-sm">/api/content/ai/perplexity</code>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">GET</Badge>
                      <code className="text-sm">/api/integration/github/*</code>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">GET</Badge>
                      <code className="text-sm">/api/integration/supabase/*</code>
                    </div>
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="deployment" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Cloud className="h-5 w-5 text-blue-500" />
                  Google Cloud Run
                </CardTitle>
                <CardDescription>Deploy to Google Cloud Run with zero-downtime</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-muted p-4 rounded-md">
                  <code className="text-sm">
                    gcloud run deploy api-weaver --source . --port 5000 --region us-central1
                  </code>
                </div>
                <div className="space-y-2">
                  <h4 className="font-medium">Zero-Downtime Deployment Features:</h4>
                  <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                    <li>Gradual traffic migration between revisions</li>
                    <li>Automatic health checks before traffic switch</li>
                    <li>Rollback capability to previous revisions</li>
                    <li>Connection draining for in-flight requests</li>
                  </ul>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 text-amber-500" />
                  Important Notes
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="list-disc list-inside text-sm text-muted-foreground space-y-2">
                  <li>Ensure all environment variables are configured in Cloud Run</li>
                  <li>Use Cloud SQL or external database for production</li>
                  <li>Configure IAM permissions for Google Cloud services</li>
                  <li>Set appropriate memory and CPU limits</li>
                </ul>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
