import axios from 'axios';

export const TOKEN_KEY = 'pt_token';
const SLOW_REQUEST_MS = 4000;

export function getToken() {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setToken(token) {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    // Storage blocked (private mode): the session just won't survive a refresh.
  }
}

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  timeout: 70000, // Render's free tier can take up to a minute to wake up
});

/* ---- Session expiry -------------------------------------------------- */
let unauthorizedHandler = null;
export const setUnauthorizedHandler = (fn) => {
  unauthorizedHandler = fn;
};

/* ---- Slow-request signal (drives the "waking up the server" banner) -- */
const slowListeners = new Set();
let slowCount = 0;
export function subscribeSlowRequests(listener) {
  slowListeners.add(listener);
  return () => slowListeners.delete(listener);
}
const notifySlow = () => slowListeners.forEach((fn) => fn(slowCount > 0));

function trackStart(config) {
  config.slowTimer = setTimeout(() => {
    config.isSlow = true;
    slowCount += 1;
    notifySlow();
  }, SLOW_REQUEST_MS);
}

function trackEnd(config) {
  if (!config) return;
  clearTimeout(config.slowTimer);
  if (config.isSlow) {
    config.isSlow = false;
    slowCount -= 1;
    notifySlow();
  }
}

/* ---- Error normalisation: every rejection is { status, code, message, details, fieldErrors } */
function normaliseError(error) {
  if (!error.response) {
    return {
      status: 0,
      code: error.code === 'ECONNABORTED' ? 'TIMEOUT' : 'NETWORK_ERROR',
      message: "Can't reach the server. Check your connection and try again.",
      details: [],
      fieldErrors: {},
    };
  }
  const apiError = error.response.data?.error || {};
  const details = apiError.details || [];
  return {
    status: error.response.status,
    code: apiError.code || 'INTERNAL_ERROR',
    message: apiError.message || 'Something went wrong. Please try again.',
    details,
    fieldErrors: Object.fromEntries(details.map((d) => [d.field, d.message])),
  };
}

api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  trackStart(config);
  return config;
});

api.interceptors.response.use(
  (response) => {
    trackEnd(response.config);
    return response;
  },
  (error) => {
    trackEnd(error.config);
    const normalised = normaliseError(error);
    const sentToken = Boolean(error.config?.headers?.Authorization);
    if (normalised.status === 401 && sentToken) unauthorizedHandler?.();
    return Promise.reject(normalised);
  },
);

export default api;
