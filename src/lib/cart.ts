import api from "@/lib/api";
import { isAuthenticated } from "@/lib/auth";
import { RelatedProduct } from "@/lib/product-details";
import { ProductType } from "@/type/ProductType";

export interface CartItemVariant {
  VariantGroupId: number;
  VariantId: number;
  VariantName: string;
  VariantGroup: string;
}

export interface ApiCartItem {
  CartId?: number | string;
  CartItemId?: number | string;
  CampaignId?: number;
  DiscountValueType?: number;
  Discount?: number;
  IsCampaignApplied?: boolean;
  ProductId: number;
  CategoryId?: number;
  ProductName?: string;
  Name?: string;
  ProductImage?: string;
  ThumbnailImagePath?: string;
  IconImagePath?: string;
  LargeImagePath?: string;
  Category?: {
    CategoryId: number;
    CategoryName: string;
    CategoryDescription: string;
  };
  relatedProductList?: RelatedProduct[];
  cartItemVariantList?: CartItemVariant[];
  Quantity?: number;
  Price?: number;
  UnitPrice?: number;
  DiscountedPrice?: number;
  TotalAmount?: number;
  IsPromotional?: boolean;
  ProductDetailId?: number;
  ProductVariants?: string;
  VariantName?: string;
  SKU?: string;
  IsProductAvailableInStock?: boolean;
  IsAvailableQuantity?: boolean;
  InventoryManagement?: boolean;
}

export interface CartSummary {
  items: ApiCartItem[];
  subTotal: number;
  totalDiscount: number;
  netTotal: number;
  totalAmount: number;
  totalItems: number;
  relatedProducts: RelatedProduct[];
  homeDeliveryEnable: boolean;
}

const SESSION_STORAGE_KEY = "cart_session_id";
const SHIPPING_PREF_KEY = "checkout_shipping_pref";

export type CartShippingPref = {
  countryId: string;
  stateId: string;
};

export function getCartSessionId(): string {
  if (typeof window === "undefined") return "";

  let sessionId = localStorage.getItem(SESSION_STORAGE_KEY);
  if (!sessionId) {
    const chars =
      "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    sessionId = Array.from(
      { length: 48 },
      () => chars[Math.floor(Math.random() * chars.length)],
    ).join("");
    localStorage.setItem(SESSION_STORAGE_KEY, sessionId);
  }

  return sessionId;
}

/** Drop guest cart session so a new empty session is created next time. */
export function clearCartSessionId(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(SESSION_STORAGE_KEY);
}

export function clearCartShippingPref(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(SHIPPING_PREF_KEY);
}

export function saveCartShippingPref(pref: CartShippingPref): void {
  if (typeof window === "undefined") return;

  if (!pref.countryId && !pref.stateId) {
    localStorage.removeItem(SHIPPING_PREF_KEY);
    return;
  }

  localStorage.setItem(
    SHIPPING_PREF_KEY,
    JSON.stringify({
      countryId: pref.countryId || "",
      stateId: pref.stateId || "",
    }),
  );
}

export function getCartShippingPref(): CartShippingPref | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = localStorage.getItem(SHIPPING_PREF_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as Partial<CartShippingPref>;
    const countryId = String(parsed.countryId || "");
    const stateId = String(parsed.stateId || "");

    if (!countryId && !stateId) return null;

    return { countryId, stateId };
  } catch {
    return null;
  }
}

function extractCartItems(data: unknown): ApiCartItem[] {
  if (!data || typeof data !== "object") return [];

  const body = data as Record<string, unknown>;
  const nested =
    body.Data && typeof body.Data === "object"
      ? (body.Data as Record<string, unknown>)
      : null;

  const list =
    nested?.CartItemList ??
    nested?.CartItems ??
    body.CartItemList ??
    body.CartItems;

  return Array.isArray(list) ? (list as ApiCartItem[]) : [];
}

export function collectRelatedProductsFromCart(
  items: ApiCartItem[],
): RelatedProduct[] {
  const seen = new Set<number>();
  const related: RelatedProduct[] = [];

  for (const item of items) {
    for (const product of item.relatedProductList ?? []) {
      if (!seen.has(product.ProductId)) {
        seen.add(product.ProductId);
        related.push(product);
      }
    }
  }

  return related;
}

