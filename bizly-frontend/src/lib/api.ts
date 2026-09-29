const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

export async function apiFetch(endpoint: string, options: RequestInit = {}) {
  const path = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
  
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  return response;
}
