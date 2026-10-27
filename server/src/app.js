const express = require('express');
const cors = require('cors');

const app = express();

app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:5173' }));
app.use(express.json());

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

// TODO (feature/backend-api): mount routers here, e.g.
// app.use('/api/auth', authRoutes);
// app.use('/api/drives', driveRoutes);
// app.use('/api/applications', applicationRoutes);
// app.use('/api/admin', adminRoutes);
// then add the 404 handler and the central error handler (see docs/api-contract.md).

module.exports = app;
