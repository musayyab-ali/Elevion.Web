"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useReducer,
  useRef,
  useState,
} from "react";
import { ProductType } from "@/type/ProductType";
import toast from "react-hot-toast";
import {
  addProductToCart,
  ApiCartItem,
  CartSummary,
  fetchCurrentCart,
  getCartItemId,
  getCartItemImage,
  getCartItemLineTotal,
  getCartItemName,
  getCartItemOriginUnitPrice,
  getCartItemUnitPrice,
  getCartItemVariantsLabel,
  removeCartItemById,
  updateCartItemQuantity,
  clearCartSessionId,
} from "@/lib/cart";
import {
  RelatedProduct,
  resolveDefaultVariantSelection,
} from "@/lib/product-details";
import { getApiErrorMessage } from "@/lib/api";

export interface CartLineItem extends ProductType {
  quantity: number;
  cartId: string;
  selectedSize: string;
  selectedColor: string;
  lineTotal: number;
  apiItem?: ApiCartItem;
}

interface CartState {
  cartArray: CartLineItem[];
  subTotal: number;
  totalDiscount: number;
  netTotal: number;
  totalAmount: number;
  deliveryCharges: number;
  minimumOrderValue: number;
  totalItems: number;
  relatedProducts: RelatedProduct[];
}

type CartAction =
  | { type: "SET_CART"; payload: CartSummary }
  | { type: "CLEAR_CART" }
  | {
      type: "UPDATE_CART";
      payload: {
        itemId: string;
        quantity: number;
        selectedSize: string;
        selectedColor: string;
      };
    };

interface CartContextProps {
  cartState: CartState;
  cartLoading: boolean;
  updatingCartId: string | null;
  addToCart: (item: ProductType) => Promise<void>;
  removeFromCart: (cartId: string) => Promise<void>;
  updateCart: (
    itemId: string,
    quantity: number,
    selectedSize: string,
    selectedColor: string,
  ) => Promise<void>;
  fetchCart: (options?: { silent?: boolean }) => Promise<void>;
  clearCart: () => void;
}

const CartContext = createContext<CartContextProps | undefined>(undefined);

const initialState: CartState = {
  cartArray: [],
  subTotal: 0,
  totalDiscount: 0,
  netTotal: 0,
  totalAmount: 0,
  deliveryCharges: 0,
  minimumOrderValue: 0,
  totalItems: 0,
  relatedProducts: [],
};

function calculateTotals(
  cartArray: CartLineItem[],
  totalDiscount: number,
  deliveryCharges = 0,
  minimumOrderValue = 0,
): Pick<CartState, "subTotal" | "netTotal" | "totalAmount" | "totalItems"> {
  const subTotal = cartArray.reduce((sum, item) => sum + item.lineTotal, 0);
  const netTotal = Math.max(subTotal - totalDiscount, 0);
  const shipping =
    minimumOrderValue > 0 && netTotal >= minimumOrderValue
      ? 0
      : deliveryCharges;

  return {
    subTotal,
    netTotal,
    totalAmount: netTotal + shipping,
    totalItems: cartArray.reduce((count, item) => count + item.quantity, 0),
  };
}

function mapApiItemToLineItem(apiItem: ApiCartItem): CartLineItem {
  const unitPrice = getCartItemUnitPrice(apiItem);
  const quantity = apiItem.Quantity ?? 1;
  const variants = apiItem.cartItemVariantList ?? [];
  const sizeVariant = variants.find((v) => v.VariantGroup === "Size");
  const colorVariant = variants.find((v) => v.VariantGroup === "Color");

  return {
    id: String(apiItem.ProductId),
    productDetailId: apiItem.ProductDetailId,
    category: apiItem.Category?.CategoryName || "",
    type: "product",
    name: getCartItemName(apiItem),
    gender: "",
    new: false,
    sale: Boolean(
      apiItem.DiscountedPrice &&
        apiItem.DiscountedPrice > 0 &&
        apiItem.DiscountedPrice < (apiItem.Price ?? 0),
    ),
    rate: 5,
    price: unitPrice,
    originPrice: apiItem ? getCartItemOriginUnitPrice(apiItem) : unitPrice,
    brand: "",
    sold: 0,
    quantity,
    quantityPurchase: quantity,
    sizes: apiItem.ProductVariants ? [apiItem.ProductVariants] : [],
    variation: [],
    thumbImage: [getCartItemImage(apiItem)],
    images: [getCartItemImage(apiItem)],
    description:
      apiItem.Category?.CategoryDescription || getCartItemVariantsLabel(apiItem),
    action: "add to cart",
    slug: String(apiItem.ProductId),
    cartId: getCartItemId(apiItem),
    selectedSize: sizeVariant?.VariantName || "",
    selectedColor: colorVariant?.VariantName || "",
    lineTotal: getCartItemLineTotal(apiItem),
    isPromotional: Boolean(apiItem.IsPromotional),
    discount: apiItem.Discount ?? 0,
    discountType: apiItem.DiscountValueType ?? 0,
    campaignType: apiItem.CampaignType ?? 0,
    campaignTypeDisplayName: apiItem.CampaignTypeDisplayName ?? null,
    apiItem,
  };
}

function mapSummaryToCartState(summary: CartSummary): CartState {
  const cartArray = summary.items.map(mapApiItemToLineItem);

  return {
    cartArray,
    subTotal: summary.subTotal,
    totalDiscount: summary.totalDiscount,
    netTotal: summary.netTotal,
    totalAmount: summary.totalAmount,
    deliveryCharges: summary.deliveryCharges,
    minimumOrderValue: summary.minimumOrderValue,
    totalItems: summary.totalItems,
    relatedProducts: summary.relatedProducts,
  };
}

