const { WebSocketServer } = require('ws');

const wss = new WebSocketServer({ port: 3001 });

// Map to store active userId -> WebSocket client connections
const clients = new Map();

// Map to store last active timestamps (ISO Strings or 'online')
const lastActive = new Map();

console.log('WebSocket server running on port 3001...');

wss.on('connection', (ws) => {
  let authenticatedUserId = null;

  ws.on('message', (message) => {
    try {
      const parsed = JSON.parse(message);
      const { type, payload } = parsed;

      switch (type) {
        case 'register':
          authenticatedUserId = payload.userId;
          clients.set(authenticatedUserId, ws);
          lastActive.set(authenticatedUserId, 'online');
          
          // Notify other clients about the online status
          broadcast({
            type: 'user_status',
            payload: { userId: authenticatedUserId, status: 'online' }
          });
          
          console.log(`User ${authenticatedUserId} registered`);
          break;

        case 'send_message':
          // Relay message in real-time to the recipient if online
          const recipientId = payload.recipientId;
          const targetSocket = clients.get(recipientId);
          if (targetSocket && targetSocket.readyState === ws.OPEN) {
            targetSocket.send(JSON.stringify({
              type: 'new_message',
              payload: payload.message
            }));
          }
          break;

        case 'typing':
          const typingTarget = clients.get(payload.targetId);
          if (typingTarget && typingTarget.readyState === ws.OPEN) {
            typingTarget.send(JSON.stringify({
              type: 'typing',
              payload: { conversationId: payload.conversationId }
            }));
          }
          break;

        case 'stop_typing':
          const stopTarget = clients.get(payload.targetId);
          if (stopTarget && stopTarget.readyState === ws.OPEN) {
            stopTarget.send(JSON.stringify({
              type: 'stop_typing',
              payload: { conversationId: payload.conversationId }
            }));
          }
          break;

        case 'message_seen':
          const seenTarget = clients.get(payload.targetId);
          if (seenTarget && seenTarget.readyState === ws.OPEN) {
            seenTarget.send(JSON.stringify({
              type: 'message_seen',
              payload: { conversationId: payload.conversationId }
            }));
          }
          break;

        case 'message_delivered':
          const deliveredTarget = clients.get(payload.targetId);
          if (deliveredTarget && deliveredTarget.readyState === ws.OPEN) {
            deliveredTarget.send(JSON.stringify({
              type: 'message_delivered',
              payload: { conversationId: payload.conversationId }
            }));
          }
          break;

        case 'query_status':
          const status = clients.has(payload.targetId) 
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
      clients.delete(authenticatedUserId);
      const isoString = new Date().toISOString();
      lastActive.set(authenticatedUserId, isoString);

      // Broadcast user disconnected status
      broadcast({
        type: 'user_status',
        payload: { userId: authenticatedUserId, status: isoString }
      });
      
      console.log(`User ${authenticatedUserId} disconnected`);
    }
  });
});

function broadcast(message) {
  const payload = JSON.stringify(message);
  for (const client of clients.values()) {
    if (client.readyState === 1) { // 1 = OPEN
      client.send(payload);
    }
  }
}
