// server.ts
const { createServer } = require('http');
const { Server } = require('socket.io');
const next = require('next');

const dev = process.env.NODE_ENV !== 'production';
const nextApp = next({ dev });
const handle = nextApp.getRequestHandler();

nextApp.prepare().then(() => {
  const httpServer = createServer((req, res) => {
    handle(req, res);
  });

  const io = new Server(httpServer, {
    cors: {
      origin: "*",
    },
  });

  io.on('connection', (socket) => {
    console.log('A user connected');

    socket.on('message', (msg) => {
      console.log('Message received: ', msg);
      io.emit('message', msg); // Broadcast the message to all connected clients
    });

    socket.on('disconnect', () => {
      console.log('A user disconnected');
    });
  });

  const PORT = process.env.PORT || 3000;
  httpServer.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
});