const cartReducer = (state: CartState, action: CartAction): CartState => {
  switch (action.type) {
    case "SET_CART":
      return mapSummaryToCartState(action.payload);
    case "CLEAR_CART":
      return { ...initialState };
    case "UPDATE_CART": {
      const cartArray = state.cartArray.map((item) => {
        if (
          item.cartId !== action.payload.itemId &&
          item.id !== action.payload.itemId
        ) {
          return item;
        }

        const unitPrice = item.apiItem
          ? getCartItemUnitPrice(item.apiItem)
          : item.price;
        const lineTotal = unitPrice * action.payload.quantity;

        return {
          ...item,
          quantity: action.payload.quantity,
          quantityPurchase: action.payload.quantity,
          selectedSize: action.payload.selectedSize,
          selectedColor: action.payload.selectedColor,
          lineTotal,
          price: unitPrice,
          apiItem: item.apiItem
            ? {
                ...item.apiItem,
                Quantity: action.payload.quantity,
                TotalAmount: lineTotal,
              }
            : item.apiItem,
        };
      });

      return {
        ...state,
        cartArray,
        ...calculateTotals(
          cartArray,
          state.totalDiscount,
          state.deliveryCharges,
          state.minimumOrderValue,
        ),
      };
    }
    default:
      return state;
  }
};

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [cartState, dispatch] = useReducer(cartReducer, initialState);
  const [cartLoading, setCartLoading] = useState(false);
  const [updatingCartId, setUpdatingCartId] = useState<string | null>(null);
  const fetchGenerationRef = useRef(0);
  const updatingCartRef = useRef(false);
  // Quantity deltas must be based on the latest cart, never a stale closure.
  const cartStateRef = useRef(cartState);
  cartStateRef.current = cartState;

  // `silent` keeps the list on screen while re-syncing after a write.
  const fetchCart = useCallback(async (options?: { silent?: boolean }) => {
    const silent = options?.silent === true;
    const generation = ++fetchGenerationRef.current;
    if (!silent) setCartLoading(true);
    try {
      const summary = await fetchCurrentCart();
      if (generation !== fetchGenerationRef.current) return;
      dispatch({ type: "SET_CART", payload: summary });
    } catch (error) {
      console.error("Fetch cart error:", error);
    } finally {
      if (!silent && generation === fetchGenerationRef.current) {
        setCartLoading(false);
      }
    }
  }, []);

  const clearCart = useCallback(() => {
    // Invalidate any in-flight fetch so it cannot restore old items
    fetchGenerationRef.current += 1;
    clearCartSessionId();
    dispatch({ type: "CLEAR_CART" });
    setCartLoading(false);
  }, []);

  useEffect(() => {
    void fetchCart();
  }, [fetchCart]);

  const addToCart = async (item: ProductType) => {
    const productId = Number(item.id);
    let productDetailId = Number(item.productDetailId);
    const quantity = item.quantityPurchase ?? 1;

    if (!productId || Number.isNaN(productId)) {
      toast.error("Invalid product.");
      return;
    }

    // Listings can omit the variant, so default to the product's smallest one.
    if (!productDetailId || Number.isNaN(productDetailId)) {
      try {
        const selection = await resolveDefaultVariantSelection(productId);
        productDetailId = selection.productDetailId;
      } catch {
        toast.error("Please select a product variant before adding to cart.");
        return;
      }
    }

    try {
      await addProductToCart(productId, productDetailId, quantity);
      await fetchCart();
      toast.success("Product added to cart!");
    } catch (error) {
      const message = getApiErrorMessage(
        error,
        "Failed to add product to cart.",
      );
      toast.error(message);
      throw error;
    }
  };

  const removeFromCart = async (cartId: string) => {
    try {
      await removeCartItemById(cartId);
      await fetchCart();
      toast.success("Item removed successfully!");
    } catch (error) {
      const message = getApiErrorMessage(error, "Failed to remove item.");
      toast.error(message);
    }
  };

  const updateCart = async (
    itemId: string,
    quantity: number,
    selectedSize: string,
    selectedColor: string,
  ) => {
    if (quantity < 1) return;
    // A ref lock blocks overlapping writes even before the disabled state
    // has had a chance to re-render.
    if (updatingCartRef.current) return;

    const item = cartStateRef.current.cartArray.find(
      (line) => line.cartId === itemId || line.id === itemId,
    );
    if (!item) return;

    const previousQuantity = item.quantity;
    if (previousQuantity === quantity) return;

    updatingCartRef.current = true;
    setUpdatingCartId(item.cartId);

    // Optimistic UI so summary/line totals update immediately
    dispatch({
      type: "UPDATE_CART",
      payload: { itemId: item.cartId, quantity, selectedSize, selectedColor },
    });

    try {
      await updateCartItemQuantity({
        cartId: item.cartId,
        productId: Number(item.id),
        productDetailId: Number(item.productDetailId),
        currentQuantity: previousQuantity,
        nextQuantity: quantity,
      });
    } catch (error) {
      toast.error(
        getApiErrorMessage(error, "Failed to update cart quantity."),
      );
    } finally {
      // AddToCart is additive and a decrease recreates the line under a new
      // CartId, so the optimistic copy must always be replaced by the server
      // state. Skipping this let small drifts compound on every click.
      await fetchCart({ silent: true });
      updatingCartRef.current = false;
      setUpdatingCartId(null);
    }
  };

  return (
    <CartContext.Provider
      value={{
        cartState,
        cartLoading,
        updatingCartId,
        addToCart,
        removeFromCart,
        updateCart,
        fetchCart,
        clearCart,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) throw new Error("useCart must be used within a CartProvider");
  return context;
};
