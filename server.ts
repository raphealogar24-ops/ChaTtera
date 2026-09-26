import express from 'express';
import { createServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface RealtimeChatMessage {
  id: string;
  conversationId: string;
  senderId: string;
  senderName: string;
  senderHandle: string;
  recipientId: string;
  senderKeyFingerprint: string;
  ciphertext: string;
  iv: string;
  algorithm: 'ECDH-P256-AES256GCM';
  deliveryStatus: 'sent' | 'delivered' | 'verified' | 'revoked';
  plaintext: string;
  createdAtMs: number;
  updatedAtMs: number;
}

export interface RealtimePresenceUser {
  uid: string;
  name: string;
  handle: string;
  avatarUrl?: string;
  online: boolean;
  lastSeenMs: number;
}

export interface RealtimeStatusItem {
  id: string;
  uid: string;
  name: string;
  handle: string;
  avatarUrl?: string;
  text: string;
  timeAgo: string;
  bgGradient: string;
  keyFingerprint: string;
  createdAtMs: number;
}

async function startServer() {
  const app = express();
  const httpServer = createServer(app);
  const PORT = 3000;

  app.use(express.json({ limit: '15mb' }));

  // In-memory store for real-time messages, voice blobs, presence, and statuses
  const voiceBlobs = new Map<string, { dataUrl: string; durationSec: number; createdAt: number }>();
  const roomMessages = new Map<string, RealtimeChatMessage[]>();
  const customStatuses: RealtimeStatusItem[] = [];
  const connectedClients = new Map<
    WebSocket,
    { uid: string; name: string; handle: string; avatarUrl?: string }
  >();

  // REST API for storing and retrieving recorded voice message audio blobs
  app.post('/api/voice', (req, res) => {
    const { id, dataUrl, durationSec } = req.body || {};
    if (!id || typeof dataUrl !== 'string') {
      res.status(400).json({ error: 'Invalid voice payload' });
      return;
    }
    voiceBlobs.set(id, {
      dataUrl,
      durationSec: Number(durationSec) || 3,
      createdAt: Date.now(),
    });
    res.json({ ok: true, id });
  });

  app.get('/api/voice/:id', (req, res) => {
    const item = voiceBlobs.get(req.params.id);
    if (!item) {
      res.status(404).json({ error: 'Voice note not found' });
      return;
    }
    res.json(item);
  });

  app.get('/api/health', (_req, res) => {
    res.json({
      status: 'ok',
      onlineClients: connectedClients.size,
    });
  });

  // WebSocket Server attached to the same HTTP server on port 3000
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });

  const broadcast = (payload: unknown, excludeWs?: WebSocket) => {
    const raw = JSON.stringify(payload);
    for (const client of wss.clients) {
      if (client !== excludeWs && client.readyState === WebSocket.OPEN) {
        client.send(raw);
      }
    }
  };

  const broadcastPresence = () => {
    const uniqueUsers = new Map<string, RealtimePresenceUser>();
    for (const info of connectedClients.values()) {
      uniqueUsers.set(info.uid, {
        uid: info.uid,
        name: info.name,
        handle: info.handle,
        avatarUrl: info.avatarUrl,
        online: true,
        lastSeenMs: Date.now(),
      });
    }
    broadcast({
      type: 'presence:list',
      users: Array.from(uniqueUsers.values()),
    });
  };

  wss.on('connection', (ws) => {
    // Send initial state snapshot to newly connected client
    const allRooms: Record<string, RealtimeChatMessage[]> = {};
    for (const [roomId, msgs] of roomMessages.entries()) {
      allRooms[roomId] = msgs;
    }

    ws.send(
      JSON.stringify({
        type: 'init:state',
        rooms: allRooms,
        statuses: customStatuses.slice(0, 30),
      })
    );

    ws.on('message', (data) => {
      try {
        const event = JSON.parse(data.toString());
        if (!event || typeof event.type !== 'string') return;

        switch (event.type) {
          case 'user:join': {
            const { uid, name, handle, avatarUrl } = event;
            if (uid && name) {
              connectedClients.set(ws, {
                uid: String(uid),
                name: String(name),
                handle: String(handle || 'user'),
                avatarUrl: avatarUrl ? String(avatarUrl) : undefined,
              });
              broadcastPresence();
            }
            break;
          }

          case 'user:leave': {
            connectedClients.delete(ws);
            broadcastPresence();
            break;
          }

          case 'typing:update': {
            // Broadcast live typing or voice recording status to all other clients
            broadcast(
              {
                type: 'typing:update',
                conversationId: event.conversationId,
                uid: event.uid,
                name: event.name,
                mode: event.mode, // 'typing' | 'recording' | 'idle'
              },
              ws
            );
            break;
          }

          case 'message:create': {
            const msg: RealtimeChatMessage = event.message;
            if (!msg || !msg.id || !msg.conversationId) break;

            const existing = roomMessages.get(msg.conversationId) || [];
            // Idempotency guard against duplicate message IDs
            if (!existing.some((m) => m.id === msg.id)) {
              const updated = [...existing, msg].slice(-200);
              roomMessages.set(msg.conversationId, updated);
            }

            broadcast({
              type: 'message:created',
              message: msg,
            });
            break;
          }

          case 'message:revoke': {
            const { conversationId, messageId } = event;
            if (!conversationId || !messageId) break;

            const list = roomMessages.get(conversationId) || [];
            const next = list.map((m) =>
              m.id === messageId
                ? {
                    ...m,
                    ciphertext: '[REVOKED_CIPHERTEXT]',
                    deliveryStatus: 'revoked' as const,
                    plaintext: 'This message was unsent',
                    updatedAtMs: Date.now(),
                  }
                : m
            );
            roomMessages.set(conversationId, next);

            broadcast({
              type: 'message:revoked',
              conversationId,
              messageId,
            });
            break;
          }

          case 'message:ack': {
            const { conversationId, messageId, status } = event;
            if (!conversationId || !messageId) break;
            const list = roomMessages.get(conversationId) || [];
            const next = list.map((m) =>
              m.id === messageId
                ? { ...m, deliveryStatus: status, updatedAtMs: Date.now() }
                : m
            );
            roomMessages.set(conversationId, next);

            broadcast({
              type: 'message:ack',
              conversationId,
              messageId,
              status,
            });
            break;
          }

          case 'status:publish': {
            const st: RealtimeStatusItem = event.status;
            if (!st || !st.id) break;
            if (!customStatuses.some((s) => s.id === st.id)) {
              customStatuses.unshift(st);
            }
            broadcast({
              type: 'status:published',
              status: st,
            });
            break;
          }
        }
      } catch {
        // Ignore malformed WS frames
      }
    });

    ws.on('close', () => {
      connectedClients.delete(ws);
      broadcastPresence();
    });
  });

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`Chattera real-time server running on http://0.0.0.0:${PORT}`);
  });
}

void startServer();
