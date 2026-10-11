"use client";

import React, { useEffect, useState } from "react";
import TopNavOne from "@/components/Header/TopNav/TopNavOne";
import MenuOne from "@/components/Header/Menu/MenuOne";
import Breadcrumb from "@/components/Breadcrumb/Breadcrumb";
import Footer from "@/components/Footer/Footer";
import StaticPageAccordion from "@/components/StaticPages/StaticPageAccordion";
import StaticPageContentBody from "@/components/StaticPages/StaticPageContentBody";
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
  /** "accordion": questions that open (FAQs, policies). "article": every section written out (About us). */
  layout?: "accordion" | "article";
  /** Shown when the shop has not written this page yet. */
  emptyText?: string;
  /** Extra sections between the page text and the footer. */
  footerExtra?: React.ReactNode;
}

const StaticPageView: React.FC<StaticPageViewProps> = ({
  pageKey,
  heading,
  subHeading,
  intro,
  layout = "accordion",
  emptyText,
  footerExtra,
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
      <TopNavOne props="style-one bg-black" />
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

          {!loading && !error && sections.length === 0 && (
            <p className="body1 text-secondary text-center py-10">
              {emptyText ?? "No content available right now."}
            </p>
          )}

          {!loading && !error && sections.length > 0 && layout === "accordion" && (
            <StaticPageAccordion sections={sections} />
          )}

          {!loading && !error && sections.length > 0 && layout === "article" && (
            <div className="flex flex-col gap-8 md:gap-10">
              {sections.map((section) => (
                <section key={section.id}>
                  <h2 className="heading4 mb-3">{section.title}</h2>
                  <StaticPageContentBody content={section.content} />
                </section>
              ))}
            </div>
          )}
        </div>
      </div>

      {footerExtra}

      <Footer />
    </>
  );
};

export default StaticPageView;
