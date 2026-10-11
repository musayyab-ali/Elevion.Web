"use client";

import React, { createContext, useContext } from "react";
import { BRAND_NAME } from "@/lib/config";
import { Branding, defaultBranding } from "@/lib/branding-model";

const BrandingContext = createContext<Branding>(defaultBranding(BRAND_NAME));

/** Gives every client component the shop's branding (fetched on the server, see lib/branding.ts). */
export function BrandingProvider({ branding, children }: { branding: Branding; children: React.ReactNode }) {
  return <BrandingContext.Provider value={branding}>{children}</BrandingContext.Provider>;
}

export function useBranding(): Branding {
  return useContext(BrandingContext);
}
