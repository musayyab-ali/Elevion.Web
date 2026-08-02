// // import axios from "axios";
// // import Cookies from "js-cookie";
// // import {
// //   AUTH_EXPIRES_KEY,
// //   ACCESS_TOKEN_KEY,
// //   AUTH_COOKIE_KEYS,
// // } from "@/lib/auth-keys";

// // const api = axios.create({
// //   baseURL: process.env.NEXT_PUBLIC_API_KEY?.trim(),
// //   headers: {
// //     "Content-Type": "application/json",
// //     "api-security-key": process.env.NEXT_PUBLIC_SECURITY_KEY?.trim() ?? "",
// //   },
// // });

// // api.interceptors.request.use((config) => {
// //   if (typeof window !== "undefined") {
// //     const token = Cookies.get(ACCESS_TOKEN_KEY);
// //     const expiresAt = Cookies.get(AUTH_EXPIRES_KEY);

// //     if (token && expiresAt && Date.now() <= Number(expiresAt)) {
// //       config.headers = config.headers ?? {};
// //       config.headers.Authorization = `Bearer ${token}`;
// //     }
// //   }

// //   return config;
// // });

// type AxiosLikeError = {
//   isAxiosError?: boolean;
//   response?: {
//     status: number;
//     data: unknown;
//   };
//   message?: string;
// };

// function isAxiosError(
//   error: unknown,
// ): error is AxiosLikeError & { isAxiosError: true } {
//   return (
//     typeof error === "object" &&
//     error !== null &&
//     (error as AxiosLikeError).isAxiosError === true
//   );
// }

// const MESSAGE_KEYS = [
//   "message",
//   "Message",
//   "error",
//   "Error",
//   "detail",
//   "Detail",
//   "title",
//   "Title",
// ] as const;

// function collectValidationMessages(errors: unknown): string[] {
//   if (!errors) return [];

//   if (Array.isArray(errors)) {
//     return errors.flatMap((item) => {
//       if (typeof item === "string" && item.trim()) return [item.trim()];
//       if (item && typeof item === "object") {
//         const record = item as Record<string, unknown>;
//         const message = record.Message ?? record.message;
//         if (typeof message === "string" && message.trim()) {
//           return [message.trim()];
//         }
//       }
//       return [];
//     });
//   }

//   if (typeof errors !== "object") return [];

//   return Object.values(errors as Record<string, unknown>).flatMap((value) => {
//     if (Array.isArray(value)) {
//       return value.filter(
//         (item): item is string =>
//           typeof item === "string" && item.trim().length > 0,
//       );
//     }
//     if (typeof value === "string" && value.trim()) return [value.trim()];
//     return [];
//   });
// }

// export function getApiErrorMessage(
//   error: unknown,
//   fallback = "Something went wrong. Please try again.",
// ): string {
//   if (isAxiosError(error)) {
//     const { response } = error;

//     if (!response) {
//       return "Unable to connect to the server. Please check your internet and try again.";
//     }

//     const { data, status } = response;

//     if (typeof data === "string" && data.trim()) {
//       return data.trim();
//     }

//     if (data && typeof data === "object") {
//       const body = data as Record<string, unknown>;

//       const validationMessages = collectValidationMessages(
//         body.errors ?? body.Errors,
//       );
//       if (validationMessages.length > 0) {
//         return validationMessages.join(" ");
//       }

//       for (const key of MESSAGE_KEYS) {
//         const value = body[key];
//         if (typeof value === "string" && value.trim()) {
//           return value.trim();
//         }
//       }

//       if (body.success === false) {
//         for (const key of MESSAGE_KEYS) {
//           const value = body[key];
//           if (typeof value === "string" && value.trim()) {
//             return value.trim();
//           }
//         }
//       }
//     }

//     if (status === 409) {
//       return "An account with these details already exists. Please login or use different information.";
//     }

//     if (status === 400) {
//       return fallback;
//     }

//     if (status === 401 || status === 403) {
//       return "You are not authorized to perform this action.";
//     }

//     if (status >= 500) {
//       return "Server error. Please try again later.";
//     }
//   }

//   if (error instanceof Error && error.message.trim()) {
//     return error.message.trim();
//   }

//   return fallback;
// }

// export default api;


import axios, { AxiosResponse, AxiosRequestConfig } from "axios";
import Cookies from "js-cookie";
import {
  AUTH_EXPIRES_KEY,
  ACCESS_TOKEN_KEY,
} from "@/lib/auth-keys";

// 1. Generic Response Interface
export interface ApiResponse<T = any> {
  Data: T;
  Message: string;
  Type: string;
  HttpStatusCode: number;
  success?: boolean;
}

// 2. Global Axios Module Augmentation (Taake 25 files mein change na karna pare)
declare module 'axios' {
  export interface AxiosInstance {
    get<T = any, R = ApiResponse<T>, D = any>(url: string, config?: AxiosRequestConfig<D>): Promise<R>;
    post<T = any, R = ApiResponse<T>, D = any>(url: string, data?: D, config?: AxiosRequestConfig<D>): Promise<R>;
    put<T = any, R = ApiResponse<T>, D = any>(url: string, data?: D, config?: AxiosRequestConfig<D>): Promise<R>;
    delete<T = any, R = ApiResponse<T>, D = any>(url: string, config?: AxiosRequestConfig<D>): Promise<R>;
  }
}

/**
 * On HTTPS sites (e.g. Vercel), browsers block requests to http:// APIs (mixed content).
 * Use the Next.js rewrite proxy (/api-backend) so the browser only talks HTTPS same-origin.
 */
function getApiBaseUrl(): string {
  const configured = process.env.NEXT_PUBLIC_API_KEY?.trim() || "";

  if (
    typeof window !== "undefined" &&
    window.location.protocol === "https:" &&
    configured.startsWith("http://")
  ) {
    return "/api-backend";
  }

  return configured;
}

const api = axios.create({
  baseURL: getApiBaseUrl(),
  headers: {
    "Content-Type": "application/json",
    "api-security-key": process.env.NEXT_PUBLIC_SECURITY_KEY?.trim() ?? "",
  },
});

api.interceptors.request.use((config) => {
  // Ensure baseURL stays correct if the client hydrated on HTTPS
  if (typeof window !== "undefined") {
    config.baseURL = getApiBaseUrl();

    const token = Cookies.get(ACCESS_TOKEN_KEY);
    const expiresAt = Cookies.get(AUTH_EXPIRES_KEY);

    if (token && expiresAt && Date.now() <= Number(expiresAt)) {
      config.headers = config.headers ?? {};
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});
type AxiosLikeError = {
  isAxiosError?: boolean;
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

      if (body.success === false) {
        for (const key of MESSAGE_KEYS) {
          const value = body[key];
          if (typeof value === "string" && value.trim()) {
            return value.trim();
          }
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
