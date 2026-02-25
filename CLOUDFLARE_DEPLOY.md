# Cloudflare Pages Deployment Guide

## Architecture
- **Frontend** (React SPA) → Cloudflare Pages (static hosting)
- **Backend** (Express.js + PostgreSQL) → Replit (API server)
- API calls from Cloudflare are proxied to Replit via `_redirects`

## Setup Steps

### 1. Connect GitHub to Cloudflare Pages

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com) → **Workers & Pages**
2. Click **Create** → **Pages** → **Connect to Git**
3. Select repository: `bowbozaa/api-weaver`
4. Configure build settings:
   - **Build command**: `npm run build`
   - **Build output directory**: `dist/public`
   - **Root directory**: `/` (leave default)

### 2. Environment Variables

Add these in Cloudflare Pages settings → **Environment variables**:

| Variable | Value |
|----------|-------|
| `NODE_VERSION` | `20` |

### 3. Auto-Deploy

Once connected, Cloudflare Pages will automatically deploy on every push to `main` branch.

### 4. Custom Domain (Optional)

1. In Cloudflare Pages → your project → **Custom domains**
2. Add your custom domain
3. Cloudflare handles SSL automatically

## How It Works

- Static frontend files are served from Cloudflare's global CDN
- API requests (`/api/*`, `/docs`, `/mcp`) are proxied to Replit backend via `_redirects`
- SPA routing is handled by the catch-all `/* /index.html 200` rule

## Files

- `client/public/_redirects` - Cloudflare Pages redirect/proxy rules
- `client/public/_headers` - Security headers for all pages
- `wrangler.toml` - Cloudflare Pages build configuration

## Updating

Push to GitHub → Cloudflare auto-deploys:
```bash
git push origin main
```

Or from Replit, use the GitHub API push script to sync changes.