function extractCartSummary(data: unknown, items: ApiCartItem[]): CartSummary {
  const body = (data as Record<string, unknown>) ?? {};
  const nested =
    body.Data && typeof body.Data === "object"
      ? (body.Data as Record<string, unknown>)
      : null;

  const calculatedNetTotal = items.reduce((total, item) => {
    return total + getCartItemLineTotal(item);
  }, 0);
  const calculatedGrossTotal = items.reduce((total, item) => {
    return total + getCartItemOriginLineTotal(item);
  }, 0);

  const apiSubTotal = Number(nested?.TotalPrice);
  const apiDiscount = Number(nested?.TotalDiscount ?? 0);
  const apiNetTotal = Number(nested?.NetTotal);

  const resolved = resolveCartDisplayTotals({
    linesNet: calculatedNetTotal,
    linesGross: calculatedGrossTotal,
    subTotal:
      Number.isFinite(apiSubTotal) && apiSubTotal > 0
        ? apiSubTotal
        : calculatedGrossTotal || calculatedNetTotal,
    totalDiscount: Number.isFinite(apiDiscount) ? apiDiscount : 0,
    netTotal:
      Number.isFinite(apiNetTotal) && apiNetTotal > 0
        ? apiNetTotal
        : calculatedNetTotal,
  });

  return {
    items,
    subTotal: resolved.subTotal,
    totalDiscount: resolved.discount,
    netTotal: resolved.netTotal,
    totalAmount: resolved.netTotal,
    totalItems: items.reduce((count, item) => count + (item.Quantity ?? 1), 0),
    relatedProducts: collectRelatedProductsFromCart(items),
    homeDeliveryEnable: Boolean(nested?.HomeDeliveryEnable),
  };
}

export async function addProductToCart(
  productId: number,
  productDetailId: number,
  quantity: number,
): Promise<void> {
  const params = {
    ProductId: productId,
    ProductDetailId: productDetailId,
    Quantity: quantity,
  };

  if (isAuthenticated()) {
    await api.post("/api/v1/Cart/AddToCart/add-product", null, { params });
    return;
  }

  const sessionId = getCartSessionId();
  await api.post(
    `/api/v1/Cart/AddToCartGuest/session/${sessionId}/add`,
    null,
    { params },
  );
}

export async function removeCartItemById(cartId: string): Promise<void> {
  await api.delete(`/api/v1/Cart/DeleteItemFromCart/remove/${cartId}`);
}

/**
 * Persist a cart line quantity.
 * AddToCart is additive, so increases send a delta; decreases remove + re-add.
 */
export async function updateCartItemQuantity(options: {
  cartId: string;
  productId: number;
  productDetailId: number;
  currentQuantity: number;
  nextQuantity: number;
}): Promise<void> {
  const {
    cartId,
    productId,
    productDetailId,
    currentQuantity,
    nextQuantity,
  } = options;

  if (nextQuantity < 1) {
    throw new Error("Quantity must be at least 1.");
  }

  if (
    !cartId ||
    !productId ||
    !productDetailId ||
    Number.isNaN(productId) ||
    Number.isNaN(productDetailId)
  ) {
    throw new Error("Unable to update cart item.");
  }

  if (nextQuantity === currentQuantity) return;

  if (nextQuantity > currentQuantity) {
    await addProductToCart(
      productId,
      productDetailId,
      nextQuantity - currentQuantity,
    );
    return;
  }

  await removeCartItemById(cartId);
  await addProductToCart(productId, productDetailId, nextQuantity);
}

export async function fetchCurrentCart(): Promise<CartSummary> {
  if (isAuthenticated()) {
    const response = await api.get("/api/v1/Cart/GetCart/current");
    const items = extractCartItems(response.data);
    return extractCartSummary(response.data, items);
  }

  const sessionId = getCartSessionId();
  const response = await api.get(`/api/v1/Cart/GetCart/session/${sessionId}`);
  const items = extractCartItems(response.data);
  return extractCartSummary(response.data, items);
}

export function formatRsPrice(amount: number): string {
  return `Rs. ${amount.toLocaleString("en-PK")}`;
}

export function getCartItemId(item: ApiCartItem): string {
  return String(item.CartId ?? item.CartItemId ?? item.ProductId);
}

export function getCartItemImage(item: ApiCartItem): string {
  const image =
    item.ProductImage ||
    item.ThumbnailImagePath ||
    item.IconImagePath ||
    item.LargeImagePath;

  if (!image || image.includes("noImage")) {
    return "/images/product/1000x1000.png";
  }

  return image;
}

export function getCartItemName(item: ApiCartItem): string {
  return item.ProductName || item.Name || "Product";
}

export function getCartItemUnitPrice(item: ApiCartItem): number {
  if (item.DiscountedPrice && item.DiscountedPrice > 0) {
    return item.DiscountedPrice;
  }
  return item.Price ?? item.UnitPrice ?? 0;
}

