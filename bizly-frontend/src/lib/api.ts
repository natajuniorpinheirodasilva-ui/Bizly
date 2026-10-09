import Cookies from "js-cookie";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

export async function apiFetch(endpoint: string, options: RequestInit = {}) {
  const path = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
  
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  }

  if (typeof window !== "undefined") {
    const token = Cookies.get("bizly_token");
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }
  }
  
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      ...headers,
      ...options.headers,
    },
  })

  if (response.status === 401 && typeof window !== "undefined" && !window.location.pathname.startsWith("/login")) {
    Cookies.remove("bizly_token");
    window.location.href = "/login";
  }

  return response;
}
