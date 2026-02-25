import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Code2,
  Copy,
  Download,
  RefreshCw,
  CheckCircle2,
  FileCode,
} from "lucide-react";

interface SDKLanguage {
  id: string;
  name: string;
  description: string;
}

interface SDKLanguagesResponse {
  languages: SDKLanguage[];
}

interface SDKGenerateResponse {
  language: string;
  code: string;
  generatedAt: string;
}

const LANGUAGE_EXTENSIONS: Record<string, string> = {
  javascript: ".js",
  python: ".py",
  curl: ".sh",
  bash: ".sh",
  typescript: ".ts",
  ruby: ".rb",
  go: ".go",
  java: ".java",
  csharp: ".cs",
  php: ".php",
};

export default function SDKGenerator() {
  const { toast } = useToast();
  const [selectedLanguage, setSelectedLanguage] = useState("");
  const [generatedSDK, setGeneratedSDK] = useState<SDKGenerateResponse | null>(null);
  const [copied, setCopied] = useState(false);

  const { data: languagesData, isLoading: languagesLoading } = useQuery<SDKLanguagesResponse>({
    queryKey: ["/api/sdk/languages"],
  });

  const generateMutation = useMutation({
    mutationFn: async (language: string) => {
      const res = await apiRequest("POST", "/api/sdk/generate", { language });
      return res.json();
    },
    onSuccess: (data: SDKGenerateResponse) => {
      setGeneratedSDK(data);
      queryClient.invalidateQueries({ queryKey: ["/api/sdk/languages"] });
      toast({
        title: "SDK Generated",
        description: `Client SDK for ${data.language} has been generated.`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Generation Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleCopy = async () => {
    if (!generatedSDK?.code) return;
    try {
      await navigator.clipboard.writeText(generatedSDK.code);
      setCopied(true);
      toast({ title: "Copied", description: "Code copied to clipboard." });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({ title: "Copy Failed", description: "Unable to copy to clipboard.", variant: "destructive" });
    }
  };

  const handleDownload = () => {
    if (!generatedSDK?.code || !generatedSDK?.language) return;
    const ext = LANGUAGE_EXTENSIONS[generatedSDK.language.toLowerCase()] || ".txt";
    const filename = `api-client${ext}`;
    const blob = new Blob([generatedSDK.code], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast({ title: "Downloaded", description: `Saved as ${filename}` });
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const languages = languagesData?.languages || [];

  return (
    <Card className="hover-elevate" data-testid="card-sdk-generator">
      <CardHeader>
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <CardTitle className="flex items-center gap-2" data-testid="title-sdk-generator">
              <Code2 className="h-5 w-5 text-primary" />
              SDK Generator
            </CardTitle>
            <CardDescription className="mt-1" data-testid="description-sdk-generator">
              Generate client SDKs for your API in multiple languages
            </CardDescription>
          </div>
          {generatedSDK && (
            <Badge variant="outline" data-testid="badge-generated-language">
              {generatedSDK.language}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {languagesLoading ? (
          <div className="flex items-center justify-center py-8" data-testid="loading-languages">
            <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-end gap-3 flex-wrap">
              <div className="flex-1 min-w-[200px] space-y-1">
                <label className="text-xs text-muted-foreground" data-testid="label-language-select">
                  Language
                </label>
                <Select value={selectedLanguage} onValueChange={setSelectedLanguage}>
                  <SelectTrigger data-testid="select-language-trigger">
                    <SelectValue placeholder="Select a language" />
                  </SelectTrigger>
                  <SelectContent>
                    {languages.map((lang) => (
                      <SelectItem
                        key={lang.id}
                        value={lang.id}
                        data-testid={`select-language-option-${lang.id}`}
                      >
                        {lang.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button
                onClick={() => generateMutation.mutate(selectedLanguage)}
                disabled={!selectedLanguage || generateMutation.isPending}
                size="sm"
                data-testid="button-generate-sdk"
              >
                {generateMutation.isPending ? (
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <FileCode className="h-4 w-4 mr-2" />
                )}
                Generate SDK
              </Button>
            </div>

            {languages.length > 0 && !generatedSDK && (
              <div className="flex flex-wrap gap-2" data-testid="list-language-descriptions">
                {languages.map((lang) => (
                  <Badge
                    key={lang.id}
                    variant="secondary"
                    className="text-xs"
                    data-testid={`badge-language-${lang.id}`}
                  >
                    {lang.name}
                  </Badge>
                ))}
              </div>
            )}

            {generatedSDK && (
              <div className="space-y-3" data-testid="section-generated-code">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <p className="text-sm text-muted-foreground" data-testid="text-generated-at">
                    Generated: {formatDate(generatedSDK.generatedAt)}
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleCopy}
                      data-testid="button-copy-code"
                    >
                      {copied ? (
                        <CheckCircle2 className="h-4 w-4 mr-2" />
                      ) : (
                        <Copy className="h-4 w-4 mr-2" />
                      )}
                      {copied ? "Copied" : "Copy"}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleDownload}
                      data-testid="button-download-sdk"
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Download
                    </Button>
                  </div>
                </div>
                <div className="rounded-md border bg-muted/30 dark:bg-muted/20">
                  <pre className="p-4 overflow-x-auto text-sm" data-testid="code-block-sdk">
                    <code className="font-mono whitespace-pre" data-testid="text-sdk-code">
                      {generatedSDK.code}
                    </code>
                  </pre>
                </div>
              </div>
            )}

            {!generatedSDK && languages.length === 0 && (
              <div className="text-center py-6 text-muted-foreground" data-testid="empty-state-languages">
                <Code2 className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No languages available</p>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
