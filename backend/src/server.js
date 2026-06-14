const http = require('http');
const app = require('./app');
const initSocket = require('./sockets');
const { port } = require('./config/env');
const pool = require('./config/db');

const server = http.createServer(app);

// Initialize Socket.IO and attach to app so controllers can emit events
const io = initSocket(server);
app.set('io', io);

server.listen(port, async () => {
  console.log(`Server running on port ${port}`);

  // Sanity-check DB connection on startup
  try {
    await pool.query('SELECT 1');
    console.log('Database connection established');
  } catch (err) {
    console.error('Database connection failed:', err.message);
  }
});
