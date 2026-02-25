import { useState, useRef, useEffect, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Sidebar,
  SidebarProvider,
  SidebarHeader,
  SidebarContent,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarTrigger,
  SidebarSeparator,
} from "@/components/ui/sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { usePageTitle } from "@/hooks/use-page-title";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useI18n } from "@/lib/i18n";
import { useTheme } from "@/lib/theme";
import { Link } from "wouter";
import {
  Bot,
  Send,
  ArrowLeft,
  Loader2,
  MessageSquare,
  Users,
  Link2,
  Swords,
  Handshake,
  Network,
  Zap,
  CheckCircle2,
  XCircle,
  Trash2,
  Plus,
  Settings2,
  Clock,
  Sparkles,
  Copy,
  Check,
  Download,
  Sun,
  Moon,
  Globe,
  FileJson,
  FileText,
} from "lucide-react";

type AgentId = "claude" | "gpt" | "gemini" | "perplexity" | "comet";
type ConversationMode = "chain" | "debate" | "consensus" | "sub-agent";

interface AgentInfo {
  id: AgentId;
  name: string;
  role: string;
  color: string;
  available: boolean;
  description: string;
}

interface AgentMessage {
  id: string;
  agentId: AgentId;
  agentName: string;
  content: string;
  timestamp: string;
  round: number;
  tokensUsed?: number;
  model?: string;
  error?: string;
}

interface A2ASession {
  id: string;
  topic: string;
  mode: ConversationMode;
  agents: AgentId[];
  messages: AgentMessage[];
  status: "running" | "completed" | "error";
  createdAt: string;
  completedAt?: string;
  summary?: string;
  totalTokens: number;
  rounds: number;
  maxRounds: number;
}

interface StreamEvent {
  type: "message" | "status" | "complete" | "error";
  data: any;
}

const AGENT_AVATAR_COLORS: Record<string, string> = {
  claude: "bg-amber-500",
  gpt: "bg-emerald-500",
  gemini: "bg-blue-500",
  perplexity: "bg-cyan-500",
  comet: "bg-red-500",
};

const AGENT_INITIALS: Record<string, string> = {
  claude: "CL",
  gpt: "GP",
  gemini: "GE",
  perplexity: "PX",
  comet: "CM",
};

const TOPIC_SUGGESTIONS = [
  { label: "REST vs GraphQL", topic: "Compare REST API vs GraphQL for modern web applications. Discuss pros, cons, and when to use each.", mode: "debate" as ConversationMode },
  { label: "AI in Software Dev", topic: "How will AI transform software development in the next 5 years? Discuss code generation, testing, and deployment.", mode: "debate" as ConversationMode },
  { label: "Microservices Best Practices", topic: "What are the best practices for building microservices architecture? Cover design patterns, communication, and monitoring.", mode: "chain" as ConversationMode },
  { label: "Security Hardening", topic: "What are the top 10 security practices every API should implement? Include authentication, rate limiting, and input validation.", mode: "consensus" as ConversationMode },
  { label: "Database Selection", topic: "PostgreSQL vs MongoDB vs Redis: when should you use each database? Compare performance, scalability, and use cases.", mode: "debate" as ConversationMode },
  { label: "Cloud Architecture", topic: "Design a scalable cloud architecture for a real-time application serving 1M users. Cover CDN, load balancing, and caching.", mode: "chain" as ConversationMode },
];

const AGENT_BUBBLE_COLORS: Record<string, string> = {
  claude: "bg-amber-500/8 dark:bg-amber-500/15",
  gpt: "bg-emerald-500/8 dark:bg-emerald-500/15",
  gemini: "bg-blue-500/8 dark:bg-blue-500/15",
  perplexity: "bg-cyan-500/8 dark:bg-cyan-500/15",
  comet: "bg-red-500/8 dark:bg-red-500/15",
};

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const { t } = useI18n();

  const handleCopy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={handleCopy}
      className="invisible group-hover/msg:visible"
      data-testid="button-copy-message"
    >
      {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
    </Button>
  );
}

