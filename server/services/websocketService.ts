import { WebSocketServer, WebSocket } from 'ws';
import type { Server } from 'http';

interface DashboardUpdate {
  type: 'stats' | 'logs' | 'security_event' | 'notification' | 'health';
  data: any;
  timestamp: string;
}

let wss: WebSocketServer | null = null;
const clients = new Set<WebSocket>();

export function initWebSocket(server: Server): void {
  wss = new WebSocketServer({ 
    server,
    path: '/ws'
  });

  wss.on('connection', (ws: WebSocket) => {
    clients.add(ws);
    console.log('[WebSocket] Client connected. Total clients:', clients.size);

    ws.send(JSON.stringify({
      type: 'connected',
      message: 'Connected to API Weaver WebSocket',
      timestamp: new Date().toISOString()
    }));

    ws.on('message', (message: Buffer) => {
      try {
        const data = JSON.parse(message.toString());
        if (data.type === 'ping') {
          ws.send(JSON.stringify({ type: 'pong', timestamp: new Date().toISOString() }));
        }
      } catch (e) {
        console.error('[WebSocket] Invalid message:', e);
      }
    });

    ws.on('close', () => {
      clients.delete(ws);
      console.log('[WebSocket] Client disconnected. Total clients:', clients.size);
    });

    ws.on('error', (error) => {
      console.error('[WebSocket] Error:', error);
      clients.delete(ws);
    });
  });

  console.log('[WebSocket] Server initialized on /ws');
}

export function broadcast(update: DashboardUpdate): void {
  if (!wss) return;

  const message = JSON.stringify({
    ...update,
    timestamp: update.timestamp || new Date().toISOString()
  });

  clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  });
}

export function broadcastStats(stats: any): void {
  broadcast({
    type: 'stats',
    data: stats,
    timestamp: new Date().toISOString()
  });
}

export function broadcastLog(log: any): void {
  broadcast({
    type: 'logs',
    data: log,
    timestamp: new Date().toISOString()
  });
}

export function broadcastSecurityEvent(event: any): void {
  broadcast({
    type: 'security_event',
    data: event,
    timestamp: new Date().toISOString()
  });
}

export function broadcastNotification(notification: any): void {
  broadcast({
    type: 'notification',
    data: notification,
    timestamp: new Date().toISOString()
  });
}

export function broadcastHealthUpdate(health: any): void {
  broadcast({
    type: 'health',
    data: health,
    timestamp: new Date().toISOString()
  });
}

export function getConnectedClientsCount(): number {
  return clients.size;
}
