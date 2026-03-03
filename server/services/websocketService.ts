import { WebSocketServer, WebSocket } from "ws";
import type { Server } from "http";

let wss: WebSocketServer;

export function initWebSocket(server: Server) {
  wss = new WebSocketServer({ server, path: "/ws" });

  wss.on("connection", (ws) => {
    ws.on("message", (data) => {
      try {
        const message = JSON.parse(data.toString());
        handleMessage(ws, message);
      } catch {
        ws.send(JSON.stringify({ error: "Invalid JSON" }));
      }
    });

    ws.send(JSON.stringify({ type: "connected", message: "WebSocket connected to API Weaver" }));
  });
}

function handleMessage(ws: WebSocket, message: any) {
  switch (message.type) {
    case "ping":
      ws.send(JSON.stringify({ type: "pong", timestamp: Date.now() }));
      break;
    default:
      ws.send(JSON.stringify({ type: "echo", data: message }));
  }
}

export function getConnectedClientsCount(): number {
  return wss ? wss.clients.size : 0;
}

export function broadcast(data: any) {
  if (!wss) return;
  const message = JSON.stringify(data);
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  });
}
