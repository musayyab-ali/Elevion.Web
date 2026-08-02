"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import {
  fetchTenantLanding,
  TenantLandingData,
} from "@/lib/tenant-landing";

const LandingPageContext = createContext<TenantLandingData | null>(null);

export function LandingPageProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [landing, setLanding] = useState<TenantLandingData | null>(null);

  useEffect(() => {
    void fetchTenantLanding().then(setLanding);
  }, []);

  return (
    <LandingPageContext.Provider value={landing}>
      {children}
    </LandingPageContext.Provider>
  );
}

export function useLandingPage(): TenantLandingData | null {
  return useContext(LandingPageContext);
}
