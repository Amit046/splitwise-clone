const { Server } = require('socket.io');
const { corsOrigin } = require('../config/env');

/**
 * Initializes Socket.IO on the given HTTP server.
 * Namespaces/handlers (e.g. expense chat) are registered separately
 * once built in Section 11.
 */
function initSocket(httpServer) {
  const io = new Server(httpServer, {
    cors: {
      origin: corsOrigin,
      methods: ['GET', 'POST'],
    },
  });

  io.on('connection', (socket) => {
    console.log(`Socket connected: ${socket.id}`);

    // Client joins an expense's chat room to receive real-time comments
    socket.on('join_expense', (expenseId) => {
      socket.join(`expense:${expenseId}`);
    });

    socket.on('leave_expense', (expenseId) => {
      socket.leave(`expense:${expenseId}`);
    });

    socket.on('disconnect', () => {
      console.log(`Socket disconnected: ${socket.id}`);
    });
  });

  return io;
}

module.exports = initSocket;
