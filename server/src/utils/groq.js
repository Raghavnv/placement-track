const env = require('../config/env');
const ApiError = require('./ApiError');

// Groq's OpenAI-compatible chat API: https://console.groq.com/docs/api-reference
const BASE_URL = 'https://api.groq.com/openai/v1/chat/completions';
const TIMEOUT_MS = 60000;

const isConfigured = () => Boolean(env.groqApiKey);

// Asks the model for one JSON object matching `schema` and returns it parsed.
// The caller still cleans the result: models can drift from a schema.
async function chatJson({ system, user, schemaName, schema, maxTokens = 4096 }) {
  if (!isConfigured()) {
    throw new ApiError(503, 'AI_NOT_CONFIGURED', "The AI coach isn't set up yet. The Groq API key is missing on the server.");
  }

  let response;
  try {
    response = await fetch(BASE_URL, {
      method: 'POST',
      headers: { Authorization: `Bearer ${env.groqApiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: env.groqModel,
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: user },
        ],
        response_format: { type: 'json_schema', json_schema: { name: schemaName, schema } },
        reasoning_effort: 'medium',
        max_completion_tokens: maxTokens,
      }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch (error) {
    console.error(`Groq request failed: ${error.message}`);
    throw new ApiError(502, 'AI_PROVIDER_ERROR', "Couldn't reach the AI coach. Please try again in a bit.");
  }

  if (response.status === 429) {
    // Free-tier limits are per minute and per day.
    throw new ApiError(429, 'AI_BUSY', 'The AI coach is busy right now. Please try again in a minute.');
  }
  if (!response.ok) {
    // 401 means GROQ_API_KEY is wrong; 400 usually means the model rejected the request shape.
    console.error(`Groq responded ${response.status}: ${(await response.text()).slice(0, 300)}`);
    throw new ApiError(502, 'AI_PROVIDER_ERROR', "The AI coach couldn't answer right now. Please try again in a bit.");
  }

  const body = await response.json();
  try {
    return JSON.parse(body.choices?.[0]?.message?.content);
  } catch {
    console.error(`Groq returned non-JSON content (finish_reason: ${body.choices?.[0]?.finish_reason})`);
    throw new ApiError(502, 'AI_PROVIDER_ERROR', 'The AI coach gave an unreadable answer. Please try again.');
  }
}

module.exports = { isConfigured, chatJson };
