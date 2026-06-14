# API Weaver

## Overview

API Weaver is a comprehensive API server leveraging a Model Context Protocol (MCP) Architecture, structured as a monorepo. It aims to provide a robust, scalable, and secure platform for managing AI, content, and external service integrations. The project includes an API Gateway, dedicated Content and Integration MCPs, a main REST API with a dashboard, and extensive security features. Its core purpose is to streamline API development, offer real-time monitoring, and enable advanced AI-driven multi-agent conversations, ultimately enhancing developer productivity and application capabilities.

## User Preferences

I prefer detailed explanations and iterative development. Ask before making major changes.

## System Architecture

The project is structured as a monorepo with a Model Context Protocol (MCP) architecture, comprising:

-   **Gateway MCP (Port 3000)**: Acts as an API Gateway, routing requests to the Content and Integration MCPs.
-   **Content MCP (Port 3001)**: Dedicated to handling AI services, file operations, and content management.
-   **Integration MCP (Port 3002)**: Manages integrations with various external services.
-   **Main API Server (Port 5000)**: Provides the primary REST API, hosting a dashboard and Swagger documentation.

**Technical Implementations:**

-   **Backend**: Developed using Express.js, featuring API key authentication, rate limiting, input validation (Zod schemas), path sanitization, and command whitelisting for security.
-   **Frontend**: Built with React and Vite, utilizing `shadcn/ui` for components and Recharts for data visualizations. It includes a comprehensive dashboard with real-time monitoring, analytics, and an AI Code Assistant.
-   **Multi-Agent System (A2A)**: Implemented an `agentOrchestrator.ts` service for multi-AI agent conversations, supporting Chain, Debate, Consensus, and Sub-Agent modes with agents like Claude, GPT, Gemini, Perplexity, and Comet ML.
-   **Security Features**: API Key Authentication (X-API-KEY header or `api_key` query param), Rate Limiting (100 req/15min/IP), Path Sanitization, Command Whitelisting, Input Validation, and Path Boundary Checks.
-   **User Management & Authentication**: Integrates Replit Auth with OIDC, utilizing PostgreSQL for user and session management. Includes user management pages and session control features.
-   **Enterprise Features**: Implementation of two-factor setup, IP whitelist management, key rotation, audit logging, caching, request queuing, tiered rate limiting, webhook management, SDK generation, API versioning, and team management with role-based access.
-   **UI/UX**: Dashboard v2.0 features a modern layout with gradient styling, interactive charts (API Traffic, Request Methods, Response Time), and responsive design for various screen sizes. Includes OpenGraph meta tags for SEO.

## External Dependencies

-   **AI Services**: Claude, OpenAI GPT, Google Gemini, Perplexity, Comet ML.
-   **Database**: PostgreSQL (for user and session management).
-   **Email Service**: Resend.
-   **Authentication**: Replit Auth (OIDC).
-   **External APIs/Services**: GitHub, Supabase, Notion, Vercel, n8n, Google Cloud.
-   **Cloud Deployment**: Cloudflare Pages, Google Cloud Run.