/** Pre-discount unit price (for strikethrough / gross subtotal). */
export function getCartItemOriginUnitPrice(item: ApiCartItem): number {
  const sale = getCartItemUnitPrice(item);
  const origin = item.Price ?? item.UnitPrice ?? sale;
  return Math.max(origin, sale);
}

export function getCartItemQuantity(item: ApiCartItem): number {
  return item.Quantity ?? 1;
}

export function getCartItemLineTotal(item: ApiCartItem, quantity?: number): number {
  const qty = quantity ?? getCartItemQuantity(item);
  if (item.TotalAmount != null && item.TotalAmount >= 0 && quantity === undefined) {
    return Number(item.TotalAmount);
  }
  return getCartItemUnitPrice(item) * qty;
}

export function getCartItemOriginLineTotal(
  item: ApiCartItem,
  quantity?: number,
): number {
  const qty = quantity ?? getCartItemQuantity(item);
  return getCartItemOriginUnitPrice(item) * qty;
}

export type CartDisplayTotals = {
  subTotal: number;
  discount: number;
  netTotal: number;
};

/**
 * Keep cart summary math consistent with visible line prices.
 * Handles API TotalPrice (gross) + TotalDiscount vs line totals that are already net.
 */
export function resolveCartDisplayTotals(input: {
  linesNet: number;
  linesGross?: number;
  subTotal: number;
  totalDiscount: number;
  netTotal: number;
}): CartDisplayTotals {
  const linesNet = Number(input.linesNet) || 0;
  const linesGross = Number(input.linesGross) || 0;
  let subTotal = Number(input.subTotal) || 0;
  let discount = Number(input.totalDiscount) || 0;
  let netTotal = Number(input.netTotal) || 0;

  const nearly = (a: number, b: number) => Math.abs(a - b) < 0.02;

  // Prefer API when Subtotal - Discount = NetTotal
  if (subTotal > 0 && nearly(subTotal - discount, netTotal)) {
    return { subTotal, discount, netTotal };
  }

  // Lines already show payable amounts and match net
  if (linesNet > 0 && (nearly(linesNet, netTotal) || netTotal <= 0)) {
    if (discount > 0) {
      const gross =
        subTotal > linesNet
          ? subTotal
          : linesGross > linesNet
            ? linesGross
            : linesNet + discount;
      return {
        subTotal: gross,
        discount,
        netTotal: netTotal > 0 ? netTotal : Math.max(gross - discount, 0),
      };
    }
    return {
      subTotal: linesNet,
      discount: 0,
      netTotal: linesNet,
    };
  }

  // Lines match gross subtotal
  if (linesNet > 0 && nearly(linesNet, subTotal)) {
    const resolvedNet =
      netTotal > 0 ? netTotal : Math.max(linesNet - discount, 0);
    return { subTotal: linesNet, discount, netTotal: resolvedNet };
  }

  // Fallback from lines
  if (linesNet > 0) {
    if (discount > 0 && linesGross > linesNet) {
      return {
        subTotal: linesGross,
        discount,
        netTotal: netTotal > 0 ? netTotal : Math.max(linesGross - discount, 0),
      };
    }
    return {
      subTotal: linesNet,
      discount: 0,
      netTotal: linesNet,
    };
  }

  return {
    subTotal,
    discount,
    netTotal: netTotal || Math.max(subTotal - discount, 0),
  };
}

export function getCartItemVariantsLabel(item: ApiCartItem): string {
  if (item.ProductVariants) {
    return item.ProductVariants.replace(/,/g, ", ");
  }

  if (item.cartItemVariantList?.length) {
    return item.cartItemVariantList
      .map((variant) => `${variant.VariantGroup}: ${variant.VariantName}`)
      .join(" · ");
  }

  return item.VariantName || "";
}

export function mapApiCartItemToProductType(item: ApiCartItem): ProductType {
  const image = getCartItemImage(item);
  const price = getCartItemUnitPrice(item);

  return {
    id: String(item.ProductId),
    productDetailId: item.ProductDetailId,
    category: item.Category?.CategoryName || "",
    type: "product",
    name: getCartItemName(item),
    gender: "",
    new: false,
    sale: Boolean(item.DiscountedPrice && item.DiscountedPrice < price),
    rate: 5,
    price,
    originPrice: item.Price ?? price,
    brand: "",
    sold: 0,
    quantity: getCartItemQuantity(item),
    quantityPurchase: getCartItemQuantity(item),
    sizes: item.ProductVariants ? [item.ProductVariants] : [],
    variation: [],
    thumbImage: [image],
    images: [image],
    description: item.Category?.CategoryDescription || getCartItemVariantsLabel(item),
    action: "add to cart",
    slug: String(item.ProductId),
  };
}
