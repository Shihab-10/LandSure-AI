export type ApiRole = "admin" | "reviewer" | "viewer" | "demo";

export type AuthUser = {
  username: string;
  role: ApiRole;
  is_demo?: boolean;
};

export type ApiRequestOptions = RequestInit & {
  token?: string;
  timeoutMs?: number;
};

export const TOKEN_STORAGE_KEY = "landsure_auth_token";
export const USER_STORAGE_KEY = "landsure_auth_user";

// In local development, if VITE_API_URL is unset, default to "" (using Vite dev proxy) to prevent CORS
// In production (e.g. Cloudflare Pages), default to the live Render backend
const envUrl = import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL;
export const API_URL = envUrl !== undefined && envUrl !== null && envUrl !== ""
  ? envUrl.replace(/\/$/, "")
  : (typeof window !== "undefined" && (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1")
      ? ""
      : "https://landsure-ai-backend.onrender.com");

export const DEMO_MODE = String(import.meta.env.VITE_DEMO_MODE || "false").toLowerCase() === "true";

export function isJwtExpired(token: string): boolean {
  if (!token || typeof token !== "string") return true;
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return true;
    const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split("")
        .map(c => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    );
    const payload = JSON.parse(jsonPayload);
    if (!payload.exp) return false;
    // Buffer of 10 seconds before actual expiration
    return Date.now() / 1000 >= (payload.exp - 10);
  } catch {
    return true;
  }
}

export function decodeJwtUser(token: string): AuthUser | null {
  if (!token || typeof token !== "string" || isJwtExpired(token)) return null;
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split("")
        .map(c => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    );
    const payload = JSON.parse(jsonPayload);
    return {
      username: payload.sub || "demo-visitor",
      role: (payload.role as ApiRole) || "demo",
      is_demo: Boolean(payload.is_demo),
    };
  } catch {
    return null;
  }
}

export async function apiRequest<T>(path: string, options: ApiRequestOptions = {}): Promise<T> {
  const { token, headers, timeoutMs = 25000, ...rest } = options;

  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), timeoutMs);

  const isFormData = typeof FormData !== "undefined" && rest.body instanceof FormData;

  try {
    const fullUrl = `${API_URL}${path}`;
    const response = await fetch(fullUrl, {
      ...rest,
      signal: controller.signal,
      headers: {
        ...(rest.body && !isFormData ? { "Content-Type": "application/json" } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...headers,
      },
    });

    const contentType = response.headers.get("content-type") || "";
    const payload = contentType.includes("application/json")
      ? await response.json().catch(() => null)
      : await response.text().catch(() => "");

    if (!response.ok) {
      let detail = `Request failed (${response.status})`;
      if (payload && typeof payload === "object") {
        if ("detail" in payload) {
          const d = (payload as any).detail;
          if (typeof d === "string") {
            detail = d;
          } else if (Array.isArray(d)) {
            detail = d.map((item: any) => item.msg || item.message || JSON.stringify(item)).join("; ");
          } else if (typeof d === "object" && d !== null) {
            detail = d.message || d.msg || JSON.stringify(d);
          }
        } else if ("message" in payload) {
          detail = String((payload as any).message);
        }
      } else if (typeof payload === "string" && payload.length > 0) {
        detail = payload;
      }

      throw new Error(detail);
    }

    return (payload ?? ({} as T)) as T;
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error("Request timed out. The backend server might be cold-starting or unreachable.");
    }
    if (error instanceof TypeError && error.message.includes("Failed to fetch")) {
      throw new Error("Failed to connect to backend server. Please verify backend is running on port 8000 or Render service is active.");
    }

    throw error;
  } finally {
    window.clearTimeout(timeout);
  }
}

export type LoginResult = {
  token: string;
  user: AuthUser;
};

export async function loginUser(username: string, password: string): Promise<LoginResult> {
  const data = await apiRequest<{
    access_token?: string;
    token?: string;
    username?: string;
    role?: ApiRole;
    is_demo?: boolean;
  }>("/api/v1/auth/login", {
    method: "POST",
    body: JSON.stringify({ username, password }),
  });

  const token = data.access_token ?? data.token;

  if (!token) {
    throw new Error("Login response did not include an access token.");
  }

  const user: AuthUser = {
    username: data.username || username,
    role: data.role || "viewer",
    is_demo: Boolean(data.is_demo),
  };

  return { token, user };
}

export async function fetchCurrentUser(token: string): Promise<AuthUser> {
  return apiRequest<AuthUser>("/api/v1/auth/me", { token });
}

export async function loginDemoUser(onProgress?: (msg: string) => void): Promise<LoginResult> {
  const maxAttempts = 3;
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      if (attempt > 1 && onProgress) {
        onProgress(`সার্ভার চালু করা হচ্ছে (${attempt}/${maxAttempts})...`);
      }

      const data = await apiRequest<{
        access_token?: string;
        token?: string;
        username?: string;
        role?: ApiRole;
        is_demo?: boolean;
      }>("/api/v1/auth/demo", {
        method: "POST",
        timeoutMs: attempt === 1 ? 15000 : 35000,
      });

      const token = data.access_token ?? data.token;

      if (!token) {
        throw new Error("Demo login response did not include an access token.");
      }

      const user: AuthUser = {
        username: data.username || "demo-visitor",
        role: data.role || "demo",
        is_demo: data.is_demo !== undefined ? data.is_demo : true,
      };

      return { token, user };
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      // Stop retrying on definite authorization/client errors
      if (lastError.message.includes("401") || lastError.message.includes("403") || lastError.message.includes("429")) {
        throw lastError;
      }
      if (attempt < maxAttempts) {
        if (onProgress) {
          onProgress("ব্যাকএন্ড সক্রিয় হতে সামান্য সময় লাগছে (Waking up, please wait)...");
        }
        await new Promise(res => setTimeout(res, 2500));
      }
    }
  }

  throw lastError ?? new Error("Demo authentication failed. Backend server is unreachable.");
}

