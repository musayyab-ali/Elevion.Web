"use client";

import React from "react";
import { useBranding } from "@/context/BrandingContext";
import { benefitIconClass } from "@/lib/branding-model";

interface Props {
  props: string;
}

/** "Why shop with us": the points the shop wrote in the admin (Settings, Branding). Nothing is shown until the shop has written some. */
const Benefit: React.FC<Props> = ({ props }) => {
  const { benefits } = useBranding();
  if (benefits.length === 0) return null;

  return (
    <section className="benefit-section">
      <div className="container px-4 sm:px-6">
        <div className={`benefit-block ${props}`}>
          <div className="benefit-header text-center">
            <h2 className="heading3">Why Shop With Us</h2>
          </div>

          <div className="benefit-grid md:mt-10 mt-8">
            {benefits.map((item) => (
              <article key={item.title} className="benefit-card">
                <div className="benefit-card-icon">
                  <i className={`${benefitIconClass(item.icon)} benefit-card-icon-symbol`} />
                </div>
                <h3 className="benefit-card-title heading6">{item.title}</h3>
                {item.description && <p className="benefit-card-text caption1 text-secondary">{item.description}</p>}
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default Benefit;
