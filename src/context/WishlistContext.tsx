"use client";
import React, {
  createContext,
  useContext,
  useReducer,
  useEffect,
  useCallback,
} from "react";
import { ProductType } from "@/type/ProductType";
import api from "@/lib/api";
import toast from "react-hot-toast";
interface WishlistState {
  wishlistArray: ProductType[];
}

type WishlistAction =
  | { type: "ADD_TO_WISHLIST"; payload: ProductType }
  | { type: "REMOVE_FROM_WISHLIST"; payload: string }
  | { type: "LOAD_WISHLIST"; payload: ProductType[] };

const WishlistContext = createContext<any>(undefined);

const WishlistReducer = (
  state: WishlistState,
  action: WishlistAction,
): WishlistState => {
  switch (action.type) {
    case "ADD_TO_WISHLIST":
      return {
        ...state,
        wishlistArray: [...state.wishlistArray, action.payload],
      };
    case "REMOVE_FROM_WISHLIST":
      return {
        ...state,
        wishlistArray: state.wishlistArray.filter(
          (item) => item.id !== action.payload,
        ),
      };
    case "LOAD_WISHLIST":
      return { ...state, wishlistArray: action.payload };
    default:
      return state;
  }
};

export const WishlistProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [wishlistState, dispatch] = useReducer(WishlistReducer, {
    wishlistArray: [],
  });

  const normalizeWishlistItem = (item: any): ProductType => {
    const price =
      item.DiscountedPrice ??
      item.Price ??
      item.MinPrice ??
      item.UnitPrice ??
      0;
    const originPrice =
      item.Price ?? item.OriginPrice ?? item.MaxPrice ?? price;
    const thumbImage =
      item.ThumbnailImagePath ||
      item.IconImagePath ||
      item.ImageName ||
      item.ProductImage ||
      item.ImageUrl ||
      item.Image?.[0] ||
      item.Images?.[0] ||
      item.thumbImage?.[0] ||
      "/images/product/1000x1000.png";

    return {
      id: String(
        item.ProductId ??
          item.id ??
          item.ProductDetailId ??
          item.WishListId ??
          "",
      ),
      productDetailId:
        item.ProductDetailId ??
        item.productDetailId ??
        item.ProductDetailId ??
        undefined,
      category: item.Category || item.CategoryName || "",
      type: item.Type || item.type || "product",
      name: item.ProductName || item.Name || item.Title || "",
      gender: item.Gender || "",
      new: Boolean(item.IsNew ?? item.new ?? false),
      sale: Boolean(item.Discount > 0 ?? item.sale ?? false),
      rate: Number(item.Rating ?? item.Rate ?? 0),
      price: Number(price),
      originPrice: Number(originPrice),
      brand: item.BrandName || item.Brand || "",
      sold: Number(item.Sold ?? 0),
      quantity: Number(item.Quantity ?? 1),
      quantityPurchase: Number(item.Quantity ?? item.QuantityPurchase ?? 1),
      sizes: Array.isArray(item.Sizes)
        ? item.Sizes
        : item.VariantName
          ? [String(item.VariantName)]
          : [],
      variation: Array.isArray(item.Variation)
        ? item.Variation
        : Array.isArray(
              item.ProductVariantDetail?.productVariantCombinationList,
            )
          ? item.ProductVariantDetail.productVariantCombinationList
          : [],
      thumbImage: [String(thumbImage)],
      images: Array.isArray(item.Images) ? item.Images : [String(thumbImage)],
      description:
        item.Description || item.LongDescription || item.VariantName || "",
      action: item.action || item.Action || "add to cart",
      slug:
        item.Slug || item.UrlSlug || String(item.ProductId ?? item.id ?? ""),
    };
  };

  const fetchWishlist = useCallback(async () => {
    try {
      const res = await api.get("/api/v1/Customer/wishlist", {
        params: { PageNumber: 1, PageSize: 10 },
      });

      if (res.data?.Data?.WishItemList) {
        const normalized = res.data.Data.WishItemList.map(
          normalizeWishlistItem,
        ).filter((item) => item.id);
        dispatch({ type: "LOAD_WISHLIST", payload: normalized });
      }
    } catch (error) {
      console.error("Fetch: Error occurred:", error);
    }
  }, []);

  useEffect(() => {
    void fetchWishlist();
  }, [fetchWishlist]);

  useEffect(() => {
    fetchWishlist();
  }, [fetchWishlist]);
  const addToWishlist = async (item: ProductType) => {
    // console.log("Add: Starting for item", item.id);
    try {
      const productDetailId = item.productDetailId ?? item.id;
      const productId = (item.id ?? productDetailId) as any;

      const res = await api.post(
        `/api/v1/Customer/wishlist/items`,
        {},
        {
          params: { ProductId: productId, ProductDetailId: productDetailId },
        },
      );

      console.log("Add: Success response:", res.data);
      toast.success("Added to wishlist!");
      await fetchWishlist();
    } catch (error) {
      console.error("Add: Error occurred:", error);
    }
  };

  const removeFromWishlist = async (product: ProductType) => {
    const idToDelete = product.productDetailId || product.id;

    try {
      const res = await api.delete(
        `/api/v1/Customer/RemoveFromWishlistByProduct/wishlist/items/product/${idToDelete}`,
      );

      if (res.data.HttpStatusCode === 200) {
        toast.success("Removed from wishlist!");
        await fetchWishlist();
      }
    } catch (error) {
      console.error("Remove: Error occurred:", error);
    }
  };

  return (
    <WishlistContext.Provider
      value={{ wishlistState, addToWishlist, removeFromWishlist }}
    >
      {children}
    </WishlistContext.Provider>
  );
};

export const useWishlist = () => useContext(WishlistContext);
