"use client";

import React, { FormEvent, useEffect, useState } from "react";
import TopNavOne from "@/components/Header/TopNav/TopNavOne";
import MenuOne from "@/components/Header/Menu/MenuOne";
import Breadcrumb from "@/components/Breadcrumb/Breadcrumb";
import Footer from "@/components/Footer/Footer";
import StaticPageContentBody from "@/components/StaticPages/StaticPageContentBody";
import { toast } from "react-hot-toast";
import { getApiErrorMessage } from "@/lib/api";
import { submitContactUs } from "@/lib/tenant-landing";
import { fetchStaticPageByKey, StaticPageSection } from "@/lib/static-pages";
import { useBranding } from "@/context/BrandingContext";
import { mailtoHref, telHref } from "@/lib/branding-model";
import {
  CONTACT_LIMITS,
  CONTACT_TYPES,
  ContactErrors,
  hasErrors,
  looksLikeBot,
  messageCounter,
  validateContact,
} from "@/lib/contact-form";

const FIELD_CLASS = "border-line px-4 py-3 w-full rounded-lg";

const ContactUs = () => {
  const branding = useBranding();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [type, setType] = useState<number>(CONTACT_TYPES[0].value);
  const [website, setWebsite] = useState(""); // hidden field: only a program fills it in
  const [errors, setErrors] = useState<ContactErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [sections, setSections] = useState<StaticPageSection[]>([]);

  // The text the shop wrote for this page in the admin (Static pages -> Contact us), if any.
  useEffect(() => {
    let cancelled = false;
    fetchStaticPageByKey("contact")
      .then((result) => {
        if (!cancelled) setSections(result.sections);
      })
      .catch(() => undefined); // the form and the shop's details work without it
    return () => {
      cancelled = true;
    };
  }, []);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (looksLikeBot(website)) {
      toast.success("Your message has been sent successfully."); // looks like success to a program; nothing is sent
      return;
    }

    const found = validateContact({ name, email, phone, message, type });
    setErrors(found);
    if (hasErrors(found)) return;

    setSubmitting(true);

    try {
      const successMessage = await submitContactUs({
        Name: name,
        Phone: phone,
        Email: email,
        Message: message,
        Type: type,
      });

      setName("");
      setPhone("");
      setEmail("");
      setMessage("");
      setType(CONTACT_TYPES[0].value);
      setErrors({});
      toast.success(successMessage);
    } catch (error) {
      toast.error(
        getApiErrorMessage(error, "Failed to send message. Please try again."),
      );
    } finally {
      setSubmitting(false);
    }
  };

  const hasDetails = Boolean(branding.email || branding.phone || branding.address);

  return (
    <>
      <TopNavOne props="style-one bg-black" />
      <div id="header" className="relative w-full">
        <MenuOne props="bg-transparent" />
        <Breadcrumb heading="Contact us" subHeading="Contact us" />
      </div>

      <div className="contact-us md:py-20 py-10">
        <div className="container">
          <div className="flex justify-center max-lg:flex-col gap-y-10 lg:gap-x-12">
            <div className="left lg:w-2/3 lg:pr-4">
              <div className="heading3">Drop Us A Line</div>
              <div className="body1 text-secondary2 mt-3">
                Use the form below to get in touch with {branding.shopName}.
              </div>
              <form className="md:mt-6 mt-4" onSubmit={handleSubmit} noValidate>
                <div className="grid sm:grid-cols-2 grid-cols-1 gap-4 gap-y-5">
                  <div className="name">
                    <input
                      className={FIELD_CLASS}
                      id="username"
                      type="text"
                      placeholder="Your Name *"
                      maxLength={CONTACT_LIMITS.name}
                      autoComplete="name"
                      value={name}
                      onChange={(event) => setName(event.target.value)}
                      disabled={submitting}
                      aria-invalid={Boolean(errors.name)}
                      aria-describedby={errors.name ? "contact-name-error" : undefined}
                    />
                    {errors.name && <p id="contact-name-error" className="caption1 text-red mt-1">{errors.name}</p>}
                  </div>
                  <div className="email">
                    <input
                      className={FIELD_CLASS}
                      id="email"
                      type="email"
                      placeholder="Your Email *"
                      maxLength={CONTACT_LIMITS.email}
                      autoComplete="email"
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      disabled={submitting}
                      aria-invalid={Boolean(errors.email)}
                      aria-describedby={errors.email ? "contact-email-error" : undefined}
                    />
                    {errors.email && <p id="contact-email-error" className="caption1 text-red mt-1">{errors.email}</p>}
                  </div>
                  <div className="phone">
                    <input
                      className={FIELD_CLASS}
                      id="phone"
                      type="tel"
                      placeholder="Your Phone *"
                      maxLength={CONTACT_LIMITS.phone}
                      autoComplete="tel"
                      value={phone}
                      onChange={(event) => setPhone(event.target.value)}
                      disabled={submitting}
                      aria-invalid={Boolean(errors.phone)}
                      aria-describedby={errors.phone ? "contact-phone-error" : undefined}
                    />
                    {errors.phone && <p id="contact-phone-error" className="caption1 text-red mt-1">{errors.phone}</p>}
                  </div>
                  <div className="type">
                    <select
                      className={FIELD_CLASS}
                      id="contact-type"
                      aria-label="What is your message about?"
                      value={type}
                      onChange={(event) => setType(Number(event.target.value))}
                      disabled={submitting}
                    >
                      {CONTACT_TYPES.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="message sm:col-span-2">
                    <textarea
                      className={FIELD_CLASS}
                      id="message"
                      placeholder="Your Message *"
                      rows={6}
                      maxLength={CONTACT_LIMITS.messageMax}
                      value={message}
                      onChange={(event) => setMessage(event.target.value)}
                      disabled={submitting}
                      aria-invalid={Boolean(errors.message)}
                      aria-describedby={errors.message ? "contact-message-error" : undefined}
                    />
                    <div className="flex justify-between gap-4 mt-1">
                      <span id="contact-message-error" className="caption1 text-red">{errors.message}</span>
                      <span className="caption1 text-secondary2">{messageCounter(message)}</span>
                    </div>
                  </div>
                  {/* Hidden from people (and from screen readers); programs that fill every field give themselves away. */}
                  <div className="hidden" aria-hidden="true">
                    <label htmlFor="website">Leave this empty</label>
                    <input id="website" type="text" tabIndex={-1} autoComplete="off" value={website} onChange={(event) => setWebsite(event.target.value)} />
                  </div>
                </div>
                <div className="block-button md:mt-6 mt-4">
                  <button
                    type="submit"
                    className="button-main bg-black disabled:opacity-60"
                    disabled={submitting}
                  >
                    {submitting ? "Sending..." : "Send message"}
                  </button>
                </div>
              </form>
            </div>

            {(hasDetails || sections.length > 0) && (
              <aside className="right lg:w-1/3 lg:pl-4">
                {hasDetails && (
                  <>
                    <div className="heading4">Get in touch</div>
                    <div className="mt-4 flex flex-col gap-3">
                      {branding.address && (
                        <div>
                          <div className="caption1 text-secondary2">Address</div>
                          <div className="body1">{branding.address}</div>
                        </div>
                      )}
                      {branding.phone && (
                        <div>
                          <div className="caption1 text-secondary2">Phone</div>
                          {telHref(branding.phone) ? (
                            <a className="body1 hover:underline" href={telHref(branding.phone)!}>{branding.phone}</a>
                          ) : (
                            <div className="body1">{branding.phone}</div>
                          )}
                        </div>
                      )}
                      {branding.email && (
                        <div>
                          <div className="caption1 text-secondary2">Email</div>
                          {mailtoHref(branding.email) ? (
                            <a className="body1 hover:underline break-all" href={mailtoHref(branding.email)!}>{branding.email}</a>
                          ) : (
                            <div className="body1 break-all">{branding.email}</div>
                          )}
                        </div>
                      )}
                    </div>
                  </>
                )}
                {sections.map((section) => (
                  <section key={section.id} className={hasDetails ? "mt-8" : ""}>
                    <h2 className="heading5 mb-2">{section.title}</h2>
                    <StaticPageContentBody content={section.content} />
                  </section>
                ))}
              </aside>
            )}
          </div>
        </div>
      </div>
      <Footer />
    </>
  );
};

export default ContactUs;
