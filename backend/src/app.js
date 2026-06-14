const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const { corsOrigin, nodeEnv } = require('./config/env');
const apiRoutes = require('./routes');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');

const app = express();

// ---------- Global middleware ----------
app.use(cors({ origin: corsOrigin, credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Logging: 'dev' format in development, 'combined' in production
app.use(morgan(nodeEnv === 'production' ? 'combined' : 'dev'));

// ---------- API routes (versioned under /api/v1) ----------
app.use('/api/v1', apiRoutes);

// ---------- 404 + centralized error handling (must be last) ----------
app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
