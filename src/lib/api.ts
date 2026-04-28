// NeonDB-only: all data access goes through edge functions

const PROJECT_ID = import.meta.env.VITE_SUPABASE_PROJECT_ID;
const ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

const BASE_URL = `https://${PROJECT_ID}.supabase.co/functions/v1`;

interface InvokeOptions {
  method?: string;
  body?: any;
  params?: Record<string, string>;
}

export async function invokeFunction(functionName: string, options: InvokeOptions = {}) {
  const { method = "GET", body, params } = options;

  let url = `${BASE_URL}/${functionName}`;
  if (params) {
    const searchParams = new URLSearchParams(params);
    url += `?${searchParams.toString()}`;
  }

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "apikey": ANON_KEY,
  };

  const fetchOptions: RequestInit = {
    method,
    headers,
  };

  if (body && method !== "GET") {
    fetchOptions.body = JSON.stringify(body);
  }

  // Retry transient errors (503 cold starts, network blips) with exponential backoff + jitter
  const maxAttempts = 5;
  let lastErr: any;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const response = await fetch(url, fetchOptions);
      if (response.ok) return response.json();

      const errBody = await response.text();
      // Retry on transient server errors and edge runtime degradation
      const isTransient =
        response.status === 503 ||
        response.status === 502 ||
        response.status === 504 ||
        response.status === 429 ||
        /SUPABASE_EDGE_RUNTIME_SERVICE_DEGRADED|temporarily unavailable/i.test(errBody);
      if (isTransient && attempt < maxAttempts) {
        const delay = Math.min(2000, 300 * 2 ** (attempt - 1)) + Math.random() * 200;
        await new Promise((r) => setTimeout(r, delay));
        continue;
      }
      throw new Error(`API error ${response.status}: ${errBody}`);
    } catch (err: any) {
      lastErr = err;
      // Network errors — retry
      if (attempt < maxAttempts && (err?.name === "TypeError" || /NetworkError|Failed to fetch/i.test(err?.message ?? ""))) {
        const delay = Math.min(2000, 300 * 2 ** (attempt - 1)) + Math.random() * 200;
        await new Promise((r) => setTimeout(r, delay));
        continue;
      }
      throw err;
    }
  }
  throw lastErr ?? new Error("Request failed");
}
