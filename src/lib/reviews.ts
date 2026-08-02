import api from "@/lib/api";
import { TestimonialType } from "@/type/TestimonialType";

export interface CustomerReview {
  ProductId: number;
  ProductName: string;
  Rating: number;
  Review: string;
  CustomerName: string;
  ReviewPostedDate: string;
  ImagePath: string;
  Category?: {
    CategoryId: number;
    CategoryName: string;
    CategoryDescription: string;
  };
}

export interface CustomerReviewsResult {
  reviews: CustomerReview[];
  totalRecords: number;
}

interface CustomerReviewsResponse {
  Data?: {
    TotalRecords: number;
    Reviews: CustomerReview[];
  };
  TotalRecords?: number;
  Reviews?: CustomerReview[];
  Message?: string;
  StatusCode?: number;
}

interface CustomerAccountReviewsResponse {
  Data?: {
    TotalRecords: number;
    Reviews: CustomerReview[];
  };
  Message?: string;
  StatusCode?: number;
}

const DEFAULT_AVATAR = "/images/avatar/1.png";

export function mapReviewToTestimonial(
  review: CustomerReview,
  index: number,
): TestimonialType {
  const image = review.ImagePath?.trim();

  return {
    id: `${review.ProductId}-${review.CustomerName}-${index}`,
    category: "",
    title: review.ProductName,
    name: review.CustomerName,
    avatar: image || DEFAULT_AVATAR,
    date: review.ReviewPostedDate,
    address: "",
    description: review.Review,
    images: image ? [image] : [],
    star: Number(review.Rating) || 0,
  };
}

function extractReviewsPayload(
  payload: CustomerReviewsResponse | undefined,
): CustomerReviewsResult {
  const data = payload?.Data;
  const reviews = data?.Reviews ?? payload?.Reviews ?? [];

  return {
    reviews,
    totalRecords: data?.TotalRecords ?? payload?.TotalRecords ?? reviews.length,
  };
}

export async function fetchRecentCustomerReviews(): Promise<CustomerReviewsResult> {
  const response = await api.get<CustomerReviewsResponse>(
    "/api/v1/TenantLanding/recent-customer-reviews",
  );

  return extractReviewsPayload(response.data);
}

export async function fetchRecentTestimonials(
  limit = 6,
): Promise<TestimonialType[]> {
  const { reviews } = await fetchRecentCustomerReviews();

  return reviews
    .slice(0, limit)
    .map((review, index) => mapReviewToTestimonial(review, index));
}

export function formatReviewDate(value: string): string {
  if (!value?.trim()) return "";

  const parsed = new Date(value.replace(" ", "T"));
  if (Number.isNaN(parsed.getTime())) return value;

  return parsed.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export async function fetchCustomerReviews(
  pageNumber = 1,
  pageSize = 10,
): Promise<CustomerReviewsResult> {
  const response = await api.get<CustomerAccountReviewsResponse>(
    "/api/v1/Customer/reviews",
    {
      params: {
        PageNumber: pageNumber,
        PageSize: pageSize,
      },
    },
  );

  const payload = response.data;
  const reviews = payload?.Data?.Reviews ?? [];
  const totalRecords = payload?.Data?.TotalRecords ?? reviews.length;

  return {
    reviews,
    totalRecords,
  };
}
