const env = require('./config/env');
const connectDB = require('./config/db');
const app = require('./app');

async function start() {
  env.assertEnv();
  await connectDB(env.mongoUri);

  const server = app.listen(env.port, () => {
    console.log(`PlacementTrack API listening on port ${env.port} (${env.nodeEnv})`);
  });

  const shutdown = (signal) => {
    console.log(`${signal} received, shutting down`);
    server.close(() => process.exit(0));
  };
  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

start().catch((err) => {
  console.error('Failed to start server:', err.message);
  process.exit(1);
});
