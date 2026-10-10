import api, { getApiErrorMessage } from "@/lib/api";

/**
 * Customer rewards: partner vouchers, loyalty tier and the referral ("invite friends") program.
 * The API answers in PascalCase inside { Message, StatusCode, Data }; the page works with the camelCase shapes below.
 */

export interface Voucher {
  voucherId: number;
  partnerName: string;
  partnerLogoUrl: string | null;
  terms: string | null;
  code: string;
  value: number;
  expiresOn: string | null;
  status: number;
  statusName: string;
  issuedOn: string | null;
  redeemedOn: string | null;
}

export interface TierLevel {
  name: string;
  color: string | null;
  minSpend: number;
  benefits: string | null;
  reached: boolean;
  current: boolean;
}

export interface Loyalty {
  tiersEnabled: boolean;
  lifetimeSpend: number;
  rewardPoints: number;
  tier: string | null;
  tierColor: string | null;
  benefits: string | null;
  nextTier: string | null;
  spendToNextTier: number;
  progress: number;
  levels: TierLevel[];
}

export interface MyReferral {
  code: string;
  invited: number;
  pending: number;
  qualified: number;
  wasReferred: boolean;
  canApplyCode: boolean;
}

/** Lower-cases the first letter of every key, deeply, so PascalCase and camelCase answers look the same. */
export function camelize<T = unknown>(value: unknown): T {
  if (Array.isArray(value)) return value.map((v) => camelize(v)) as unknown as T;
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const key of Object.keys(value as Record<string, unknown>)) {
      out[key.charAt(0).toLowerCase() + key.slice(1)] = camelize((value as Record<string, unknown>)[key]);
    }
    return out as T;
  }
  return value as T;
}

export function isVoucherUsable(v: Voucher): boolean {
  return ["Issued", "Delivered", "Viewed"].includes(v.statusName);
}

export function rewardsErrorMessage(error: unknown, fallback: string): string {
  const status = (error as { response?: { status?: number } })?.response?.status;
  if (status === 404) return "This feature is not available yet.";
  return getApiErrorMessage(error, fallback);
}

/** Opening the list marks unseen vouchers as viewed on the server. */
export async function fetchMyVouchers(): Promise<Voucher[]> {
  const res = await api.get("/api/v1/CustomerRewards/GetMyVouchers");
  return camelize<Voucher[]>((res.data as { Data?: unknown })?.Data ?? []);
}

export async function fetchMyLoyalty(): Promise<Loyalty> {
  const res = await api.get("/api/v1/CustomerRewards/GetMyLoyalty");
  return camelize<Loyalty>((res.data as { Data?: unknown })?.Data ?? { tiersEnabled: false, levels: [] });
}

export async function fetchMyReferral(): Promise<MyReferral> {
  const res = await api.get("/api/v1/CustomerRewards/GetMyReferral");
  return camelize<MyReferral>((res.data as { Data?: unknown })?.Data);
}

/** Rejects with the API's own message when the code cannot be used. */
export async function applyReferralCode(code: string): Promise<string> {
  const res = await api.post("/api/v1/CustomerRewards/ApplyReferralCode", { Code: code.trim() });
  return (res.data as { Message?: string })?.Message ?? "Referral code applied.";
}
