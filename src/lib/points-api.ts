import api from "@/lib/api";

/** Points the signed-in customer can spend (the API reports 0 when the shop has switched reward points off). */
export async function fetchPointsBalance(): Promise<number> {
  const res = await api.get("/api/v1/Customer/GetProfile");
  const points = Number((res.data as { Data?: { EarnedRewardPoints?: number } })?.Data?.EarnedRewardPoints);
  return Number.isFinite(points) && points > 0 ? Math.floor(points) : 0;
}

/**
 * Uses `points` on an order. The API first removes points already applied, then applies the new amount,
 * so sending 0 takes the points discount off. Rejects with the API's message when it refuses.
 */
export async function applyRedeemPoints(orderId: number, points: number): Promise<string> {
  const res = await api.post("/api/v1/Payment/RedeemPoints", null, {
    params: { RedeemPoints: Math.max(0, Math.floor(points)), OrderId: orderId },
  });
  return (res.data as { Message?: string })?.Message ?? "Reward points updated.";
}
