import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Play, Plus, Trash2, Loader2, Copy, Zap, Clock, FileJson } from "lucide-react";
import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { usePageTitle } from "@/hooks/use-page-title";
import { apiRequest } from "@/lib/queryClient";

interface Header {
  key: string;
  value: string;
  id: string;
}

interface ExecuteResponse {
  status: number;
  statusText: string;
  headers: Record<string, string>;
  body: string;
  duration: number;
}

interface SampleRequest {
  name: string;
  description?: string;
  method: string;
  url?: string;
  path?: string;
  headers?: Record<string, string>;
  body?: Record<string, unknown> | string;
}

interface EndpointInfo {
  method: string;
  path: string;
  description?: string;
}

const METHODS = ["GET", "POST", "PUT", "DELETE"] as const;

const methodColors: Record<string, string> = {
  GET: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  POST: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  PUT: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  DELETE: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
};

export default function Playground() {
  usePageTitle("API Playground");
  const { toast } = useToast();
  const [method, setMethod] = useState<string>("GET");
  const [url, setUrl] = useState("");
  const [headers, setHeaders] = useState<Header[]>([
    { key: "Content-Type", value: "application/json", id: "1" },
  ]);
  const [body, setBody] = useState("");
  const [response, setResponse] = useState<ExecuteResponse | null>(null);

  const { data: samples, isLoading: samplesLoading } = useQuery<SampleRequest[]>({
    queryKey: ["/api/playground/samples"],
  });

  const { data: endpoints, isLoading: endpointsLoading } = useQuery<EndpointInfo[]>({
    queryKey: ["/api/playground/endpoints"],
  });

  const executeMutation = useMutation({
    mutationFn: async (payload: { method: string; url: string; headers: Record<string, string>; body: string }) => {
      const res = await apiRequest("POST", "/api/playground/execute", payload);
      return res.json();
    },
    onSuccess: (data: ExecuteResponse) => {
      setResponse(data);
      toast({ title: "Request Complete", description: `Status: ${data.status} in ${data.duration}ms` });
    },
    onError: (error: Error) => {
      toast({ title: "Request Failed", description: error.message, variant: "destructive" });
    },
  });

  const handleExecute = () => {
    const headersObj: Record<string, string> = {};
    headers.forEach((h) => {
      if (h.key.trim()) headersObj[h.key] = h.value;
    });
    executeMutation.mutate({ method, url, headers: headersObj, body });
  };

  const addHeader = () => {
    setHeaders([...headers, { key: "", value: "", id: Date.now().toString() }]);
  };

  const removeHeader = (id: string) => {
    setHeaders(headers.filter((h) => h.id !== id));
  };

  const updateHeader = (id: string, field: "key" | "value", val: string) => {
    setHeaders(headers.map((h) => (h.id === id ? { ...h, [field]: val } : h)));
  };

  const loadSample = (sample: SampleRequest) => {
    setMethod(sample.method);
    setUrl(sample.url || sample.path || "");
    if (sample.headers && Object.keys(sample.headers).length > 0) {
      setHeaders(
        Object.entries(sample.headers).map(([key, value], i) => ({
          key,
          value,
          id: `sample-${i}`,
        }))
      );
    } else {
      setHeaders([{ key: "", value: "", id: "default" }]);
    }
    if (sample.body) {
      setBody(typeof sample.body === "string" ? sample.body : JSON.stringify(sample.body, null, 2));
    } else {
      setBody("");
    }
  };

  const copyResponse = () => {
    if (response?.body) {
      navigator.clipboard.writeText(response.body);
      toast({ title: "Copied", description: "Response body copied to clipboard" });
    }
  };

  const formatJson = (str: string): string => {
    try {
      return JSON.stringify(JSON.parse(str), null, 2);
    } catch {
      return str;
    }
  };

  const statusColor = (status: number) => {
    if (status >= 200 && status < 300) return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400";
    if (status >= 300 && status < 400) return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400";
    if (status >= 400 && status < 500) return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400";
    return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400";
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur-sm">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Link href="/">
                <Button variant="ghost" size="icon" data-testid="button-back">
                  <ArrowLeft className="h-4 w-4" />
                </Button>
              </Link>
              <div>
                <h1 className="text-xl font-bold" data-testid="text-page-title">API Playground</h1>
                <p className="text-sm text-muted-foreground">Test and explore API endpoints</p>
              </div>
            </div>
            <Badge variant="outline" className="gap-1.5" data-testid="badge-playground">
              <Zap className="h-3 w-3" />
              Interactive
            </Badge>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-6">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Request</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-2">
                  <Select value={method} onValueChange={setMethod} data-testid="select-method">
                    <SelectTrigger className="w-32" data-testid="select-method-trigger">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {METHODS.map((m) => (
                        <SelectItem key={m} value={m} data-testid={`select-method-${m.toLowerCase()}`}>
                          {m}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    placeholder="https://api.example.com/endpoint"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    className="flex-1"
                    data-testid="input-url"
                  />
                  <Button
                    onClick={handleExecute}
                    disabled={executeMutation.isPending || !(url || "").trim()}
                    data-testid="button-execute"
                  >
                    {executeMutation.isPending ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Play className="h-4 w-4 mr-2" />
                    )}
                    Send
                  </Button>
                </div>

                <Separator />

                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="text-sm font-medium">Headers</span>
                    <Button variant="ghost" size="sm" onClick={addHeader} data-testid="button-add-header">
                      <Plus className="h-3 w-3 mr-1" />
                      Add
                    </Button>
                  </div>
                  <div className="space-y-2">
                    {headers.map((header) => (
                      <div key={header.id} className="flex items-center gap-2" data-testid={`header-row-${header.id}`}>
                        <Input
                          placeholder="Key"
                          value={header.key}
                          onChange={(e) => updateHeader(header.id, "key", e.target.value)}
                          className="flex-1"
                          data-testid={`input-header-key-${header.id}`}
                        />
                        <Input
                          placeholder="Value"
                          value={header.value}
                          onChange={(e) => updateHeader(header.id, "value", e.target.value)}
                          className="flex-1"
                          data-testid={`input-header-value-${header.id}`}
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removeHeader(header.id)}
                          data-testid={`button-remove-header-${header.id}`}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>

                <Separator />

                <div>
                  <span className="text-sm font-medium mb-2 block">Body</span>
                  <Textarea
                    placeholder='{"key": "value"}'
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                    className="font-mono text-sm min-h-[120px]"
                    data-testid="input-body"
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Sample Requests</CardTitle>
              </CardHeader>
              <CardContent>
                {samplesLoading ? (
                  <div className="space-y-2">
                    <Skeleton className="h-8 w-full" />
                    <Skeleton className="h-8 w-full" />
                    <Skeleton className="h-8 w-3/4" />
                  </div>
                ) : samples && samples.length > 0 ? (
                  <div className="space-y-1.5">
                    {samples.map((sample, i) => (
                      <button
                        key={i}
                        className="w-full flex items-start gap-2 p-2 rounded-md text-left hover-elevate"
                        onClick={() => loadSample(sample)}
                        data-testid={`button-sample-${i}`}
                      >
                        <Badge variant="outline" className={`text-xs shrink-0 mt-0.5 ${methodColors[sample.method] || ""}`}>
                          {sample.method}
                        </Badge>
                        <div className="min-w-0">
                          <span className="text-sm font-medium block truncate">{sample.name}</span>
                          {sample.description && (
                            <span className="text-xs text-muted-foreground block truncate">{sample.description}</span>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground" data-testid="text-no-samples">No samples available</p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Available Endpoints</CardTitle>
              </CardHeader>
              <CardContent>
                {endpointsLoading ? (
                  <div className="space-y-2">
                    <Skeleton className="h-6 w-full" />
                    <Skeleton className="h-6 w-full" />
                    <Skeleton className="h-6 w-3/4" />
                  </div>
                ) : endpoints && endpoints.length > 0 ? (
                  <ScrollArea className="max-h-[300px]">
                    <div className="space-y-1">
                      {endpoints.map((ep, i) => (
                        <div
                          key={i}
                          className="flex items-center gap-2 py-1.5 px-2 rounded-md hover-elevate cursor-pointer"
                          onClick={() => {
                            setMethod(ep.method);
                            setUrl(ep.path);
                          }}
                          data-testid={`endpoint-item-${i}`}
                        >
                          <Badge variant="outline" className={`text-xs font-mono ${methodColors[ep.method] || ""}`}>
                            {ep.method}
                          </Badge>
                          <span className="font-mono text-sm truncate">{ep.path}</span>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                ) : (
                  <p className="text-sm text-muted-foreground" data-testid="text-no-endpoints">No endpoints available</p>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between gap-2">
                  <CardTitle className="text-base">Response</CardTitle>
                  {response && (
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className={statusColor(response.status)} data-testid="badge-status-code">
                        {response.status} {response.statusText}
                      </Badge>
                      <Badge variant="outline" className="gap-1" data-testid="badge-duration">
                        <Clock className="h-3 w-3" />
                        {response.duration}ms
                      </Badge>
                      <Button variant="ghost" size="icon" onClick={copyResponse} data-testid="button-copy-response">
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {executeMutation.isPending ? (
                  <div className="flex items-center justify-center py-12" data-testid="loading-response">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : response ? (
                  <div className="space-y-4">
                    <div>
                      <span className="text-sm font-medium mb-2 block">Response Headers</span>
                      <ScrollArea className="max-h-[200px]">
                        <div className="space-y-1">
                          {Object.entries(response.headers || {}).map(([key, value]) => (
                            <div key={key} className="flex items-start gap-2 text-sm" data-testid={`response-header-${key}`}>
                              <span className="font-mono text-muted-foreground min-w-0 break-all">{key}:</span>
                              <span className="font-mono break-all">{value}</span>
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                    </div>

                    <Separator />

                    <div>
                      <span className="text-sm font-medium mb-2 block">Response Body</span>
                      <ScrollArea className="max-h-[400px]">
                        <pre className="font-mono text-sm whitespace-pre-wrap break-all bg-muted/50 p-4 rounded-md" data-testid="text-response-body">
                          {formatJson(response.body)}
                        </pre>
                      </ScrollArea>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-16 text-muted-foreground" data-testid="text-no-response">
                    <FileJson className="h-12 w-12 mb-4 opacity-30" />
                    <p className="text-sm">Send a request to see the response</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
