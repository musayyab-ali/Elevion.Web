import type { Metadata } from "next";
import TopNavOne from "@/components/Header/TopNav/TopNavOne";
import MenuOne from "@/components/Header/Menu/MenuOne";
import SliderOne from "@/components/Slider/SliderOne";
import WhatNewOne from "@/components/Home1/WhatNewOne";
import productData from "@/data/Product.json";
import Collection from "@/components/Home1/Collection";
import TabFeatures from "@/components/Home1/TabFeatures";
import Banner from "@/components/Home1/Banner";
import Benefit from "@/components/Home1/Benefit";
import Testimonial from "@/components/Home1/Testimonial";
import Instagram from "@/components/Home1/Instagram";
import Brand from "@/components/Home1/Brand";
import Footer from "@/components/Footer/Footer";
import ModalNewsletter from "@/components/Modal/ModalNewsletter";
import LandingYoutube from "@/components/Home1/LandingYoutube";
import { fetchTenantLanding } from "@/lib/tenant-landing";

export async function generateMetadata(): Promise<Metadata> {
  const landing = await fetchTenantLanding();

  if (!landing?.Seo) {
    return {
      title: "TopSaver",
      description: "Multipurpose eCommerce Template",
    };
  }

  return {
    title: landing.Seo.MetaTitle || "TopSaver",
    description: landing.Seo.MetaDescription || undefined,
    keywords: landing.Seo.MetaKeywords || undefined,
  };
}

export default function Home() {
  return (
    <>
      <TopNavOne
        props="style-one bg-black"
        slogan="New customers save 10% with the code GET10"
      />
      <div id="header" className="relative w-full">
        <MenuOne props="bg-transparent" />
        <SliderOne />
      </div>
      <WhatNewOne data={productData} start={0} limit={4} />
      <Collection />
      <TabFeatures />
      {/* <Banner /> */}
      <Benefit props="md:py-20 py-10" />
      <LandingYoutube />
      <Testimonial limit={6} />
      {/* <Instagram /> */}
      <Brand />
      <Footer />
      <ModalNewsletter />
    </>
  );
}
