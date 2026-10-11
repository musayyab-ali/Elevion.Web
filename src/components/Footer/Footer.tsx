"use client";

import React, { FormEvent, useState } from "react";
import Link from "next/link";
import * as Icon from "@phosphor-icons/react/dist/ssr";
import { toast } from "react-hot-toast";
import LandingFooterImage from "@/components/Home1/LandingFooterImage";
import TenantLogo from "@/components/Common/TenantLogo";
import { subscribeNewsletter } from "@/lib/tenant-landing";
import { getApiErrorMessage } from "@/lib/api";
import { openCookieSettings } from "@/lib/cookie-consent";
import SocialIcon from "@/components/Common/SocialIcon";
import { useBranding } from "@/context/BrandingContext";
import { COMPANY_PAGE_KEYS, LEGAL_PAGE_KEYS, copyrightLine, mailtoHref, pageHref, telHref } from "@/lib/branding-model";

const FOOTER_LINK_CLASS = "caption1 has-line-before duration-300 w-fit";

const Footer = () => {
  const branding = useBranding();
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const pageOf = (keys: string[]) => keys.map((key) => branding.pages.find((page) => page.key === key)).filter((page): page is NonNullable<typeof page> => Boolean(page));
  const companyPages = pageOf(COMPANY_PAGE_KEYS);
  const legalPages = pageOf(LEGAL_PAGE_KEYS);

  const handleSubscribe = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const trimmedEmail = email.trim();
    if (!trimmedEmail) return;

    setSubmitting(true);

    try {
      const message = await subscribeNewsletter(trimmedEmail);
      setEmail("");
      toast.success(message);
    } catch (error) {
      toast.error(
        getApiErrorMessage(error, "Failed to subscribe. Please try again."),
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div id="footer" className="footer">
          <LandingFooterImage />
      <div className="footer-main bg-green">
        <div className="container px-4 sm:px-6">

          <div className="content-footer">
            <div className="footer-layout">
              <div className="footer-brand">
                <TenantLogo className="logo" />
                {(branding.email || branding.phone || branding.address) && (
                  <div className="footer-contact-list">
                    {branding.email && (
                      <div className="footer-contact-item">
                        <span className="footer-contact-label caption1">Mail:</span>
                        {mailtoHref(branding.email) ? (
                          <a href={mailtoHref(branding.email)!} className="footer-contact-value caption1 hover:text-black duration-300">
                            {branding.email}
                          </a>
                        ) : (
                          <span className="footer-contact-value caption1">{branding.email}</span>
                        )}
                      </div>
                    )}
                    {branding.phone && (
                      <div className="footer-contact-item">
                        <span className="footer-contact-label caption1">Phone:</span>
                        {telHref(branding.phone) ? (
                          <a href={telHref(branding.phone)!} className="footer-contact-value caption1 hover:text-black duration-300">
                            {branding.phone}
                          </a>
                        ) : (
                          <span className="footer-contact-value caption1">{branding.phone}</span>
                        )}
                      </div>
                    )}
                    {branding.address && (
                      <div className="footer-contact-item">
                        <span className="footer-contact-label caption1">Address:</span>
                        <span className="footer-contact-value caption1">{branding.address}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="footer-nav-grid">
                <div className="footer-nav-column">
                  <div className="footer-nav-title text-button-uppercase">
                    Support
                  </div>
                  <div className="footer-nav-links">
                    {companyPages.map((page) => (
                      <Link key={page.key} href={pageHref(page.key)!} className={FOOTER_LINK_CLASS}>
                        {page.title}
                      </Link>
                    ))}
                    {!companyPages.some((page) => page.key === "contact") && (
                      <Link href="/pages/contact" className={FOOTER_LINK_CLASS}>
                        Contact Us
                      </Link>
                    )}
                    <Link href="/my-account" className={FOOTER_LINK_CLASS}>
                      My Account
                    </Link>
                    <Link href="/blog/list" className={FOOTER_LINK_CLASS}>
                      Blog
                    </Link>
                    <Link href="/pages/store-list" className={FOOTER_LINK_CLASS}>
                      Store List
                    </Link>
                  </div>
                </div>

                <div className="footer-nav-column">
                  <div className="footer-nav-title text-button-uppercase">
                    Quick Shop
                  </div>
                  <div className="footer-nav-links">
                    <Link href="/cart" className={FOOTER_LINK_CLASS}>
                      Cart
                    </Link>
                    <Link href="/checkout" className={FOOTER_LINK_CLASS}>
                      Checkout
                    </Link>
                    <Link href="/wishlist" className={FOOTER_LINK_CLASS}>
                      Wishlist
                    </Link>
                    <Link href="/categories" className={FOOTER_LINK_CLASS}>
                      Categories
                    </Link>
                  </div>
                </div>

                <div className="footer-nav-column">
                  <div className="footer-nav-title text-button-uppercase">Legal</div>
                  <div className="footer-nav-links">
                    {legalPages.map((page) => (
                      <Link key={page.key} href={pageHref(page.key)!} className={FOOTER_LINK_CLASS}>
                        {page.title}
                      </Link>
                    ))}
                    <button type="button" onClick={openCookieSettings} className={`${FOOTER_LINK_CLASS} text-left`}>
                      Cookie settings
                    </button>
                  </div>
                </div>
              </div>

              <div className="footer-newsletter">
                <div className="footer-nav-title text-button-uppercase">
                  Newsletter
                </div>
                {branding.newsletterText && <p className="footer-newsletter-text caption1">{branding.newsletterText}</p>}
                <div className="input-block w-full h-[52px] mt-4 max-w-full">
                  <form
                    className="w-full h-full relative"
                    onSubmit={handleSubscribe}
                  >
                    <input
                      type="email"
                      placeholder="Enter your e-mail"
                      className="caption1 w-full h-full pl-4 pr-14 rounded-xl border border-line bg-white"
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      disabled={submitting}
                      required
                    />
                    <button
                      type="submit"
                      disabled={submitting}
                      className="w-[44px] h-[44px] bg-black flex items-center justify-center rounded-xl absolute top-1 right-1 disabled:opacity-60"
                      aria-label="Subscribe to newsletter"
                    >
                      <Icon.ArrowRight size={24} color="#fff" />
                    </button>
                  </form>
                </div>
                {branding.social.length > 0 && (
                  <div className="footer-social">
                    {branding.social.map((link) => (
                      <Link key={link.platform} href={link.url} target="_blank" rel="noopener noreferrer" aria-label={link.name}>
                        <SocialIcon platform={link.platform} size={24} className="text-black" />
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="footer-bottom border-t border-line">
            <p className="footer-copyright caption1 text-secondary">
              {copyrightLine(branding, new Date().getFullYear())}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Footer;
