require('dotenv').config();

const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  isProduction: process.env.NODE_ENV === 'production',
  isTest: process.env.NODE_ENV === 'test',
  port: Number(process.env.PORT) || 5050,
  mongoUri: process.env.MONGO_URI,
  jwtSecret: process.env.JWT_SECRET,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  // Comma-separated list. Entries may use * as a wildcard, e.g. https://placement-track-*.vercel.app
  clientUrls: (process.env.CLIENT_URL || 'http://localhost:5173')
    .split(',')
    .map((url) => url.trim().replace(/\/$/, ''))
    .filter(Boolean),
  // Optional: without these the Jobs tab says job search isn't set up. Keys from developer.adzuna.com
  adzunaAppId: process.env.ADZUNA_APP_ID,
  adzunaAppKey: process.env.ADZUNA_APP_KEY,
  adzunaCountry: process.env.ADZUNA_COUNTRY || 'in',
  // Optional: without this the Resume Coach says it isn't set up. Free key at https://console.groq.com
  groqApiKey: process.env.GROQ_API_KEY,
  groqModel: process.env.GROQ_MODEL || 'openai/gpt-oss-120b',
  // Optional notification emails (Brevo). EMAIL_FROM like "PlacementTrack <noreply@yourcollege.edu>", a sender verified in Brevo.
  brevoApiKey: process.env.BREVO_API_KEY,
  emailFrom: process.env.EMAIL_FROM,
};

// Fail fast on boot instead of failing on the first request.
function assertEnv() {
  const missing = ['MONGO_URI', 'JWT_SECRET'].filter((key) => !process.env[key]);
  if (missing.length) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}. See server/.env.example`);
  }
  if (env.isProduction && env.jwtSecret.length < 32) {
    throw new Error('JWT_SECRET must be at least 32 characters in production');
  }
}

// Links in emails go to the first CLIENT_URL that isn't a wildcard (APP_URL overrides it).
env.appUrl = (process.env.APP_URL || env.clientUrls.find((url) => !url.includes('*')) || '').replace(/\/$/, '');

module.exports = { ...env, assertEnv };
