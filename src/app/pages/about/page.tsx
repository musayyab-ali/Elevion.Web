"use client";

import React from "react";
import TopNavOne from "@/components/Header/TopNav/TopNavOne";
import MenuOne from "@/components/Header/Menu/MenuOne";
import Breadcrumb from "@/components/Breadcrumb/Breadcrumb";
import Benefit from "@/components/Home1/Benefit";
import Brand from "@/components/Home1/Brand";
import Footer from "@/components/Footer/Footer";

const AboutUs = () => {
  return (
    <>
      <TopNavOne
        props="style-one bg-black"
        slogan="New customers save 10% with the code GET10"
      />
      <div id="header" className="relative w-full">
        <MenuOne props="bg-transparent" />
        <Breadcrumb heading="About Us" subHeading="About Us" />
      </div>
      <div className="about md:pt-20 pt-10">
        <div className="about-us-block">
          <div className="container">
            <div className="text flex items-center justify-center">
              <div className="content md:w-5/6 w-full">
                <div className="heading3 text-center">
                  Welcome to TopSaver
                </div>
                <div className="body1 text-center md:mt-7 mt-5">
                  We are a modern fashion destination focused on quality products,
                  thoughtful design, and a smooth shopping experience. From curated
                  collections to reliable delivery, our goal is to help you find
                  pieces you love with confidence.
                </div>
                <div className="body1 text-center md:mt-5 mt-4 text-secondary">
                  Thank you for being part of our journey — we are always working to
                  bring you better styles, better service, and a store you can trust.
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <Benefit props="md:pt-20 pt-10" />
      <Brand />
      <Footer />
    </>
  );
};

export default AboutUs;
