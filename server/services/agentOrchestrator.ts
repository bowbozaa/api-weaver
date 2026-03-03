import { callClaude, callGPT, callGemini, callPerplexity } from "./aiProviders";

export type AgentId = "claude" | "gpt" | "gemini" | "perplexity" | "comet";
export type ConversationMode = "chain" | "debate" | "consensus" | "sub-agent";

export interface AgentInfo {
  id: AgentId;
  name: string;
  role: string;
  color: string;
  available: boolean;
  description: string;
}

export interface AgentMessage {
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

export interface A2ASession {
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

interface A2AChatRequest {
  topic: string;
  mode: ConversationMode;
  agents: AgentId[];
  maxRounds?: number;
  maxTokensPerAgent?: number;
}

const AGENT_DEFINITIONS: Record<AgentId, Omit<AgentInfo, "available">> = {
  claude: {
    id: "claude",
    name: "Claude (Anthropic)",
    role: "Analytical Thinker",
    color: "#D97706",
    description: "Excels at nuanced analysis, careful reasoning, and detailed explanations",
  },
  gpt: {
    id: "gpt",
    name: "GPT (OpenAI)",
    role: "Creative Synthesizer",
    color: "#10A37F",
    description: "Strong at creative solutions, broad knowledge synthesis, and structured responses",
  },
  gemini: {
    id: "gemini",
    name: "Gemini (Google)",
    role: "Research Specialist",
    color: "#4285F4",
    description: "Specializes in research-backed answers, multimodal understanding, and factual precision",
  },
  perplexity: {
    id: "perplexity",
    name: "Perplexity AI",
    role: "Web-Connected Researcher",
    color: "#22B8CF",
    description: "Provides real-time web search results with cited sources and current information",
  },
  comet: {
    id: "comet",
    name: "Comet ML",
    role: "ML Experiment Tracker",
    color: "#FF6B6B",
    description: "Tracks ML experiments, metrics, and model performance data",
  },
};

const sessions = new Map<string, A2ASession>();

function generateId(): string {
  return `a2a_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function getAgentAvailability(): Record<AgentId, boolean> {
  return {
    claude: !!process.env.ANTHROPIC_API_KEY,
    gpt: !!process.env.OPENAI_API_KEY,
    gemini: !!process.env.GOOGLE_AI_API_KEY,
    perplexity: !!process.env.PERPLEXITY_API_KEY,
    comet: !!process.env.COMET_API_KEY,
  };
}

export function getAvailableAgents(): AgentInfo[] {
  const availability = getAgentAvailability();
  return Object.values(AGENT_DEFINITIONS).map((agent) => ({
    ...agent,
    available: availability[agent.id],
  }));
}

async function callAgent(
  agentId: AgentId,
  prompt: string,
  maxTokens: number
): Promise<{ response: string; tokensUsed?: number; model?: string }> {
  switch (agentId) {
    case "claude":
      return callClaude({ prompt, maxTokens });
    case "gpt":
      return callGPT({ prompt, maxTokens });
    case "gemini":
      return callGemini({ prompt, maxTokens });
    case "perplexity":
      return callPerplexity({ prompt, maxTokens });
    case "comet":
      return {
        response: `[Comet ML] I'm a specialized ML experiment tracker. I can help with tracking experiments, comparing model metrics, and logging ML artifacts. For the topic "${prompt.slice(0, 100)}...", I'd recommend setting up proper experiment tracking with metrics logging.`,
        model: "comet-ml-v2",
      };
    default:
      throw new Error(`Unknown agent: ${agentId}`);
  }
}

function buildChainPrompt(
  topic: string,
  agentId: AgentId,
  prevMessages: AgentMessage[],
  round: number
): string {
  const agentDef = AGENT_DEFINITIONS[agentId];
  let prompt = `You are ${agentDef.name}, acting as the "${agentDef.role}" in a multi-AI agent collaboration.\n\n`;
  prompt += `Topic: "${topic}"\n\n`;

  if (prevMessages.length > 0) {
    prompt += `Previous agents have shared their perspectives:\n\n`;
    for (const msg of prevMessages) {
      const def = AGENT_DEFINITIONS[msg.agentId];
      prompt += `--- ${def.name} (${def.role}) ---\n${msg.content}\n\n`;
    }
    prompt += `Build upon their insights. Add your unique perspective as ${agentDef.role}. Don't repeat what others said - extend, challenge, or synthesize their ideas.\n`;
  } else {
    prompt += `You are the first to respond. Share your initial analysis and perspective on this topic.\n`;
  }

