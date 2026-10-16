export type ApiRole = "admin" | "reviewer" | "viewer";

export type AuthUser = {
  username: string;
  role: ApiRole;
};

export type ApiRequestOptions = RequestInit & {
  token?: string;
};

export const DEFAULT_API_URL = "http://127.0.0.1:8000";
export const API_URL = (import.meta.env.VITE_API_URL || DEFAULT_API_URL).replace(/\/$/, "");
export const DEMO_MODE = String(import.meta.env.VITE_DEMO_MODE || "false").toLowerCase() === "true";

export async function apiRequest<T>(path: string, options: ApiRequestOptions = {}): Promise<T> {
  const { token, headers, ...rest } = options;

  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 15000);

  try {
    const response = await fetch(`${API_URL}${path}`, {
      ...rest,
      signal: controller.signal,
      headers: {
        ...(rest.body ? { "Content-Type": "application/json" } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...headers,
      },
    });

    const contentType = response.headers.get("content-type") || "";
    const payload = contentType.includes("application/json")
      ? await response.json().catch(() => null)
      : await response.text().catch(() => "");

    if (!response.ok) {
      const detail =
        typeof payload === "object" && payload && "detail" in payload
          ? String((payload as { detail?: string }).detail)
          : typeof payload === "string" && payload.length > 0
            ? payload
            : `Request failed (${response.status})`;

      throw new Error(detail);
    }

    return (payload ?? ({} as T)) as T;
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error("The request timed out. Please try again.");
    }

    throw error;
  } finally {
    window.clearTimeout(timeout);
  }
}

export async function loginUser(username: string, password: string) {
  const data = await apiRequest<{ access_token?: string; token?: string }>("/api/v1/auth/login", {
    method: "POST",
    body: JSON.stringify({ username, password }),
  });

  const token = data.access_token ?? data.token;

  if (!token) {
    throw new Error("Login response did not include an access token.");
  }

  return token;
}

export async function fetchCurrentUser(token: string): Promise<AuthUser> {
  return apiRequest<AuthUser>("/api/v1/auth/me", { token });
}
