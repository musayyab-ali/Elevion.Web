"use client";

import React, { FormEvent, useState } from "react";
import TopNavOne from "@/components/Header/TopNav/TopNavOne";
import MenuOne from "@/components/Header/Menu/MenuOne";
import Breadcrumb from "@/components/Breadcrumb/Breadcrumb";
import Footer from "@/components/Footer/Footer";
import { toast } from "react-hot-toast";
import { getApiErrorMessage } from "@/lib/api";
import { submitContactUs } from "@/lib/tenant-landing";

const ContactUs = () => {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    setSubmitting(true);

    try {
      const successMessage = await submitContactUs({
        Name: name,
        Phone: phone,
        Email: email,
        Message: message,
        Type: 1,
      });

      setName("");
      setPhone("");
      setEmail("");
      setMessage("");
      toast.success(successMessage);
    } catch (error) {
      toast.error(
        getApiErrorMessage(error, "Failed to send message. Please try again."),
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <TopNavOne
        props="style-one bg-black"
        slogan="New customers save 10% with the code GET10"
      />
      <div id="header" className="relative w-full">
        <MenuOne props="bg-transparent" />
        <Breadcrumb heading="Contact us" subHeading="Contact us" />
      </div>
      <div className="contact-us md:py-20 py-10">
        <div className="container">
          <div className="flex justify-center max-lg:flex-col gap-y-10">
            <div className="left lg:w-2/3 lg:pr-4">
              <div className="heading3">Drop Us A Line</div>
              <div className="body1 text-secondary2 mt-3">
                Use the form below to get in touch with the sales team
              </div>
              <form className="md:mt-6 mt-4" onSubmit={handleSubmit}>
                <div className="grid sm:grid-cols-2 grid-cols-1 gap-4 gap-y-5">
                  <div className="name">
                    <input
                      className="border-line px-4 py-3 w-full rounded-lg"
                      id="username"
                      type="text"
                      placeholder="Your Name *"
                      value={name}
                      onChange={(event) => setName(event.target.value)}
                      disabled={submitting}
                      required
                    />
                  </div>
                  <div className="email">
                    <input
                      className="border-line px-4 pt-3 pb-3 w-full rounded-lg"
                      id="email"
                      type="email"
                      placeholder="Your Email *"
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      disabled={submitting}
                      required
                    />
                  </div>
                  <div className="phone sm:col-span-2">
                    <input
                      className="border-line px-4 py-3 w-full rounded-lg"
                      id="phone"
                      type="tel"
                      placeholder="Your Phone *"
                      value={phone}
                      onChange={(event) => setPhone(event.target.value)}
                      disabled={submitting}
                      required
                    />
                  </div>
                  <div className="message sm:col-span-2">
                    <textarea
                      className="border-line px-4 pt-3 pb-3 w-full rounded-lg"
                      id="message"
                      rows={3}
                      placeholder="Your Message *"
                      value={message}
                      onChange={(event) => setMessage(event.target.value)}
                      disabled={submitting}
                      required
                    />
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

          </div>
        </div>
      </div>
      <Footer />
    </>
  );
};

export default ContactUs;