function MarkdownContent({ content }: { content: string }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
        ul: ({ children }) => <ul className="list-disc pl-4 mb-2">{children}</ul>,
        ol: ({ children }) => <ol className="list-decimal pl-4 mb-2">{children}</ol>,
        li: ({ children }) => <li className="mb-0.5">{children}</li>,
        strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
        em: ({ children }) => <em className="italic">{children}</em>,
        code: ({ className, children, ...props }) => {
          const isBlock = className?.includes("language-");
          if (isBlock) {
            return (
              <pre className="bg-background/50 dark:bg-background/30 rounded-md p-3 my-2 overflow-x-auto text-xs">
                <code className={className} {...props}>{children}</code>
              </pre>
            );
          }
          return (
            <code className="bg-background/50 dark:bg-background/30 px-1 py-0.5 rounded text-xs" {...props}>
              {children}
            </code>
          );
        },
        h1: ({ children }) => <h1 className="text-base font-bold mb-2">{children}</h1>,
        h2: ({ children }) => <h2 className="text-sm font-bold mb-1.5">{children}</h2>,
        h3: ({ children }) => <h3 className="text-sm font-semibold mb-1">{children}</h3>,
        blockquote: ({ children }) => (
          <blockquote className="border-l-2 border-muted-foreground/30 pl-3 italic my-2">{children}</blockquote>
        ),
        table: ({ children }) => (
          <div className="overflow-x-auto my-2">
            <table className="min-w-full text-xs border-collapse">{children}</table>
          </div>
        ),
        th: ({ children }) => <th className="border border-border px-2 py-1 font-semibold bg-muted/50 text-left">{children}</th>,
        td: ({ children }) => <td className="border border-border px-2 py-1">{children}</td>,
      }}
    >
      {content}
    </ReactMarkdown>
  );
}

