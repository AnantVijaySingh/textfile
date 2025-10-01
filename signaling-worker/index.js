/**
 * The Durable Object class for a signaling room.
 */
export class SignalingRoom {
    constructor(state, env) {
      this.state = state;
      this.sessions = [];
    }
  
    // Handle HTTP requests (for WebSocket upgrades)
    async fetch(request) {
      // Expecting a WebSocket upgrade request
      const upgradeHeader = request.headers.get('Upgrade');
      if (!upgradeHeader || upgradeHeader !== 'websocket') {
        return new Response('Expected Upgrade: websocket', { status: 426 });
      }
  
      const [client, server] = Object.values(new WebSocketPair());
      await this.handleSession(server);
  
      return new Response(null, {
        status: 101,
        webSocket: client,
      });
    }
  
    // Handle a new WebSocket session
    async handleSession(socket) {
      socket.accept();
      const session = { socket, messages: [] };
      this.sessions.push(session);
  
      socket.addEventListener('message', async (event) => {
        try {
          const message = JSON.parse(event.data);
          this.broadcast(session, message);
        } catch (err) {
          console.error('Failed to parse or broadcast message:', err);
        }
      });
  
      socket.addEventListener('close', () => {
        this.sessions = this.sessions.filter((s) => s !== session);
      });
      
      socket.addEventListener('error', (err) => {
          console.error('WebSocket error:', err);
      });
    }
  
    // Broadcast a message to all other sessions in the room
    broadcast(sender, message) {
      const messageString = JSON.stringify(message);
      this.sessions.forEach((session) => {
        if (session !== sender && session.socket.readyState === WebSocket.READY_STATE_OPEN) {
          try {
              session.socket.send(messageString);
          } catch (err) {
              console.error('Failed to send message to a session:', err);
          }
        }
      });
    }
  }
  
  // This is the new part: Export a default object with a 'fetch' handler.
  // It routes incoming requests to the correct Durable Object room.
  // This makes your Worker use ES Module format.
  export default {
    async fetch(request, env) {
      const url = new URL(request.url);
  
      // Extract the room name from the path (e.g., /room-name becomes 'room-name')
      // Adjust if your paths are different.
      const roomName = url.pathname.slice(1); // Removes the leading '/'
  
      if (!roomName) {
        return new Response('Invalid signaling URL', { status: 400 });
      }
  
      // Get the Durable Object ID and instance using the room name
      const id = env.ROOMS.idFromName(roomName);
      const room = env.ROOMS.get(id);
  
      // Forward the request to the Durable Object's fetch method
      return room.fetch(request);
    }
  };