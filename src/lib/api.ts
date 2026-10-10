import axios from "axios";
import { API_PROXY_PATH, API_TIMEOUT_MS, API_URL } from "@/lib/config";

// 1. Generic Response Interface
export interface ApiResponse<T = any> {
  Data: T;
  Message: string;
  Type: string;
  HttpStatusCode: number;
  success?: boolean;
}

// NOTE: axios returns an AxiosResponse, so the body is at response.data (response.data.Data for the API envelope).
// A previous global augmentation claimed calls returned the envelope directly, which was wrong and hid real bugs.

const isBrowser = typeof window !== "undefined";

/**
 * In the browser every call goes through the same-origin /api-backend proxy (src/app/api-backend): it adds the API security key
 * and the session tokens (httpOnly cookies) and refreshes expired tokens, so none of that is visible to page scripts, and an
 * https page never talks to an http API directly (no mixed content). On the server (SSR) the API is called directly.
 */
function getApiBaseUrl(): string {
  if (isBrowser) return API_PROXY_PATH;
  return (process.env.API_BACKEND_URL || API_URL).replace(/\/+$/, "");
}

const api = axios.create({
  baseURL: getApiBaseUrl(),
  timeout: API_TIMEOUT_MS,
  headers: {
    "Content-Type": "application/json",
  },
});

let sessionExpiredHandler: (() => void) | null = null;

/** Registered by lib/auth.ts: called when the server reports that the login session is over. */
export function onSessionExpired(handler: () => void) {
  sessionExpiredHandler = handler;
}

api.interceptors.request.use((config) => {
  config.baseURL = getApiBaseUrl();
  if (!isBrowser) {
    // Server-side calls (page metadata) are public: they only need the API security key, which is a server-only setting.
    config.headers.set("api-security-key", process.env.API_SECURITY_KEY ?? "");
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (isBrowser && error?.response?.status === 401 && error.response.headers?.["x-session-expired"] === "1") {
      sessionExpiredHandler?.();
    }
    return Promise.reject(error);
  },
);

type AxiosLikeError = {
  isAxiosError?: boolean;
  code?: string;
  response?: {
    status: number;
    data: unknown;
  };
  message?: string;
};

function isAxiosError(
  error: unknown,
): error is AxiosLikeError & { isAxiosError: true } {
  return (
    typeof error === "object" &&
    error !== null &&
    (error as AxiosLikeError).isAxiosError === true
  );
}

const MESSAGE_KEYS = [
  "message",
  "Message",
  "error",
  "Error",
  "detail",
  "Detail",
  "title",
  "Title",
] as const;

function collectValidationMessages(errors: unknown): string[] {
  if (!errors) return [];

  if (Array.isArray(errors)) {
    return errors.flatMap((item) => {
      if (typeof item === "string" && item.trim()) return [item.trim()];
      if (item && typeof item === "object") {
        const record = item as Record<string, unknown>;
        const message = record.Message ?? record.message;
        if (typeof message === "string" && message.trim()) {
          return [message.trim()];
        }
      }
      return [];
    });
  }

  if (typeof errors !== "object") return [];

  return Object.values(errors as Record<string, unknown>).flatMap((value) => {
    if (Array.isArray(value)) {
      return value.filter(
        (item): item is string =>
          typeof item === "string" && item.trim().length > 0,
      );
    }
    if (typeof value === "string" && value.trim()) return [value.trim()];
    return [];
  });
}

export function getApiErrorMessage(
  error: unknown,
  fallback = "Something went wrong. Please try again.",
): string {
  if (isAxiosError(error)) {
    const { response } = error;

    if (!response) {
      if (error.code === "ECONNABORTED") {
        return "The server took too long to respond. Please try again.";
      }
      return "Unable to connect to the server. Please check your internet and try again.";
    }

    const { data, status } = response;

    if (typeof data === "string" && data.trim()) {
      return data.trim();
    }

    if (data && typeof data === "object") {
      const body = data as Record<string, unknown>;

      const validationMessages = collectValidationMessages(
        body.errors ?? body.Errors,
      );
      if (validationMessages.length > 0) {
        return validationMessages.join(" ");
      }

      for (const key of MESSAGE_KEYS) {
        const value = body[key];
        if (typeof value === "string" && value.trim()) {
          return value.trim();
        }
      }
    }

    if (status === 409) {
      return "An account with these details already exists. Please login or use different information.";
    }

    if (status === 400) {
      return fallback;
    }

    if (status === 401 || status === 403) {
      return "You are not authorized to perform this action.";
    }

    if (status >= 500) {
      return "Server error. Please try again later.";
    }
  }

  if (error instanceof Error && error.message.trim()) {
    return error.message.trim();
  }

  return fallback;
}

export default api;
