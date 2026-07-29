"use client";

import { useEffect } from "react";
import { useLandingPage } from "@/hooks/useLandingPage";
import { isLandingImageEnabled } from "@/lib/tenant-landing";

const LandingSeo = () => {
  const landing = useLandingPage();

  useEffect(() => {
    if (!landing) return;

    if (landing.Seo?.MetaTitle) {
      document.title = landing.Seo.MetaTitle;
    }

    if (landing.Seo?.MetaDescription) {
      let descriptionTag = document.querySelector('meta[name="description"]');

      if (!descriptionTag) {
        descriptionTag = document.createElement("meta");
        descriptionTag.setAttribute("name", "description");
        document.head.appendChild(descriptionTag);
      }

      descriptionTag.setAttribute("content", landing.Seo.MetaDescription);
    }

    if (landing.Seo?.MetaKeywords) {
      let keywordsTag = document.querySelector('meta[name="keywords"]');

      if (!keywordsTag) {
        keywordsTag = document.createElement("meta");
        keywordsTag.setAttribute("name", "keywords");
        document.head.appendChild(keywordsTag);
      }

      keywordsTag.setAttribute("content", landing.Seo.MetaKeywords);
    }

    if (
      isLandingImageEnabled(landing.FaviconImageRequest) &&
      landing.FaviconImagePath
    ) {
      let faviconTag = document.querySelector('link[rel="icon"]');

      if (!faviconTag) {
        faviconTag = document.createElement("link");
        faviconTag.setAttribute("rel", "icon");
        document.head.appendChild(faviconTag);
      }

      faviconTag.setAttribute("href", landing.FaviconImagePath);
    }
  }, [landing]);

  return null;
};

export default LandingSeo;
