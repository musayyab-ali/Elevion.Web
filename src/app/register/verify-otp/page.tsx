"use client";
import Cookies from "js-cookie";
import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import * as Icon from "@phosphor-icons/react/dist/ssr";
import TopNavOne from "@/components/Header/TopNav/TopNavOne";
import MenuOne from "@/components/Header/Menu/MenuOne";
import Breadcrumb from "@/components/Breadcrumb/Breadcrumb";
import Footer from "@/components/Footer/Footer";
import toast from "react-hot-toast";
import api, { getApiErrorMessage } from "@/lib/api";
import { completeLoginAfterVerification } from "@/lib/auth";

type StoredRegData = {
  username: string;
  email?: string;
  phoneNumber: string;
  phoneCode: string | number;
};

const VerifyOTP = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    const queryEmail = searchParams?.get("email") || "";
    const cookieEmail = Cookies.get("registerEmail") || "";

    if (queryEmail) {
      setEmail(queryEmail);
      Cookies.set("registerEmail", queryEmail, {
        expires: 1,
        secure: process.env.NODE_ENV === "production",
        sameSite: "Strict",
        path: "/",
      });
      return;
    }

    if (cookieEmail) {
      setEmail(cookieEmail);
    }
  }, [searchParams]);

  const getStoredRegData = (): StoredRegData | null => {
    const savedData = Cookies.get("userRegData");
    if (!savedData) return null;

    try {
      return JSON.parse(savedData) as StoredRegData;
    } catch {
      return null;
    }
  };

  const handleVerify = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    const storedData = getStoredRegData();
    if (!storedData?.username || !storedData.phoneNumber) {
      const msg = "Registration details missing. Please register again.";
      setError(msg);
      toast.error(msg);
      return;
    }

    if (!otp.trim() || otp.trim().length !== 6) {
      const msg = "Please enter a valid 6-digit OTP code.";
      setError(msg);
      toast.error(msg);
      return;
    }

    setLoading(true);

    const payloadForVerify = {
      OTP: otp.trim(),
      PhoneCode: storedData.phoneCode,
      PhoneNumber: storedData.phoneNumber,
      UserName: storedData.username,
      UpdateAuthToken: true,
    };

    try {
      const response = await api.post("/api/v1/Account/VerifyOTP", payloadForVerify);
      const responseBody =
        response && typeof response === "object" && "data" in response
          ? (response as { data: unknown }).data
          : response;

      const loggedIn = await completeLoginAfterVerification(
        responseBody,
        storedData.username,
      );

      if (!loggedIn) {
        throw new Error("Verification succeeded but automatic login failed.");
      }

      toast.success("Account verified and logged in successfully!");
      Cookies.remove("userRegData");
      Cookies.remove("registerEmail");
      sessionStorage.removeItem("regPassword");
      setSuccess("Logged in! Redirecting to home...");

      window.setTimeout(() => {
        router.push("/");
      }, 1200);
    } catch (err) {
      const message = getApiErrorMessage(
        err,
        "OTP verification failed. Please check the code and try again.",
      );
      toast.error(message);
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setError("");
    setSuccess("");

    const storedData = getStoredRegData();
    if (!storedData?.username) {
      setError("Registration details missing. Please register again.");
      return;
    }

    const resendEmail =
      email || storedData.email || Cookies.get("registerEmail");
    if (!resendEmail) {
      setError("Email address missing. Please register again.");
      return;
    }

    setResendLoading(true);
    try {
      await api.post("/api/v1/Account/ResendOTP", {
        UserName: storedData.username,
        Email: resendEmail,
      });

      toast.success("OTP resent successfully!");
      setSuccess(
        "A new OTP has been sent to your email. Please check your inbox.",
      );
    } catch (err) {
      const message = getApiErrorMessage(
        err,
        "Failed to resend OTP. Please try again in a moment.",
      );
      toast.error(message);
      setError(message);
    } finally {
      setResendLoading(false);
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
        <Breadcrumb heading="Verify OTP" subHeading="Verify your account" />
      </div>
      <div className="register-block md:py-20 py-10">
        <div className="container">
          <div className="content-main flex gap-y-8 max-md:flex-col">
            <div className="left md:w-1/2 w-full lg:pr-[60px] md:pr-[40px] md:border-r border-line">
              <div className="heading4">Verify OTP</div>
              <form className="md:mt-7 mt-4" onSubmit={handleVerify}>
                {error && (
                  <div className="mb-4 px-4 py-3 rounded-lg bg-red-50 text-red-600 text-sm">
                    {error}
                  </div>
                )}
                {success && (
                  <div className="mb-4 px-4 py-3 rounded-lg bg-green-50 text-green-600 text-sm">
                    {success}
                  </div>
                )}
                <div className="email mb-5">
                  <input
                    className="border-line px-4 pt-3 pb-3 w-full rounded-lg"
                    type="email"
                    value={email}
                    readOnly
                    placeholder="Email address"
                  />
                </div>
                <div className="otp mb-5">
                  <input
                    className="border-line px-4 pt-3 pb-3 w-full rounded-lg"
                    type="text"
                    maxLength={6}
                    placeholder="Enter 6-digit OTP code"
                    value={otp}
                    onChange={(e) =>
                      setOtp(e.target.value.replace(/[^0-9]/g, ""))
                    }
                  />
                </div>
                <div className="block-button md:mt-7 mt-4">
                  <button
                    title="Send your OTP"
                    type="submit"
                    className="button-main bg-black text-white cursor-pointer hover:text-black transition-all duration-300"
                    disabled={loading}
                  >
                    {loading ? "Verifying..." : "Verify OTP"}
                  </button>
                </div>
              </form>
              <div className="mt-4 text-sm text-secondary2">
                Didn&apos;t receive the code?
                <button
                  title="Send New OTP"
                  type="button"
                  className="ml-1 font-semibold text-black hover:underline"
                  onClick={handleResend}
                  disabled={resendLoading}
                >
                  {resendLoading ? "Resending..." : "Resend OTP"}
                </button>
              </div>
            </div>

            <div className="right md:w-1/2 w-full lg:pl-[60px] md:pl-[40px] flex items-center">
              <div className="text-content">
                <div className="heading4">Need help?</div>
                <div className="mt-2 text-secondary">
                  Enter the 6-digit code sent to your email address. If you
                  still have trouble, contact support.
                </div>
                <div className="block-button md:mt-7 mt-4">
                  <button
                    type="button"
                    title="Go back to Login Page"
                    onClick={() => router.push("/login")}
                    className="button-main bg-black text-white cursor-pointer hover:text-black transition-all duration-300"
                  >
                    Login
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </>
  );
};

export default VerifyOTP;
