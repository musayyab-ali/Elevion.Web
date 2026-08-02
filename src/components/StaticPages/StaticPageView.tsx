"use client";

import React, { useEffect, useState } from "react";
import TopNavOne from "@/components/Header/TopNav/TopNavOne";
import MenuOne from "@/components/Header/Menu/MenuOne";
import Breadcrumb from "@/components/Breadcrumb/Breadcrumb";
import Footer from "@/components/Footer/Footer";
import StaticPageAccordion from "@/components/StaticPages/StaticPageAccordion";
import {
  fetchStaticPageByKey,
  StaticPageKey,
  StaticPageSection,
} from "@/lib/static-pages";
import { getApiErrorMessage } from "@/lib/api";

interface StaticPageViewProps {
  pageKey: StaticPageKey;
  heading: string;
  subHeading: string;
  intro?: string;
}

const StaticPageView: React.FC<StaticPageViewProps> = ({
  pageKey,
  heading,
  subHeading,
  intro,
}) => {
  const [sections, setSections] = useState<StaticPageSection[]>([]);
  const [pageTitle, setPageTitle] = useState(heading);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const loadPage = async () => {
      setLoading(true);
      setError(null);

      try {
        const result = await fetchStaticPageByKey(pageKey);
        if (cancelled) return;

        setSections(result.sections);
        setPageTitle(result.group?.staticPageModel?.Title || heading);
      } catch (err) {
        if (!cancelled) {
          setError(getApiErrorMessage(err, "Failed to load page content."));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void loadPage();

    return () => {
      cancelled = true;
    };
  }, [pageKey, heading]);

  return (
    <>
      <TopNavOne
        props="style-one bg-black"
        slogan="New customers save 10% with the code GET10"
      />
      <div id="header" className="relative w-full">
        <MenuOne props="bg-transparent" />
        <Breadcrumb heading={pageTitle} subHeading={subHeading} />
      </div>

      <div className="static-page-block md:py-20 py-10">
        <div className="container max-w-4xl">
          {intro && (
            <p className="body1 text-secondary mb-8 md:mb-10">{intro}</p>
          )}

          {loading && (
            <p className="text-center text-secondary py-12">Loading...</p>
          )}

          {error && (
            <div className="text-center py-12">
              <p className="text-red">{error}</p>
            </div>
          )}

          {!loading && !error && (
            <StaticPageAccordion sections={sections} />
          )}
        </div>
      </div>

      <Footer />
    </>
  );
};

export default StaticPageView;
