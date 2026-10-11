"use client";

import React from "react";
import StaticPageView from "@/components/StaticPages/StaticPageView";
import Benefit from "@/components/Home1/Benefit";
import Brand from "@/components/Home1/Brand";

/** About us: written by the shop in the admin (Static pages -> About us). Nothing about the shop is fixed in the code. */
const AboutUs = () => {
  return (
    <StaticPageView
      pageKey="about"
      heading="About Us"
      subHeading="About Us"
      layout="article"
      emptyText="This page has not been written yet."
      footerExtra={
        <>
          <Benefit props="md:pt-20 pt-10" />
          <Brand />
        </>
      }
    />
  );
};

export default AboutUs;
