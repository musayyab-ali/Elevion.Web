export enum CampaignType {
  Sale = 1,
  PromoCode = 2,
  OrderValue = 3,
  PaymentMethod = 4,
}

export enum DiscountValueType {
  Percentage = 1,
  Amount = 2,
}

export type DiscountCampaign = {
  campaignType?: number | null;
  campaignTypeDisplayName?: string | null;
  discount?: number | null;
  discountValueType?: number | null;
};

const CAMPAIGN_LABELS: Record<number, string> = {
  [CampaignType.Sale]: "Sale",
  [CampaignType.PromoCode]: "Promo Code",
  [CampaignType.OrderValue]: "Order Value",
  [CampaignType.PaymentMethod]: "Payment Method",
};

/**
 * Label comes from CampaignType first (matches backend enum Display Name).
 * CampaignTypeDisplayName is only a fallback when type is missing.
 */
export function getCampaignLabel(
  campaignType?: number | null,
  displayName?: string | null,
): string {
  const type = Number(campaignType) || 0;
  if (CAMPAIGN_LABELS[type]) return CAMPAIGN_LABELS[type];

  const apiLabel = displayName?.trim();
  if (!apiLabel) return "Discount";

  const normalized = apiLabel.replace(/\s+Campaign$/i, "").trim();
  if (/promo/i.test(normalized)) return CAMPAIGN_LABELS[CampaignType.PromoCode];
  if (/sale/i.test(normalized)) return CAMPAIGN_LABELS[CampaignType.Sale];
  if (/order\s*value/i.test(normalized))
    return CAMPAIGN_LABELS[CampaignType.OrderValue];
  if (/payment/i.test(normalized))
    return CAMPAIGN_LABELS[CampaignType.PaymentMethod];

  return normalized || "Discount";
}

export function getCampaignDiscountLabel(
  campaignType?: number | null,
  displayName?: string | null,
): string {
  const label = getCampaignLabel(campaignType, displayName);
  return label === "Discount" ? label : `${label} Discount`;
}

export function formatDiscountValue(
  discount?: number | null,
  discountValueType?: number | null,
): string | null {
  const value = Number(discount) || 0;
  if (value <= 0) return null;

  return Number(discountValueType) === DiscountValueType.Percentage
    ? `${value}%`
    : `Rs. ${value.toLocaleString("en-PK")}`;
}

/**
 * Product badge / price chip from CampaignType + DiscountValueType.
 * Examples: "-2% Sale", "-Rs. 2 Promo Code"
 *
 * Product-level discounts always come from a campaign, so an unknown type
 * falls back to Sale instead of the generic "Discount" word.
 */
export function formatCampaignDiscount(campaign: DiscountCampaign): string | null {
  const value = formatDiscountValue(
    campaign.discount,
    campaign.discountValueType,
  );
  if (!value) return null;

  const label = getCampaignLabel(
    campaign.campaignType,
    campaign.campaignTypeDisplayName,
  );

  return `-${value} ${label === "Discount" ? CAMPAIGN_LABELS[CampaignType.Sale] : label}`;
}

export function applyDiscount(
  price: number,
  discount?: number | null,
  discountValueType?: number | null,
): number {
  const basePrice = Math.max(0, Number(price) || 0);
  const value = Math.max(0, Number(discount) || 0);
  if (!basePrice || !value) return basePrice;

  const discounted =
    Number(discountValueType) === DiscountValueType.Percentage
      ? basePrice * (1 - value / 100)
      : basePrice - value;

  return Math.max(0, Math.round(discounted * 100) / 100);
}

export type CampaignDiscountTotal = {
  campaignType: number;
  campaignTypeDisplayName?: string | null;
  amount: number;
};

export function groupCampaignDiscounts(
  campaigns: Array<DiscountCampaign & { amount?: number | null }>,
): CampaignDiscountTotal[] {
  const totals = new Map<number, CampaignDiscountTotal>();

  for (const campaign of campaigns) {
    const amount = Math.max(0, Number(campaign.amount) || 0);
    if (!amount) continue;
    const campaignType = Number(campaign.campaignType) || 0;
    const existing = totals.get(campaignType);
    totals.set(campaignType, {
      campaignType,
      campaignTypeDisplayName:
        campaign.campaignTypeDisplayName ??
        existing?.campaignTypeDisplayName ??
        null,
      amount: (existing?.amount ?? 0) + amount,
    });
  }

  return Array.from(totals.values());
}

export function getCartCampaignDiscounts(
  items: Array<{
    originPrice?: number;
    price?: number;
    quantity?: number;
    lineTotal?: number;
    campaignType?: number;
    campaignTypeDisplayName?: string | null;
  }>,
  totalDiscount: number,
): CampaignDiscountTotal[] {
  const grouped = groupCampaignDiscounts(
    items.map((item) => {
      const quantity = Math.max(1, Number(item.quantity) || 1);
      const gross = Math.max(
        0,
        (Number(item.originPrice) || Number(item.price) || 0) * quantity,
      );
      return {
        // Line-level savings always come from a product campaign (Sale by default).
        campaignType: Number(item.campaignType) || CampaignType.Sale,
        campaignTypeDisplayName: item.campaignTypeDisplayName,
        amount: Math.max(0, gross - (Number(item.lineTotal) || 0)),
      };
    }),
  );

  const knownTotal = grouped.reduce((sum, item) => sum + item.amount, 0);
  const remainder = Math.max(0, (Number(totalDiscount) || 0) - knownTotal);
  if (remainder > 0.009) {
    grouped.push({
      campaignType: 0,
      campaignTypeDisplayName: null,
      amount: remainder,
    });
  }

  return grouped;
}
