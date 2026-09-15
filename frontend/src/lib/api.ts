const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:4000";

export class ApiError extends Error {
  status: number;
  details?: unknown;
  constructor(status: number, message: string, details?: unknown) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(options.headers ?? {}),
    },
    ...options,
  });

  let body: any = null;
  try {
    body = await res.json();
  } catch {
    body = null;
  }

  if (!res.ok) {
    throw new ApiError(
      res.status,
      body?.error ?? `Request failed (${res.status})`,
      body?.details
    );
  }
  return body as T;
}

export const api = {
  register: (data: {
    username: string;
    email: string;
    password: string;
    confirmPassword: string;
  }) =>
    request<{ message: string }>("/api/auth/register", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  login: (data: { identifier: string; password: string }) =>
    request<{ user: any }>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  logout: () =>
    request<{ message: string }>("/api/auth/logout", { method: "POST" }),

  me: () =>
    request<{ user: any }>("/api/auth/me"),

  dashboard: () => request<any>("/api/dashboard"),

  claimDaily: () =>
    request<{ message: string; points: number }>("/api/dashboard/claim-daily", {
      method: "POST",
    }),

  doroWot: () => request<any>("/api/doro-wot"),

  purchase: () =>
    request<any>("/api/doro-wot/purchase", { method: "POST" }),

  submitFlag: (flag: string) =>
    request<{ message: string; solvedAt: string }>(
      "/api/challenges/doro-wot/submit",
      { method: "POST", body: JSON.stringify({ flag }) }
    ),
};