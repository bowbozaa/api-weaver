// API Weaver — Cloudflare Worker Proxy to Replit
// Proxies all requests to Replit API Weaver backend
// Updated by F.R.I.D.A.Y. — 2026-04-06

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const origin = env.REPLIT_ORIGIN || 'https://api-weaver--banknakorn39.replit.app';

    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-API-KEY',
          'Access-Control-Max-Age': '86400',
        },
      });
    }

    // Health check endpoint
    if (url.pathname === '/health') {
      return new Response(JSON.stringify({
        status: 'ok',
        service: 'api-weaver',
        backend: 'replit',
        timestamp: new Date().toISOString(),
      }), {
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      });
    }

    // Proxy to Replit
    const targetUrl = `${origin}${url.pathname}${url.search}`;
    const proxyHeaders = new Headers(request.headers);
    proxyHeaders.set('X-Forwarded-For', request.headers.get('CF-Connecting-IP') || '');
    proxyHeaders.set('X-Forwarded-Host', url.hostname);
    proxyHeaders.set('X-Forwarded-Proto', 'https');
    proxyHeaders.delete('host');

    try {
      const response = await fetch(targetUrl, {
        method: request.method,
        headers: proxyHeaders,
        body: request.method !== 'GET' && request.method !== 'HEAD' ? request.body : undefined,
        redirect: 'follow',
      });

      const responseHeaders = new Headers(response.headers);
      responseHeaders.set('Access-Control-Allow-Origin', '*');

      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: responseHeaders,
      });
    } catch (err) {
      return new Response(JSON.stringify({
        status: 'error',
        message: 'Replit backend unreachable',
        detail: err.message,
        backend: origin,
        timestamp: new Date().toISOString(),
      }), {
        status: 502,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      });
    }
  },
};
