"use client";

import { useLandingPage } from "@/hooks/useLandingPage";
import { getYoutubeEmbedUrl } from "@/lib/tenant-landing";

const LandingYoutube = () => {
  const landing = useLandingPage();
  const embedUrl = getYoutubeEmbedUrl(landing?.YoutubeEmbededLink ?? "");

  if (!embedUrl) {
    return null;
  }

  return (
    <section className="landing-youtube-section bg-white md:py-5 py-5">
      <div className="container px-4 sm:px-6">
        <div className="landing-youtube-header text-center">
        
          <h2 className="heading3 mt-4">Watch Our Story</h2>
          <p className="caption1 text-secondary mt-3">
            See who we are, what we stand for, and why customers love shopping
            with us.
          </p>
        </div>

        <div className="landing-youtube-frame mt-5">
          <div className="landing-youtube-player">
            <iframe
              src={embedUrl}
              title="YouTube video"
              className="landing-youtube-iframe"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
            />
          </div>
        </div>
      </div>
    </section>
  );
};

export default LandingYoutube;