  prompt += `\nKeep your response focused and concise (2-3 paragraphs). Round ${round}.`;
  return prompt;
}

function buildDebatePrompt(
  topic: string,
  agentId: AgentId,
  allMessages: AgentMessage[],
  round: number,
  maxRounds: number
): string {
  const agentDef = AGENT_DEFINITIONS[agentId];
  let prompt = `You are ${agentDef.name}, participating in a structured AI debate as the "${agentDef.role}".\n\n`;
  prompt += `Debate topic: "${topic}"\n`;
  prompt += `This is round ${round} of ${maxRounds}.\n\n`;

  const prevRoundMessages = allMessages.filter((m) => m.round < round);
  if (prevRoundMessages.length > 0) {
    prompt += `Previous arguments:\n\n`;
    for (const msg of prevRoundMessages) {
      const def = AGENT_DEFINITIONS[msg.agentId];
      prompt += `--- ${def.name} (Round ${msg.round}) ---\n${msg.content}\n\n`;
    }
    prompt += `Respond to the arguments above. You may agree, disagree, or present a new angle. Be constructive but critical.\n`;
  } else {
    prompt += `Present your opening argument on this topic.\n`;
  }

  if (round === maxRounds) {
    prompt += `\nThis is the FINAL round. Provide your concluding thoughts and summarize the key takeaways from this debate.\n`;
  }

  prompt += `\nKeep your response focused (2-3 paragraphs).`;
  return prompt;
}

function buildConsensusPrompt(
  topic: string,
  agentId: AgentId,
  allMessages: AgentMessage[],
  round: number,
  isConsensusRound: boolean
): string {
  const agentDef = AGENT_DEFINITIONS[agentId];
  let prompt = `You are ${agentDef.name}, working as the "${agentDef.role}" in a consensus-building exercise.\n\n`;
  prompt += `Topic: "${topic}"\n\n`;

  if (isConsensusRound) {
    prompt += `All agents have shared their perspectives:\n\n`;
    for (const msg of allMessages) {
      const def = AGENT_DEFINITIONS[msg.agentId];
      prompt += `--- ${def.name} ---\n${msg.content}\n\n`;
    }
    prompt += `Synthesize ALL perspectives above into a unified consensus. Identify:\n`;
    prompt += `1. Points of agreement\n2. Key differences\n3. A balanced conclusion that integrates the strongest ideas\n`;
    prompt += `\nKeep it concise (3-4 paragraphs).`;
  } else {
    prompt += `Share your independent perspective on this topic. Do NOT consider other agents' views - give your own honest analysis.\n`;
    prompt += `\nKeep your response focused (2-3 paragraphs). Round ${round}.`;
  }

  return prompt;
}

function buildSubAgentPrompt(
  topic: string,
  agentId: AgentId,
  allMessages: AgentMessage[],
  round: number,
  leadAgent: AgentId,
  isLead: boolean,
  subTasks?: string[]
): string {
  const agentDef = AGENT_DEFINITIONS[agentId];

  if (isLead && round === 1) {
    return `You are ${agentDef.name}, acting as the LEAD COORDINATOR in a multi-agent team.\n\n` +
      `Topic: "${topic}"\n\n` +
      `Your team includes:\n${Object.values(AGENT_DEFINITIONS).filter(a => a.id !== agentId).map(a => `- ${a.name}: ${a.role}`).join("\n")}\n\n` +
      `Break this topic into 3-4 specific sub-tasks. Assign each sub-task to the most appropriate team member based on their role.\n` +
      `Format your response as:\n` +
      `TASK 1: [description] → Assign to: [agent name]\n` +
      `TASK 2: [description] → Assign to: [agent name]\n` +
      `...\n\nThen provide a brief overview of your coordination strategy.`;
  }

  if (!isLead) {
    const leadMessages = allMessages.filter((m) => m.agentId === leadAgent);
    const lastLeadMessage = leadMessages[leadMessages.length - 1];
    return `You are ${agentDef.name}, acting as "${agentDef.role}" in a team led by ${AGENT_DEFINITIONS[leadAgent].name}.\n\n` +
      `Main topic: "${topic}"\n\n` +
      `The lead coordinator assigned you the following context:\n${lastLeadMessage?.content || "Work on your area of expertise for this topic."}\n\n` +
      `Focus specifically on your role as ${agentDef.role}. Provide your specialized contribution.\n` +
      `\nKeep your response focused (2-3 paragraphs).`;
  }

  const subResponses = allMessages.filter((m) => m.agentId !== leadAgent && m.round === round - 1);
  return `You are ${agentDef.name}, the LEAD COORDINATOR reviewing your team's work.\n\n` +
    `Topic: "${topic}"\n\n` +
    `Your team's contributions:\n\n` +
    `${subResponses.map(m => `--- ${AGENT_DEFINITIONS[m.agentId].name} ---\n${m.content}`).join("\n\n")}\n\n` +
    `Synthesize all contributions into a comprehensive final response. Highlight the best insights from each team member.\n` +
    `\nKeep your response concise (3-4 paragraphs).`;
}

async function runChainMode(session: A2ASession, maxTokens: number): Promise<void> {
  for (let round = 1; round <= session.maxRounds; round++) {
    for (const agentId of session.agents) {
      const prompt = buildChainPrompt(session.topic, agentId, session.messages, round);
      const msgId = generateId();

      try {
        const result = await callAgent(agentId, prompt, maxTokens);
        session.messages.push({
          id: msgId,
          agentId,
          agentName: AGENT_DEFINITIONS[agentId].name,
          content: result.response,
          timestamp: new Date().toISOString(),
          round,
          tokensUsed: result.tokensUsed,
          model: result.model,
        });
        session.totalTokens += result.tokensUsed || 0;
      } catch (error: any) {
        session.messages.push({
          id: msgId,
          agentId,
          agentName: AGENT_DEFINITIONS[agentId].name,
          content: "",
          timestamp: new Date().toISOString(),
          round,
          error: error.message,
        });
      }
    }
    session.rounds = round;
  }
}

async function runDebateMode(session: A2ASession, maxTokens: number): Promise<void> {
  for (let round = 1; round <= session.maxRounds; round++) {
    for (const agentId of session.agents) {
      const prompt = buildDebatePrompt(session.topic, agentId, session.messages, round, session.maxRounds);
      const msgId = generateId();

      try {
        const result = await callAgent(agentId, prompt, maxTokens);
        session.messages.push({
          id: msgId,
          agentId,
          agentName: AGENT_DEFINITIONS[agentId].name,
          content: result.response,
          timestamp: new Date().toISOString(),
          round,
          tokensUsed: result.tokensUsed,
          model: result.model,
        });
        session.totalTokens += result.tokensUsed || 0;
      } catch (error: any) {
        session.messages.push({
          id: msgId,
          agentId,
          agentName: AGENT_DEFINITIONS[agentId].name,
          content: "",
          timestamp: new Date().toISOString(),
          round,
          error: error.message,
        });
      }
    }
    session.rounds = round;
  }
}

async function runConsensusMode(session: A2ASession, maxTokens: number): Promise<void> {
  const independentPromises = session.agents.map(async (agentId) => {
    const prompt = buildConsensusPrompt(session.topic, agentId, [], 1, false);
    const msgId = generateId();
    try {
      const result = await callAgent(agentId, prompt, maxTokens);
      return {
        id: msgId,
        agentId,
        agentName: AGENT_DEFINITIONS[agentId].name,
        content: result.response,
        timestamp: new Date().toISOString(),
        round: 1,
        tokensUsed: result.tokensUsed,
        model: result.model,
      } as AgentMessage;
    } catch (error: any) {
      return {
        id: msgId,
        agentId,
        agentName: AGENT_DEFINITIONS[agentId].name,
        content: "",
        timestamp: new Date().toISOString(),
        round: 1,
        error: error.message,
      } as AgentMessage;
    }
  });

  const independentResults = await Promise.all(independentPromises);
  session.messages.push(...independentResults);
  session.totalTokens += independentResults.reduce((sum, m) => sum + (m.tokensUsed || 0), 0);
  session.rounds = 1;

  const synthesizer = session.agents[0];
  const consensusPrompt = buildConsensusPrompt(session.topic, synthesizer, session.messages, 2, true);
  const consensusId = generateId();

  try {
    const result = await callAgent(synthesizer, consensusPrompt, maxTokens * 2);
    session.messages.push({
      id: consensusId,
      agentId: synthesizer,
      agentName: `${AGENT_DEFINITIONS[synthesizer].name} (Consensus Synthesizer)`,
      content: result.response,
      timestamp: new Date().toISOString(),
      round: 2,
      tokensUsed: result.tokensUsed,
      model: result.model,
    });
    session.totalTokens += result.tokensUsed || 0;
    session.summary = result.response;
  } catch (error: any) {
    session.messages.push({
      id: consensusId,
      agentId: synthesizer,
      agentName: `${AGENT_DEFINITIONS[synthesizer].name} (Consensus Synthesizer)`,
      content: "",
      timestamp: new Date().toISOString(),
      round: 2,
      error: error.message,
    });
  }
  session.rounds = 2;
}

async function runSubAgentMode(session: A2ASession, maxTokens: number): Promise<void> {
  const leadAgent = session.agents[0];
  const subAgents = session.agents.slice(1);

  const leadPrompt = buildSubAgentPrompt(session.topic, leadAgent, [], 1, leadAgent, true);
  const leadMsgId = generateId();

  try {
    const leadResult = await callAgent(leadAgent, leadPrompt, maxTokens);
    session.messages.push({
      id: leadMsgId,
      agentId: leadAgent,
      agentName: `${AGENT_DEFINITIONS[leadAgent].name} (Lead)`,
      content: leadResult.response,
      timestamp: new Date().toISOString(),
      round: 1,
      tokensUsed: leadResult.tokensUsed,
      model: leadResult.model,
    });
    session.totalTokens += leadResult.tokensUsed || 0;
  } catch (error: any) {
    session.messages.push({
      id: leadMsgId,
      agentId: leadAgent,
      agentName: `${AGENT_DEFINITIONS[leadAgent].name} (Lead)`,
      content: "",
      timestamp: new Date().toISOString(),
      round: 1,
      error: error.message,
    });
  }
  session.rounds = 1;

  const subPromises = subAgents.map(async (agentId) => {
    const prompt = buildSubAgentPrompt(session.topic, agentId, session.messages, 2, leadAgent, false);
    const msgId = generateId();
    try {
      const result = await callAgent(agentId, prompt, maxTokens);
      return {
        id: msgId,
        agentId,
        agentName: AGENT_DEFINITIONS[agentId].name,
        content: result.response,
        timestamp: new Date().toISOString(),
        round: 2,
        tokensUsed: result.tokensUsed,
        model: result.model,
      } as AgentMessage;
    } catch (error: any) {
      return {
        id: msgId,
        agentId,
        agentName: AGENT_DEFINITIONS[agentId].name,
        content: "",
        timestamp: new Date().toISOString(),
        round: 2,
        error: error.message,
      } as AgentMessage;
    }
  });

  const subResults = await Promise.all(subPromises);
  session.messages.push(...subResults);
  session.totalTokens += subResults.reduce((sum, m) => sum + (m.tokensUsed || 0), 0);
  session.rounds = 2;

  const synthesisPrompt = buildSubAgentPrompt(session.topic, leadAgent, session.messages, 3, leadAgent, true);
  const synthesisId = generateId();

  try {
    const result = await callAgent(leadAgent, synthesisPrompt, maxTokens * 2);
    session.messages.push({
      id: synthesisId,
      agentId: leadAgent,
      agentName: `${AGENT_DEFINITIONS[leadAgent].name} (Lead Summary)`,
      content: result.response,
      timestamp: new Date().toISOString(),
      round: 3,
      tokensUsed: result.tokensUsed,
      model: result.model,
    });
    session.totalTokens += result.tokensUsed || 0;
    session.summary = result.response;
  } catch (error: any) {
    session.messages.push({
      id: synthesisId,
      agentId: leadAgent,
      agentName: `${AGENT_DEFINITIONS[leadAgent].name} (Lead Summary)`,
      content: "",
      timestamp: new Date().toISOString(),
      round: 3,
      error: error.message,
    });
  }
  session.rounds = 3;
}

const MAX_SESSIONS = 100;

function cleanupOldSessions(): void {
  if (sessions.size <= MAX_SESSIONS) return;
  const sorted = Array.from(sessions.entries())
    .sort(([, a], [, b]) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  const toRemove = sorted.slice(0, sorted.length - MAX_SESSIONS);
  for (const [id] of toRemove) {
    sessions.delete(id);
  }
}

const VALID_AGENT_IDS = new Set<AgentId>(["claude", "gpt", "gemini", "perplexity", "comet"]);

export async function startA2AChat(request: A2AChatRequest): Promise<A2ASession> {
  const invalidAgents = request.agents.filter((id) => !VALID_AGENT_IDS.has(id));
  if (invalidAgents.length > 0) {
    throw new Error(`Invalid agent IDs: ${invalidAgents.join(", ")}. Valid: ${Array.from(VALID_AGENT_IDS).join(", ")}`);
  }

  const availability = getAgentAvailability();
  const unavailableAgents = request.agents.filter((id) => !availability[id]);
  if (unavailableAgents.length > 0) {
    throw new Error(
      `The following agents don't have API keys configured: ${unavailableAgents.join(", ")}. Configure them in Secrets first.`
    );
  }

  const availableAgents = request.agents.filter((id) => availability[id]);

  if (availableAgents.length < 2) {
    throw new Error(
      `At least 2 available agents required. Available: ${Object.entries(availability).filter(([, v]) => v).map(([k]) => k).join(", ")}`
    );
  }

  cleanupOldSessions();

  const session: A2ASession = {
    id: generateId(),
    topic: request.topic,
    mode: request.mode,
    agents: availableAgents,
    messages: [],
    status: "running",
    createdAt: new Date().toISOString(),
    totalTokens: 0,
    rounds: 0,
    maxRounds: request.maxRounds || (request.mode === "chain" ? 1 : request.mode === "debate" ? 3 : 1),
  };

  sessions.set(session.id, session);
  const maxTokens = request.maxTokensPerAgent || 800;

  try {
    switch (request.mode) {
      case "chain":
        await runChainMode(session, maxTokens);
        break;
      case "debate":
        await runDebateMode(session, maxTokens);
        break;
      case "consensus":
        await runConsensusMode(session, maxTokens);
        break;
      case "sub-agent":
        await runSubAgentMode(session, maxTokens);
        break;
    }
    session.status = "completed";
    session.completedAt = new Date().toISOString();
  } catch (error: any) {
    session.status = "error";
    session.completedAt = new Date().toISOString();
  }

  return session;
}

export function getSession(sessionId: string): A2ASession | undefined {
  return sessions.get(sessionId);
}

export function getAllSessions(): A2ASession[] {
  return Array.from(sessions.values())
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 50);
}

export function deleteSession(sessionId: string): boolean {
  return sessions.delete(sessionId);
}

export function clearAllSessions(): number {
  const count = sessions.size;
  sessions.clear();
  return count;
}

type StreamEvent = { type: 'message' | 'status' | 'complete' | 'error', data: any };

async function runChainModeStream(
  session: A2ASession,
  maxTokens: number,
  onEvent: (event: StreamEvent) => void
): Promise<void> {
  for (let round = 1; round <= session.maxRounds; round++) {
    for (const agentId of session.agents) {
      onEvent({ type: 'status', data: { agentId, round, status: 'thinking' } });
      const prompt = buildChainPrompt(session.topic, agentId, session.messages, round);
      const msgId = generateId();

      try {
        const result = await callAgent(agentId, prompt, maxTokens);
        const msg: AgentMessage = {
          id: msgId,
          agentId,
          agentName: AGENT_DEFINITIONS[agentId].name,
          content: result.response,
          timestamp: new Date().toISOString(),
          round,
          tokensUsed: result.tokensUsed,
          model: result.model,
        };
        session.messages.push(msg);
        session.totalTokens += result.tokensUsed || 0;
        onEvent({ type: 'message', data: msg });
      } catch (error: any) {
        const msg: AgentMessage = {
          id: msgId,
          agentId,
          agentName: AGENT_DEFINITIONS[agentId].name,
          content: "",
          timestamp: new Date().toISOString(),
          round,
          error: error.message,
        };
        session.messages.push(msg);
        onEvent({ type: 'message', data: msg });
      }
    }
    session.rounds = round;
  }
}

async function runDebateModeStream(
  session: A2ASession,
  maxTokens: number,
  onEvent: (event: StreamEvent) => void
): Promise<void> {
  for (let round = 1; round <= session.maxRounds; round++) {
    for (const agentId of session.agents) {
      onEvent({ type: 'status', data: { agentId, round, status: 'thinking' } });
      const prompt = buildDebatePrompt(session.topic, agentId, session.messages, round, session.maxRounds);
      const msgId = generateId();

      try {
        const result = await callAgent(agentId, prompt, maxTokens);
        const msg: AgentMessage = {
          id: msgId,
          agentId,
          agentName: AGENT_DEFINITIONS[agentId].name,
          content: result.response,
          timestamp: new Date().toISOString(),
          round,
          tokensUsed: result.tokensUsed,
          model: result.model,
        };
        session.messages.push(msg);
        session.totalTokens += result.tokensUsed || 0;
        onEvent({ type: 'message', data: msg });
      } catch (error: any) {
        const msg: AgentMessage = {
          id: msgId,
          agentId,
          agentName: AGENT_DEFINITIONS[agentId].name,
          content: "",
          timestamp: new Date().toISOString(),
          round,
          error: error.message,
        };
        session.messages.push(msg);
        onEvent({ type: 'message', data: msg });
      }
    }
    session.rounds = round;
  }
}

async function runConsensusModeStream(
  session: A2ASession,
  maxTokens: number,
  onEvent: (event: StreamEvent) => void
): Promise<void> {
  for (const agentId of session.agents) {
    onEvent({ type: 'status', data: { agentId, round: 1, status: 'thinking' } });
  }

  const independentResults = await Promise.allSettled(
    session.agents.map(async (agentId) => {
      const prompt = buildConsensusPrompt(session.topic, agentId, [], 1, false);
      const msgId = generateId();
      try {
        const result = await callAgent(agentId, prompt, maxTokens);
        const msg: AgentMessage = {
          id: msgId,
          agentId,
          agentName: AGENT_DEFINITIONS[agentId].name,
          content: result.response,
          timestamp: new Date().toISOString(),
          round: 1,
          tokensUsed: result.tokensUsed,
          model: result.model,
        };
        session.messages.push(msg);
        session.totalTokens += result.tokensUsed || 0;
        onEvent({ type: 'message', data: msg });
        return msg;
      } catch (error: any) {
        const msg: AgentMessage = {
          id: msgId,
          agentId,
          agentName: AGENT_DEFINITIONS[agentId].name,
          content: "",
          timestamp: new Date().toISOString(),
          round: 1,
          error: error.message,
        };
        session.messages.push(msg);
        onEvent({ type: 'message', data: msg });
        return msg;
      }
    })
  );

  session.rounds = 1;

  const synthesizer = session.agents[0];
  onEvent({ type: 'status', data: { agentId: synthesizer, round: 2, status: 'thinking' } });
  const consensusPrompt = buildConsensusPrompt(session.topic, synthesizer, session.messages, 2, true);
  const consensusId = generateId();

  try {
    const result = await callAgent(synthesizer, consensusPrompt, maxTokens * 2);
    const msg: AgentMessage = {
      id: consensusId,
      agentId: synthesizer,
      agentName: `${AGENT_DEFINITIONS[synthesizer].name} (Consensus Synthesizer)`,
      content: result.response,
      timestamp: new Date().toISOString(),
      round: 2,
      tokensUsed: result.tokensUsed,
      model: result.model,
    };
    session.messages.push(msg);
    session.totalTokens += result.tokensUsed || 0;
    session.summary = result.response;
    onEvent({ type: 'message', data: msg });
  } catch (error: any) {
    const msg: AgentMessage = {
      id: consensusId,
      agentId: synthesizer,
      agentName: `${AGENT_DEFINITIONS[synthesizer].name} (Consensus Synthesizer)`,
      content: "",
      timestamp: new Date().toISOString(),
      round: 2,
      error: error.message,
    };
    session.messages.push(msg);
    onEvent({ type: 'message', data: msg });
  }
  session.rounds = 2;
}

async function runSubAgentModeStream(
  session: A2ASession,
  maxTokens: number,
  onEvent: (event: StreamEvent) => void
): Promise<void> {
  const leadAgent = session.agents[0];
  const subAgents = session.agents.slice(1);

  onEvent({ type: 'status', data: { agentId: leadAgent, round: 1, status: 'thinking' } });
  const leadPrompt = buildSubAgentPrompt(session.topic, leadAgent, [], 1, leadAgent, true);
  const leadMsgId = generateId();

  try {
    const leadResult = await callAgent(leadAgent, leadPrompt, maxTokens);
    const msg: AgentMessage = {
      id: leadMsgId,
      agentId: leadAgent,
      agentName: `${AGENT_DEFINITIONS[leadAgent].name} (Lead)`,
      content: leadResult.response,
      timestamp: new Date().toISOString(),
      round: 1,
      tokensUsed: leadResult.tokensUsed,
      model: leadResult.model,
    };
    session.messages.push(msg);
    session.totalTokens += leadResult.tokensUsed || 0;
    onEvent({ type: 'message', data: msg });
  } catch (error: any) {
    const msg: AgentMessage = {
      id: leadMsgId,
      agentId: leadAgent,
      agentName: `${AGENT_DEFINITIONS[leadAgent].name} (Lead)`,
      content: "",
      timestamp: new Date().toISOString(),
      round: 1,
      error: error.message,
    };
    session.messages.push(msg);
    onEvent({ type: 'message', data: msg });
  }
  session.rounds = 1;

  for (const agentId of subAgents) {
    onEvent({ type: 'status', data: { agentId, round: 2, status: 'thinking' } });
  }

  await Promise.allSettled(
    subAgents.map(async (agentId) => {
      const prompt = buildSubAgentPrompt(session.topic, agentId, session.messages, 2, leadAgent, false);
      const msgId = generateId();
      try {
        const result = await callAgent(agentId, prompt, maxTokens);
        const msg: AgentMessage = {
          id: msgId,
          agentId,
          agentName: AGENT_DEFINITIONS[agentId].name,
          content: result.response,
          timestamp: new Date().toISOString(),
          round: 2,
          tokensUsed: result.tokensUsed,
          model: result.model,
        };
        session.messages.push(msg);
        session.totalTokens += result.tokensUsed || 0;
        onEvent({ type: 'message', data: msg });
      } catch (error: any) {
        const msg: AgentMessage = {
          id: msgId,
          agentId,
          agentName: AGENT_DEFINITIONS[agentId].name,
          content: "",
          timestamp: new Date().toISOString(),
          round: 2,
          error: error.message,
        };
        session.messages.push(msg);
        onEvent({ type: 'message', data: msg });
      }
    })
  );
  session.rounds = 2;

  onEvent({ type: 'status', data: { agentId: leadAgent, round: 3, status: 'thinking' } });
  const synthesisPrompt = buildSubAgentPrompt(session.topic, leadAgent, session.messages, 3, leadAgent, true);
  const synthesisId = generateId();

  try {
    const result = await callAgent(leadAgent, synthesisPrompt, maxTokens * 2);
    const msg: AgentMessage = {
      id: synthesisId,
      agentId: leadAgent,
      agentName: `${AGENT_DEFINITIONS[leadAgent].name} (Lead Summary)`,
      content: result.response,
      timestamp: new Date().toISOString(),
      round: 3,
      tokensUsed: result.tokensUsed,
      model: result.model,
    };
    session.messages.push(msg);
    session.totalTokens += result.tokensUsed || 0;
    session.summary = result.response;
    onEvent({ type: 'message', data: msg });
  } catch (error: any) {
    const msg: AgentMessage = {
      id: synthesisId,
      agentId: leadAgent,
      agentName: `${AGENT_DEFINITIONS[leadAgent].name} (Lead Summary)`,
      content: "",
      timestamp: new Date().toISOString(),
      round: 3,
      error: error.message,
    };
    session.messages.push(msg);
    onEvent({ type: 'message', data: msg });
  }
  session.rounds = 3;
}

export async function startA2AChatStream(
  request: A2AChatRequest,
  onEvent: (event: StreamEvent) => void
): Promise<A2ASession> {
  const invalidAgents = request.agents.filter((id) => !VALID_AGENT_IDS.has(id));
  if (invalidAgents.length > 0) {
    throw new Error(`Invalid agent IDs: ${invalidAgents.join(", ")}. Valid: ${Array.from(VALID_AGENT_IDS).join(", ")}`);
  }

  const availability = getAgentAvailability();
  const unavailableAgents = request.agents.filter((id) => !availability[id]);
  if (unavailableAgents.length > 0) {
    throw new Error(
      `The following agents don't have API keys configured: ${unavailableAgents.join(", ")}. Configure them in Secrets first.`
    );
  }

  const availableAgents = request.agents.filter((id) => availability[id]);

  if (availableAgents.length < 2) {
    throw new Error(
      `At least 2 available agents required. Available: ${Object.entries(availability).filter(([, v]) => v).map(([k]) => k).join(", ")}`
    );
  }

  cleanupOldSessions();

  const session: A2ASession = {
    id: generateId(),
    topic: request.topic,
    mode: request.mode,
    agents: availableAgents,
    messages: [],
    status: "running",
    createdAt: new Date().toISOString(),
    totalTokens: 0,
    rounds: 0,
    maxRounds: request.maxRounds || (request.mode === "chain" ? 1 : request.mode === "debate" ? 3 : 1),
  };

  sessions.set(session.id, session);
  const maxTokens = request.maxTokensPerAgent || 800;

  try {
    switch (request.mode) {
      case "chain":
        await runChainModeStream(session, maxTokens, onEvent);
        break;
      case "debate":
        await runDebateModeStream(session, maxTokens, onEvent);
        break;
      case "consensus":
        await runConsensusModeStream(session, maxTokens, onEvent);
        break;
      case "sub-agent":
        await runSubAgentModeStream(session, maxTokens, onEvent);
        break;
    }
    session.status = "completed";
    session.completedAt = new Date().toISOString();
    onEvent({ type: 'complete', data: session });
  } catch (error: any) {
    session.status = "error";
    session.completedAt = new Date().toISOString();
    onEvent({ type: 'error', data: { message: error.message } });
  }

  return session;
}
