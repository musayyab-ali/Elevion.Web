"use client";

import Image from "next/image";
import { useLandingPage } from "@/hooks/useLandingPage";
import { isLandingImageEnabled } from "@/lib/tenant-landing";

const LandingFooterImage = () => {
  const landing = useLandingPage();

  if (
    !landing ||
    !isLandingImageEnabled(landing.FooterImageRequest) ||
    !landing.FooterImagePath
  ) {
    return null;
  }

  return (
    <div className="landing-footer-image w-full overflow-hidden ">
      <Image
        src={landing.FooterImagePath}
        alt="Footer banner"
        width={1920}
        height={400}
        className="w-full h-auto object-cover max-h-[400px] md:max-h-[330px]"
      />
    </div>
  );
};

export default LandingFooterImage;
