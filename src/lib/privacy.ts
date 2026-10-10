import api, { getApiErrorMessage } from "@/lib/api";

/**
 * GDPR self-service for the signed-in customer: consent choices (Art. 7) and the personal data export (Art. 15 / 20).
 * Every consent change is kept by the API as evidence (who, when, which policy version).
 */

/** Bump when the privacy policy text changes; it is stored with every consent choice. */
export const PRIVACY_POLICY_VERSION = "2026-10";

export interface ConsentChoice {
  type: number;
  name: string;
  isGranted: boolean;
  updatedOn: string | null;
  policyVersion: string | null;
}

const LABELS: Record<string, { title: string; description: string }> = {
  MarketingEmail: { title: "Marketing emails", description: "Offers, news and vouchers sent to your email." },
  MarketingSms: { title: "Marketing SMS", description: "Offers and reminders sent to your phone." },
  MarketingPush: { title: "Push notifications", description: "Offers and updates sent to your device." },
  Personalization: { title: "Personalised recommendations", description: "Product suggestions based on what you browse and buy." },
};

export function consentLabel(choice: ConsentChoice): { title: string; description: string } {
  return LABELS[choice.name] ?? { title: choice.name.replace(/([a-z])([A-Z])/g, "$1 $2"), description: "" };
}

type RawConsent = { Type: number; Name: string; IsGranted: boolean; UpdatedOn: string | null; PolicyVersion: string | null };

function map(raw: RawConsent[] | undefined): ConsentChoice[] {
  return (raw ?? []).map((c) => ({
    type: c.Type,
    name: c.Name,
    isGranted: c.IsGranted,
    updatedOn: c.UpdatedOn,
    policyVersion: c.PolicyVersion,
  }));
}

export async function fetchConsents(): Promise<ConsentChoice[]> {
  const res = await api.get("/api/v1/Customer/account/consents");
  return map((res.data as { Data?: RawConsent[] })?.Data);
}

export async function saveConsents(choices: Pick<ConsentChoice, "type" | "isGranted">[]): Promise<ConsentChoice[]> {
  const res = await api.put("/api/v1/Customer/account/consents", {
    Consents: choices.map((c) => ({ Type: c.type, IsGranted: c.isGranted })),
    Source: "Web",
    PolicyVersion: PRIVACY_POLICY_VERSION,
  });
  return map((res.data as { Data?: RawConsent[] })?.Data);
}

/** Downloads everything the shop holds about the customer as a JSON file. */
export async function downloadMyData(): Promise<void> {
  const res = await api.get("/api/v1/Customer/account/export-data", { responseType: "blob" });
  const blob = res.data as Blob;
  const url = URL.createObjectURL(blob);
  try {
    const link = document.createElement("a");
    link.href = url;
    link.download = `my-data-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
  } finally {
    URL.revokeObjectURL(url);
  }
}

export function privacyErrorMessage(error: unknown, fallback: string): string {
  const status = (error as { response?: { status?: number } })?.response?.status;
  if (status === 429) return "Too many requests. Please wait a moment and try again.";
  return getApiErrorMessage(error, fallback);
}