function exportSessionJSON(session: A2ASession) {
  const blob = new Blob([JSON.stringify(session, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `a2a-${session.id}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

function exportSessionMarkdown(session: A2ASession) {
  let md = `# A2A Conversation: ${session.topic}\n\n`;
  md += `**Mode:** ${session.mode} | **Agents:** ${session.agents.join(", ")} | **Rounds:** ${session.rounds}\n`;
  md += `**Status:** ${session.status} | **Tokens:** ${session.totalTokens.toLocaleString()}\n\n---\n\n`;

  const grouped = session.messages.reduce<Record<number, AgentMessage[]>>((acc, msg) => {
    if (!acc[msg.round]) acc[msg.round] = [];
    acc[msg.round].push(msg);
    return acc;
  }, {});

  for (const [round, msgs] of Object.entries(grouped)) {
    md += `## Round ${round}\n\n`;
    for (const msg of msgs) {
      md += `### ${msg.agentName}${msg.model ? ` (${msg.model})` : ""}\n\n`;
      md += msg.error ? `> Error: ${msg.error}\n\n` : `${msg.content}\n\n`;
    }
  }

  if (session.summary) {
    md += `## Final Summary\n\n${session.summary}\n`;
  }

  const blob = new Blob([md], { type: "text/markdown" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `a2a-${session.id}.md`;
  a.click();
  URL.revokeObjectURL(url);
}

function A2ASidebar({
  agents,
  selectedAgents,
  toggleAgent,
  mode,
  setMode,
  maxRounds,
  setMaxRounds,
  sessions,
  currentSession,
  openSession,
  startNewChat,
  deleteMutation,
  clearAllMutation,
}: {
  agents: AgentInfo[];
  selectedAgents: AgentId[];
  toggleAgent: (id: AgentId) => void;
  mode: ConversationMode;
  setMode: (m: ConversationMode) => void;
  maxRounds: number;
  setMaxRounds: (n: number) => void;
  sessions: A2ASession[];
  currentSession: A2ASession | null;
  openSession: (s: A2ASession) => void;
  startNewChat: () => void;
  deleteMutation: { mutate: (id: string) => void };
  clearAllMutation: { mutate: () => void; isPending: boolean };
}) {
  const { t } = useI18n();
  const modeKeys: Record<ConversationMode, string> = {
    chain: "a2a.chain",
    debate: "a2a.debate",
    consensus: "a2a.consensus",
    "sub-agent": "a2a.subAgent",
  };
  const MODE_ICONS: Record<ConversationMode, typeof Link2> = {
    chain: Link2,
    debate: Swords,
    consensus: Handshake,
    "sub-agent": Network,
  };

  return (
    <Sidebar>
      <SidebarHeader>
        <div className="flex items-center gap-2">
          <Link href="/">
            <Button variant="ghost" size="icon" data-testid="button-back-home">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <Bot className="h-4 w-4 text-sidebar-foreground/70" />
          <span className="text-sm font-semibold truncate">{t("nav.a2a")}</span>
        </div>
        <Button variant="outline" className="w-full justify-start" onClick={startNewChat} data-testid="button-new-chat">
          <Plus className="h-4 w-4 mr-2" />
          {t("common.newConversation")}
        </Button>
      </SidebarHeader>

      <SidebarSeparator />

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>
            <Settings2 className="h-3.5 w-3.5 mr-1.5" />
            {t("a2a.settings")}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <div className="space-y-3 px-1">
              <div>
                <label className="text-xs font-medium mb-1 block text-sidebar-foreground/70">{t("a2a.mode")}</label>
                <Select value={mode} onValueChange={(v) => setMode(v as ConversationMode)}>
                  <SelectTrigger data-testid="select-mode">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.keys(modeKeys) as ConversationMode[]).map((key) => {
                      const Icon = MODE_ICONS[key];
                      return (
                        <SelectItem key={key} value={key}>
                          <div className="flex items-center gap-2">
                            <Icon className="h-3 w-3" />
                            <span>{t(`${modeKeys[key]}.label`)}</span>
                          </div>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
                <p className="text-[11px] text-sidebar-foreground/50 mt-1">{t(`${modeKeys[mode]}.description`)}</p>
              </div>

              {mode === "debate" && (
                <div>
                  <label className="text-xs font-medium mb-1 block text-sidebar-foreground/70">{t("a2a.rounds")}</label>
                  <Select value={String(maxRounds)} onValueChange={(v) => setMaxRounds(Number(v))}>
                    <SelectTrigger data-testid="select-rounds">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="2">2 {t("a2a.roundsLabel")}</SelectItem>
                      <SelectItem value="3">3 {t("a2a.roundsLabel")}</SelectItem>
                      <SelectItem value="4">4 {t("a2a.roundsLabel")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div>
                <label className="text-xs font-medium mb-1 block text-sidebar-foreground/70">
                  {t("a2a.agents")} ({selectedAgents.length} {t("a2a.selected")})
                </label>
                <SidebarMenu>
                  {agents.map((agent) => {
                    const isSelected = selectedAgents.includes(agent.id);
                    return (
                      <SidebarMenuItem key={agent.id}>
                        <SidebarMenuButton
                          size="sm"
                          data-active={isSelected}
                          onClick={() => agent.available && toggleAgent(agent.id)}
                          disabled={!agent.available}
                          data-testid={`agent-toggle-${agent.id}`}
                        >
                          <Avatar className="h-5 w-5">
                            <AvatarFallback className={`${AGENT_AVATAR_COLORS[agent.id]} text-white text-[8px] font-bold`}>
                              {AGENT_INITIALS[agent.id]}
                            </AvatarFallback>
                          </Avatar>
                          <span className="truncate">{agent.name.split(" ")[0]}</span>
                          {isSelected && <CheckCircle2 className="h-3 w-3 ml-auto text-primary shrink-0" />}
                          {!agent.available && (
                            <span className="text-[10px] text-sidebar-foreground/40 ml-auto">{t("a2a.noKey")}</span>
                          )}
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  })}
                </SidebarMenu>
                {selectedAgents.length > 0 && selectedAgents.length < 2 && (
                  <p className="text-[10px] text-destructive mt-1 px-2">{t("a2a.selectAtLeast2")}</p>
                )}
              </div>
            </div>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarSeparator />

        <SidebarGroup className="flex-1">
          <SidebarGroupLabel className="flex items-center justify-between gap-1 pr-1">
            <span className="flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5" />
              {t("a2a.history")}
            </span>
            {sessions.length > 0 && (
              <Button
                variant="ghost"
                size="icon"
                disabled={clearAllMutation.isPending}
                onClick={() => clearAllMutation.mutate()}
                data-testid="button-clear-all-sessions"
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            )}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {sessions.length === 0 ? (
                <p className="text-xs text-sidebar-foreground/40 px-2 py-2">{t("a2a.noConversations")}</p>
              ) : (
                sessions.map((s) => {
                  const mKey = modeKeys[s.mode];
                  return (
                    <SidebarMenuItem key={s.id} className="group/row">
                      <SidebarMenuButton
                        size="sm"
                        data-active={currentSession?.id === s.id}
                        onClick={() => openSession(s)}
                        data-testid={`session-item-${s.id}`}
                      >
                        <MessageSquare className="h-3.5 w-3.5 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs truncate">{s.topic}</p>
                          <p className="text-[10px] text-sidebar-foreground/50">
                            {t(`${mKey}.label`)} · {s.messages.length} {t("a2a.msgs")}
                          </p>
                        </div>
                      </SidebarMenuButton>
                      <div className="absolute right-1 top-1/2 -translate-y-1/2 invisible group-hover/row:visible">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => { e.stopPropagation(); deleteMutation.mutate(s.id); }}
                          data-testid={`button-delete-session-${s.id}`}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </SidebarMenuItem>
                  );
                })
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}

export default function A2APage() {
  usePageTitle("A2A Multi-Agent Chat");
  const { toast } = useToast();
  const { t, toggleLanguage, language } = useI18n();
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [topic, setTopic] = useState("");
  const [mode, setMode] = useState<ConversationMode>("debate");
  const [selectedAgents, setSelectedAgents] = useState<AgentId[]>([]);
  const [maxRounds, setMaxRounds] = useState(2);
  const [currentSession, setCurrentSession] = useState<A2ASession | null>(null);
  const [showNewChat, setShowNewChat] = useState(true);
  const [streamingMessages, setStreamingMessages] = useState<AgentMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [thinkingAgent, setThinkingAgent] = useState<string | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  const { data: agents = [] } = useQuery<AgentInfo[]>({
    queryKey: ["/api/a2a/agents"],
  });

  const { data: sessions = [] } = useQuery<A2ASession[]>({
    queryKey: ["/api/a2a/sessions"],
  });

  useEffect(() => {
    if (agents.length > 0 && selectedAgents.length === 0) {
      const available = agents.filter((a) => a.available).map((a) => a.id);
      if (available.length >= 2) {
        setSelectedAgents(available.slice(0, 3));
      } else if (available.length > 0) {
        setSelectedAgents(available);
      }
    }
  }, [agents]);

  const startStream = useCallback(async () => {
    if (!topic.trim() || selectedAgents.length < 2 || isStreaming) return;

    setIsStreaming(true);
    setStreamingMessages([]);
    setShowNewChat(false);
    setCurrentSession(null);
    setThinkingAgent(null);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const response = await fetch("/api/a2a/chat/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic: topic.trim(), mode, agents: selectedAgents, maxRounds }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || "Stream failed");
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error("No reader");

      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const data = line.slice(6).trim();
          if (data === "[DONE]") break;

          try {
            const event: StreamEvent = JSON.parse(data);

            if (event.type === "message") {
              setStreamingMessages((prev) => [...prev, event.data]);
              setThinkingAgent(null);
            } else if (event.type === "status") {
              setThinkingAgent(event.data.agentId);
            } else if (event.type === "complete") {
              setCurrentSession(event.data);
              setStreamingMessages([]);
              setThinkingAgent(null);
              queryClient.invalidateQueries({ queryKey: ["/api/a2a/sessions"] });
              toast({
                title: t("a2a.conversationCompleted"),
                description: `${event.data.messages.length} ${t("a2a.messagesAcross")} ${event.data.rounds} ${t("a2a.roundsLabel")}`,
              });
            } else if (event.type === "error") {
              toast({ title: t("common.error"), description: event.data.message, variant: "destructive" });
            }
          } catch {}
        }
      }
    } catch (err: any) {
      if (err.name !== "AbortError") {
        toast({ title: t("common.error"), description: err.message, variant: "destructive" });
      }
    } finally {
      setIsStreaming(false);
      setThinkingAgent(null);
      abortRef.current = null;
      setTopic("");
    }
  }, [topic, mode, selectedAgents, maxRounds, isStreaming, toast, t]);

  useEffect(() => {
    return () => {
      if (abortRef.current) {
        abortRef.current.abort();
      }
    };
  }, []);

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/a2a/sessions/${id}`);
    },
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ["/api/a2a/sessions"] });
      if (currentSession?.id === id) {
        setCurrentSession(null);
        setShowNewChat(true);
      }
      toast({ title: t("a2a.sessionDeleted") });
    },
  });

  const clearAllMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("DELETE", "/api/a2a/sessions");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/a2a/sessions"] });
      setCurrentSession(null);
      setShowNewChat(true);
      setStreamingMessages([]);
      toast({ title: t("a2a.allCleared") });
    },
  });

  const toggleAgent = (agentId: AgentId) => {
    setSelectedAgents((prev) =>
      prev.includes(agentId) ? prev.filter((id) => id !== agentId) : [...prev, agentId]
    );
  };

  const canStart = topic.trim().length > 0 && selectedAgents.length >= 2 && !isStreaming;

  const handleSubmit = () => {
    if (canStart) startStream();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const openSession = (session: A2ASession) => {
    setCurrentSession(session);
    setShowNewChat(false);
    setStreamingMessages([]);
  };

  const startNewChat = () => {
    if (isStreaming && abortRef.current) {
      abortRef.current.abort();
    }
    setCurrentSession(null);
    setShowNewChat(true);
    setStreamingMessages([]);
    setThinkingAgent(null);
  };

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [currentSession, streamingMessages, thinkingAgent]);

  const displayMessages = currentSession ? currentSession.messages : streamingMessages;
  const groupedMessages = displayMessages.reduce<Record<number, AgentMessage[]>>((acc, msg) => {
    if (!acc[msg.round]) acc[msg.round] = [];
    acc[msg.round].push(msg);
    return acc;
  }, {});

  const modeKeys: Record<ConversationMode, string> = {
    chain: "a2a.chain",
    debate: "a2a.debate",
    consensus: "a2a.consensus",
    "sub-agent": "a2a.subAgent",
  };
  const MODE_ICONS: Record<ConversationMode, typeof Link2> = {
    chain: Link2,
    debate: Swords,
    consensus: Handshake,
    "sub-agent": Network,
  };

  const sidebarStyle = {
    "--sidebar-width": "18rem",
    "--sidebar-width-icon": "3rem",
  } as React.CSSProperties;

  const activeSession = currentSession;
  const activeModeKey = activeSession ? modeKeys[activeSession.mode] : modeKeys[mode];

  return (
    <SidebarProvider style={sidebarStyle}>
      <div className="flex h-screen w-full">
        <A2ASidebar
          agents={agents}
          selectedAgents={selectedAgents}
          toggleAgent={toggleAgent}
          mode={mode}
          setMode={setMode}
          maxRounds={maxRounds}
          setMaxRounds={setMaxRounds}
          sessions={sessions}
          currentSession={currentSession}
          openSession={openSession}
          startNewChat={startNewChat}
          deleteMutation={deleteMutation}
          clearAllMutation={clearAllMutation}
        />

        <div className="flex-1 flex flex-col min-w-0">
          <div className="flex items-center gap-2 justify-between p-2 border-b sticky top-0 z-50 bg-background">
            <div className="flex items-center gap-2">
              <SidebarTrigger data-testid="button-toggle-sidebar" />
              <Bot className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium truncate" data-testid="text-chat-title">
                {activeSession ? activeSession.topic : t("a2a.title")}
              </span>
            </div>
            <div className="flex items-center gap-1.5 flex-wrap">
              {activeSession && (
                <>
                  <Badge variant="outline" className="text-xs">
                    {t(`${modeKeys[activeSession.mode]}.label`)}
                  </Badge>
                  <Badge variant={activeSession.status === "completed" ? "secondary" : "destructive"} className="text-xs">
                    {activeSession.status === "completed" ? t("common.completed") : activeSession.status}
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    <Zap className="h-2.5 w-2.5 mr-1" />
                    {activeSession.totalTokens.toLocaleString()}
                  </Badge>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" data-testid="button-export">
                        <Download className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => exportSessionJSON(activeSession)} data-testid="button-export-json">
                        <FileJson className="h-4 w-4 mr-2" />
                        {t("a2a.exportJSON")}
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => exportSessionMarkdown(activeSession)} data-testid="button-export-md">
                        <FileText className="h-4 w-4 mr-2" />
                        {t("a2a.exportMarkdown")}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </>
              )}
              <Button variant="ghost" size="icon" onClick={toggleLanguage} data-testid="button-language-toggle">
                <Globe className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
                data-testid="button-theme-toggle"
              >
                {resolvedTheme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </Button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {(isStreaming && displayMessages.length === 0 && !thinkingAgent) ? (
              <div className="flex flex-col items-center justify-center h-full gap-4">
                <div className="relative">
                  <Loader2 className="h-12 w-12 animate-spin text-primary/30" />
                  <Bot className="h-6 w-6 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-primary" />
                </div>
                <div className="text-center">
                  <p className="font-medium">{t("a2a.agentsDiscussing")}</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {selectedAgents.length} {t("a2a.agents")} · {t(`${modeKeys[mode]}.label`)}
                  </p>
                </div>
              </div>
            ) : displayMessages.length > 0 ? (
              <div className="max-w-3xl mx-auto px-4 py-6 space-y-1">
                {activeSession && (
                  <div className="flex items-center justify-center mb-6">
                    <div className="text-center">
                      <div className="flex items-center justify-center gap-2 mb-2">
                        <Users className="h-4 w-4 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground font-medium">
                          {activeSession.agents.length} {t("a2a.agents")} · {t(`${modeKeys[activeSession.mode]}.label`)} · {activeSession.rounds} {t("a2a.roundsLabel")}
                        </span>
                      </div>
                      <div className="flex items-center justify-center gap-2">
                        {activeSession.agents.map((id) => (
                          <Avatar key={id} className="h-6 w-6">
                            <AvatarFallback className={`${AGENT_AVATAR_COLORS[id]} text-white text-[9px] font-bold`}>
                              {AGENT_INITIALS[id]}
                            </AvatarFallback>
                          </Avatar>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {Object.entries(groupedMessages).map(([round, messages]) => (
                  <div key={round}>
                    <div className="flex items-center gap-3 my-5">
                      <div className="flex-1 h-px bg-border" />
                      <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">
                        {t("a2a.round")} {round}
                      </span>
                      <div className="flex-1 h-px bg-border" />
                    </div>

                    <div className="space-y-4">
                      {messages.map((msg) => (
                        <div key={msg.id} className="flex gap-3 items-start group/msg" data-testid={`message-${msg.id}`}>
                          <Avatar className="h-8 w-8 mt-0.5 shrink-0">
                            <AvatarFallback className={`${AGENT_AVATAR_COLORS[msg.agentId] || "bg-muted"} text-white text-[10px] font-bold`}>
                              {AGENT_INITIALS[msg.agentId] || "??"}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              <span className="text-sm font-semibold">{msg.agentName}</span>
                              <span className="text-xs text-muted-foreground">
                                {agents.find((a) => a.id === msg.agentId)?.role}
                              </span>
                              {msg.model && (
                                <span className="text-[10px] text-muted-foreground">· {msg.model}</span>
                              )}
                              {msg.tokensUsed != null && msg.tokensUsed > 0 && (
                                <Badge variant="outline" className="text-[10px]">
                                  <Zap className="h-2 w-2 mr-0.5" />{msg.tokensUsed.toLocaleString()}
                                </Badge>
                              )}
                              <CopyButton text={msg.content || msg.error || ""} />
                            </div>
                            {msg.error ? (
                              <div className={`rounded-md p-3 ${AGENT_BUBBLE_COLORS[msg.agentId] || "bg-muted"}`}>
                                <div className="flex items-center gap-2 text-destructive text-sm">
                                  <XCircle className="h-4 w-4 shrink-0" />
                                  <span>{msg.error}</span>
                                </div>
                              </div>
                            ) : (
                              <div className={`rounded-md p-3 ${AGENT_BUBBLE_COLORS[msg.agentId] || "bg-muted"}`}>
                                <div className="text-sm leading-relaxed prose-sm">
                                  <MarkdownContent content={msg.content} />
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}

                {thinkingAgent && (
                  <div className="flex gap-3 items-start mt-4">
                    <Avatar className="h-8 w-8 mt-0.5 shrink-0">
                      <AvatarFallback className={`${AGENT_AVATAR_COLORS[thinkingAgent] || "bg-muted"} text-white text-[10px] font-bold animate-pulse`}>
                        {AGENT_INITIALS[thinkingAgent] || "??"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-semibold">
                          {agents.find((a) => a.id === thinkingAgent)?.name || thinkingAgent}
                        </span>
                        <span className="text-xs text-muted-foreground animate-pulse">{t("a2a.thinking")}</span>
                      </div>
                      <div className={`rounded-md p-3 ${AGENT_BUBBLE_COLORS[thinkingAgent] || "bg-muted"}`}>
                        <div className="flex gap-1.5">
                          <div className="w-2 h-2 rounded-full bg-foreground/20 animate-bounce" style={{ animationDelay: "0ms" }} />
                          <div className="w-2 h-2 rounded-full bg-foreground/20 animate-bounce" style={{ animationDelay: "150ms" }} />
                          <div className="w-2 h-2 rounded-full bg-foreground/20 animate-bounce" style={{ animationDelay: "300ms" }} />
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {activeSession?.summary && (
                  <div className="mt-6">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="flex-1 h-px bg-border" />
                      <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider flex items-center gap-1.5">
                        <Sparkles className="h-3 w-3" />
                        {t("a2a.finalSummary")}
                      </span>
                      <div className="flex-1 h-px bg-border" />
                    </div>
                    <div className="flex gap-3 items-start group/msg">
                      <Avatar className="h-8 w-8 mt-0.5 shrink-0">
                        <AvatarFallback className="bg-primary text-primary-foreground text-[10px] font-bold">
                          AI
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-semibold">{t("a2a.consensusSummary")}</span>
                          <CopyButton text={activeSession.summary} />
                        </div>
                        <div className="rounded-md p-3 bg-primary/5 dark:bg-primary/10">
                          <div className="text-sm leading-relaxed prose-sm">
                            <MarkdownContent content={activeSession.summary} />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                <div ref={chatEndRef} />
              </div>
            ) : showNewChat ? (
              <div className="flex flex-col items-center justify-center h-full gap-6 px-4">
                <div className="p-5 rounded-full bg-muted/50">
                  <Bot className="h-10 w-10 text-muted-foreground" />
                </div>
                <div className="text-center max-w-md">
                  <h2 className="text-xl font-semibold mb-2">{t("a2a.multiAgentChat")}</h2>
                  <p className="text-sm text-muted-foreground">{t("a2a.subtitle")}</p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-sm w-full">
                  {(Object.keys(modeKeys) as ConversationMode[]).map((key) => {
                    const Icon = MODE_ICONS[key];
                    return (
                      <button
                        key={key}
                        className={`flex items-start gap-2 p-3 rounded-md text-left ${
                          mode === key ? "bg-accent" : ""
                        } hover-elevate`}
                        onClick={() => setMode(key)}
                        data-testid={`mode-card-${key}`}
                      >
                        <Icon className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                        <div>
                          <p className="text-sm font-medium">{t(`${modeKeys[key]}.label`)}</p>
                          <p className="text-xs text-muted-foreground">{t(`${modeKeys[key]}.description`)}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>

                <div className="w-full max-w-md space-y-2">
                  <span className="text-xs font-medium text-muted-foreground block text-center">{t("a2a.trySuggestion")}</span>
                  <div className="flex flex-wrap gap-2 justify-center">
                    {TOPIC_SUGGESTIONS.map((suggestion, i) => (
                      <Button
                        key={i}
                        variant="outline"
                        size="sm"
                        className="text-xs"
                        onClick={() => {
                          setTopic(suggestion.topic);
                          setMode(suggestion.mode);
                        }}
                        data-testid={`button-suggestion-${i}`}
                      >
                        <Sparkles className="h-3 w-3 mr-1.5" />
                        {suggestion.label}
                      </Button>
                    ))}
                  </div>
                </div>
                {selectedAgents.length > 0 && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">
                      {selectedAgents.length} {t("a2a.agents")} {t("a2a.selected")}:
                    </span>
                    <div className="flex -space-x-1">
                      {selectedAgents.map((id) => (
                        <Avatar key={id} className="h-6 w-6 border-2 border-background">
                          <AvatarFallback className={`${AGENT_AVATAR_COLORS[id]} text-white text-[8px] font-bold`}>
                            {AGENT_INITIALS[id]}
                          </AvatarFallback>
                        </Avatar>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : null}
          </div>

          {(showNewChat || (!currentSession && !isStreaming)) && (
            <div className="border-t p-3 bg-background">
              <div className="max-w-3xl mx-auto flex gap-2 items-end">
                <div className="flex-1">
                  <Textarea
                    placeholder={
                      selectedAgents.length < 2 ? t("a2a.selectAgentsFirst") : t("a2a.enterTopic")
                    }
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    onKeyDown={handleKeyDown}
                    disabled={isStreaming}
                    className="min-h-[44px] max-h-[120px] resize-none text-sm"
                    rows={1}
                    data-testid="input-topic"
                  />
                </div>
                <Button
                  size="icon"
                  disabled={!canStart}
                  onClick={handleSubmit}
                  data-testid="button-start-chat"
                >
                  {isStreaming ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
              </div>
              <div className="max-w-3xl mx-auto mt-1.5 flex items-center gap-2 flex-wrap">
                <span className="text-[10px] text-muted-foreground">
                  {t(`${modeKeys[mode]}.label`)}
                </span>
                {mode === "debate" && (
                  <>
                    <span className="text-[10px] text-muted-foreground">·</span>
                    <span className="text-[10px] text-muted-foreground">{maxRounds} {t("a2a.roundsLabel")}</span>
                  </>
                )}
                {selectedAgents.length > 0 && (
                  <>
                    <span className="text-[10px] text-muted-foreground">·</span>
                    <span className="text-[10px] text-muted-foreground">{selectedAgents.length} {t("a2a.agents")}</span>
                  </>
                )}
                <span className="text-[10px] text-muted-foreground">· {t("a2a.enterToSend")}</span>
              </div>
            </div>
          )}

          {currentSession && !isStreaming && (
            <div className="border-t p-3 bg-background">
              <div className="max-w-3xl mx-auto flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  <span data-testid="text-session-stats">
                    {t("common.completed")} · {currentSession.messages.length} {t("a2a.messages")} · {currentSession.totalTokens.toLocaleString()} {t("a2a.tokens")}
                  </span>
                </div>
                <Button variant="outline" size="sm" onClick={startNewChat} data-testid="button-new-conversation">
                  <Plus className="h-3.5 w-3.5 mr-1.5" />
                  {t("common.newConversation")}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </SidebarProvider>
  );
}
