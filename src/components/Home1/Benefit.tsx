import React from "react";

interface Props {
  props: string;
}

const BENEFITS = [
  {
    icon: "icon-phone-call",
    title: "24/7 Customer Service",
    description:
      "We're here to help you with any questions or concerns you have, 24/7.",
  },
  {
    icon: "icon-return",
    title: "14-Day Money Back",
    description:
      "If you're not satisfied with your purchase, simply return it within 14 days for a refund.",
  },
  {
    icon: "icon-guarantee",
    title: "Our Guarantee",
    description:
      "We stand behind our products and services and guarantee your satisfaction.",
  },
  {
    icon: "icon-delivery-truck",
    title: "Shipping Worldwide",
    description:
      "We ship our products worldwide, making them accessible to customers everywhere.",
  },
] as const;

const Benefit: React.FC<Props> = ({ props }) => {
  return (
    <section className="benefit-section">
      <div className="container px-4 sm:px-6">
        <div className={`benefit-block ${props}`}>
          <div className="benefit-header text-center">
            <h2 className="heading3">Why Shop With Us</h2>
            <p className="caption1 text-secondary mt-3">
              Enjoy a smooth, secure, and worry-free shopping experience every
              time.
            </p>
          </div>

          <div className="benefit-grid md:mt-10 mt-8">
            {BENEFITS.map((item) => (
              <article key={item.title} className="benefit-card">
                <div className="benefit-card-icon">
                  <i className={`${item.icon} benefit-card-icon-symbol`} />
                </div>
                <h3 className="benefit-card-title heading6">{item.title}</h3>
                <p className="benefit-card-text caption1 text-secondary">
                  {item.description}
                </p>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default Benefit;
