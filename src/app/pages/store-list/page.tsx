"use client";

import React, { useEffect, useState } from "react";
import TopNavOne from "@/components/Header/TopNav/TopNavOne";
import MenuOne from "@/components/Header/Menu/MenuOne";
import Breadcrumb from "@/components/Breadcrumb/Breadcrumb";
import Footer from "@/components/Footer/Footer";
import * as Icon from "@phosphor-icons/react/dist/ssr";
import {
  fetchTenantBranches,
  TenantBranch,
} from "@/lib/tenant-landing";
import { getApiErrorMessage } from "@/lib/api";

const StoreList = () => {
  const [branches, setBranches] = useState<TenantBranch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadBranches = async () => {
      try {
        setLoading(true);
        setError(null);
        const result = await fetchTenantBranches({
          PageNumber: 1,
          PageSize: 20,
        });
        setBranches(result.branches);
      } catch (err) {
        console.error("Failed to load stores:", err);
        setError(
          getApiErrorMessage(err, "Unable to load stores. Please try again."),
        );
      } finally {
        setLoading(false);
      }
    };

    void loadBranches();
  }, []);

  const getDirectionsUrl = (branch: TenantBranch) => {
    if (branch.Latitude != null && branch.Longitude != null) {
      return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
        `${branch.Latitude},${branch.Longitude}`,
      )}`;
    }

    const query = [branch.Address, branch.City, branch.State]
      .filter(Boolean)
      .join(", ");
    if (!query) return null;
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
  };

  const getTimingLabel = (branch: TenantBranch) => {
    if (branch.Timing?.trim()) return branch.Timing.trim();
    if (branch.OpeningTiming && branch.ClosingTiming) {
      return `${branch.OpeningTiming} - ${branch.ClosingTiming}`;
    }
    return branch.OpeningTiming || branch.ClosingTiming || null;
  };

  return (
    <>
      <TopNavOne
        props="style-one bg-black"
        slogan="New customers save 10% with the code GET10"
      />
      <div id="header" className="relative w-full">
        <MenuOne props="bg-transparent" />
        <Breadcrumb heading="Store list" subHeading="Store list" />
      </div>

      <div className="store-list md:py-16 py-10">
        <div className="container">
          <div className="max-w-2xl mb-8 md:mb-10">
            <h2 className="heading3">Visit Our Stores</h2>
            <p className="body1 text-secondary mt-3">
              Browse our branch locations, opening hours, and contact details.
            </p>
          </div>

          {loading ? (
            <div className="grid md:grid-cols-2 gap-5">
              {[0, 1, 2, 3].map((item) => (
                <div
                  key={item}
                  className="rounded-2xl border border-line bg-surface p-6 animate-pulse"
                >
                  <div className="h-6 w-2/3 rounded bg-line" />
                  <div className="mt-5 space-y-3">
                    <div className="h-4 w-full rounded bg-line" />
                    <div className="h-4 w-4/5 rounded bg-line" />
                    <div className="h-4 w-1/2 rounded bg-line" />
                  </div>
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="rounded-2xl border border-line bg-surface px-6 py-10 text-center">
              <Icon.WarningCircle size={36} className="mx-auto text-red" />
              <p className="text-red mt-3">{error}</p>
            </div>
          ) : branches.length === 0 ? (
            <div className="rounded-2xl border border-line bg-surface px-6 py-10 text-center">
              <Icon.Storefront size={36} className="mx-auto text-secondary" />
              <p className="heading6 mt-3">No stores available</p>
              <p className="caption1 text-secondary mt-2">
                Store locations will appear here once they are published.
              </p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 gap-5">
              {branches.map((branch) => {
                const directionsUrl = getDirectionsUrl(branch);
                const timing = getTimingLabel(branch);
                const location = [branch.City, branch.State]
                  .filter(Boolean)
                  .join(", ");

                return (
                  <article
                    key={branch.BranchId}
                    className="flex flex-col rounded-2xl border border-line bg-surface p-5 md:p-6"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3 min-w-0">
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white border border-line">
                          <Icon.Storefront size={18} weight="bold" />
                        </span>
                        <div className="min-w-0">
                          <h3 className="heading6">
                            {branch.Name || "Store location"}
                          </h3>
                          <div className="flex flex-wrap items-center gap-2 mt-1">
                            {branch.BranchCode ? (
                              <span className="caption2 text-secondary">
                                Code: {branch.BranchCode}
                              </span>
                            ) : null}
                            {location ? (
                              <span className="caption1 text-secondary">
                                {location}
                              </span>
                            ) : null}
                          </div>
                        </div>
                      </div>
                      {branch.Status ? (
                        <span
                          className={`caption2 shrink-0 rounded-full px-2.5 py-1 ${
                            branch.Status.toLowerCase() === "active"
                              ? "bg-green text-white"
                              : "bg-line text-secondary"
                          }`}
                        >
                          {branch.Status}
                        </span>
                      ) : null}
                    </div>

                    <div className="mt-5 space-y-3 flex-1">
                      {branch.Address ? (
                        <div className="flex gap-3">
                          <Icon.MapPin
                            size={18}
                            className="shrink-0 mt-0.5 text-secondary"
                          />
                          <p className="caption1 text-secondary">
                            {branch.Address}
                          </p>
                        </div>
                      ) : null}

                      {timing ? (
                        <div className="flex gap-3">
                          <Icon.Clock
                            size={18}
                            className="shrink-0 mt-0.5 text-secondary"
                          />
                          <p className="caption1 text-secondary">{timing}</p>
                        </div>
                      ) : null}

                      {branch.ContactPerson ? (
                        <div className="flex gap-3">
                          <Icon.User
                            size={18}
                            className="shrink-0 mt-0.5 text-secondary"
                          />
                          <p className="caption1 text-secondary">
                            {branch.ContactPerson}
                          </p>
                        </div>
                      ) : null}

                      {branch.Phone ? (
                        <div className="flex gap-3">
                          <Icon.Phone
                            size={18}
                            className="shrink-0 mt-0.5 text-secondary"
                          />
                          <a
                            href={`tel:${branch.Phone}`}
                            className="caption1 text-secondary hover:underline"
                          >
                            {branch.Phone}
                          </a>
                        </div>
                      ) : null}

                      {branch.Email ? (
                        <div className="flex gap-3">
                          <Icon.Envelope
                            size={18}
                            className="shrink-0 mt-0.5 text-secondary"
                          />
                          <a
                            href={`mailto:${branch.Email}`}
                            className="caption1 text-secondary hover:underline break-all"
                          >
                            {branch.Email}
                          </a>
                        </div>
                      ) : null}
                    </div>

                    <div className="mt-6 flex flex-wrap gap-3">
                      {directionsUrl ? (
                        <a
                          href={directionsUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="button-main"
                        >
                          Get Directions
                        </a>
                      ) : null}
                      {branch.Phone ? (
                        <a
                          href={`tel:${branch.Phone}`}
                          className="button-main bg-white text-black border border-line"
                        >
                          Call Store
                        </a>
                      ) : null}
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </div>
      <Footer />
    </>
  );
};

export default StoreList;
