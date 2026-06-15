/* eslint-disable @typescript-eslint/no-require-imports */
const { WebSocketServer, WebSocket } = require('ws');

const PORT = parseInt(process.env.PORT || '3001', 10);
const wss = new WebSocketServer({ port: PORT });

// Map to store active userId -> Set of WebSocket client connections
const clients = new Map();

// Map to store last active timestamps (ISO Strings or 'online')
const lastActive = new Map();

console.log(`WebSocket server running on port ${PORT}...`);

wss.on('connection', (ws) => {
  let authenticatedUserId = null;

  ws.on('message', (message) => {
    try {
      const parsed = JSON.parse(message);
      const { type, payload } = parsed;

      switch (type) {
        case 'register':
          authenticatedUserId = payload.userId;
          if (!clients.has(authenticatedUserId)) {
            clients.set(authenticatedUserId, new Set());
          }
          clients.get(authenticatedUserId).add(ws);
          lastActive.set(authenticatedUserId, 'online');
          
          // Notify other clients about the online status
          broadcast({
            type: 'user_status',
            payload: { userId: authenticatedUserId, status: 'online' }
          });
          
          console.log(`User ${authenticatedUserId} registered (total connections: ${clients.get(authenticatedUserId).size})`);
          break;

        case 'send_message':
          // Relay message in real-time to the recipient if online
          const recipientId = payload.recipientId;
          const recipientSockets = clients.get(recipientId);
          const messageEvent = JSON.stringify({
            type: 'new_message',
            payload: payload.message
          });

          if (recipientSockets) {
            for (const socket of recipientSockets) {
              if (socket.readyState === WebSocket.OPEN) {
                socket.send(messageEvent);
              }
            }
          }
          break;

        case 'typing':
          const typingTargets = clients.get(payload.targetId);
          if (typingTargets) {
            const typingEvent = JSON.stringify({
              type: 'typing',
              payload: { conversationId: payload.conversationId }
            });
            for (const socket of typingTargets) {
              if (socket.readyState === WebSocket.OPEN) {
                socket.send(typingEvent);
              }
            }
          }
          break;

        case 'stop_typing':
          const stopTargets = clients.get(payload.targetId);
          if (stopTargets) {
            const stopEvent = JSON.stringify({
              type: 'stop_typing',
              payload: { conversationId: payload.conversationId }
            });
            for (const socket of stopTargets) {
              if (socket.readyState === WebSocket.OPEN) {
                socket.send(stopEvent);
              }
            }
          }
          break;

        case 'message_seen':
          const seenTargets = clients.get(payload.targetId);
          if (seenTargets) {
            const seenEvent = JSON.stringify({
              type: 'message_seen',
              payload: { conversationId: payload.conversationId }
            });
            for (const socket of seenTargets) {
              if (socket.readyState === WebSocket.OPEN) {
                socket.send(seenEvent);
              }
            }
          }
          break;

        case 'message_delivered':
          const deliveredTargets = clients.get(payload.targetId);
          if (deliveredTargets) {
            const deliveredEvent = JSON.stringify({
              type: 'message_delivered',
              payload: { conversationId: payload.conversationId }
            });
            for (const socket of deliveredTargets) {
              if (socket.readyState === WebSocket.OPEN) {
                socket.send(deliveredEvent);
              }
            }
          }
          break;

        case 'query_status':
          const hasConnections = clients.has(payload.targetId) && clients.get(payload.targetId).size > 0;
          const status = hasConnections 
            ? 'online' 
            : (lastActive.get(payload.targetId) || 'offline');
          
          ws.send(JSON.stringify({
            type: 'user_status',
            payload: { userId: payload.targetId, status }
          }));
          break;
      }
    } catch (e) {
      console.error('Failed to handle socket message:', e);
    }
  });

  ws.on('close', () => {
    if (authenticatedUserId) {
      const userSockets = clients.get(authenticatedUserId);
      if (userSockets) {
        userSockets.delete(ws);
        if (userSockets.size === 0) {
          clients.delete(authenticatedUserId);
          const isoString = new Date().toISOString();
          lastActive.set(authenticatedUserId, isoString);

          // Broadcast user disconnected status
          broadcast({
            type: 'user_status',
            payload: { userId: authenticatedUserId, status: isoString }
          });
          
          console.log(`User ${authenticatedUserId} completely disconnected`);
        } else {
          console.log(`User ${authenticatedUserId} closed one connection (remaining: ${userSockets.size})`);
        }
      }
    }
  });
});

function broadcast(message) {
  const payload = JSON.stringify(message);
  for (const userSockets of clients.values()) {
    for (const client of userSockets) {
      if (client.readyState === 1) { // 1 = OPEN
        client.send(payload);
      }
    }
  }
}
