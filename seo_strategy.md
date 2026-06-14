# SEO Strategy

## In scope
- Public landing experience at `/`
- Public documentation and help pages: `/guide`, `/api-docs`, `/status`
- Public legal/auth pages: `/login`, `/terms`, `/license`
- Crawl files and deployment artifacts that affect public visibility (`client/index.html`, `client/public/*`, `wrangler.toml`, `server/static.ts`, `_redirects`)

## Out of scope
- Authenticated dashboard and app surfaces shown after login
- Protected routes: `/users`, `/playground`, `/analytics`, `/teams`, `/a2a`
- Internal API behavior that does not affect public crawlability or shareability

## Target audience
- Developers and technical teams evaluating an MCP-based API gateway and dashboard platform.

## Primary keywords
- API gateway
- MCP server
- Model Context Protocol
- developer API dashboard
- multi-agent API platform

## Notes
- The repo supports both an Express-served deployment and a Cloudflare Pages static frontend deployment.
- Public pages are currently implemented as a React + Vite SPA using Wouter routing.

## Dismissed categories
- None yet.
