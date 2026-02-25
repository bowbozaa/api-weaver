import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Zap, 
  Shield, 
  Cloud, 
  Bot, 
  GitBranch, 
  Layers,
  ArrowRight,
  CheckCircle2,
  Server,
  Code,
  Activity
} from "lucide-react";
import { SiGithub, SiGoogle } from "react-icons/si";
import { Link } from "wouter";
import { usePageTitle } from "@/hooks/use-page-title";

export default function Landing() {
  usePageTitle("Welcome");
  return (
    <div className="min-h-screen bg-background">
      <nav className="fixed top-0 left-0 right-0 z-50 border-b bg-background/80 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers className="h-6 w-6 text-primary" />
            <span className="text-lg font-semibold">API Weaver</span>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/guide">
              <Button variant="ghost" size="sm" data-testid="link-guide">Guide</Button>
            </Link>
            <Link href="/terms">
              <Button variant="ghost" size="sm" data-testid="link-terms">Terms</Button>
            </Link>
            <Link href="/license">
              <Button variant="ghost" size="sm" data-testid="link-license">License</Button>
            </Link>
            <a href="/api/login">
              <Button size="sm" data-testid="button-login">
                Sign In
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </a>
          </div>
        </div>
      </nav>

      <main className="pt-20">
        <section className="py-24 px-4">
          <div className="container mx-auto max-w-6xl">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <div className="space-y-6">
                <Badge variant="secondary" className="mb-4">
                  MCP Architecture Monorepo
                </Badge>
                <h1 className="text-4xl md:text-5xl font-serif font-bold tracking-tight">
                  Unified API Gateway for Modern Development
                </h1>
                <p className="text-lg text-muted-foreground">
                  Connect 11 external services through a single, intelligent API gateway. 
                  AI services, cloud platforms, and developer tools - all unified.
                </p>
                <div className="flex flex-wrap gap-4">
                  <a href="/api/login">
                    <Button size="lg" data-testid="button-get-started">
                      Get Started
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </Button>
                  </a>
                  <Link href="/guide">
                    <Button variant="outline" size="lg" data-testid="button-view-docs">
                      View Documentation
                    </Button>
                  </Link>
                </div>
                <div className="flex items-center gap-4 pt-4">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    <span>Free forever</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    <span>Open source</span>
                  </div>
                </div>
                <div className="flex items-center gap-3 pt-2 text-sm text-muted-foreground">
                  <span>Sign in with:</span>
                  <div className="flex items-center gap-2">
                    <SiGithub className="h-5 w-5" />
                    <span>GitHub</span>
                  </div>
                  <span className="text-muted-foreground/50">|</span>
                  <div className="flex items-center gap-2">
                    <SiGoogle className="h-4 w-4" />
                    <span>Google</span>
                  </div>
                  <span className="text-muted-foreground/50">|</span>
                  <span>Email</span>
                </div>
              </div>
              <div className="relative">
                <div className="bg-gradient-to-br from-primary/10 to-primary/5 rounded-xl p-8 ring-1 ring-primary/10">
                  <div className="space-y-4">
                    <div className="flex items-center gap-3 p-3 bg-background rounded-lg shadow-sm">
                      <Bot className="h-5 w-5 text-blue-500" />
                      <span className="text-sm font-medium">Claude, GPT, Gemini, Perplexity</span>
                    </div>
                    <div className="flex items-center gap-3 p-3 bg-background rounded-lg shadow-sm">
                      <Cloud className="h-5 w-5 text-purple-500" />
                      <span className="text-sm font-medium">Google Cloud, Vercel, Supabase</span>
                    </div>
                    <div className="flex items-center gap-3 p-3 bg-background rounded-lg shadow-sm">
                      <GitBranch className="h-5 w-5 text-gray-700 dark:text-gray-300" />
                      <span className="text-sm font-medium">GitHub, Notion, n8n, Comet ML</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="py-16 px-4 bg-muted/30">
          <div className="container mx-auto max-w-6xl">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold mb-4">Why API Weaver?</h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                A unified interface for all your API needs, built with security and performance in mind.
              </p>
            </div>
            <div className="grid md:grid-cols-3 gap-6">
              <Card className="hover-elevate">
                <CardHeader>
                  <Server className="h-8 w-8 text-purple-500 mb-2" />
                  <CardTitle>MCP Architecture</CardTitle>
                  <CardDescription>
                    Three dedicated MCP servers - Gateway, Content, and Integration - for optimal request routing.
                  </CardDescription>
                </CardHeader>
              </Card>
              <Card className="hover-elevate">
                <CardHeader>
                  <Shield className="h-8 w-8 text-green-500 mb-2" />
                  <CardTitle>Enterprise Security</CardTitle>
                  <CardDescription>
                    API key auth, rate limiting, path sanitization, and input validation built-in.
                  </CardDescription>
                </CardHeader>
              </Card>
              <Card className="hover-elevate">
                <CardHeader>
                  <Activity className="h-8 w-8 text-blue-500 mb-2" />
                  <CardTitle>Real-time Monitoring</CardTitle>
                  <CardDescription>
                    Dashboard with live statistics, request logs, and service health monitoring.
                  </CardDescription>
                </CardHeader>
              </Card>
            </div>
          </div>
        </section>

        <section className="py-16 px-4">
          <div className="container mx-auto max-w-6xl">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold mb-4">11 Services Connected</h2>
              <p className="text-muted-foreground">All your favorite tools, one API</p>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {[
                { name: "Claude", icon: Bot, color: "text-orange-500" },
                { name: "GPT", icon: Bot, color: "text-green-500" },
                { name: "Gemini", icon: Bot, color: "text-blue-500" },
                { name: "Perplexity", icon: Bot, color: "text-purple-500" },
                { name: "GitHub", icon: GitBranch, color: "text-gray-700 dark:text-gray-300" },
                { name: "Supabase", icon: Cloud, color: "text-emerald-500" },
                { name: "Notion", icon: Code, color: "text-gray-900 dark:text-gray-100" },
                { name: "Vercel", icon: Zap, color: "text-gray-900 dark:text-gray-100" },
                { name: "n8n", icon: Activity, color: "text-red-500" },
                { name: "Google Cloud", icon: Cloud, color: "text-blue-500" },
                { name: "Comet ML", icon: Activity, color: "text-yellow-500" },
              ].map((service) => (
                <div key={service.name} className="flex flex-col items-center justify-center p-4 border rounded-md hover-elevate">
                  <service.icon className={`h-6 w-6 ${service.color} mb-2`} />
                  <span className="text-sm font-medium">{service.name}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        <footer className="border-t py-8 px-4">
          <div className="container mx-auto max-w-6xl flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Layers className="h-5 w-5 text-primary" />
              <span className="text-sm text-muted-foreground">API Weaver</span>
            </div>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <Link href="/guide">
                <span className="hover:text-foreground cursor-pointer">Documentation</span>
              </Link>
              <Link href="/terms">
                <span className="hover:text-foreground cursor-pointer">Terms</span>
              </Link>
              <Link href="/license">
                <span className="hover:text-foreground cursor-pointer">License</span>
              </Link>
            </div>
            <p className="text-sm text-muted-foreground">
              MIT License
            </p>
          </div>
        </footer>
      </main>
    </div>
  );
}
