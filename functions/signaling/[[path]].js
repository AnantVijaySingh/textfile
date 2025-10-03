export async function onRequest(context) {
    const { request, env } = context;
    const url = new URL(request.url);
  
    const roomName = url.pathname.replace('/signaling/', '');
  
    if (!roomName) {
      return new Response('Invalid signaling URL', { status: 400 });
    }
  
    const id = env.ROOMS.idFromName(roomName);
    const room = env.ROOMS.get(id);
  
    return room.fetch(request);
  }