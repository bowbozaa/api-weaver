# Multi-AI Provider Pattern Skill

## Overview
This skill describes how API Weaver integrates multiple AI providers through a unified interface, and the A2A (Agent-to-Agent) multi-agent conversation system.

## AI Providers

### Supported Providers
1. **Claude** (Anthropic) - Analytical Thinker role
2. **GPT** (OpenAI) - Creative Synthesizer role
3. **Gemini** (Google) - Data Interpreter role
4. **Perplexity** - Research Specialist role
5. **Comet ML** - Performance Optimizer role

### Service Architecture
Each provider has a dedicated service function in `server/content-mcp/services/aiService.ts`:

```typescript
// Each AI service follows the same pattern:
async function callProvider(prompt: string, options?: ProviderOptions): Promise<AIResponse> {
  // 1. Check API key availability
  // 2. Format request for provider-specific API
  // 3. Make API call with error handling
  // 4. Return normalized response
}
```

### Environment Variables
- `ANTHROPIC_API_KEY` - Claude
- `OPENAI_API_KEY` - GPT (via AI_INTEGRATIONS_OPENAI_API_KEY)
- `GOOGLE_CLOUD_CREDENTIALS` / `GCLOUD_CREDENTIALS` - Gemini
- `PERPLEXITY_API_KEY` - Perplexity
- Comet ML uses its own configuration

### API Endpoints
- `POST /api/content/ai/claude` - Claude prompt
- `POST /api/content/ai/gpt` - GPT prompt
- `POST /api/content/ai/gemini` - Gemini prompt
- `POST /api/content/ai/perplexity` - Perplexity search
- `POST /api/ai` - General AI prompt (routes to available provider)

## A2A Multi-Agent Chat System

### Conversation Modes
1. **Chain**: Agents respond sequentially, each building on the previous
2. **Debate**: Agents argue different perspectives on a topic
3. **Consensus**: Agents work together to reach agreement
4. **Sub-Agent**: One lead agent delegates tasks to specialists

### Key Files
- `server/services/agentOrchestrator.ts` - Multi-agent conversation orchestration
- `client/src/pages/a2a.tsx` - A2A chat interface

### Agent Configuration
```typescript
interface Agent {
  id: string;
  name: string;
  role: string;
  provider: string;
  systemPrompt: string;
}
```

### Session Management
- Max 100 sessions in memory
- Automatic cleanup of oldest sessions
- API: GET/DELETE `/api/a2a/sessions`

### Adding a New AI Provider
1. Add API key to environment secrets
2. Create service function in `aiService.ts`
3. Add agent definition in `agentOrchestrator.ts`
4. Add API endpoint in content MCP routes
5. Update health check in main routes
6. Add to dashboard service cards in `home.tsx`

### Best Practices
- Always check API key availability before attempting calls
- Normalize response format across providers
- Handle rate limits and token limits per provider
- Use streaming where supported for better UX
- Validate agent IDs and API key availability before starting A2A sessions
