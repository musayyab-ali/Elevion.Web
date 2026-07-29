interface Variation {
    color: string;
    colorCode: string;
    colorImage: string;
    image: string;
}

export interface ProductType {
    id: string,
    productDetailId?: number | string,
    category: string,
    type: string,
    name: string,
    gender: string,
    new: boolean,
    sale: boolean,
    rate: number,
    price: number,
    originPrice: number,
    brand: string,
    sold: number,
    quantity: number,
    quantityPurchase: number,
    sizes: Array<string>,
    variation: Variation[],
    thumbImage: Array<string>,
    images: Array<string>,
    description: string,
    action: string,
    slug: string,
    /** API commerce flags */
    isPromotional?: boolean,
    isFeatured?: boolean,
    discount?: number,
    discountType?: number,
    inventoryManagement?: boolean,
    availableStock?: number | null,
    comingSoon?: boolean,
    status?: number,
    inStock?: boolean,
}