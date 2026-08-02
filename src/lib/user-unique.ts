import api, { getApiErrorMessage } from "@/lib/api";

export type UserUniqueType = "email" | "phone" | "username";

export type UserUniqueCheckResult = {
  isUnique: boolean;
  message: string;
};

function readEnvelope(payload: unknown): Record<string, unknown> {
  if (!payload || typeof payload !== "object") return {};

  const record = payload as Record<string, unknown>;
  // Axios body or already-unwrapped ApiResponse
  if (record.data && typeof record.data === "object" && !("Data" in record)) {
    return record.data as Record<string, unknown>;
  }
  return record;
}

function interpretUniqueFlag(data: unknown): boolean | null {
  if (typeof data === "boolean") return data;
  if (typeof data === "number") return data === 1;
  if (typeof data === "string") {
    const lower = data.trim().toLowerCase();
    if (["true", "1", "yes", "unique"].includes(lower)) return true;
    if (["false", "0", "no", "exists", "taken"].includes(lower)) return false;
  }
  if (data && typeof data === "object") {
    const record = data as Record<string, unknown>;
    for (const key of [
      "IsUnique",
      "isUnique",
      "Unique",
      "unique",
      "Available",
      "available",
    ]) {
      const nested = interpretUniqueFlag(record[key]);
      if (nested != null) return nested;
    }
  }
  return null;
}

function defaultTakenMessage(type: UserUniqueType): string {
  switch (type) {
    case "email":
      return "This email is already registered. Please use a different email or sign in.";
    case "phone":
      return "This phone number is already registered. Please use a different number or sign in.";
    case "username":
      return "This username is already taken. Please choose another username.";
  }
}

function defaultAvailableMessage(type: UserUniqueType): string {
  switch (type) {
    case "email":
      return "Email is available.";
    case "phone":
      return "Phone number is available.";
    case "username":
      return "Username is available.";
  }
}

/**
 * GET /api/v2/Account/IsUserUnique?Value=&Type=email|phone|username
 * Type must match the kind of Value being checked.
 */
export async function checkUserIsUnique(
  value: string,
  type: UserUniqueType,
): Promise<UserUniqueCheckResult> {
  const trimmed = value.trim();
  if (!trimmed) {
    return {
      isUnique: false,
      message: `Please enter a ${type} to continue.`,
    };
  }

  try {
    const response = await api.get("/api/v2/Account/IsUserUnique", {
      params: {
        Value: trimmed,
        Type: type,
      },
    });

    const body = readEnvelope(response.data ?? response);
    const status = Number(body.HttpStatusCode ?? body.StatusCode ?? 200);
    const responseType = String(body.Type ?? "").toLowerCase();
    const message = String(body.Message ?? body.message ?? "").trim();

    if (
      status >= 400 ||
      responseType === "error" ||
      responseType === "exception"
    ) {
      return {
        isUnique: false,
        message: message || defaultTakenMessage(type),
      };
    }

    const flag = interpretUniqueFlag(body.Data ?? body.data);

    // If API only returns a message without Data, treat "exists/taken" wording as not unique.
    if (flag == null && message) {
      const lower = message.toLowerCase();
      if (
        lower.includes("already") ||
        lower.includes("exist") ||
        lower.includes("taken") ||
        lower.includes("not unique") ||
        lower.includes("in use")
      ) {
        return { isUnique: false, message: message || defaultTakenMessage(type) };
      }
      if (
        lower.includes("unique") ||
        lower.includes("available") ||
        lower.includes("success")
      ) {
        return {
          isUnique: true,
          message: message || defaultAvailableMessage(type),
        };
      }
    }

    const isUnique = flag !== false;
    return {
      isUnique,
      message: isUnique
        ? message || defaultAvailableMessage(type)
        : message || defaultTakenMessage(type),
    };
  } catch (error) {
    return {
      isUnique: false,
      message: getApiErrorMessage(error, defaultTakenMessage(type)),
    };
  }
}
