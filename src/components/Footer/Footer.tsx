"use client";

import React, { FormEvent, useState } from "react";
import Link from "next/link";
import * as Icon from "@phosphor-icons/react/dist/ssr";
import { toast } from "react-hot-toast";
import LandingFooterImage from "@/components/Home1/LandingFooterImage";
import TenantLogo from "@/components/Common/TenantLogo";
import { subscribeNewsletter } from "@/lib/tenant-landing";
import { getApiErrorMessage } from "@/lib/api";

const FOOTER_LINK_CLASS = "caption1 has-line-before duration-300 w-fit";

const Footer = () => {
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);

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
      <div className="footer-main bg-[#d4f1a6]">
        <div className="container px-4 sm:px-6">

          <div className="content-footer">
            <div className="footer-layout">
              <div className="footer-brand">
                <TenantLogo className="logo" />
                <div className="footer-contact-list">
                  <div className="footer-contact-item">
                    <span className="footer-contact-label caption1">Mail:</span>
                    <a
                      href="mailto:hi.avitex@gmail.com"
                      className="footer-contact-value caption1 hover:text-black duration-300"
                    >
                      hi.avitex@gmail.com
                    </a>
                  </div>
                  <div className="footer-contact-item">
                    <span className="footer-contact-label caption1">Phone:</span>
                    <a
                      href="tel:+13333456868"
                      className="footer-contact-value caption1 hover:text-black duration-300"
                    >
                      1-333-345-6868
                    </a>
                  </div>
                  <div className="footer-contact-item">
                    <span className="footer-contact-label caption1">Address:</span>
                    <span className="footer-contact-value caption1">
                      549 Oak St. Crystal Lake, IL 60014
                    </span>
                  </div>
                </div>
              </div>

              <div className="footer-nav-grid">
                <div className="footer-nav-column">
                  <div className="footer-nav-title text-button-uppercase">
                    Support
                  </div>
                  <div className="footer-nav-links">
                    <Link href="/pages/contact" className={FOOTER_LINK_CLASS}>
                      Contact Us
                    </Link>
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
                    <Link href="/pages/faqs" className={FOOTER_LINK_CLASS}>
                      FAQs
                    </Link>
                    <Link
                      href="/pages/terms-and-conditions"
                      className={FOOTER_LINK_CLASS}
                    >
                      Terms & Conditions
                    </Link>
                    <Link href="/pages/privacy-policy" className={FOOTER_LINK_CLASS}>
                      Privacy Policy
                    </Link>
                  </div>
                </div>
              </div>

              <div className="footer-newsletter">
                <div className="footer-nav-title text-button-uppercase">
                  Newsletter
                </div>
                <p className="footer-newsletter-text caption1">
                  Sign up for our newsletter and get 10% off your first purchase.
                </p>
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
                <div className="footer-social">
                  <Link href="https://www.facebook.com/" target="_blank" rel="noopener noreferrer" aria-label="Facebook">
                    <div className="icon-facebook text-2xl text-black" />
                  </Link>
                  <Link href="https://www.instagram.com/" target="_blank" rel="noopener noreferrer" aria-label="Instagram">
                    <div className="icon-instagram text-2xl text-black" />
                  </Link>
                  <Link href="https://www.twitter.com/" target="_blank" rel="noopener noreferrer" aria-label="Twitter">
                    <div className="icon-twitter text-2xl text-black" />
                  </Link>
                  <Link href="https://www.youtube.com/" target="_blank" rel="noopener noreferrer" aria-label="YouTube">
                    <div className="icon-youtube text-2xl text-black" />
                  </Link>
                  <Link href="https://www.pinterest.com/" target="_blank" rel="noopener noreferrer" aria-label="Pinterest">
                    <div className="icon-pinterest text-2xl text-black" />
                  </Link>
                </div>
              </div>
            </div>
          </div>

          <div className="footer-bottom border-t border-line">
            <p className="footer-copyright caption1 text-secondary">
              © {new Date().getFullYear()} TopSaver. All Rights Reserved.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Footer;
